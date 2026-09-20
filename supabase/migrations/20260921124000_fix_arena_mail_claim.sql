create or replace function private.mail_reward_catalog(p_channel text,p_mail_id text)
returns table(mail_key text,wallet_rewards jsonb,sect_rewards jsonb,item_rewards jsonb)
language plpgsql stable set search_path='' as $$
declare arena_amount integer;arena_week date;
begin
 if p_mail_id like 'welcome-%' then return query select 'welcome-v1','{}'::jsonb,'{"prestige":200}'::jsonb,'{}'::jsonb;return;end if;
 if p_mail_id in ('update-compensation-20260913-v1','update-compensation-20260913-v2') then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"reputationspiritStone10000Count":5,"pillCount_yuanxi_1":20,"pillCount_minggu_1":20,"pillCount_xuanqu_1":20,"pillCount_youying_1":20}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-temporary-items-v1' then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"testCultivationPillCount":1,"testSpiritStoneTenMillionCount":1}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-resource-supply-v1' then return query select p_mail_id,'{"wood":10000000,"meteorIron":10000000,"food":10000000}'::jsonb,'{"prestige":10000000}'::jsonb,'{}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-resource-supply-v2' then return query select p_mail_id,'{"food":10000000,"aura":10000000}'::jsonb,'{}'::jsonb,'{}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-spirit-medicine-v1' then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"spiritMedicineCount":500}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-sword-path-pills-v1' then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,'{"righteousQiPillCount":500,"evilQiPillCount":500}'::jsonb;return;end if;
 if p_channel='test' and p_mail_id='test-sword-essence-v1' then return query select p_mail_id,'{"swordEssence":1000000000}'::jsonb,'{}'::jsonb,'{}'::jsonb;return;end if;
 if p_mail_id like 'arena-week-'||p_channel||'-%' then
  begin arena_week:=right(p_mail_id,10)::date;exception when others then raise exception '問道臺信件資料不正確';end;
  select stone_bundle_count into arena_amount from public.arena_rewards where user_id=(select auth.uid()) and channel=p_channel and week_start=arena_week and claimed;
  if arena_amount is not null then return query select p_mail_id,'{}'::jsonb,'{}'::jsonb,jsonb_build_object('reputationspiritStone10000Count',arena_amount);return;end if;
 end if;
 raise exception '此信件無法由伺服器驗證';
end $$;
