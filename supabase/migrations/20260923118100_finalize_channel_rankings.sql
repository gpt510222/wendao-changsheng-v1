drop view if exists public.player_rankings;
create or replace function public.player_ascension_rankings(p_channel text)
returns table(rank bigint,player_name text,route text,ascended_at timestamptz,title_id text,spirit_level integer,sword_level integer,body_level integer)
language sql stable security definer set search_path='' as $$
 select s.ascension_rank,coalesce(r.player_name,a.player_name,'無名修士'),s.route,s.ascended_at,s.title_id,p.spirit_level,p.sword_level,p.body_level
 from private.player_ascension_states s
 join private.player_progression_states p on p.user_id=s.user_id and p.channel=s.channel
 left join public.player_rankings_v2 r on r.user_id=s.user_id and r.channel=s.channel
 left join public.arena_profiles a on a.user_id=s.user_id and a.channel=s.channel
 where s.channel=p_channel and s.ascended order by s.ascension_rank limit 50
$$;
revoke execute on function public.player_ascension_rankings(text)from public,anon;
grant execute on function public.player_ascension_rankings(text)to authenticated;

