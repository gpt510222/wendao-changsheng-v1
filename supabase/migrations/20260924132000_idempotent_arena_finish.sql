-- A completed match is its own idempotency key. If the HTTP response is lost,
-- a retry returns the persisted verdict instead of attempting a second result.
create or replace function public.arena_finish_match(p_match uuid, p_won boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  m public.arena_matches;
  a public.arena_profiles;
  d public.arena_profiles;
  expected numeric;
  delta integer;
  server_won boolean;
  attacker_power numeric;
  defender_power numeric;
  win_chance numeric;
begin
  if uid is null or p_match is null then
    raise exception 'invalid match';
  end if;

  select * into m
  from public.arena_matches
  where id = p_match and challenger_id = uid
  for update;

  if m.id is null then
    raise exception 'invalid match';
  end if;

  if m.status = 'finished' then
    select * into a
    from public.arena_profiles
    where user_id = uid and channel = m.channel;
    return jsonb_build_object(
      'won', m.winner_id = uid,
      'delta', m.challenger_delta,
      'score', coalesce(a.score, 1000),
      'alreadyFinished', true
    );
  end if;

  if m.status <> 'pending' then
    raise exception 'invalid match';
  end if;
  if m.created_at < now() - interval '30 minutes' then
    raise exception 'match expired';
  end if;
  if m.created_at > now() - interval '3 seconds' then
    raise exception '戰鬥尚未完成';
  end if;

  perform private.arena_validate_snapshot(m.challenger_snapshot);
  perform private.arena_validate_snapshot(m.defender_snapshot);

  select * into a
  from public.arena_profiles
  where user_id = m.challenger_id and channel = m.channel
  for update;
  select * into d
  from public.arena_profiles
  where user_id = m.defender_id and channel = m.channel
  for update;

  if a.user_id is null or d.user_id is null then
    raise exception 'arena profile unavailable';
  end if;

  attacker_power := (m.challenger_snapshot->>'combat_power')::numeric;
  defender_power := (m.defender_snapshot->>'combat_power')::numeric;
  win_chance := greatest(.1, least(.9, attacker_power / greatest(1, attacker_power + defender_power)));
  -- p_won is deliberately ignored: the browser animation is not authoritative.
  server_won := random() < win_chance;
  expected := 1 / (1 + power(10, (d.score - a.score) / 400.0));
  delta := round(32 * ((case when server_won then 1 else 0 end) - expected));
  if server_won then
    delta := greatest(5, least(30, delta));
  else
    delta := -greatest(5, least(30, abs(delta)));
  end if;

  update public.arena_profiles
  set score = greatest(0, score + delta),
      wins = wins + (server_won)::integer,
      losses = losses + ((not server_won))::integer,
      reached_at = case when delta > 0 then now() else reached_at end,
      updated_at = now()
  where user_id = m.challenger_id and channel = m.channel
  returning * into a;

  update public.arena_profiles
  set score = greatest(0, score - delta),
      wins = wins + ((not server_won))::integer,
      losses = losses + (server_won)::integer,
      reached_at = case when delta < 0 then now() else reached_at end,
      updated_at = now()
  where user_id = m.defender_id and channel = m.channel;

  update public.arena_matches
  set status = 'finished',
      winner_id = case when server_won then challenger_id else defender_id end,
      challenger_delta = delta,
      defender_delta = -delta,
      finished_at = now()
  where id = p_match;

  return jsonb_build_object(
    'won', server_won,
    'delta', delta,
    'score', a.score,
    'alreadyFinished', false
  );
end
$$;

revoke execute on function public.arena_finish_match(uuid, boolean) from public, anon;
grant execute on function public.arena_finish_match(uuid, boolean) to authenticated;
