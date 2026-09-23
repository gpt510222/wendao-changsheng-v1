create or replace function public.player_mainline_bootstrap(p_channel text,p_legacy_cleared integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_mainline_states;p private.player_progression_states;allowed integer;source jsonb;cleared integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('mainlineCleared',p_legacy_cleared)else private.sealed_legacy_state(uid,p_channel)end;cleared:=least(18,greatest(0,coalesce((source->>'mainlineCleared')::integer,0)));
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;allowed:=least(18,greatest(0,(greatest(p.spirit_level,p.sword_level,p.body_level)/10+1)*2));
 insert into private.player_mainline_states(user_id,channel)values(uid,p_channel)on conflict do nothing;select * into s from private.player_mainline_states where user_id=uid and channel=p_channel for update;
 if not s.legacy_imported then update private.player_mainline_states set cleared_stage=least(allowed,cleared),legacy_imported=true,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;end if;return private.mainline_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '主線舊存檔資料不正確';end $$;

create or replace function public.player_sect_bootstrap(p_channel text,p_rank integer default 0,p_acting_leader boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;source jsonb;rank_value integer;leader_value boolean;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')then raise exception 'invalid channel';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('sectRank',p_rank,'actingLeader',p_acting_leader)else private.sealed_legacy_state(uid,p_channel)end;rank_value:=least(4,greatest(0,coalesce((source->>'sectRank')::integer,0)));leader_value:=coalesce((source->>'actingLeader')::boolean,false);
 insert into private.player_sect_states(user_id,channel)values(uid,p_channel)on conflict do nothing;select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if not s.legacy_imported then update private.player_sect_states set sect_rank=rank_value,acting_leader=leader_value,legacy_imported=true,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;end if;return private.sect_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '門派舊存檔資料不正確';end $$;

create or replace function public.player_sect_membership_bootstrap(p_channel text,p_sect_name text,p_sect_star integer,p_sect_faction text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;c record;source jsonb;sect_name text;sect_star integer;sect_faction text;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('sect',p_sect_name,'sectStar',p_sect_star,'sectFaction',p_sect_faction)else private.sealed_legacy_state(uid,p_channel)end;sect_name:=coalesce(source->>'sect','');sect_star:=coalesce((source->>'sectStar')::integer,0);sect_faction:=coalesce(source->>'sectFaction','');
 insert into private.player_sect_states(user_id,channel)values(uid,p_channel)on conflict do nothing;select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if not s.membership_imported then if sect_name<>''then select * into c from private.sect_catalog()where name=sect_name;if c.name is null or c.star<>sect_star or c.faction<>sect_faction then raise exception '門派資料不正確';end if;update private.player_sect_states set sect_name=c.name,sect_star=c.star,sect_faction=c.faction,membership_imported=true,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;else update private.player_sect_states set membership_imported=true where user_id=uid and channel=p_channel returning * into s;end if;end if;return private.sect_progress_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '門派舊存檔資料不正確';end $$;

create or replace function public.player_sect_progress_bootstrap(p_channel text,p_merit numeric,p_contribution numeric,p_prestige numeric,p_task text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;source jsonb;merit numeric;contribution numeric;prestige numeric;task text;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')then raise exception 'invalid channel';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('sectMerit',p_merit,'sectContribution',p_contribution,'prestige',p_prestige,'sectTask',p_task)else private.sealed_legacy_state(uid,p_channel)end;
 merit:=least(1000000000,greatest(0,coalesce((source->>'sectMerit')::numeric,0)));contribution:=least(1000000000,greatest(0,coalesce((source->>'sectContribution')::numeric,0)));prestige:=least(1000000000,greatest(0,coalesce((source->>'prestige')::numeric,0)));task:=coalesce(source->>'sectTask','');
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;if s.user_id is null then raise exception 'sect state not initialized';end if;
 if not s.progress_imported then update private.player_sect_states set sect_merit=merit,sect_contribution=contribution,prestige=prestige,task_id=case when exists(select 1 from private.sect_task_values(task))then task else''end,progress_imported=true,task_settled_at=now(),revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel;end if;return private.settle_sect_progress(uid,p_channel);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '門派進度舊存檔資料不正確';end $$;

