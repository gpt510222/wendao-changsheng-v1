create table if not exists private.player_market_purchases(
 user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in('formal','test')),
 offer_id text not null,period_key text not null,purchase_count integer not null default 0 check(purchase_count>=0),updated_at timestamptz not null default now(),
 primary key(user_id,channel,offer_id,period_key)
);
alter table private.player_market_purchases enable row level security;
revoke all on private.player_market_purchases from public,anon,authenticated;

create or replace function private.spirit_stone_market_offer(p_offer text)
returns table(item_key text,price integer,daily_limit integer,weekly_limit integer,quantity_enabled boolean)
language plpgsql immutable set search_path='' as $$
declare parts text[];resource text;amount integer;
begin
 if p_offer like 'market%Floor_' escape '_' then null;end if;
 if p_offer ~ '^market(wood|food|meteorIron)(100|1000|10000)Floor[1-5]$' then
  resource:=(regexp_match(p_offer,'^market(wood|food|meteorIron)'))[1];amount:=((regexp_match(p_offer,'(10000|1000|100)Floor'))[1])::integer;
  price:=case amount when 100 then case resource when 'wood' then 180 when 'food' then 120 else 260 end when 1000 then case resource when 'wood' then 1500 when 'food' then 1000 else 2200 end else case resource when 'wood' then 12000 when 'food' then 8000 else 18000 end end;
  item_key:='market'||resource||amount||'Count';daily_limit:=5;weekly_limit:=null;quantity_enabled:=true;return next;return;
 end if;
 if p_offer ~ '^marketCultivationCasket[1-5]$' then
  amount:=right(p_offer,1)::integer;item_key:=p_offer||'Count';price:=(array[300,900,2500,6500,10000])[amount];daily_limit:=1;weekly_limit:=null;quantity_enabled:=false;return next;return;
 end if;
 if p_offer='brew-base-normal' then item_key:='brewBase_normal';price:=2500;daily_limit:=3;weekly_limit:=null;quantity_enabled:=true;return next;return;end if;
 if p_offer='brew-base-rare' then item_key:='brewBase_rare';price:=9000;daily_limit:=3;weekly_limit:=null;quantity_enabled:=true;return next;return;end if;
 if p_offer='market-sword-embryo-reversion' then item_key:='swordEmbryoReversionElixirCount';price:=30000;daily_limit:=null;weekly_limit:=1;quantity_enabled:=false;return next;return;end if;
 if p_offer='market-xisui-famao-pill' then item_key:='xisuiFamaoPillCount';price:=30000;daily_limit:=null;weekly_limit:=1;quantity_enabled:=false;return next;return;end if;
 raise exception '商品不屬於伺服器坊市清單';
end $$;

create or replace function public.player_spirit_stone_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());o record;w private.player_resource_wallets;quantity integer;today_key text:=((now() at time zone 'Asia/Taipei')::date)::text;week_key text:=(date_trunc('week',now() at time zone 'Asia/Taipei')::date)::text;v_period_key text;used integer:=0;balance bigint;total numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 select * into o from private.spirit_stone_market_offer(p_offer_id);quantity:=case when o.quantity_enabled then greatest(1,least(999,coalesce(p_quantity,1))) else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-market-'||p_channel||'-'||p_offer_id));
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的購買請求';end if;
 v_period_key:=case when o.daily_limit is not null then 'day:'||today_key when o.weekly_limit is not null then 'week:'||week_key else 'all' end;
 select purchase_count into used from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id=p_offer_id and period_key=v_period_key for update;used:=coalesce(used,0);
 if o.daily_limit is not null and used+quantity>o.daily_limit then raise exception '今日限購數量已達上限';end if;
 if o.weekly_limit is not null and used+quantity>o.weekly_limit then raise exception '本週限購數量已達上限';end if;
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;total:=o.price::numeric*quantity;
 if w.user_id is null or w.spirit_stone<total then raise exception '靈石不足';end if;
 update private.player_resource_wallets set spirit_stone=spirit_stone-total,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,o.item_key,quantity) on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+excluded.amount,updated_at=now() returning amount into balance;
 insert into private.player_market_purchases(user_id,channel,offer_id,period_key,purchase_count) values(uid,p_channel,p_offer_id,v_period_key,used+quantity) on conflict(user_id,channel,offer_id,period_key) do update set purchase_count=excluded.purchase_count,updated_at=now();
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'market_purchase',p_request_id,jsonb_build_object('offer',p_offer_id,'quantity',quantity,'cost',total));
 return jsonb_build_object('wallet',private.wallet_snapshot(w),'itemBalances',jsonb_build_object(o.item_key,balance),'offerId',p_offer_id,'quantity',quantity,'periodKey',v_period_key,'periodCount',used+quantity);
end $$;

revoke all on function private.spirit_stone_market_offer(text) from public,anon,authenticated;
revoke all on function public.player_spirit_stone_market_purchase(text,text,integer,uuid) from public,anon;
grant execute on function public.player_spirit_stone_market_purchase(text,text,integer,uuid) to authenticated;
