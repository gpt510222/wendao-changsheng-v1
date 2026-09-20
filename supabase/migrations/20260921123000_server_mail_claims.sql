create table if not exists private.player_mail_claims(
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('formal','test')),
  mail_key text not null,
  claimed_at timestamptz not null default now(),
  rewards jsonb not null default '{}'::jsonb,
  primary key(user_id,channel,mail_key)
);
alter table private.player_mail_claims enable row level security;
revoke all on private.player_mail_claims from public,anon,authenticated;

create table if not exists private.player_mail_item_balances(
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check(channel in ('formal','test')),
  item_key text not null,
  amount bigint not null default 0 check(amount>=0),
  updated_at timestamptz not null default now(),
  primary key(user_id,channel,item_key)
);
alter table private.player_mail_item_balances enable row level security;
revoke all on private.player_mail_item_balances from public,anon,authenticated;

create or replace function private.mail_reward_catalog(p_channel text,p_mail_id text)
returns table(mail_key text,wallet_rewards jsonb,sect_rewards jsonb,item_rewards jsonb)
language plpgsql stable set search_path='' as $$
declare arena_amount integer;arena_week date;
begin
 if p_mail_id like 'welcome-%' then
  return query select 'welcome-v1','{}'::jsonb,'{"prestige":200}'::jsonb,'{}'::jsonb;return;
 end if;
 if p_mail_id in ('update-compensation-20260913-v1','update-compensation-20260913-v2') then
  return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,
   '{"reputationspiritStone10000Count":5,"pillCount_yuanxi_1":20,"pillCount_minggu_1":20,"pillCount_xuanqu_1":20,"pillCount_youying_1":20}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-temporary-items-v1' then
  return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"testCultivationPillCount":1,"testSpiritStoneTenMillionCount":1}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-resource-supply-v1' then
  return query select p_mail_id,'{"wood":10000000,"meteorIron":10000000,"food":10000000}'::jsonb,'{"prestige":10000000}'::jsonb,'{}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-resource-supply-v2' then
  return query select p_mail_id,'{"food":10000000,"aura":10000000}'::jsonb,'{}'::jsonb,'{}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-spirit-medicine-v1' then
  return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"spiritMedicineCount":500}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-sword-path-pills-v1' then
  return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"righteousQiPillCount":500,"evilQiPillCount":500}'::jsonb;return;
 end if;
 if p_channel='test' and p_mail_id='test-sword-essence-v1' then
  return query select p_mail_id,'{"swordEssence":1000000000}'::jsonb,'{}'::jsonb,'{}'::jsonb;return;
 end if;
 if p_mail_id like 'arena-week-'||p_channel||'-%' then
  begin arena_week:=right(p_mail_id,10)::date;exception when others then raise exception '問道臺信件資料不正確';end;
  select stone_bundle_count into arena_amount from public.arena_rewards where user_id=(select auth.uid()) and channel=p_channel and week_start=arena_week and claimed;
  if arena_amount is not null then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,jsonb_build_object('reputationspiritStone10000Count',arena_amount);return;end if;
 end if;
 raise exception '此信件無法由伺服器驗證';
end $$;

create or replace function public.player_mail_claim(p_channel text,p_mail_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());catalog record;existing private.player_mail_claims;w private.player_resource_wallets;s private.player_sect_states;k text;v numeric;items jsonb:='{}'::jsonb;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in ('formal','test') or p_mail_id is null or length(p_mail_id)>120 then raise exception '信件資料不正確';end if;
 select * into catalog from private.mail_reward_catalog(p_channel,p_mail_id);
 perform pg_advisory_xact_lock(hashtext(uid::text||'-mail-'||p_channel||'-'||catalog.mail_key));
 select * into existing from private.player_mail_claims where user_id=uid and channel=p_channel and mail_key=catalog.mail_key;
 if existing.user_id is not null then
  select coalesce(jsonb_object_agg(item_key,amount),'{}'::jsonb) into items from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key in(select key from jsonb_each(catalog.item_rewards));
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel;
  select * into s from private.player_sect_states where user_id=uid and channel=p_channel;
  return jsonb_build_object('alreadyClaimed',true,'mailKey',catalog.mail_key,'wallet',private.wallet_snapshot(w),'sect',case when s.user_id is null then null else private.sect_progress_snapshot(s) end,'itemBalances',items);
 end if;
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
 if w.user_id is null then raise exception '伺服器資源帳本尚未建立';end if;
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if s.user_id is null then raise exception '伺服器角色狀態尚未建立';end if;
 update private.player_resource_wallets set
  cultivation=cultivation+coalesce((catalog.wallet_rewards->>'free')::numeric,0),
  sword_essence=sword_essence+coalesce((catalog.wallet_rewards->>'swordEssence')::numeric,0),
  aura=aura+coalesce((catalog.wallet_rewards->>'aura')::numeric,0),
  spirit_stone=spirit_stone+coalesce((catalog.wallet_rewards->>'spiritStone')::numeric,0),
  food=food+coalesce((catalog.wallet_rewards->>'food')::numeric,0),wood=wood+coalesce((catalog.wallet_rewards->>'wood')::numeric,0),
  meteor_iron=meteor_iron+coalesce((catalog.wallet_rewards->>'meteorIron')::numeric,0),revision=revision+1,updated_at=now()
 where user_id=uid and channel=p_channel returning * into w;
 update private.player_sect_states set prestige=prestige+coalesce((catalog.sect_rewards->>'prestige')::bigint,0),revision=revision+1,updated_at=now()
 where user_id=uid and channel=p_channel returning * into s;
 for k,v in select key,value::text::numeric from jsonb_each(catalog.item_rewards) loop
  insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,k,v)
  on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+excluded.amount,updated_at=now();
 end loop;
 select coalesce(jsonb_object_agg(item_key,amount),'{}'::jsonb) into items from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key in(select key from jsonb_each(catalog.item_rewards));
 result:=jsonb_build_object('wallet',catalog.wallet_rewards,'sect',catalog.sect_rewards,'items',catalog.item_rewards);
 insert into private.player_mail_claims(user_id,channel,mail_key,rewards) values(uid,p_channel,catalog.mail_key,result);
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,w.revision,'mail_claimed',p_request_id,jsonb_build_object('mail_key',catalog.mail_key));
 return jsonb_build_object('alreadyClaimed',false,'mailKey',catalog.mail_key,'wallet',private.wallet_snapshot(w),'sect',private.sect_progress_snapshot(s),'itemBalances',items);
end $$;

create or replace function public.player_mail_claim_status(p_channel text,p_mail_ids text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());claimed jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in ('formal','test') then raise exception '版本不正確';end if;
 select coalesce(jsonb_agg(c.mail_key),'[]'::jsonb) into claimed from private.player_mail_claims c where c.user_id=uid and c.channel=p_channel;
 return jsonb_build_object('claimed',claimed);
end $$;

revoke all on function private.mail_reward_catalog(text,text) from public,anon,authenticated;
revoke all on function public.player_mail_claim(text,text,uuid),public.player_mail_claim_status(text,text[]) from public,anon;
grant execute on function public.player_mail_claim(text,text,uuid),public.player_mail_claim_status(text,text[]) to authenticated;
