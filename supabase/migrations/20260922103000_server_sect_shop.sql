create table if not exists private.player_sect_shop_daily(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 shop_day date not null,
 offer_id text not null,
 purchase_count integer not null default 0 check(purchase_count>=0),
 updated_at timestamptz not null default now(),
 primary key(user_id,channel,shop_day,offer_id)
);
alter table private.player_sect_shop_daily enable row level security;
revoke all on private.player_sect_shop_daily from public,anon,authenticated;

create or replace function private.sect_shop_offer(p_offer text)
returns table(item_key text,price integer,daily_limit integer,unlock_tier integer) language sql immutable set search_path='' as $$
select v.item_key,v.price,v.daily_limit,v.unlock_tier from (values
 ('brew-normal','brewBase_normal',120,1,1),('brew-rare','brewBase_rare',300,1,1),
 ('alchemy-craftHerbChiyuan','craftHerbChiyuan',15,10,1),('alchemy-craftHerbXueyu','craftHerbXueyu',15,10,1),('alchemy-craftHerbJinjia','craftHerbJinjia',15,10,1),('alchemy-craftHerbQingling','craftHerbQingling',15,10,1),('alchemy-craftCinnabar','craftCinnabar',10,10,1),
 ('equipment-main-xuansi','mainlineMaterial_xuansi',18,10,1),('equipment-main-xuanjuan','mainlineMaterial_xuanjuan',18,10,1),('equipment-main-xuanpi','mainlineMaterial_xuanpi',18,10,1),('equipment-main-lingpi','mainlineMaterial_lingpi',18,10,1),('equipment-main-fengpi','mainlineMaterial_fengpi',18,10,1),('equipment-main-lingyu','mainlineMaterial_lingyu',18,10,1),('equipment-main-lingjing','mainlineMaterial_lingjing',18,10,1),
 ('equipment-tier-1','forgeTierMaterial_1',15,10,1),('equipment-tier-2','forgeTierMaterial_2',22,10,2),('equipment-tier-3','forgeTierMaterial_3',30,10,3),('equipment-tier-4','forgeTierMaterial_4',42,10,4),('equipment-tier-5','forgeTierMaterial_5',56,10,5),('equipment-tier-6','forgeTierMaterial_6',72,10,6),('equipment-tier-7','forgeTierMaterial_7',90,10,7),('equipment-tier-8','forgeTierMaterial_8',110,10,8),('equipment-tier-9','forgeTierMaterial_9',135,10,9),
 ('equipment-spirit-core','equipmentSpiritCore',500,2,1)
) v(offer_id,item_key,price,daily_limit,unlock_tier) where v.offer_id=p_offer
$$;

create or replace function private.sect_shop_counts(p_uid uuid,p_channel text,p_day date) returns jsonb
language sql stable set search_path='' as $$select coalesce(jsonb_object_agg(offer_id,purchase_count),'{}'::jsonb) from private.player_sect_shop_daily where user_id=p_uid and channel=p_channel and shop_day=p_day$$;

create or replace function public.player_sect_shop_status(p_channel text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());today date:=(now() at time zone 'Asia/Taipei')::date;s private.player_sect_states;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 result:=private.settle_sect_progress(uid,p_channel);select * into s from private.player_sect_states where user_id=uid and channel=p_channel;
 if s.user_id is null then raise exception '伺服器門派狀態尚未建立';end if;
 return jsonb_build_object('day',today::text,'purchases',private.sect_shop_counts(uid,p_channel,today),'sect',private.sect_progress_snapshot(s),'wallet',result->'wallet');
end $$;

create or replace function public.player_sect_shop_purchase(p_channel text,p_offer_id text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());today date:=(now() at time zone 'Asia/Taipei')::date;s private.player_sect_states;p private.player_progression_states;o record;b private.player_mail_item_balances;bought integer:=0;highest integer;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '功勳堂請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的兌換請求';end if;
 select * into o from private.sect_shop_offer(p_offer_id);if o.item_key is null then raise exception '功勳堂品項不存在';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-shop-'||p_channel));
 result:=private.settle_sect_progress(uid,p_channel);select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if s.user_id is null or p.user_id is null or s.sect_name='' then raise exception '目前尚未加入門派';end if;
 highest:=least(9,greatest(p.spirit_level/10+1,p.sword_level/10+1,p.body_level/4+1));if highest<o.unlock_tier then raise exception '修行境界不足';end if;
 select purchase_count into bought from private.player_sect_shop_daily where user_id=uid and channel=p_channel and shop_day=today and offer_id=p_offer_id for update;bought:=coalesce(bought,0);
 if bought>=o.daily_limit then raise exception '此品項今日已達兌換上限';end if;if s.sect_contribution<o.price then raise exception '門派貢獻不足';end if;
 insert into private.player_sect_shop_daily(user_id,channel,shop_day,offer_id,purchase_count) values(uid,p_channel,today,p_offer_id,1) on conflict(user_id,channel,shop_day,offer_id) do update set purchase_count=private.player_sect_shop_daily.purchase_count+1,updated_at=now();
 update private.player_sect_states set sect_contribution=sect_contribution-o.price,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,o.item_key,1) on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+1,updated_at=now() returning * into b;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,s.revision,'sect_shop_purchase',p_request_id,jsonb_build_object('offerId',p_offer_id,'itemKey',o.item_key,'price',o.price));
 return jsonb_build_object('day',today::text,'purchases',private.sect_shop_counts(uid,p_channel,today),'sect',private.sect_progress_snapshot(s),'wallet',result->'wallet','itemBalances',jsonb_build_object(o.item_key,b.amount));
end $$;

revoke execute on function public.player_sect_shop_status(text),public.player_sect_shop_purchase(text,text,uuid) from public,anon;
grant execute on function public.player_sect_shop_status(text),public.player_sect_shop_purchase(text,text,uuid) to authenticated;
revoke all on function private.sect_shop_offer(text),private.sect_shop_counts(uuid,text,date) from public,anon,authenticated;
