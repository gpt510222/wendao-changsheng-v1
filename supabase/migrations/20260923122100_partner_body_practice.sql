alter function public.player_body_settle(text,bigint,bigint,uuid) rename to player_body_settle_partner_base;

create or replace function public.player_body_settle(p_channel text,p_expected_wallet_revision bigint,p_expected_body_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=(select auth.uid());before_state private.player_body_states;after_state private.player_body_states;
 ps private.player_partner_states;p private.player_progression_states;result jsonb;cycle_count integer;active_cycles integer:=0;
 cycle_duration interval;need numeric;ratio numeric;extra_bone numeric:=0;extra_blood numeric:=0;extra_organs numeric:=0;
begin
 select * into before_state from private.player_body_states where user_id=uid and channel=p_channel;
 select * into ps from private.player_partner_states where user_id=uid and channel=p_channel;
 result:=public.player_body_settle_partner_base(p_channel,p_expected_wallet_revision,p_expected_body_revision,p_request_id);
 cycle_count:=coalesce((result->>'cycles')::integer,0);
 if cycle_count<1 or ps.user_id is null or not ps.established or ps.active_route<>'body' or ps.active_until is null then return result;end if;
 cycle_duration:=case before_state.training_mode when'basic'then interval '5 minutes'when'bath'then interval '10 minutes'else interval '15 minutes'end;
 select count(*)into active_cycles from generate_series(0,cycle_count-1)g(i)where before_state.next_cycle_at+cycle_duration*g.i>=coalesce(ps.active_from,'infinity'::timestamptz)and before_state.next_cycle_at+cycle_duration*g.i<=ps.active_until;
 if active_cycles<1 then return result;end if;
 select * into after_state from private.player_body_states where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 need:=(array[3,3,4,4,4,5,5,6,7])[least(9,floor(p.body_level/10.0)::integer+1)];ratio:=.03*active_cycles/cycle_count;
 extra_bone:=greatest(0,(after_state.foundation_bone-before_state.foundation_bone)*ratio);extra_blood:=greatest(0,(after_state.foundation_blood-before_state.foundation_blood)*ratio);extra_organs:=greatest(0,(after_state.foundation_organs-before_state.foundation_organs)*ratio);
 update private.player_body_states set foundation_bone=least(need,foundation_bone+extra_bone),foundation_blood=least(need,foundation_blood+extra_blood),foundation_organs=least(need,foundation_organs+extra_organs),revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into after_state;
 return jsonb_set(result,'{body}',private.body_snapshot(after_state));
end$$;

revoke all on function public.player_body_settle_partner_base(text,bigint,bigint,uuid)from public,anon,authenticated;
revoke execute on function public.player_body_settle(text,bigint,bigint,uuid)from public,anon;
grant execute on function public.player_body_settle(text,bigint,bigint,uuid)to authenticated;
