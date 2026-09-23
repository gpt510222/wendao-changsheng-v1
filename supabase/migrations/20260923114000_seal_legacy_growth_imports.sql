create or replace function public.player_body_bootstrap(p_channel text,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());b private.player_body_states;source jsonb;f jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or jsonb_typeof(p_body)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_body else private.sealed_legacy_state(uid,p_channel)end;f:=coalesce(case when source?'bodyFoundations'then source->'bodyFoundations'else source->'foundations'end,'{}'::jsonb);
 insert into private.player_body_states(user_id,channel,nutrition,foundation_bone,foundation_blood,foundation_organs,training_mode,next_cycle_at,training_load,injury,injury_until)
 values(uid,p_channel,least(100000,greatest(0,coalesce((source->>case when source?'bodyNutrition'then'bodyNutrition'else'nutrition'end)::numeric,0))),least(100,greatest(0,coalesce((f->>'bone')::numeric,0))),least(100,greatest(0,coalesce((f->>'blood')::numeric,0))),least(100,greatest(0,coalesce((f->>'organs')::numeric,0))),'',null,least(100,greatest(0,coalesce((source->>case when source?'bodyTrainingLoad'then'bodyTrainingLoad'else'trainingLoad'end)::integer,0))),'',null)on conflict(user_id,channel)do nothing;
 select * into b from private.player_body_states where user_id=uid and channel=p_channel;return private.body_snapshot(b);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid body state';end $$;

create or replace function public.player_cave_bootstrap(p_channel text,p_cave jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());c private.player_cave_states;source jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or jsonb_typeof(p_cave)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_cave else private.sealed_legacy_state(uid,p_channel)end;
 insert into private.player_cave_states(user_id,channel,dao_child_total,dao_child_bought,worker_food,worker_wood,worker_iron,food_area_level,wood_area_level,iron_area_level,spirit_pool_level)
 values(uid,p_channel,least(1000,greatest(1,coalesce((source->>'daoChildTotal')::integer,1))),least(999,greatest(0,coalesce((source->>'daoChildBought')::integer,0))),least(1000,greatest(0,coalesce((source->>'workerFood')::integer,0))),least(1000,greatest(0,coalesce((source->>'workerWood')::integer,0))),least(1000,greatest(0,coalesce((source->>'workerMeteorIron')::integer,0))),least(99,greatest(1,coalesce((source->>'foodAreaLevel')::integer,1))),least(99,greatest(1,coalesce((source->>'woodAreaLevel')::integer,1))),least(99,greatest(1,coalesce((source->>'meteorIronAreaLevel')::integer,1))),least(999,greatest(1,coalesce((source->>'spiritPoolLevel')::integer,1))))on conflict(user_id,channel)do nothing;
 select * into c from private.player_cave_states where user_id=uid and channel=p_channel;return private.cave_snapshot(c);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid cave state';end $$;

create or replace function public.player_cave_security_bootstrap(p_channel text,p_config jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());c private.player_cave_states;source jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or jsonb_typeof(p_config)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_config else private.sealed_legacy_state(uid,p_channel)end;
 select * into c from private.player_cave_states where user_id=uid and channel=p_channel for update;if c.user_id is null then raise exception 'cave state not initialized';end if;
 if not c.security_v2_initialized then update private.player_cave_states set security_v2_initialized=true,cave_core_level=least(7,greatest(1,coalesce((source->>'caveCoreLevel')::integer,1))),cultivation_level=least(7,greatest(1,coalesce((source->>'caveCultivationLevel')::integer,1))),sword_level=least(7,greatest(1,coalesce((source->>'caveSwordLevel')::integer,1))),body_level=least(7,greatest(1,coalesce((source->>'caveBodyLevel')::integer,1))),cultivation_enabled=coalesce((source->>'caveCultivationEnabled')::boolean,false),sword_enabled=coalesce((source->>'caveSwordEnabled')::boolean,false),body_enabled=coalesce((source->>'caveBodyEnabled')::boolean,false),spirit_path_opened=coalesce((source->>'spiritPathOpened')::boolean,false),sword_path_opened=coalesce((source->>'swordPathOpened')::boolean,false),body_path_opened=coalesce((source->>'bodyPathOpened')::boolean,false),has_sword_embryo=coalesce(length(source->>'swordEmbryo')>0,false),metal_root=least(200,greatest(0,coalesce((source->>'metalRoot')::integer,0))),wood_root=least(200,greatest(0,coalesce((source->>'woodRoot')::integer,0))),water_root=least(200,greatest(0,coalesce((source->>'waterRoot')::integer,0))),fire_root=least(200,greatest(0,coalesce((source->>'fireRoot')::integer,0))),earth_root=least(200,greatest(0,coalesce((source->>'earthRoot')::integer,0))),updated_at=now()where user_id=uid and channel=p_channel returning * into c;delete from private.legacy_cave_security_import_eligibility where user_id=uid;end if;
 perform private.refresh_resource_profile_authoritative(uid,p_channel);return private.cave_snapshot(c);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid cave configuration';end $$;

create or replace function public.player_moral_bootstrap(p_channel text,p_legacy_righteousness bigint default 0,p_legacy_evil_qi bigint default 0,p_legacy_traits jsonb default '{}',p_legacy_trials jsonb default '{}',p_legacy_sword_choices jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_moral_states;source jsonb;traits jsonb;trials jsonb;choices jsonb;v_righteousness bigint;v_evil_qi bigint;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('righteousness',p_legacy_righteousness,'evilQi',p_legacy_evil_qi,'qiHeartTraits',p_legacy_traits,'qiHeartTrials',p_legacy_trials,'swordTrialChoices',p_legacy_sword_choices)else private.sealed_legacy_state(uid,p_channel)end;
 v_righteousness:=least(1000000,greatest(0,coalesce((source->>'righteousness')::bigint,0)));v_evil_qi:=least(1000000,greatest(0,coalesce((source->>'evilQi')::bigint,0)));traits:=jsonb_build_object('guard',least(3,greatest(0,coalesce((source->'qiHeartTraits'->>'guard')::integer,0))),'benevolent',least(3,greatest(0,coalesce((source->'qiHeartTraits'->>'benevolent')::integer,0))),'free',least(3,greatest(0,coalesce((source->'qiHeartTraits'->>'free')::integer,0))));
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)into trials from jsonb_each(coalesce(source->'qiHeartTrials','{}'::jsonb))where key in('30','60','90')and jsonb_typeof(value)='object';
 select coalesce(jsonb_object_agg(key,to_jsonb(value#>>'{}')),'{}'::jsonb)into choices from jsonb_each(coalesce(source->'swordTrialChoices','{}'::jsonb))where key in('10','20','30','40','50','60','70','80','90')and value#>>'{}'in('righteous','evil','balance');
 perform pg_advisory_xact_lock(hashtext(uid::text||'-moral-'||p_channel));insert into private.player_moral_states(user_id,channel)values(uid,p_channel)on conflict do nothing;select * into s from private.player_moral_states where user_id=uid and channel=p_channel for update;
 if not s.imported then update private.player_moral_states set righteousness=v_righteousness,evil_qi=v_evil_qi,qi_heart_traits=traits,qi_heart_trials=trials,sword_trial_choices=choices,imported=true,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;end if;return private.moral_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '道心舊存檔資料不正確';end $$;
