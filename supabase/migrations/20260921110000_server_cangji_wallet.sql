alter table public.cangji_games add column if not exists escrow_backed boolean not null default false;

-- Older games only changed browser memory and have no matching server escrow.
update public.cangji_games set status='cancelled',cancelled_at=coalesce(cancelled_at,now()) where status='open' and not escrow_backed;
update public.cangji_games set creator_claimed=true where status='resolved' and not escrow_backed;

create or replace function private.cangji_wallet_json(w private.player_resource_wallets)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object('revision',w.revision,'resources',jsonb_build_object(
  'free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,
  'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text))
$$;

create or replace function public.cangji_create_game(p_channel text,p_name text,p_choice text,p_wager integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); game_id uuid; new_game_no bigint; new_game_code text; local_day date:=(now() at time zone 'Asia/Taipei')::date; daily_no integer; w private.player_resource_wallets;
begin
 if uid is null then raise exception '請重新登入後再設局'; end if;
 if p_channel not in ('formal','test') or p_choice not in ('rock','scissors','paper') then raise exception '設局內容不正確'; end if;
 if p_wager not between 5000 and 30000 or p_wager%500<>0 then raise exception '押注須為5,000至30,000，並以500為單位'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-cangji-'||p_channel));
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if w.user_id is null then raise exception '資源帳本未建立';end if;
 if w.spirit_stone<p_wager then raise exception '靈石不足，無法設局';end if;
 if (select count(*) from public.cangji_games where creator_id=uid and channel=p_channel and escrow_backed and (status='open' or (status='resolved' and creator_claimed=false)))>=5 then raise exception '尚未結算的設局已達上限 5/5，請先領取結果或撤回待應之局';end if;
 insert into private.cangji_daily_sequences(day,last_no) values(local_day,1) on conflict(day) do update set last_no=private.cangji_daily_sequences.last_no+1 returning last_no into daily_no;
 new_game_code:=to_char(local_day,'YYYYMMDD')||lpad(daily_no::text,3,'0');
 update private.player_resource_wallets set spirit_stone=spirit_stone-p_wager,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 insert into public.cangji_games(channel,creator_id,creator_name,creator_choice,wager,game_code,escrow_backed) values(p_channel,uid,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_choice,p_wager,new_game_code,true) returning id,game_no into game_id,new_game_no;
 return jsonb_build_object('id',game_id,'game_no',new_game_no,'game_code',new_game_code,'wager',p_wager,'wallet',private.cangji_wallet_json(w));
end $$;

create or replace function public.cangji_accept_game(p_game uuid,p_name text,p_choice text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); g public.cangji_games; w private.player_resource_wallets; creator_won boolean; tied boolean; house_fee integer; winner uuid; cp integer; rp integer;
begin
 if uid is null then raise exception '請重新登入後再應局';end if;if p_choice not in ('rock','scissors','paper') then raise exception '請選擇出拳';end if;
 select * into g from public.cangji_games where id=p_game for update;
 if g.id is null or g.status<>'open' or not g.escrow_backed then raise exception '此局已無法應局';end if;if g.creator_id=uid then raise exception '不可應自己設下的局';end if;
 select * into w from private.player_resource_wallets where user_id=uid and channel=g.channel for update;
 if w.user_id is null or w.spirit_stone<g.wager then raise exception '靈石不足，無法應局';end if;
 tied:=g.creator_choice=p_choice;creator_won:=private.cangji_creator_wins(g.creator_choice,p_choice);house_fee:=case when tied then 0 else floor(g.wager*.02)::integer end;winner:=case when tied then null when creator_won then g.creator_id else uid end;
 cp:=case when tied then g.wager when creator_won then g.wager*2-house_fee else 0 end;rp:=case when tied then g.wager when creator_won then 0 else g.wager*2-house_fee end;
 update private.player_resource_wallets set spirit_stone=spirit_stone-g.wager+rp,revision=revision+1,updated_at=now() where user_id=uid and channel=g.channel returning * into w;
 update public.cangji_games set status='resolved',responder_id=uid,responder_name=left(coalesce(nullif(trim(p_name),''),'無名修士'),20),responder_choice=p_choice,winner_id=winner,fee=house_fee,creator_payout=cp,responder_payout=rp,resolved_at=now() where id=g.id;
 return jsonb_build_object('id',g.id,'game_no',g.game_no,'game_code',g.game_code,'creator_name',g.creator_name,'creator_choice',g.creator_choice,'responder_choice',p_choice,'outcome',case when tied then 'draw' when creator_won then 'loss' else 'win' end,'wager',g.wager,'payout',rp,'fee',house_fee,'resolved_at',now(),'wallet',private.cangji_wallet_json(w));
end $$;

create or replace function public.cangji_claim_game(p_game uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());g public.cangji_games;w private.player_resource_wallets;
begin select * into g from public.cangji_games where id=p_game and creator_id=uid for update;if g.id is null or g.status<>'resolved' or not g.escrow_backed then raise exception '此局尚未結算';end if;if g.creator_claimed then raise exception '此局已領取';end if;select * into w from private.player_resource_wallets where user_id=uid and channel=g.channel for update;update private.player_resource_wallets set spirit_stone=spirit_stone+g.creator_payout,revision=revision+1,updated_at=now() where user_id=uid and channel=g.channel returning * into w;update public.cangji_games set creator_claimed=true where id=g.id;return jsonb_build_object('id',g.id,'payout',g.creator_payout,'fee',g.fee,'outcome',case when g.winner_id is null then 'draw' when g.winner_id=uid then 'win' else 'loss' end,'wallet',private.cangji_wallet_json(w));end $$;

create or replace function public.cangji_cancel_game(p_game uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());g public.cangji_games;w private.player_resource_wallets;
begin select * into g from public.cangji_games where id=p_game and creator_id=uid for update;if g.id is null or g.status<>'open' or not g.escrow_backed then raise exception '此局已無法撤回';end if;select * into w from private.player_resource_wallets where user_id=uid and channel=g.channel for update;update private.player_resource_wallets set spirit_stone=spirit_stone+g.wager,revision=revision+1,updated_at=now() where user_id=uid and channel=g.channel returning * into w;update public.cangji_games set status='cancelled',cancelled_at=now() where id=g.id;return jsonb_build_object('id',g.id,'refund',g.wager,'wallet',private.cangji_wallet_json(w));end $$;

create or replace function public.cangji_claim_all_games(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());total_payout bigint:=0;claimed_count integer:=0;w private.player_resource_wallets;
begin if uid is null then raise exception '請重新登入後再領取';end if;if p_channel not in ('formal','test') then raise exception '藏機局版本不正確';end if;select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;with claimed as(update public.cangji_games set creator_claimed=true where creator_id=uid and channel=p_channel and status='resolved' and escrow_backed and not creator_claimed returning creator_payout)select coalesce(sum(creator_payout),0),count(*) into total_payout,claimed_count from claimed;update private.player_resource_wallets set spirit_stone=spirit_stone+total_payout,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;return jsonb_build_object('payout',total_payout,'count',claimed_count,'wallet',private.cangji_wallet_json(w));end $$;

create or replace function public.cangji_cancel_all_games(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());total_refund bigint:=0;cancelled_count integer:=0;w private.player_resource_wallets;
begin if uid is null then raise exception '請重新登入後再撤局';end if;if p_channel not in ('formal','test') then raise exception '藏機局版本不正確';end if;perform pg_advisory_xact_lock(hashtext(uid::text||'-cangji-'||p_channel));select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;with cancelled as(update public.cangji_games set status='cancelled',cancelled_at=now() where creator_id=uid and channel=p_channel and status='open' and escrow_backed returning wager)select coalesce(sum(wager),0),count(*) into total_refund,cancelled_count from cancelled;update private.player_resource_wallets set spirit_stone=spirit_stone+total_refund,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;return jsonb_build_object('refund',total_refund,'count',cancelled_count,'wallet',private.cangji_wallet_json(w));end $$;

revoke all on function private.cangji_wallet_json(private.player_resource_wallets) from public,anon,authenticated;
