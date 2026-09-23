alter table private.player_body_states
  add column if not exists stamina numeric not null default 100 check(stamina>=0 and stamina<=1000000);

create or replace function private.body_snapshot(b private.player_body_states)
returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
  'revision',b.revision,'nutrition',b.nutrition,'stamina',b.stamina,
  'foundations',jsonb_build_object('bone',b.foundation_bone,'blood',b.foundation_blood,'organs',b.foundation_organs),
  'trainingMode',b.training_mode,'nextCycleAt',case when b.next_cycle_at is null then 0 else floor(extract(epoch from b.next_cycle_at)*1000) end,
  'trainingLoad',b.training_load,'injury',case when b.injury_until>now() then b.injury else '' end,
  'injuryUntil',case when b.injury_until>now() then floor(extract(epoch from b.injury_until)*1000) else 0 end,
  'breakthroughValue',b.breakthrough_value,'trialFailures',b.trial_failures)
$$;

create or replace function public.player_body_consume_stamina_medicine(p_channel text,p_quantity integer,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());b private.player_body_states;item private.player_mail_item_balances;quantity integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in ('formal','test') or p_request_id is null then raise exception '靈藥請求不正確';end if;
 quantity:=least(10000,greatest(1,coalesce(p_quantity,0)));if quantity<>p_quantity then raise exception '靈藥數量不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的靈藥請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-body-stamina-'||p_channel));
 select * into b from private.player_body_states where user_id=uid and channel=p_channel for update;if b.user_id is null then raise exception '伺服器煉體狀態尚未建立';end if;if b.revision<>p_expected_body_revision then raise exception '煉體狀態已更新，請重試';end if;
 select * into item from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='spiritMedicineCount' for update;if item.user_id is null or item.amount<quantity then raise exception '伺服器靈藥數量不足';end if;if b.stamina+quantity*100>1000000 then raise exception '體力已達可保存上限';end if;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key='spiritMedicineCount' returning * into item;
 update private.player_body_states set stamina=stamina+quantity*100,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into b;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,b.revision,'body_stamina_medicine_consumed',p_request_id,jsonb_build_object('quantity',quantity,'stamina',b.stamina));
 return jsonb_build_object('body',private.body_snapshot(b),'itemBalances',jsonb_build_object('spiritMedicineCount',item.amount),'quantity',quantity,'gain',quantity*100);
end $$;

revoke all on function public.player_body_consume_stamina_medicine(text,integer,bigint,uuid) from public,anon;
grant execute on function public.player_body_consume_stamina_medicine(text,integer,bigint,uuid) to authenticated;
