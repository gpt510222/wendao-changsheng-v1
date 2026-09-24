-- Follow-up for the deployed recoverable-mail function: the claim ledger's
-- durable identifier column is mail_key.
create or replace function public.arena_claim_rewards(p_channel text)
returns table(week_start date, rank integer, stone_bundle_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception '需要重新登入';
  end if;
  if p_channel not in ('formal', 'test') then
    raise exception '問道臺版本不正確';
  end if;

  perform private.arena_rollover(p_channel);

  return query
  update public.arena_rewards r
  set claimed = true
  where r.user_id = uid
    and r.channel = p_channel
    and not exists (
      select 1
      from private.player_mail_claims c
      where c.user_id = uid
        and c.channel = p_channel
        and c.mail_key = 'arena-week-' || p_channel || '-' || r.week_start::text
    )
  returning r.week_start, r.rank, r.stone_bundle_count;
end
$$;

revoke execute on function public.arena_claim_rewards(text) from public, anon;
grant execute on function public.arena_claim_rewards(text) to authenticated;
