create or replace function private.secure_market_offer(p_offer text)
returns table(item_key text,currency_key text,price integer,daily_limit integer,permanent_limit integer,quantity_enabled boolean)
language plpgsql immutable set search_path='' as $$
declare m text[];tier integer;invitation_no integer;star integer;amount integer;resource text;
begin
 m:=regexp_match(p_offer,'^artbook-(secret|formula|sutra|escape)-t([1-9])-(metal|wood|water|fire|earth)-([12])$');
 if m is not null then tier:=m[2]::integer;item_key:='artBook_'||m[1]||'_'||tier||'_'||m[3]||'_'||m[4];currency_key:='spiritStone';price:=(array[100,350,1200,5400,16000,48000,145000,435000,1300000])[tier];daily_limit:=null;permanent_limit:=1;quantity_enabled:=false;return next;return;end if;
 m:=regexp_match(p_offer,'^reputation(spiritStone|wood|meteorIron)(100|1000|10000)$');
 if m is not null then resource:=m[1];amount:=m[2]::integer;item_key:=p_offer||'Count';currency_key:='prestige';price:=case amount when 100 then case resource when 'spiritStone' then 10 when 'wood' then 18 else 26 end when 1000 then case resource when 'spiritStone' then 100 when 'wood' then 150 else 220 end else case resource when 'spiritStone' then 1000 when 'wood' then 1200 else 1800 end end;daily_limit:=3;permanent_limit:=null;quantity_enabled:=true;return next;return;end if;
 m:=regexp_match(p_offer,'^sectInvitation([1-9][0-9]?)$');
 if m is not null then invitation_no:=m[1]::integer;if invitation_no>66 then raise exception '門派信物不存在';end if;star:=case when invitation_no<=7 then 1 when invitation_no<=16 then 2 when invitation_no<=26 then 3 when invitation_no<=34 then 4 when invitation_no<=41 then 5 when invitation_no<=48 then 6 when invitation_no<=54 then 7 when invitation_no<=60 then 8 else 9 end;item_key:='sectInvitationCount'||invitation_no;currency_key:='prestige';price:=(array[150,250,450,700,1000,1400,1900,2500,3300])[star];daily_limit:=1;permanent_limit:=null;quantity_enabled:=false;return next;return;end if;
 raise exception '商品不屬於後端藏經閣或聲望堂清單';
end $$;

create or replace function public.player_secure_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());o record;w private.player_resource_wallets;s private.player_sect_states;quantity integer;today_key text:=((now() at time zone 'Asia/Taipei')::date)::text;v_period_key text;used integer:=0;balance bigint;total numeric;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_request_id is null then raise exception '請求資料不正確';end if;
 select * into o from private.secure_market_offer(p_offer_id);quantity:=case when o.quantity_enabled then greatest(1,least(999,coalesce(p_quantity,1))) else 1 end;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-secure-market-'||p_channel||'-'||p_offer_id));
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的購買請求';end if;
 v_period_key:=case when o.daily_limit is not null then 'day:'||today_key else 'all' end;
 select purchase_count into used from private.player_market_purchases where user_id=uid and channel=p_channel and offer_id=p_offer_id and period_key=v_period_key for update;used:=coalesce(used,0);
 if o.daily_limit is not null and used+quantity>o.daily_limit then raise exception '今日限購數量已達上限';end if;
 if o.permanent_limit is not null and used+quantity>o.permanent_limit then raise exception '此商品已達永久限購上限';end if;
 total:=o.price::numeric*quantity;
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if w.user_id is null or s.user_id is null then raise exception '伺服器角色帳本尚未建立';end if;
 if o.currency_key='spiritStone' then if w.spirit_stone<total then raise exception '靈石不足';end if;update private.player_resource_wallets set spirit_stone=spirit_stone-total,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
 elsif o.currency_key='prestige' then if s.prestige<total then raise exception '聲望不足';end if;update private.player_sect_states set prestige=prestige-total,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;else raise exception '付款類型不受支援';end if;
 insert into private.player_mail_item_balances(user_id,channel,item_key,amount) values(uid,p_channel,o.item_key,quantity) on conflict(user_id,channel,item_key) do update set amount=private.player_mail_item_balances.amount+excluded.amount,updated_at=now() returning amount into balance;
 insert into private.player_market_purchases(user_id,channel,offer_id,period_key,purchase_count) values(uid,p_channel,p_offer_id,v_period_key,used+quantity) on conflict(user_id,channel,offer_id,period_key) do update set purchase_count=excluded.purchase_count,updated_at=now();
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,case when o.currency_key='spiritStone' then w.revision else s.revision end,'secure_market_purchase',p_request_id,jsonb_build_object('offer',p_offer_id,'quantity',quantity,'cost',total,'currency',o.currency_key));
 return jsonb_build_object('wallet',private.wallet_snapshot(w),'sect',private.sect_progress_snapshot(s),'itemBalances',jsonb_build_object(o.item_key,balance),'offerId',p_offer_id,'quantity',quantity,'periodKey',v_period_key,'periodCount',used+quantity,'permanent',o.permanent_limit is not null);
end $$;

revoke all on function private.secure_market_offer(text) from public,anon,authenticated;
revoke all on function public.player_secure_market_purchase(text,text,integer,uuid) from public,anon;
grant execute on function public.player_secure_market_purchase(text,text,integer,uuid) to authenticated;
