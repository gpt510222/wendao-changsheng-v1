create or replace function public.arena_rankings(p_channel text)
returns table(rank bigint,player_name text,score int,wins int,losses int)
language plpgsql stable security definer set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '問道臺版本不正確';end if;
  return query select * from(
    select row_number()over(order by p.score desc,p.wins desc,p.reached_at asc,p.user_id)as rank,
      p.player_name,p.score,p.wins,p.losses
    from private.arena_canonical(p_channel)p
  )r where r.rank<=50;
end $$;

create or replace function public.arena_history(p_channel text)
returns table(id uuid,challenger_name text,defender_name text,winner_id uuid,challenger_delta int,defender_delta int,created_at timestamptz,was_challenger boolean)
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '問道臺版本不正確';end if;
  return query select m.id,m.challenger_name,m.defender_name,m.winner_id,m.challenger_delta,m.defender_delta,m.created_at,m.challenger_id=uid
  from public.arena_matches m where m.channel=p_channel and m.status='finished'and(uid=m.challenger_id or uid=m.defender_id)
  order by m.finished_at desc limit 10;
end $$;

create or replace function public.arena_claim_rewards(p_channel text)
returns table(week_start date,rank int,stone_bundle_count int)
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '問道臺版本不正確';end if;
  perform private.arena_rollover(p_channel);
  return query update public.arena_rewards r set claimed=true
    where r.user_id=uid and r.channel=p_channel and not r.claimed
    returning r.week_start,r.rank,r.stone_bundle_count;
end $$;

create or replace function public.player_combat_components_get(p_channel text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());
begin
  if uid is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '戰鬥資料版本不正確';end if;
  return private.server_component_core(uid,p_channel);
end $$;

revoke execute on function public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text),public.player_combat_components_get(text)from public,anon;
grant execute on function public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text),public.player_combat_components_get(text)to authenticated;
