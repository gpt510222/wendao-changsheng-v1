alter table private.player_art_profiles
 add column if not exists sword_name text not null default '',
 add column if not exists sword_nurture_level integer not null default 0 check(sword_nurture_level between 0 and 9),
 add column if not exists sword_intent integer not null default 0 check(sword_intent>=0),
 add column if not exists sword_insight integer not null default 0 check(sword_insight>=0),
 add column if not exists sword_intent_type text not null default '' check(sword_intent_type in('','break','light','origin')),
 add column if not exists sword_state_imported boolean not null default false;

create or replace function private.combat_loadout_snapshot(profile private.player_art_profiles) returns jsonb
language sql stable set search_path='' as $$select jsonb_build_object(
 'revision',profile.revision,'swordEmbryo',profile.sword_embryo,'moves',profile.combat_moves,
 'swordName',profile.sword_name,'swordNurtureLevel',profile.sword_nurture_level,
 'swordIntent',profile.sword_intent,'swordInsight',profile.sword_insight,'swordIntentType',profile.sword_intent_type
)$$;

create or replace function public.player_sword_state_bootstrap(p_channel text,p_legacy_name text,p_legacy_nurture integer,p_legacy_intent integer,p_legacy_insight integer,p_legacy_intent_type text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());profile private.player_art_profiles;p private.player_progression_states;max_nurture integer;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sword-state-'||p_channel));
 select * into profile from private.player_art_profiles where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if profile.user_id is null or p.user_id is null then raise exception '伺服器本命劍資料尚未建立';end if;
 if not profile.sword_state_imported then
  max_nurture:=least(9,1+floor(p.sword_trial_wins/10.0)::integer);
  update private.player_art_profiles set
   sword_name=case when profile.sword_embryo='' then '' else left(coalesce(nullif(trim(p_legacy_name),''),'無名靈劍'),12) end,
   sword_nurture_level=least(max_nurture,greatest(0,coalesce(p_legacy_nurture,0))),
   sword_intent=least(10000,greatest(0,coalesce(p_legacy_intent,0))),
   sword_insight=least(1000,greatest(0,coalesce(p_legacy_insight,0))),
   sword_intent_type=case when p_legacy_intent_type in('break','light','origin') and p.sword_level>=40 and p.sword_trial_wins>=40 then p_legacy_intent_type else '' end,
   sword_state_imported=true,revision=revision+1,updated_at=now()
  where user_id=uid and channel=p_channel returning * into profile;
 end if;
 return private.combat_loadout_snapshot(profile);
end $$;

