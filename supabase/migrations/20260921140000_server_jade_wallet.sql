create table if not exists private.player_jade_wallets(
 user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in('formal','test')),
 balance bigint not null default 0 check(balance>=0),legacy_imported boolean not null default false,revision bigint not null default 1,updated_at timestamptz not null default now(),primary key(user_id,channel)
);
alter table private.player_jade_wallets enable row level security;revoke all on private.player_jade_wallets from public,anon,authenticated;
create table if not exists private.gem_ledger(
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in('formal','test')),
 amount bigint not null,balance_after bigint not null check(balance_after>=0),event_type text not null,source_ref text not null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),unique(user_id,channel,event_type,source_ref)
);
alter table private.gem_ledger enable row level security;revoke all on private.gem_ledger from public,anon,authenticated;

create or replace function private.jade_wallet_snapshot(w private.player_jade_wallets)
returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('balance',w.balance,'revision',w.revision)$$;

create or replace function public.player_jade_bootstrap(p_channel text,p_legacy_balance bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());w private.player_jade_wallets;grant_total bigint:=0;opening bigint:=0;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-jade-'||p_channel));insert into private.player_jade_wallets(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into w from private.player_jade_wallets where user_id=uid and channel=p_channel for update;
 if not w.legacy_imported then
  if p_channel='formal' then select coalesce(sum(amount),0) into grant_total from public.jade_grants where user_id=uid;opening:=least(grant_total,greatest(0,coalesce(p_legacy_balance,0)));
  else opening:=least(99999,greatest(99999,coalesce(p_legacy_balance,0)));end if;
  update private.player_jade_wallets set balance=balance+opening,legacy_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata) values(uid,p_channel,opening,w.balance,'legacy_import','opening',jsonb_build_object('grant_cap',grant_total)) on conflict do nothing;
 end if;
 update public.jade_grants set status='claimed',claimed_at=coalesce(claimed_at,now()) where user_id=uid and status='pending';
 return private.jade_wallet_snapshot(w);
end $$;

create or replace function public.admin_issue_jade(p_public_uid text,p_amount bigint,p_order_ref text,p_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare target_user uuid;grant_id uuid;w private.player_jade_wallets;
begin
 if not private.is_jade_admin() then raise exception 'not authorized';end if;if p_amount<1 or p_amount>10000000 then raise exception 'invalid amount';end if;
 select user_id into target_user from public.player_accounts where public_uid=upper(trim(p_public_uid)) and release_channel='v1';if target_user is null then raise exception 'player UID not found';end if;
 perform pg_advisory_xact_lock(hashtext(target_user::text||'-jade-formal'));
 insert into public.jade_grants(user_id,public_uid,amount,order_ref,note,created_by,status,claimed_at) values(target_user,upper(trim(p_public_uid)),p_amount,trim(p_order_ref),coalesce(p_note,''),(select auth.uid()),'claimed',now()) returning id into grant_id;
 insert into private.player_jade_wallets(user_id,channel,balance,legacy_imported) values(target_user,'formal',p_amount,false) on conflict(user_id,channel) do update set balance=private.player_jade_wallets.balance+excluded.balance,revision=private.player_jade_wallets.revision+1,updated_at=now() returning * into w;
 insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata) values(target_user,'formal',p_amount,w.balance,'admin_grant',grant_id::text,jsonb_build_object('order_ref',trim(p_order_ref),'note',coalesce(p_note,''),'admin',(select auth.uid())));
 return grant_id;
end $$;

