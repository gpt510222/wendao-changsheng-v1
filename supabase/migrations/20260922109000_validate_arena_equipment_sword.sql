create or replace function private.server_component_core(p_user uuid,p_channel text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p private.player_progression_states;e private.player_permanent_consumable_effects;a private.player_ascension_states;s private.player_art_profiles;base jsonb;k text;v numeric;equip numeric;sword numeric;realm integer;
begin
 select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;select * into e from private.player_permanent_consumable_effects where user_id=p_user and channel=p_channel;select * into a from private.player_ascension_states where user_id=p_user and channel=p_channel;select * into s from private.player_art_profiles where user_id=p_user and channel=p_channel;base:=private.server_base_core(p_user,p_channel);realm:=greatest(1,floor(p.sword_level/10.0)::integer+1);
 foreach k in array array['trueQi','rootBone','physique','agility','spiritualPower'] loop
  v:=coalesce((base->>k)::numeric,0)+case when k='spiritualPower' then 0 else coalesce((e.attribute_bonuses->>k)::numeric,0)+coalesce((a.allocations->>k)::numeric,0) end;
  select coalesce(sum(i.value),0) into equip from private.player_equipment_items i where i.user_id=p_user and i.channel=p_channel and i.equipped and i.slot=case k when 'spiritualPower' then 'crown' when 'physique' then 'robe' when 'rootBone' then 'bracer' when 'trueQi' then 'belt' when 'agility' then 'boots' end;
  sword:=case s.sword_embryo when 'heavy' then case k when 'rootBone' then 2*s.sword_nurture_level when 'physique' then s.sword_nurture_level else 0 end when 'spirit' then case when k in('trueQi','spiritualPower') then s.sword_nurture_level else 0 end when 'shadow' then case when k='agility' then 2*s.sword_nurture_level when k='spiritualPower' then s.sword_nurture_level else 0 end else 0 end;
  sword:=sword+case s.sword_intent_type when 'break' then case k when 'trueQi' then 2*realm when 'physique' then realm else 0 end when 'light' then case when k='agility' then 2*realm when 'spiritualPower' then realm else 0 end when 'origin' then case when k in('rootBone','physique') then realm else 0 end else 0 end;
  base:=jsonb_set(base,array[k],to_jsonb(v+equip+sword),true);
 end loop;return base;
end $$;

alter function private.arena_validate_server_progression(uuid,text,jsonb) rename to arena_validate_server_progression_base;
create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare expected jsonb;provided jsonb;k text;
begin
 perform private.arena_validate_server_progression_base(p_user,p_channel,p_snapshot);expected:=private.server_component_core(p_user,p_channel);provided:=p_snapshot->'component_core';if jsonb_typeof(provided)<>'object' then raise exception '戰鬥快照缺少伺服器裝備屬性';end if;
 foreach k in array array['trueQi','rootBone','physique','agility','spiritualPower'] loop if coalesce((provided->>k)::numeric,-1)<>coalesce((expected->>k)::numeric,0) then raise exception '裝備或本命劍屬性與伺服器紀錄不一致';end if;end loop;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '戰鬥快照包含無效數值';end $$;

revoke all on function private.server_component_core(uuid,text),private.arena_validate_server_progression_base(uuid,text,jsonb),private.arena_validate_server_progression(uuid,text,jsonb) from public,anon,authenticated;
