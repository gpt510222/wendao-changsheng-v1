create or replace function private.sealed_legacy_state(p_uid uuid,p_channel text)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare snapshot jsonb;
begin
 select legacy_state into snapshot from private.player_states where user_id=p_uid and channel=p_channel;
 if snapshot is null then raise exception '伺服器舊存檔快照尚未建立';end if;
 return snapshot;
end $$;
revoke all on function private.sealed_legacy_state(uuid,text) from public,anon,authenticated;

create or replace function public.player_resource_wallet_bootstrap(p_channel text,p_resources jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());wallet private.player_resource_wallets;source jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or p_resources is null or jsonb_typeof(p_resources)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_resources else private.sealed_legacy_state(uid,p_channel)end;
 insert into private.player_resource_wallets(user_id,channel,cultivation,sword_essence,aura,spirit_stone,food,wood,meteor_iron)
 values(uid,p_channel,private.legacy_resource_amount(source,'free'),private.legacy_resource_amount(source,'swordEssence'),private.legacy_resource_amount(source,'aura'),private.legacy_resource_amount(source,'spiritStone'),private.legacy_resource_amount(source,'food'),private.legacy_resource_amount(source,'wood'),private.legacy_resource_amount(source,'meteorIron'))on conflict(user_id,channel)do nothing;
 select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel;
 if wallet.revision=1 and not exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.event_type='resource_wallet_legacy_import')then insert into private.player_state_events(user_id,channel,revision,event_type,payload)values(uid,p_channel,1,'resource_wallet_legacy_import',jsonb_build_object('wallet_revision',wallet.revision,'source','sealed'));end if;
 return private.wallet_snapshot(wallet);
end $$;

create or replace function public.player_progression_bootstrap(p_channel text,p_progress jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());p private.player_progression_states;source jsonb;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or jsonb_typeof(p_progress)<>'object'then raise exception 'invalid request';end if;
 source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then p_progress else private.sealed_legacy_state(uid,p_channel)end;
 insert into private.player_progression_states(user_id,channel,cultivation_awakened,spirit_path_opened,sword_path_opened,body_path_opened,spirit_level,sword_level,body_level,sword_trial_wins)
 values(uid,p_channel,coalesce((source->>'cultivationAwakened')::boolean,false),coalesce((source->>'spiritPathOpened')::boolean,false),coalesce((source->>'swordPathOpened')::boolean,false),coalesce((source->>'bodyPathOpened')::boolean,false),least(228,greatest(0,coalesce((source->>'spiritLevel')::integer,0))),least(228,greatest(0,coalesce((source->>'swordLevel')::integer,0))),least(228,greatest(0,coalesce((source->>'bodyLevel')::integer,0))),least(228,greatest(0,coalesce((source->>'swordTrialWins')::integer,0))))on conflict(user_id,channel)do nothing;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;return private.progression_snapshot(p);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid progression state';
end $$;

