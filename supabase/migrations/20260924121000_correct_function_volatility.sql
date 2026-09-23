-- These routines call PostgreSQL operations classified as STABLE.  Marking them
-- IMMUTABLE can allow the planner to reuse a result beyond the guarantees their
-- implementations actually provide.
alter function private.partner_chapter_score(integer,jsonb) stable;
alter function private.arena_validate_snapshot(jsonb) stable;
alter function private.spirit_stone_market_offer(text) stable;
alter function private.secure_market_offer(text) stable;
