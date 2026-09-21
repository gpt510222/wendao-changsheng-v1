alter table private.player_permanent_consumable_effects add column if not exists attribute_bonuses jsonb not null default '{"trueQi":0,"rootBone":0,"physique":0,"agility":0}'::jsonb check(jsonb_typeof(attribute_bonuses)='object');
alter table private.player_permanent_consumable_effects add column if not exists pill_usage jsonb not null default '{}'::jsonb check(jsonb_typeof(pill_usage)='object');
alter table private.player_permanent_consumable_effects add column if not exists brew_usage jsonb not null default '{}'::jsonb check(jsonb_typeof(brew_usage)='object');

create or replace function private.permanent_consumable_snapshot(e private.player_permanent_consumable_effects)
returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('dosageBonus',e.dosage_bonus,'mindEmbodiment',e.mind_embodiment,'learnedBooks',e.learned_books,'attributeBonuses',e.attribute_bonuses,'pillUsage',e.pill_usage,'brewUsage',e.brew_usage,'revision',e.revision)$$;

create or replace function public.player_attribute_consumable_use(p_channel text,p_item_key text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_permanent_consumable_effects;b private.player_mail_item_balances;quantity integer;kind text;type_key text;variant text;usage_key text;attribute_key text;gain integer;used integer;limit_value bigint;available integer;bonuses jsonb;usage jsonb;tier integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '服用資料不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的服用請求';end if;
 if p_item_key~'^pillCount_(yuanxi|minggu|xuanqu|youying)_[1-9]$' then kind:='pill';type_key:=split_part(p_item_key,'_',2);variant:=split_part(p_item_key,'_',3);tier:=variant::integer;gain:=(array[10,20,30,40,50,60,70,80,100])[tier];
 elsif p_item_key~'^brewCount_(yuanxi|minggu|xuanqu|youying)_(normal|rare)$' then kind:='brew';type_key:=split_part(p_item_key,'_',2);variant:=split_part(p_item_key,'_',3);gain:=case when variant='rare' then 100 else 50 end;
 else raise exception '此道具不是可服用的屬性道具';end if;
 attribute_key:=case type_key when 'yuanxi' then 'trueQi' when 'minggu' then 'rootBone' when 'xuanqu' then 'physique' else 'agility' end;usage_key:=type_key||'_'||variant;quantity:=greatest(1,least(9999,coalesce(p_quantity,1)));
 perform pg_advisory_xact_lock(hashtext(uid::text||'-attribute-consume-'||p_channel));insert into private.player_permanent_consumable_effects(user_id,channel) values(uid,p_channel) on conflict do nothing;select * into e from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel for update;select * into b from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=p_item_key for update;
 usage:=case when kind='pill' then e.pill_usage else e.brew_usage end;used:=coalesce((usage->>usage_key)::integer,0);limit_value:=50+e.dosage_bonus;available:=least(coalesce(b.amount,0)::integer,greatest(0,(limit_value-used)::integer));quantity:=least(quantity,available);if quantity<1 then raise exception '持有數量不足或已達服用上限';end if;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key=p_item_key returning * into b;usage:=jsonb_set(usage,array[usage_key],to_jsonb(used+quantity),true);bonuses:=jsonb_set(e.attribute_bonuses,array[attribute_key],to_jsonb(coalesce((e.attribute_bonuses->>attribute_key)::bigint,0)+gain::bigint*quantity),true);
 update private.player_permanent_consumable_effects set attribute_bonuses=bonuses,pill_usage=case when kind='pill' then usage else pill_usage end,brew_usage=case when kind='brew' then usage else brew_usage end,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into e;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,e.revision,'attribute_consumable_used',p_request_id,jsonb_build_object('itemKey',p_item_key,'quantity',quantity,'attribute',attribute_key,'gain',gain*quantity));
 return jsonb_build_object('effects',private.permanent_consumable_snapshot(e),'itemBalances',jsonb_build_object(p_item_key,b.amount),'quantity',quantity,'gain',gain*quantity,'attribute',attribute_key);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '服用資料不正確';end $$;

revoke all on function public.player_attribute_consumable_use(text,text,integer,uuid) from public,anon;
grant execute on function public.player_attribute_consumable_use(text,text,integer,uuid) to authenticated;
