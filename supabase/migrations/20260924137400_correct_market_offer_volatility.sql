-- The offer parser uses regular-expression helpers whose catalog volatility is
-- STABLE. Match the wrapper contract to those helpers so PostgreSQL does not
-- treat the result as immutable across catalog/configuration changes.
alter function private.spirit_stone_market_offer(text) stable;
