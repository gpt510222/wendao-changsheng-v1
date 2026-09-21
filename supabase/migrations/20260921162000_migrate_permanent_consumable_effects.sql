create or replace function public.player_permanent_consumables_get(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_permanent_consumable_effects;dosage bigint:=0;mind boolean:=false;books jsonb:='[]'::jsonb;purchased bigint;remaining bigint;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 if not exists(select 1 from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel) then
  select coalesce(sum(purchase_count),0) into purchased from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id='xisuiFamaoPill';
  select coalesce(amount,0) into remaining from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='xisuiFamaoPillCount';dosage:=greatest(0,purchased-coalesce(remaining,0));
  select coalesce(sum(purchase_count),0)>coalesce((select amount from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='mindEmbodimentManualCount'),0) into mind from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id='mindEmbodimentManual';
  if coalesce((select sum(purchase_count) from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id='treasure-taiyang-lianshen-wujuan'),0)>coalesce((select amount from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='treasureTaiyangLianshenWujuanCount'),0) then books:=books||jsonb_build_array('treasure-taiyang-lianshen-wujuan');end if;
  if coalesce((select sum(purchase_count) from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id='treasure-chixiao-dingming-tianjian'),0)>coalesce((select amount from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key='treasureChixiaoDingmingTianjianCount'),0) then books:=books||jsonb_build_array('treasure-chixiao-dingming-tianjian');end if;
  insert into private.player_permanent_consumable_effects(user_id,channel,dosage_bonus,mind_embodiment,learned_books) values(uid,p_channel,dosage,mind,books) on conflict do nothing;
 end if;
 select * into e from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel;
 return private.permanent_consumable_snapshot(e);
end $$;

update private.player_permanent_consumable_effects e set
 dosage_bonus=greatest(e.dosage_bonus,greatest(0,coalesce((select sum(purchase_count) from private.player_market_purchases p where p.user_id=e.user_id and p.channel=e.channel and p.offer_id='xisuiFamaoPill'),0)-coalesce((select amount from private.player_mail_item_balances b where b.user_id=e.user_id and b.channel=e.channel and b.item_key='xisuiFamaoPillCount'),0))),
 mind_embodiment=e.mind_embodiment or coalesce((select sum(purchase_count) from private.player_market_purchases p where p.user_id=e.user_id and p.channel=e.channel and p.offer_id='mindEmbodimentManual'),0)>coalesce((select amount from private.player_mail_item_balances b where b.user_id=e.user_id and b.channel=e.channel and b.item_key='mindEmbodimentManualCount'),0),
 learned_books=e.learned_books
  ||case when not e.learned_books?'treasure-taiyang-lianshen-wujuan' and coalesce((select sum(purchase_count) from private.player_market_purchases p where p.user_id=e.user_id and p.channel=e.channel and p.offer_id='treasure-taiyang-lianshen-wujuan'),0)>coalesce((select amount from private.player_mail_item_balances b where b.user_id=e.user_id and b.channel=e.channel and b.item_key='treasureTaiyangLianshenWujuanCount'),0) then jsonb_build_array('treasure-taiyang-lianshen-wujuan') else '[]'::jsonb end
  ||case when not e.learned_books?'treasure-chixiao-dingming-tianjian' and coalesce((select sum(purchase_count) from private.player_market_purchases p where p.user_id=e.user_id and p.channel=e.channel and p.offer_id='treasure-chixiao-dingming-tianjian'),0)>coalesce((select amount from private.player_mail_item_balances b where b.user_id=e.user_id and b.channel=e.channel and b.item_key='treasureChixiaoDingmingTianjianCount'),0) then jsonb_build_array('treasure-chixiao-dingming-tianjian') else '[]'::jsonb end,
 revision=e.revision+1,updated_at=now();
