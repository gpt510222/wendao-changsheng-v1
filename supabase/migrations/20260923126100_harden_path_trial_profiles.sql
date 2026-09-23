alter function public.player_sword_trial_begin(text,uuid)rename to player_sword_trial_begin_unverified;
create or replace function public.player_sword_trial_begin(p_channel text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());profile public.arena_profiles;
begin
 if uid is null or p_channel not in('formal','test')or p_request_id is null then raise exception '試劍請求不正確';end if;select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;if profile.user_id is null then raise exception '戰鬥快照尚未建立';end if;perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);return public.player_sword_trial_begin_unverified(p_channel,p_request_id);
end$$;

alter function public.player_body_trial_begin(text,bigint,uuid)rename to player_body_trial_begin_unverified;
create or replace function public.player_body_trial_begin(p_channel text,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());profile public.arena_profiles;
begin
 if uid is null or p_channel not in('formal','test')or p_request_id is null then raise exception '煉體試煉請求不正確';end if;select * into profile from public.arena_profiles where user_id=uid and channel=p_channel;if profile.user_id is null then raise exception '戰鬥快照尚未建立';end if;perform private.arena_validate_snapshot(profile.snapshot);perform private.arena_validate_server_progression(uid,p_channel,profile.snapshot);return public.player_body_trial_begin_unverified(p_channel,p_expected_body_revision,p_request_id);
end$$;

revoke all on function public.player_sword_trial_begin_unverified(text,uuid),public.player_body_trial_begin_unverified(text,bigint,uuid)from public,anon,authenticated;
revoke execute on function public.player_sword_trial_begin(text,uuid),public.player_body_trial_begin(text,bigint,uuid)from public,anon;
grant execute on function public.player_sword_trial_begin(text,uuid),public.player_body_trial_begin(text,bigint,uuid)to authenticated;
