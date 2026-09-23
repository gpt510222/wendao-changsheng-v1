create or replace function private.market_unlocked_floor(p_uid uuid,p_channel text)
returns integer language plpgsql stable security definer set search_path=''as $$
declare p private.player_progression_states;level integer;
begin select * into p from private.player_progression_states where user_id=p_uid and channel=p_channel;if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;level:=greatest(p.spirit_level,p.sword_level,p.body_level);return case when level>=80 then 5 when level>=60 then 4 when level>=40 then 3 when level>=20 then 2 else 1 end;end$$;

create or replace function public.player_scripture_stock(p_channel text,p_floor integer)
returns jsonb language plpgsql stable security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());
begin if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_floor not between 1 and 5 then raise exception '藏經閣請求不正確';end if;if p_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以進入此樓層';end if;return jsonb_build_object('day',((now()at time zone'Asia/Taipei')::date)::text,'floor',p_floor,'offers',private.scripture_daily_stock(p_channel,p_floor));end$$;

create or replace function public.player_reputation_stock(p_channel text,p_floor integer)
returns jsonb language plpgsql stable security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());
begin if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_floor not between 1 and 5 then raise exception '聲望堂請求不正確';end if;if p_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以進入此樓層';end if;return jsonb_build_object('day',((now()at time zone'Asia/Taipei')::date)::text,'floor',p_floor,'offers',private.reputation_daily_stock(p_channel,p_floor));end$$;

alter function public.player_secure_market_purchase(text,text,integer,uuid)rename to player_secure_market_purchase_without_floor_guard;
create or replace function public.player_secure_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());m text[];tier integer;star integer;required_floor integer:=1;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'^artbook-(secret|formula|sutra|escape)-t([1-9])-(metal|wood|water|fire|earth)-([12])$');if m is not null then tier:=m[2]::integer;required_floor:=case when tier=9 then 5 else((tier+1)/2)end;end if;
 m:=regexp_match(p_offer_id,'^sectInvitation([1-9][0-9]?)$');if m is not null then star:=case when m[1]::integer<=7 then 1 when m[1]::integer<=16 then 2 when m[1]::integer<=26 then 3 when m[1]::integer<=34 then 4 when m[1]::integer<=41 then 5 when m[1]::integer<=48 then 6 when m[1]::integer<=54 then 7 when m[1]::integer<=60 then 8 else 9 end;required_floor:=case when star=9 then 5 else((star+1)/2)end;end if;
 if p_offer_id~'^reputation(spiritStone|wood|meteorIron)1000$'then required_floor:=3;elsif p_offer_id~'^reputation(spiritStone|wood|meteorIron)10000$'then required_floor:=5;end if;
 if required_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以購買此樓層商品';end if;
 return public.player_secure_market_purchase_without_floor_guard(p_channel,p_offer_id,p_quantity,p_request_id);
end$$;

alter function public.player_spirit_stone_market_purchase(text,text,integer,uuid)rename to player_spirit_stone_market_purchase_without_floor_guard;
create or replace function public.player_spirit_stone_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());m text[];required_floor integer:=1;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'Floor([1-5])$');if m is not null then required_floor:=m[1]::integer;elsif p_offer_id~'^marketCultivationCasket[1-5]$'then required_floor:=right(p_offer_id,1)::integer;elsif p_offer_id='brew-base-normal'then required_floor:=2;elsif p_offer_id='brew-base-rare'then required_floor:=4;elsif p_offer_id='market-xisui-famao-pill'then required_floor:=5;end if;
 if required_floor>private.market_unlocked_floor(uid,p_channel)then raise exception '修行境界尚不足以購買此樓層商品';end if;
 return public.player_spirit_stone_market_purchase_without_floor_guard(p_channel,p_offer_id,p_quantity,p_request_id);
end$$;

revoke all on function private.market_unlocked_floor(uuid,text),public.player_secure_market_purchase_without_floor_guard(text,text,integer,uuid),public.player_spirit_stone_market_purchase_without_floor_guard(text,text,integer,uuid)from public,anon,authenticated;
revoke execute on function public.player_scripture_stock(text,integer),public.player_reputation_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid),public.player_spirit_stone_market_purchase(text,text,integer,uuid)from public,anon;
grant execute on function public.player_scripture_stock(text,integer),public.player_reputation_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid),public.player_spirit_stone_market_purchase(text,text,integer,uuid)to authenticated;