create or replace function public.player_sword_state_command(p_channel text,p_action text,p_value text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());profile private.player_art_profiles;p private.player_progression_states;w private.player_resource_wallets;next_level integer;cost_iron numeric;cost_wood numeric;cost_stone numeric;cost_insight integer;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test') or p_action not in('rename','nurture','intent') or p_request_id is null then raise exception '本命劍請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的本命劍請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sword-state-'||p_channel));
 select * into profile from private.player_art_profiles where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if profile.user_id is null or not profile.sword_state_imported or profile.sword_embryo='' then raise exception '本命劍尚未建立';end if;
 if p_action='rename' then
  if length(trim(coalesce(p_value,''))) not between 1 and 12 or trim(p_value)~'[[:cntrl:]]' then raise exception '劍名限一至十二個文字';end if;
  update private.player_art_profiles set sword_name=trim(p_value),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into profile;
 elsif p_action='nurture' then
  select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;
  next_level:=profile.sword_nurture_level+1;
  if next_level>9 then raise exception '本命劍已養成圓滿';end if;
  if next_level>least(9,1+floor(p.sword_trial_wins/10.0)::integer) then raise exception '試劍進度尚未達到養劍要求';end if;
  cost_iron:=40+25*next_level+5*next_level*next_level;cost_wood:=20+12*next_level+2*next_level*next_level;cost_stone:=ceil(150*power(next_level,1.42));cost_insight:=2+floor((next_level-1)/5.0)::integer;
  if w.user_id is null or w.meteor_iron<cost_iron or w.wood<cost_wood or w.spirit_stone<cost_stone or profile.sword_insight<cost_insight then raise exception '養劍資源不足';end if;
  update private.player_resource_wallets set meteor_iron=meteor_iron-cost_iron,wood=wood-cost_wood,spirit_stone=spirit_stone-cost_stone,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  update private.player_art_profiles set sword_nurture_level=next_level,sword_insight=sword_insight-cost_insight,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into profile;
 else
  if p_value not in('break','light','origin') or profile.sword_intent_type<>'' then raise exception '劍意選擇不正確';end if;
  if p.sword_level<40 or p.sword_trial_wins<40 or profile.sword_intent<10 then raise exception '尚未達到領悟劍意的條件';end if;
  update private.player_art_profiles set sword_intent=sword_intent-10,sword_intent_type=p_value,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into profile;
 end if;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,profile.revision,'sword_state_'||p_action,p_request_id,jsonb_build_object('value',p_value));
 return jsonb_build_object('sword',private.combat_loadout_snapshot(profile),'wallet',case when w.user_id is null then null else jsonb_build_object('revision',w.revision,'resources',jsonb_build_object('free',w.cultivation::text,'swordEssence',w.sword_essence::text,'aura',w.aura::text,'spiritStone',w.spirit_stone::text,'food',w.food::text,'wood',w.wood::text,'meteorIron',w.meteor_iron::text)) end);
end $$;

create or replace function public.player_sword_trial_finish(p_channel text,p_attempt_id uuid,p_expected_progression_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());a private.sword_trial_attempts;p private.player_progression_states;profile private.player_art_profiles;chance numeric;server_won boolean;intent_gain integer;
begin
 if uid is null then raise exception 'authentication required';end if;
 if p_channel not in('formal','test') or p_attempt_id is null or p_request_id is null then raise exception 'invalid request';end if;
 if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then raise exception 'duplicate request';end if;
 select * into a from private.sword_trial_attempts where id=p_attempt_id and user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
 select * into profile from private.player_art_profiles where user_id=uid and channel=p_channel for update;
 if a.id is null or a.status<>'pending' or a.created_at<now()-interval '30 minutes' then raise exception 'sword trial attempt expired';end if;
 if a.created_at>now()-interval '3 seconds' then raise exception 'sword trial is not complete';end if;
 if p.revision<>p_expected_progression_revision or a.stage<>p.sword_trial_wins+1 or a.stage>p.sword_level+1 then raise exception 'progression revision conflict';end if;
 chance:=greatest(.1,least(.9,a.player_power/greatest(1,a.player_power+a.enemy_power)));server_won:=random()<chance;
 if server_won then
  intent_gain:=case when a.stage%10=0 then 3 else 0 end;
  update private.player_progression_states set sword_trial_wins=a.stage,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
  update private.player_art_profiles set sword_insight=sword_insight+1,sword_intent=sword_intent+intent_gain,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into profile;
 end if;
 update private.sword_trial_attempts set status='finished',won=server_won,finished_at=now() where id=a.id;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,p.revision,'sword_trial_resolved',p_request_id,jsonb_build_object('attempt_id',a.id,'stage',a.stage,'won',server_won,'chance',chance));
 return jsonb_build_object('won',server_won,'stage',a.stage,'progression',private.progression_snapshot(p),'sword',private.combat_loadout_snapshot(profile));
end $$;

revoke execute on function public.player_sword_state_bootstrap(text,text,integer,integer,integer,text),public.player_sword_state_command(text,text,text,uuid) from public,anon;
grant execute on function public.player_sword_state_bootstrap(text,text,integer,integer,integer,text),public.player_sword_state_command(text,text,text,uuid) to authenticated;
