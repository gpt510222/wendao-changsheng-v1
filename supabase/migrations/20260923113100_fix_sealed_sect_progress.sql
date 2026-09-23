create or replace function public.player_sect_progress_bootstrap(p_channel text,p_merit numeric,p_contribution numeric,p_prestige numeric,p_task text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;source jsonb;v_merit numeric;v_contribution numeric;v_prestige numeric;v_task text;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')then raise exception 'invalid channel';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('sectMerit',p_merit,'sectContribution',p_contribution,'prestige',p_prestige,'sectTask',p_task)else private.sealed_legacy_state(uid,p_channel)end;
 v_merit:=least(1000000000,greatest(0,coalesce((source->>'sectMerit')::numeric,0)));v_contribution:=least(1000000000,greatest(0,coalesce((source->>'sectContribution')::numeric,0)));v_prestige:=least(1000000000,greatest(0,coalesce((source->>'prestige')::numeric,0)));v_task:=coalesce(source->>'sectTask','');
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;if s.user_id is null then raise exception 'sect state not initialized';end if;
 if not s.progress_imported then update private.player_sect_states set sect_merit=v_merit,sect_contribution=v_contribution,prestige=v_prestige,task_id=case when exists(select 1 from private.sect_task_values(v_task))then v_task else''end,progress_imported=true,task_settled_at=now(),revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel;end if;return private.settle_sect_progress(uid,p_channel);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '門派進度舊存檔資料不正確';end $$;

