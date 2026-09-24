-- Resource-market purchases are replayable by request UUID.  The original inner
-- routines remain the single writer; wrappers recover current authoritative state.
create or replace function public.player_secure_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());m text[];tier integer;star integer;required_floor integer:=1;o record;quantity integer;prior private.player_state_events;w private.player_resource_wallets;s private.player_sect_states;balance bigint:=0;period_key text;period_count integer:=0;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'^artbook-(secret|formula|sutra|escape)-t([1-9])-(metal|wood|water|fire|earth)-([12])$');if m is not null then tier:=m[2]::integer;required_floor:=case when tier=9 then 5 else((tier+1)/2)end;end if;
 m:=regexp_match(p_offer_id,'^sectInvitation([1-9][0-9]?)$');if m is not null then star:=case when m[1]::integer<=7 then 1 when m[1]::integer<=16 then 2 when m[1]::integer<=26 then 3 when m[1]::integer<=34 then 4 when m[1]::integer<=41 then 5 when m[1]::integer<=48 then 6 when m[1]::integer<=54 then 7 when m[1]::integer<=60 then 8 else 9 end;required_floor:=case when star=9 then 5 else((star+1)/2)end;end if;
 if p_offer_id~'^reputation(spiritStone|wood|meteorIron)1000$'then required_floor:=3;elsif p_offer_id~'^reputation(spiritStone|wood|meteorIron)10000$'then required_floor:=5;end if;
 if required_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以購買此樓層商品';end if;
 select * into o from private.secure_market_offer(p_offer_id);quantity:=case when o.quantity_enabled then greatest(1,least(999,coalesce(p_quantity,1)))else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-secure-market-'||p_channel||'-'||p_offer_id));
 select * into prior from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if prior.id is not null then
  if prior.event_type<>'secure_market_purchase'or prior.payload->>'offer'<>p_offer_id or coalesce((prior.payload->>'quantity')::integer,0)<>quantity then raise exception '請求識別碼已被使用';end if;
  period_key:=case when o.daily_limit is not null then'day:'||((now()at time zone'Asia/Taipei')::date)::text else'all'end;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;select * into s from private.player_sect_states where user_id=uid and channel=p_channel;
  select amount into balance from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=o.item_key;
  select pm.purchase_count into period_count from private.player_market_purchases pm where pm.user_id=uid and pm.channel=p_channel and pm.offer_id=p_offer_id and pm.period_key=period_key;
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'sect',private.sect_progress_snapshot(s),'itemBalances',jsonb_build_object(o.item_key,coalesce(balance,0)),'offerId',p_offer_id,'quantity',quantity,'periodKey',period_key,'periodCount',coalesce(period_count,0),'permanent',o.permanent_limit is not null,'alreadyPurchased',true);
 end if;
 result:=public.player_secure_market_purchase_without_floor_guard(p_channel,p_offer_id,quantity,p_request_id);
 return result||jsonb_build_object('alreadyPurchased',false);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '購買請求資料不正確';end$$;

create or replace function public.player_spirit_stone_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());m text[];required_floor integer:=1;o record;quantity integer;prior private.player_state_events;w private.player_resource_wallets;balance bigint:=0;period_key text;period_count integer:=0;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'Floor([1-5])$');if m is not null then required_floor:=m[1]::integer;elsif p_offer_id~'^marketCultivationCasket[1-5]$'then required_floor:=right(p_offer_id,1)::integer;elsif p_offer_id='brew-base-normal'then required_floor:=2;elsif p_offer_id='brew-base-rare'then required_floor:=4;elsif p_offer_id='market-xisui-famao-pill'then required_floor:=5;end if;
 if required_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以購買此樓層商品';end if;
 select * into o from private.spirit_stone_market_offer(p_offer_id);quantity:=case when o.quantity_enabled then greatest(1,least(999,coalesce(p_quantity,1)))else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-market-'||p_channel||'-'||p_offer_id));
 select * into prior from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id;
 if prior.id is not null then
  if prior.event_type<>'market_purchase'or prior.payload->>'offer'<>p_offer_id or coalesce((prior.payload->>'quantity')::integer,0)<>quantity then raise exception '請求識別碼已被使用';end if;
  period_key:=case when o.daily_limit is not null then'day:'||((now()at time zone'Asia/Taipei')::date)::text when o.weekly_limit is not null then'week:'||(date_trunc('week',now()at time zone'Asia/Taipei')::date)::text else'all'end;
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;select amount into balance from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=o.item_key;
  select pm.purchase_count into period_count from private.player_market_purchases pm where pm.user_id=uid and pm.channel=p_channel and pm.offer_id=p_offer_id and pm.period_key=period_key;
  return jsonb_build_object('wallet',private.wallet_snapshot(w),'itemBalances',jsonb_build_object(o.item_key,coalesce(balance,0)),'offerId',p_offer_id,'quantity',quantity,'periodKey',period_key,'periodCount',coalesce(period_count,0),'alreadyPurchased',true);
 end if;
 result:=public.player_spirit_stone_market_purchase_without_floor_guard(p_channel,p_offer_id,quantity,p_request_id);
 return result||jsonb_build_object('alreadyPurchased',false);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '購買請求資料不正確';end$$;

revoke all on function public.player_secure_market_purchase(text,text,integer,uuid),public.player_spirit_stone_market_purchase(text,text,integer,uuid)from public,anon;
grant execute on function public.player_secure_market_purchase(text,text,integer,uuid),public.player_spirit_stone_market_purchase(text,text,integer,uuid)to authenticated;