create or replace function private.jade_shop_offer(p_offer text)
returns table(item_key text,price integer,daily_limit integer,weekly_limit integer,permanent_limit integer,quantity_enabled boolean,limit_key text)
language plpgsql immutable set search_path='' as $$begin
 if p_offer='xisuiFamaoPill' then return query select 'xisuiFamaoPillCount',50,null::integer,1,null::integer,false,p_offer;return;end if;
 if p_offer='treasure-sword-embryo-reversion' then return query select 'swordEmbryoReversionElixirCount',50,null::integer,1,null::integer,false,'swordEmbryoReversionElixir';return;end if;
 if p_offer='renameProtagonistJade' then return query select 'renameProtagonistJadeCount',50,null::integer,null::integer,null::integer,false,p_offer;return;end if;
 if p_offer='genderRebirthMirror' then return query select 'genderRebirthMirrorCount',150,null::integer,null::integer,null::integer,false,p_offer;return;end if;
 if p_offer='renamePartnerCovenant' then return query select 'renamePartnerCovenantCount',50,null::integer,null::integer,null::integer,false,p_offer;return;end if;
 if p_offer='divineRoamingManual' then return query select 'divineRoamingManualCount',35,null::integer,null::integer,1,false,p_offer;return;end if;
 if p_offer='mindEmbodimentManual' then return query select 'mindEmbodimentManualCount',15,null::integer,null::integer,1,false,p_offer;return;end if;
 if p_offer='treasure-brew-base-rare' then return query select 'brewBase_rare',18,5,null::integer,null::integer,true,p_offer;return;end if;
 if p_offer='treasure-taiyang-lianshen-wujuan' then return query select 'treasureTaiyangLianshenWujuanCount',999,null::integer,null::integer,1,false,p_offer;return;end if;
 if p_offer='treasure-chixiao-dingming-tianjian' then return query select 'treasureChixiaoDingmingTianjianCount',999,null::integer,null::integer,1,false,p_offer;return;end if;
 raise exception '百寶樓商品不存在';end $$;

create or replace function public.player_jade_shop_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());o record;w private.player_jade_wallets;quantity integer;today_key text:=((now() at time zone 'Asia/Taipei')::date)::text;week_key text:=(date_trunc('week',now() at time zone 'Asia/Taipei')::date)::text;v_period_key text;used integer:=0;item_balance bigint;total bigint;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '請求資料不正確';end if;select * into o from private.jade_shop_offer(p_offer_id);quantity:=case when o.quantity_enabled then greatest(1,least(999,coalesce(p_quantity,1))) else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-jade-shop-'||p_channel||'-'||o.limit_key));if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的購買請求';end if;
 v_period_key:=case when o.daily_limit is not null then 'day:'||today_key when o.weekly_limit is not null then 'week:'||week_key else 'all' end;select purchase_count into used from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id=o.limit_key and period_key=v_period_key for update;used:=coalesce(used,0);
 if o.daily_limit is not null and used+quantity>o.daily_limit then raise exception '今日限購數量已達上限';end if;if o.weekly_limit is not null and used+quantity>o.weekly_limit then raise exception '本週限購數量已達上限';end if;if o.permanent_limit is not null and used+quantity>o.permanent_limit then raise exception '此商品已達永久限購上限';end if;
 select * into w from private.player_jade_wallets where user_id=uid and channel=p_channel for update;total:=o.price::bigint*quantity;if w.user_id is null then raise exception '靈玉帳本尚未建立';end if;if w.balance<total then raise exception '靈玉不足';end if;
 update private.player_jade_wallets set balance=private.player_jade_wallets.balance-total,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,o.item_key,quantity) on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+excluded.amount,updated_at=now() returning amount into item_balance;
 insert into private.player_market_purchases(user_id,channel,offer_id,period_key,purchase_count) values(uid,p_channel,o.limit_key,v_period_key,used+quantity) on conflict(user_id,channel,offer_id,period_key) do update set purchase_count=excluded.purchase_count,updated_at=now();
 insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata) values(uid,p_channel,-total,w.balance,'shop_purchase',p_request_id::text,jsonb_build_object('offer',p_offer_id,'quantity',quantity));
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'jade_shop_purchase',p_request_id,jsonb_build_object('offer',p_offer_id,'quantity',quantity,'cost',total));
 return jsonb_build_object('jade',private.jade_wallet_snapshot(w),'itemBalances',jsonb_build_object(o.item_key,item_balance),'offerId',p_offer_id,'quantity',quantity,'periodCount',used+quantity,'periodKey',v_period_key,'limitKey',o.limit_key);
end $$;

revoke all on function private.jade_wallet_snapshot(private.player_jade_wallets),private.jade_shop_offer(text) from public,anon,authenticated;
revoke all on function public.player_jade_bootstrap(text,bigint),public.player_jade_shop_purchase(text,text,integer,uuid) from public,anon;
grant execute on function public.player_jade_bootstrap(text,bigint),public.player_jade_shop_purchase(text,text,integer,uuid) to authenticated;
