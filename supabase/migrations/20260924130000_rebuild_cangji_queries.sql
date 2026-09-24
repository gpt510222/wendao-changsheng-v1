-- Keep the read side of Cangji reproducible and expose only server-escrowed games.
drop function if exists public.cangji_open_games(text);
create function public.cangji_open_games(p_channel text)
returns table(
  id uuid,
  game_no bigint,
  game_code text,
  creator_name text,
  wager integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception '請重新登入後再查看藏機局';
  end if;
  if p_channel not in ('formal', 'test') then
    raise exception '藏機局版本不正確';
  end if;

  return query
  select g.id, g.game_no, g.game_code, g.creator_name, g.wager, g.created_at
  from public.cangji_games g
  where g.channel = p_channel
    and g.status = 'open'
    and g.escrow_backed
    and g.creator_id <> (select auth.uid())
  order by g.created_at desc
  limit 100;
end
$$;

drop function if exists public.cangji_creator_games(text);
create function public.cangji_creator_games(p_channel text)
returns table(
  id uuid,
  game_no bigint,
  game_code text,
  status text,
  opponent_name text,
  creator_choice text,
  responder_choice text,
  wager integer,
  outcome text,
  payout integer,
  fee integer,
  claimed boolean,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception '請重新登入後再查看藏機局';
  end if;
  if p_channel not in ('formal', 'test') then
    raise exception '藏機局版本不正確';
  end if;

  return query
  select
    g.id,
    g.game_no,
    g.game_code,
    g.status,
    g.responder_name,
    g.creator_choice,
    case when g.status = 'resolved' then g.responder_choice else null end,
    g.wager,
    case
      when g.status <> 'resolved' then null
      when g.winner_id is null then 'draw'
      when g.winner_id = g.creator_id then 'win'
      else 'loss'
    end,
    g.creator_payout,
    g.fee,
    g.creator_claimed,
    g.created_at,
    g.resolved_at
  from public.cangji_games g
  where g.creator_id = (select auth.uid())
    and g.channel = p_channel
    and g.escrow_backed
    and g.status <> 'cancelled'
  order by g.created_at desc
  limit 100;
end
$$;

revoke execute on function public.cangji_open_games(text) from public, anon;
revoke execute on function public.cangji_creator_games(text) from public, anon;
grant execute on function public.cangji_open_games(text) to authenticated;
grant execute on function public.cangji_creator_games(text) to authenticated;
