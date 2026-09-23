create or replace function private.reputation_daily_stock(p_channel text,p_floor integer)
returns text[] language sql stable security definer set search_path=''as $$
 with invitations as(
  select 'sectInvitation'||n offer_id,case when n<=7 then 1 when n<=16 then 2 when n<=26 then 3 when n<=34 then 4 when n<=41 then 5 when n<=48 then 6 when n<=54 then 7 when n<=60 then 8 else 9 end star
  from generate_series(1,66)n
 ),selected as(
  select offer_id from invitations where star=any(case p_floor when 1 then array[1,2]when 2 then array[3,4]when 3 then array[5,6]when 4 then array[7,8]when 5 then array[9]else array[]::integer[]end)
  order by md5(p_channel||':'||((now()at time zone'Asia/Taipei')::date)::text||':'||p_floor||':'||offer_id)limit 6
 ),resources as(
  select unnest(case when p_floor between 1 and 2 then array['reputationspiritStone100','reputationwood100','reputationmeteorIron100']when p_floor between 3 and 4 then array['reputationspiritStone1000','reputationwood1000','reputationmeteorIron1000']when p_floor=5 then array['reputationspiritStone10000','reputationwood10000','reputationmeteorIron10000']else array[]::text[]end)offer_id
 )select coalesce(array_agg(offer_id),'{}'::text[])from(select offer_id from resources union all select offer_id from selected)stock
$$;

create or replace function public.player_reputation_stock(p_channel text,p_floor integer)
returns jsonb language plpgsql stable security definer set search_path=''as $$
begin if(select auth.uid())is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_floor not between 1 and 5 then raise exception '聲望堂請求不正確';end if;return jsonb_build_object('day',((now()at time zone'Asia/Taipei')::date)::text,'floor',p_floor,'offers',private.reputation_daily_stock(p_channel,p_floor));end$$;

alter function public.player_secure_market_purchase(text,text,integer,uuid)rename to player_secure_market_purchase_without_daily_stock_guard;
create or replace function public.player_secure_market_purchase(p_channel text,p_offer_id text,p_quantity integer,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare m text[];star integer;floor_no integer;
begin
 if(select auth.uid())is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 m:=regexp_match(p_offer_id,'^sectInvitation([1-9][0-9]?)$');
 if m is not null then star:=case when m[1]::integer<=7 then 1 when m[1]::integer<=16 then 2 when m[1]::integer<=26 then 3 when m[1]::integer<=34 then 4 when m[1]::integer<=41 then 5 when m[1]::integer<=48 then 6 when m[1]::integer<=54 then 7 when m[1]::integer<=60 then 8 else 9 end;floor_no:=case when star=9 then 5 else ((star+1)/2)end;if not(p_offer_id=any(private.reputation_daily_stock(p_channel,floor_no)))then raise exception '此門派信物今日未於聲望堂上架';end if;end if;
 return public.player_secure_market_purchase_without_daily_stock_guard(p_channel,p_offer_id,p_quantity,p_request_id);
end$$;

revoke all on function private.reputation_daily_stock(text,integer),public.player_secure_market_purchase_without_daily_stock_guard(text,text,integer,uuid)from public,anon,authenticated;
revoke execute on function public.player_reputation_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid)from public,anon;
grant execute on function public.player_reputation_stock(text,integer),public.player_secure_market_purchase(text,text,integer,uuid)to authenticated;
