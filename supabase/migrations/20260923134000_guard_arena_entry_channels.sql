alter function public.arena_opponents(text)rename to arena_opponents_channel_unchecked;
alter function public.arena_begin_challenge(text,uuid)rename to arena_begin_challenge_channel_unchecked;
alter function public.arena_status(text)rename to arena_status_channel_unchecked;

create or replace function public.arena_opponents(p_channel text)
returns table(user_id uuid,player_name text,score int,snapshot jsonb)
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid())is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '問道臺版本不正確';end if;
  return query select * from public.arena_opponents_channel_unchecked(p_channel);
end $$;

create or replace function public.arena_begin_challenge(p_channel text,p_defender uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid())is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')or p_defender is null then raise exception '問道臺開戰資料不正確';end if;
  return public.arena_begin_challenge_channel_unchecked(p_channel,p_defender);
end $$;

create or replace function public.arena_status(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid())is null then raise exception '需要重新登入';end if;
  if p_channel not in('formal','test')then raise exception '問道臺版本不正確';end if;
  return public.arena_status_channel_unchecked(p_channel);
end $$;

revoke all on function public.arena_opponents_channel_unchecked(text),public.arena_begin_challenge_channel_unchecked(text,uuid),public.arena_status_channel_unchecked(text)from public,anon,authenticated;
revoke execute on function public.arena_opponents(text),public.arena_begin_challenge(text,uuid),public.arena_status(text)from public,anon;
grant execute on function public.arena_opponents(text),public.arena_begin_challenge(text,uuid),public.arena_status(text)to authenticated;
