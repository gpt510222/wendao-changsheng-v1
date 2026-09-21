create table if not exists private.player_permanent_consumable_effects(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 dosage_bonus bigint not null default 0 check(dosage_bonus>=0),
 mind_embodiment boolean not null default false,
 learned_books jsonb not null default '[]'::jsonb check(jsonb_typeof(learned_books)='array'),
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 primary key(user_id,channel)
);
alter table private.player_permanent_consumable_effects enable row level security;
revoke all on private.player_permanent_consumable_effects from public,anon,authenticated;

create or replace function private.permanent_consumable_snapshot(e private.player_permanent_consumable_effects)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('dosageBonus',e.dosage_bonus,'mindEmbodiment',e.mind_embodiment,'learnedBooks',e.learned_books,'revision',e.revision)
$$;

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

create or replace function public.player_permanent_consumable_use(p_channel text,p_item_key text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());e private.player_permanent_consumable_effects;b private.player_mail_item_balances;quantity integer;book_id text;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_request_id is null then raise exception '請求資料不正確';end if;
 if p_item_key not in('xisuiFamaoPillCount','mindEmbodimentManualCount','treasureTaiyangLianshenWujuanCount','treasureChixiaoDingmingTianjianCount') then raise exception '此道具尚未開放伺服器使用';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的道具使用請求';end if;
 quantity:=case when p_item_key='xisuiFamaoPillCount' then greatest(1,least(999,coalesce(p_quantity,1))) else 1 end;
 book_id:=case p_item_key when 'treasureTaiyangLianshenWujuanCount' then 'treasure-taiyang-lianshen-wujuan' when 'treasureChixiaoDingmingTianjianCount' then 'treasure-chixiao-dingming-tianjian' end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-permanent-item-'||p_channel));
 insert into private.player_permanent_consumable_effects(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into e from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel for update;
 if p_item_key='mindEmbodimentManualCount' and e.mind_embodiment then raise exception '已習得意念入體';end if;
 if book_id is not null and e.learned_books ? book_id then raise exception '此功法已習得';end if;
 select * into b from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=p_item_key for update;
 if b.user_id is null or b.amount<quantity then raise exception '伺服器道具數量不足';end if;
 update private.player_mail_item_balances set amount=amount-quantity,updated_at=now() where user_id=uid and channel=p_channel and item_key=p_item_key returning * into b;
 update private.player_permanent_consumable_effects set
  dosage_bonus=dosage_bonus+case when p_item_key='xisuiFamaoPillCount' then quantity else 0 end,
  mind_embodiment=case when p_item_key='mindEmbodimentManualCount' then true else mind_embodiment end,
  learned_books=case when book_id is not null then learned_books||jsonb_build_array(book_id) else learned_books end,
  revision=revision+1,updated_at=now()
 where user_id=uid and channel=p_channel returning * into e;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,e.revision,'permanent_consumable_used',p_request_id,jsonb_build_object('itemKey',p_item_key,'quantity',quantity,'bookId',book_id));
 return jsonb_build_object('effects',private.permanent_consumable_snapshot(e),'itemBalances',jsonb_build_object(p_item_key,b.amount));
end $$;

revoke all on function private.permanent_consumable_snapshot(private.player_permanent_consumable_effects) from public,anon,authenticated;
revoke all on function public.player_permanent_consumables_get(text),public.player_permanent_consumable_use(text,text,integer,uuid) from public,anon;
grant execute on function public.player_permanent_consumables_get(text),public.player_permanent_consumable_use(text,text,integer,uuid) to authenticated;
