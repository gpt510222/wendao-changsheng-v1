-- Remove an invalid LIKE ... ESCAPE expression whose pattern ended in the escape
-- character and therefore made every spirit-stone market lookup fail.
create or replace function private.spirit_stone_market_offer(p_offer text)
returns table(item_key text,price integer,daily_limit integer,weekly_limit integer,quantity_enabled boolean)
language plpgsql immutable set search_path='' as $$
declare resource text;amount integer;
begin
 if p_offer ~ '^market(wood|food|meteorIron)(100|1000|10000)Floor[1-5]$' then
  resource:=(regexp_match(p_offer,'^market(wood|food|meteorIron)'))[1];amount:=((regexp_match(p_offer,'(10000|1000|100)Floor'))[1])::integer;
  price:=case amount when 100 then case resource when 'wood' then 180 when 'food' then 120 else 260 end when 1000 then case resource when 'wood' then 1500 when 'food' then 1000 else 2200 end else case resource when 'wood' then 12000 when 'food' then 8000 else 18000 end end;
  item_key:='market'||resource||amount||'Count';daily_limit:=5;weekly_limit:=null;quantity_enabled:=true;return next;return;
 end if;
 if p_offer ~ '^marketCultivationCasket[1-5]$' then amount:=right(p_offer,1)::integer;item_key:=p_offer||'Count';price:=(array[300,900,2500,6500,10000])[amount];daily_limit:=1;weekly_limit:=null;quantity_enabled:=false;return next;return;end if;
 if p_offer='brew-base-normal' then item_key:='brewBase_normal';price:=2500;daily_limit:=3;weekly_limit:=null;quantity_enabled:=true;return next;return;end if;
 if p_offer='brew-base-rare' then item_key:='brewBase_rare';price:=9000;daily_limit:=3;weekly_limit:=null;quantity_enabled:=true;return next;return;end if;
 if p_offer='market-sword-embryo-reversion' then item_key:='swordEmbryoReversionElixirCount';price:=30000;daily_limit:=null;weekly_limit:=1;quantity_enabled:=false;return next;return;end if;
 if p_offer='market-xisui-famao-pill' then item_key:='xisuiFamaoPillCount';price:=30000;daily_limit:=null;weekly_limit:=1;quantity_enabled:=false;return next;return;end if;
 raise exception '商品不屬於伺服器坊市清單';
end $$;

revoke all on function private.spirit_stone_market_offer(text) from public,anon,authenticated;
