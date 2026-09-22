create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare p private.player_progression_states;e private.player_permanent_consumable_effects;profile private.player_art_profiles;core jsonb;level_total integer;cap_value numeric;k text;bonus numeric;snapshot_moves jsonb;
begin
 select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;
 if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;
 if (p_snapshot->'progression'->>'spirit_level')::integer<>p.spirit_level or (p_snapshot->'progression'->>'sword_level')::integer<>p.sword_level or (p_snapshot->'progression'->>'body_level')::integer<>p.body_level then raise exception '戰鬥快照與伺服器境界不一致';end if;
 select * into profile from private.player_art_profiles where user_id=p_user and channel=p_channel;
 if profile.user_id is null or not profile.combat_imported or not profile.sword_state_imported then raise exception '伺服器戰鬥配置尚未建立';end if;
 select coalesce(jsonb_agg(value->>'id' order by ord),'[]'::jsonb) into snapshot_moves from jsonb_array_elements(coalesce(p_snapshot->'moves','[]'::jsonb)) with ordinality e(value,ord);
 if coalesce(p_snapshot->>'sword_embryo','')<>profile.sword_embryo or coalesce((p_snapshot->>'sword_nurture_level')::integer,-1)<>profile.sword_nurture_level or coalesce(p_snapshot->>'sword_intent_type','')<>profile.sword_intent_type or snapshot_moves<>profile.combat_moves then raise exception '戰鬥招式與伺服器配置不一致';end if;
 select * into e from private.player_permanent_consumable_effects where user_id=p_user and channel=p_channel;core:=p_snapshot->'core';level_total:=p.spirit_level+p.sword_level+p.body_level;
 foreach k in array array['trueQi','rootBone','physique','agility','spiritualPower'] loop
  bonus:=case when k='spiritualPower' then 0 else coalesce((e.attribute_bonuses->>k)::numeric,0) end;cap_value:=100+level_total*15+bonus;
  if coalesce((core->>k)::numeric,-1)>cap_value then raise exception '戰鬥屬性超出伺服器進度上限';end if;
 end loop;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '戰鬥快照包含無效數值';end $$;
