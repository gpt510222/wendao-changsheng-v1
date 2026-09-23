-- The browser uses RPCs exclusively.  Keep tables and sequences inaccessible
-- so a missed RLS policy or future grant cannot become a direct write path.
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
