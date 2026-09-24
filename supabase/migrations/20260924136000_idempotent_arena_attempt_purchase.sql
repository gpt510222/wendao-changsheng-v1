-- Replaying one purchase request returns current authoritative state instead of
-- charging again or leaving the browser unable to learn that it succeeded.
create or replace function public.arena_buy_attempt(
  p_kind text,
  p_channel text,
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid := (select auth.uid());
  d date := (timezone('Asia/Taipei',now()))::date;
  row_data public.arena_daily;
  rw private.player_resource_wallets;
  jw private.player_jade_wallets;
  prior private.player_state_events;
  cost bigint;
begin
  if uid is null or p_channel not in ('formal','test') or p_kind not in ('stone','jade') or p_request_id is null then
    raise exception 'invalid purchase';
  end if;
  perform pg_advisory_xact_lock(hashtext(uid::text||'-arena-buy-'||p_channel));

  select * into prior from private.player_state_events
  where user_id=uid and channel=p_channel and request_id=p_request_id;
  if prior.id is not null then
    if prior.event_type<>'arena_attempt_purchase' or prior.payload->>'kind'<>p_kind then
      raise exception '請求識別碼已被使用';
    end if;
    insert into public.arena_daily(user_id,channel,play_date) values(uid,p_channel,d) on conflict do nothing;
    select * into row_data from public.arena_daily where user_id=uid and channel=p_channel and play_date=d;
    select * into rw from private.player_resource_wallets where user_id=uid and channel=p_channel;
    select * into jw from private.player_jade_wallets where user_id=uid and channel=p_channel;
    return to_jsonb(row_data)||jsonb_build_object(
      'wallet',case when rw.user_id is null then null else private.wallet_snapshot(rw) end,
      'jade',case when jw.user_id is null then null else private.jade_wallet_snapshot(jw) end,
      'alreadyPurchased',true
    );
  end if;

  insert into public.arena_daily(user_id,channel,play_date) values(uid,p_channel,d) on conflict do nothing;
  select * into row_data from public.arena_daily
  where user_id=uid and channel=p_channel and play_date=d for update;
  if p_kind='stone' and row_data.stone_bought>=5 then raise exception 'stone purchase limit'; end if;
  if p_kind='jade' and row_data.jade_bought>=5 then raise exception 'jade purchase limit'; end if;

  if p_kind='stone' then
    cost:=5000;
    select * into rw from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
    if rw.user_id is null or rw.spirit_stone<cost then raise exception '靈石不足'; end if;
    update private.player_resource_wallets
    set spirit_stone=spirit_stone-cost,revision=revision+1,updated_at=now()
    where user_id=uid and channel=p_channel returning * into rw;
  else
    cost:=10;
    select * into jw from private.player_jade_wallets where user_id=uid and channel=p_channel for update;
    if jw.user_id is null or jw.balance<cost then raise exception '靈玉不足'; end if;
    update private.player_jade_wallets set balance=balance-cost,revision=revision+1,updated_at=now()
    where user_id=uid and channel=p_channel returning * into jw;
    insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata)
    values(uid,p_channel,-cost,jw.balance,'arena_attempt',p_request_id::text,'{}');
  end if;

  update public.arena_daily set
    stone_bought=stone_bought+(p_kind='stone')::integer,
    jade_bought=jade_bought+(p_kind='jade')::integer,
    bought_available=bought_available+1
  where user_id=uid and channel=p_channel and play_date=d returning * into row_data;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,coalesce(rw.revision,jw.revision),'arena_attempt_purchase',p_request_id,
    jsonb_build_object('kind',p_kind,'cost',cost,'playDate',d));
  return to_jsonb(row_data)||jsonb_build_object(
    'wallet',case when rw.user_id is null then null else private.wallet_snapshot(rw) end,
    'jade',case when jw.user_id is null then null else private.jade_wallet_snapshot(jw) end,
    'alreadyPurchased',false
  );
end $$;

revoke all on function public.arena_buy_attempt(text,text,uuid) from public,anon;
grant execute on function public.arena_buy_attempt(text,text,uuid) to authenticated;
