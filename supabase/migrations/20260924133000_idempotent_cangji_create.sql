-- A successful create can outlive a lost HTTP response.  Make the client request
-- UUID the durable idempotency key so retrying never escrows the wager twice.
drop function if exists public.cangji_create_game(text,text,text,integer);

create or replace function public.cangji_create_game(
  p_channel text,
  p_name text,
  p_choice text,
  p_wager integer,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  game_id uuid;
  new_game_no bigint;
  new_game_code text;
  local_day date := (now() at time zone 'Asia/Taipei')::date;
  daily_no integer;
  w private.player_resource_wallets;
  prior private.player_state_events;
  g public.cangji_games;
begin
  if uid is null then raise exception '請重新登入後再設局'; end if;
  if p_channel not in ('formal','test') or p_choice not in ('rock','scissors','paper') or p_request_id is null then
    raise exception '設局內容不正確';
  end if;
  if p_wager not between 5000 and 30000 or p_wager % 500 <> 0 then
    raise exception '押注須為5,000至30,000，並以500為單位';
  end if;

  perform pg_advisory_xact_lock(hashtext(uid::text||'-cangji-'||p_channel));

  select * into prior
  from private.player_state_events
  where user_id=uid and channel=p_channel and request_id=p_request_id;

  if prior.id is not null then
    if prior.event_type <> 'cangji_created' then raise exception '請求識別碼已被使用'; end if;
    select * into g from public.cangji_games
    where id=(prior.payload->>'gameId')::uuid and creator_id=uid and channel=p_channel;
    select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;
    if g.id is null or w.user_id is null then raise exception '設局紀錄不完整'; end if;
    return jsonb_build_object(
      'id',g.id,'game_no',g.game_no,'game_code',g.game_code,'wager',g.wager,
      'wallet',private.cangji_wallet_json(w),'alreadyCreated',true
    );
  end if;

  select * into w from private.player_resource_wallets
  where user_id=uid and channel=p_channel for update;
  if w.user_id is null then raise exception '資源帳本未建立'; end if;
  if w.spirit_stone < p_wager then raise exception '靈石不足，無法設局'; end if;
  if (select count(*) from public.cangji_games
      where creator_id=uid and channel=p_channel and escrow_backed
        and (status='open' or (status='resolved' and creator_claimed=false))) >= 5 then
    raise exception '尚未結算的設局已達上限 5/5，請先領取結果或撤回待應之局';
  end if;

  insert into private.cangji_daily_sequences(day,last_no) values(local_day,1)
  on conflict(day) do update set last_no=private.cangji_daily_sequences.last_no+1
  returning last_no into daily_no;
  new_game_code := to_char(local_day,'YYYYMMDD')||lpad(daily_no::text,3,'0');

  update private.player_resource_wallets
  set spirit_stone=spirit_stone-p_wager,revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into w;

  insert into public.cangji_games(channel,creator_id,creator_name,creator_choice,wager,game_code,escrow_backed)
  values(p_channel,uid,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_choice,p_wager,new_game_code,true)
  returning id,game_no into game_id,new_game_no;

  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,w.revision,'cangji_created',p_request_id,
    jsonb_build_object('gameId',game_id,'gameNo',new_game_no,'gameCode',new_game_code,'wager',p_wager));

  return jsonb_build_object(
    'id',game_id,'game_no',new_game_no,'game_code',new_game_code,'wager',p_wager,
    'wallet',private.cangji_wallet_json(w),'alreadyCreated',false
  );
end $$;

revoke all on function public.cangji_create_game(text,text,text,integer,uuid) from public,anon;
grant execute on function public.cangji_create_game(text,text,text,integer,uuid) to authenticated;
