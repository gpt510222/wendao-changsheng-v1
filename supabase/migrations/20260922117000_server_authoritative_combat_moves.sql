create or replace function private.server_combat_move(p_user uuid,p_channel text,p_move text,p_slot integer,p_active_path text)returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p private.player_progression_states;profile private.player_art_profiles;m private.player_moral_states;core jsonb;stats jsonb;potential jsonb;kind text;embryo text:='';ord integer:=0;hits numeric:=1;min_v numeric:=0;max_v numeric:=0;base_percent numeric:=0;attribute_name text:='';attribute_multiplier numeric:=0;armor numeric:=0;accuracy_bonus numeric:=0;crit_bonus numeric:=0;life_steal numeric:=0;guard_bonus numeric:=0;repeat_chance numeric:=0;repeat_scale numeric:=0;balance_multiplier numeric:=1;damage_multiplier numeric:=1;evil_marks integer:=0;balance_marks integer:=0;realm_breaks integer;cycle_armor integer;cycle_accuracy integer;cycle_damage integer;
begin select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;select * into profile from private.player_art_profiles where user_id=p_user and channel=p_channel;select * into m from private.player_moral_states where user_id=p_user and channel=p_channel;core:=private.server_final_combat_core(p_user,p_channel,p_active_path);stats:=private.server_combat_stats(p_user,p_channel,p_active_path);potential:=private.server_potential_totals(p_user,p_channel);select count(*)filter(where value#>>'{}'='evil'),count(*)filter(where value#>>'{}'='balance')into evil_marks,balance_marks from jsonb_each(coalesce(m.sword_trial_choices,'{}'::jsonb));
 case p_move
 when'origin'then kind:='spirit';min_v:=.8;max_v:=1;
 when'body-origin'then kind:='body';min_v:=.9;max_v:=1.05;guard_bonus:=.05;
 when'body-jade-break'then kind:='body';min_v:=1.25;max_v:=1.45;armor:=.2;
 when'body-mountain-crush'then kind:='body';min_v:=1.55;max_v:=1.78;hits:=2;guard_bonus:=.08;
 when'body-myriad-calamity'then kind:='body';min_v:=1.72;max_v:=1.96;hits:=2;life_steal:=.08;
 when'body-golden-boundary'then kind:='body';min_v:=2;max_v:=2.28;armor:=.35;guard_bonus:=.12;
 when'body-dao-incarnate'then kind:='body';min_v:=2.35;max_v:=2.7;hits:=3;armor:=.25;life_steal:=.12;
 when'heavy-fall'then kind:='heavy-fall';embryo:='heavy';ord:=1;min_v:=1.3;max_v:=1.45;armor:=.18;
 when'heavy-rift'then kind:='heavy-rift';embryo:='heavy';ord:=2;min_v:=1.72;max_v:=1.92;hits:=2;armor:=.12;
 when'spirit-thread'then kind:='spirit-thread';embryo:='spirit';ord:=1;min_v:=1.18;max_v:=1.32;hits:=3;crit_bonus:=.08;
 when'spirit-return'then kind:='spirit-return';embryo:='spirit';ord:=2;min_v:=1.52;max_v:=1.7;life_steal:=.12;
 when'shadow-stars'then kind:='shadow-stars';embryo:='shadow';ord:=1;min_v:=1.14;max_v:=1.3;hits:=3;accuracy_bonus:=.25;
 when'shadow-void'then kind:='shadow-void';embryo:='shadow';ord:=2;min_v:=1.38;max_v:=1.55;repeat_chance:=.35;repeat_scale:=.55;
 when'斷刃堂-2'then kind:='sectSkill';base_percent:=120;attribute_name:='trueQi';attribute_multiplier:=2;
 when'御風門-2'then kind:='sectSkill';base_percent:=100;attribute_name:='agility';attribute_multiplier:=3;
 when'鎮岳宗-2'then kind:='sectSkill';base_percent:=110;attribute_name:='physique';attribute_multiplier:=2;
 when'焚心魔教-2'then kind:='sectSkill';base_percent:=100;attribute_name:='trueQi';attribute_multiplier:=3;
 when'幽冥血海-2'then kind:='sectSkill';base_percent:=80;attribute_name:='rootBone';attribute_multiplier:=3;
 when'萬壽仙山-2'then kind:='sectSkill';base_percent:=110;attribute_name:='rootBone';attribute_multiplier:=2;
 when'蒼穹道統-2'then kind:='sectSkill';base_percent:=80;attribute_name:='trueQi';attribute_multiplier:=4;
 when'燭龍神庭-2'then kind:='sectSkill';base_percent:=80;attribute_name:='physique';attribute_multiplier:=4;
 when'諸天星羅神宗-2'then kind:='sectSkill';base_percent:=70;attribute_name:='agility';attribute_multiplier:=4;
 else raise exception '伺服器無法辨識戰鬥招式';end case;
 if p_slot=2 then balance_multiplier:=1+case when embryo<>''then least(.5,balance_marks*.05)else 0 end+coalesce((stats->>'alignmentSecondMove')::numeric,0);end if;
 if embryo<>''then realm_breaks:=floor(greatest(0,p.sword_level)/10.0);cycle_armor:=greatest(0,floor((realm_breaks+1)/3.0));cycle_accuracy:=greatest(0,floor(realm_breaks/3.0));cycle_damage:=greatest(0,floor((realm_breaks-1)/3.0));damage_multiplier:=(1+greatest(0,p.sword_level)*.008+realm_breaks*.02+cycle_damage*.02)*(1+coalesce(profile.sword_nurture_level,0)*case when ord=2 then .015 else .01 end)*(1+least(.2,evil_marks*.02));accuracy_bonus:=accuracy_bonus+cycle_accuracy*.05;armor:=least(.8,armor+cycle_armor*.02);end if;
 if kind='sectSkill'then base_percent:=base_percent;end if;life_steal:=life_steal+coalesce((potential->>'lifeSteal')::numeric,0)/100;
 return jsonb_build_object('kind',kind,'embryo',embryo,'hits',hits,'min',min_v,'max',max_v,'basePercent',base_percent,'balanceMultiplier',balance_multiplier,'damageMultiplier',damage_multiplier,'attributeDamage',case when kind='sectSkill'then(core->>attribute_name)::numeric*attribute_multiplier else 0 end,'accuracyBonus',accuracy_bonus,'armorPierce',armor,'critBonus',crit_bonus,'lifeSteal',life_steal,'guardBonus',guard_bonus,'repeatChance',repeat_chance,'repeatScale',repeat_scale);
end$$;

alter function private.arena_validate_server_progression(uuid,text,jsonb)rename to arena_validate_server_progression_stats;
create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)returns void language plpgsql stable security definer set search_path='' as $$
declare supplied jsonb;expected jsonb;move_id text;k text;ord integer;
begin perform private.arena_validate_server_progression_stats(p_user,p_channel,p_snapshot);for supplied,ord in select value,ordinality::integer from jsonb_array_elements(p_snapshot->'moves')with ordinality loop move_id:=supplied->>'id';expected:=private.server_combat_move(p_user,p_channel,move_id,ord,coalesce(p_snapshot->>'active_path',''));if coalesce(supplied->>'kind','')<>expected->>'kind'or coalesce(supplied->>'embryo','')<>expected->>'embryo'then raise exception '招式種類與伺服器配置不一致';end if;foreach k in array array['hits','min','max','basePercent','balanceMultiplier','damageMultiplier','attributeDamage','accuracyBonus','armorPierce','critBonus','lifeSteal','guardBonus','repeatChance','repeatScale']loop if abs(coalesce((supplied->>k)::numeric,0)-coalesce((expected->>k)::numeric,0))>.000001 then raise exception '招式戰鬥參數與伺服器重算結果不一致';end if;end loop;end loop;end$$;
revoke all on function private.server_combat_move(uuid,text,text,integer,text),private.arena_validate_server_progression_stats(uuid,text,jsonb),private.arena_validate_server_progression(uuid,text,jsonb)from public,anon,authenticated;
