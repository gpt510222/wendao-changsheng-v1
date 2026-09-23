alter table private.player_sect_states add column if not exists task_routes jsonb not null default'{}'::jsonb check(jsonb_typeof(task_routes)='object');

create or replace function private.refresh_sect_task_routes(p_user uuid,p_channel text)returns jsonb language plpgsql security definer set search_path=''as $$
declare s private.player_sect_states;p private.player_progression_states;route_map jsonb;task record;spirit_realm integer:=0;sword_realm integer:=0;body_realm integer:=0;highest integer;chosen text;
begin
 select * into s from private.player_sect_states where user_id=p_user and channel=p_channel for update;select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;
 if s.user_id is null or p.user_id is null then return'{}'::jsonb;end if;route_map:=s.task_routes;
 spirit_realm:=case when p.spirit_path_opened then floor(p.spirit_level/10.0)::integer+1 else 0 end;sword_realm:=case when p.sword_path_opened then floor(p.sword_level/10.0)::integer+1 else 0 end;body_realm:=case when p.body_path_opened then floor(p.body_level/10.0)::integer+1 else 0 end;
 for task in select * from(values('sweep',1),('cook',2),('herb',3),('escort',4),('gate',5),('vein',6),('demon',7),('array',8),('realm',9),('diplomacy',11),('rift',13),('skyward',15),('domain',17),('voidward',19),('worldaxis',21),('heavenorder',23))v(id,realm)loop
  if not route_map?task.id and greatest(spirit_realm,sword_realm,body_realm)>=task.realm then highest:=greatest(case when spirit_realm>=task.realm then spirit_realm else 0 end,case when sword_realm>=task.realm then sword_realm else 0 end,case when body_realm>=task.realm then body_realm else 0 end);chosen:=case when p.first_path='spirit'and spirit_realm=highest then'spirit'when p.first_path='sword'and sword_realm=highest then'sword'when p.first_path='body'and body_realm=highest then'body'when spirit_realm=highest then'spirit'when sword_realm=highest then'sword'else'body'end;route_map:=jsonb_set(route_map,array[task.id],to_jsonb(chosen),true);end if;
 end loop;
 if route_map<>s.task_routes then update private.player_sect_states set task_routes=route_map,revision=revision+1,updated_at=now()where user_id=p_user and channel=p_channel;end if;return route_map;
end$$;

create or replace function private.sect_progress_snapshot(s private.player_sect_states)returns jsonb language sql stable set search_path=''as $$
 select private.sect_snapshot(s)||jsonb_build_object('sectMerit',s.sect_merit::text,'sectContribution',s.sect_contribution::text,'prestige',s.prestige::text,'sectTask',s.task_id,'transmissionUntil',s.transmission_until,'sectExperienceBonus',private.sect_experience_bonus(s.user_id,s.channel),'taskRoutes',s.task_routes)
$$;

alter function private.settle_sect_progress(uuid,text)rename to settle_sect_progress_without_task_routes;
create or replace function private.settle_sect_progress(p_uid uuid,p_channel text)returns jsonb language plpgsql security definer set search_path=''as $$begin perform private.refresh_sect_task_routes(p_uid,p_channel);return private.settle_sect_progress_without_task_routes(p_uid,p_channel);end$$;

revoke all on function private.refresh_sect_task_routes(uuid,text),private.sect_progress_snapshot(private.player_sect_states),private.settle_sect_progress_without_task_routes(uuid,text),private.settle_sect_progress(uuid,text)from public,anon,authenticated;
