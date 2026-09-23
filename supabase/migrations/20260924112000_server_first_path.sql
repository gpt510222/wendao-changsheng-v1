alter table private.player_progression_states add column if not exists first_path text not null default '' check(first_path in('','spirit','sword','body'));

update private.player_progression_states p set first_path=coalesce(
 (select e.payload->>'path' from private.player_state_events e where e.user_id=p.user_id and e.channel=p.channel and e.event_type='novice_awakened'and e.payload->>'path'in('spirit','sword','body')order by e.created_at asc limit 1),
 (select case when s.legacy_state->>'firstPath'in('spirit','sword','body')then s.legacy_state->>'firstPath'end from private.player_states s where s.user_id=p.user_id and s.channel=p.channel),
 case when p.spirit_path_opened then'spirit'when p.sword_path_opened then'sword'when p.body_path_opened then'body'end,
 '') where p.cultivation_awakened and p.first_path='';

create or replace function private.progression_snapshot(p private.player_progression_states)returns jsonb language sql immutable set search_path=''as $$select jsonb_build_object('revision',p.revision,'cultivationAwakened',p.cultivation_awakened,'firstPath',p.first_path,'spiritPathOpened',p.spirit_path_opened,'swordPathOpened',p.sword_path_opened,'bodyPathOpened',p.body_path_opened,'spiritLevel',p.spirit_level,'swordLevel',p.sword_level,'bodyLevel',p.body_level,'swordTrialWins',p.sword_trial_wins)$$;

alter function public.player_novice_awaken(text,text,uuid)rename to player_novice_awaken_without_first_path;
revoke all on function public.player_novice_awaken_without_first_path(text,text,uuid)from public,anon,authenticated;
create or replace function public.player_novice_awaken(p_channel text,p_path text,p_request_id uuid)returns jsonb language plpgsql security definer set search_path=''as $$declare uid uuid:=(select auth.uid());result jsonb;p private.player_progression_states;begin if uid is null then raise exception '需要重新登入';end if;result:=public.player_novice_awaken_without_first_path(p_channel,p_path,p_request_id);update private.player_progression_states set first_path=p_path,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel and first_path=''returning * into p;if p.user_id is null then select * into p from private.player_progression_states where user_id=uid and channel=p_channel;end if;if p.first_path<>p_path then raise exception '第一條修行道路已經選定';end if;return jsonb_set(result,'{progression}',private.progression_snapshot(p),true);end$$;
revoke all on function public.player_novice_awaken(text,text,uuid)from public,anon;
grant execute on function public.player_novice_awaken(text,text,uuid)to authenticated;
revoke all on function private.progression_snapshot(private.player_progression_states)from public,anon,authenticated;
