create or replace function private.scripture_daily_stock(p_channel text,p_floor integer)
returns text[] language sql stable security definer set search_path=''as $$
 with tiers as(select case p_floor when 1 then array[1,2]when 2 then array[3,4]when 3 then array[5,6]when 4 then array[7,8]when 5 then array[9]else array[]::integer[]end values),
 offers as(select 'artbook-'||kind||'-t'||tier||'-'||element||'-'||variant offer_id from unnest(array['secret','formula','sutra','escape'])kind cross join unnest(array['metal','wood','water','fire','earth'])element cross join unnest((select values from tiers))tier cross join generate_series(1,2)variant)
 select (coalesce(array_agg(offer_id order by md5(p_channel||':'||((now()at time zone'Asia/Taipei')::date)::text||':'||p_floor||':'||offer_id)),'{}'::text[]))[1:9]from offers
$$;

create or replace function public.player_scripture_stock(p_channel text,p_floor integer)
returns jsonb language plpgsql stable security definer set search_path=''as $$
begin if(select auth.uid())is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_floor not between 1 and 5 then raise exception '藏經閣請求不正確';end if;return jsonb_build_object('day',((now()at time zone'Asia/Taipei')::date)::text,'floor',p_floor,'offers',private.scripture_daily_stock(p_channel,p_floor));end$$;

alter function public.player_secure_market_purchase(text,text,integer,uuid)rename to player_secure_market_purchase_without_stock_guard;
create or replace function public.player_secure_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare m text[];tier integer;floor_no integer;
begin
 if(select auth.uid())is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'^artbook-(secret|formula|sutra|escape)-t([1-9])-(metal|wood|water|fire|earth)-([12])$');
 if m is not null then tier:=m[2]::integer;floor_no:=case when tier=9 then 5 else ((tier+1)/2)end;if not(p_offer_id=any(private.scripture_daily_stock(p_channel,floor_no)))then raise exception '此功法今日未於藏經閣上架';end if;end if;
 return public.player_secure_market_purchase_without_stock_guard(p_channel,p_offer_id,p_quantity,p_request_id);
end$$;

revoke all on function private.scripture_daily_stock(text,integer),public.player_secure_market_purchase_without_stock_guard(text,text,integer,uuid)from public,anon,authenticated;
revoke execute on function public.player_scripture_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid)from public,anon;
grant execute on function public.player_scripture_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid)to authenticated;
