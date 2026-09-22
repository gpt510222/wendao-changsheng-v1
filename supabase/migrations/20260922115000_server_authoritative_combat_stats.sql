create or replace function private.server_combat_stats(p_user uuid,p_channel text,p_active_path text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p private.player_progression_states;b private.player_body_states;m private.player_moral_states;core jsonb;root_bone numeric;true_qi numeric;physique numeric;agility numeric;spiritual_power numeric;righteous_marks integer:=0;evil_marks integer:=0;balance_marks integer:=0;choice_count integer:=0;choice_score numeric:=0;total_moral numeric:=0;alignment_score numeric:=0;alignment_tier integer:=0;alignment_strength numeric:=0;alignment text:='unsettled';guard_power numeric:=1;attack_power numeric:=1;hp_power numeric:=1;precision numeric:=1;max_hp numeric;attack numeric;body_attack numeric;defense numeric;evasion numeric;accuracy numeric;critical numeric;damage_reduction numeric:=0;second_move numeric:=0;
begin
 select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;
 select * into b from private.player_body_states where user_id=p_user and channel=p_channel;
 select * into m from private.player_moral_states where user_id=p_user and channel=p_channel;
 core:=private.server_final_combat_core(p_user,p_channel,p_active_path);root_bone:=(core->>'rootBone')::numeric;true_qi:=(core->>'trueQi')::numeric;physique:=(core->>'physique')::numeric;agility:=(core->>'agility')::numeric;spiritual_power:=(core->>'spiritualPower')::numeric;
 select count(*)filter(where value#>>'{}'='righteous'),count(*)filter(where value#>>'{}'='evil'),count(*)filter(where value#>>'{}'='balance'),count(*),coalesce(sum(case value#>>'{}' when 'righteous'then 2 when 'evil'then -2 else 0 end),0) into righteous_marks,evil_marks,balance_marks,choice_count,choice_score from jsonb_each(coalesce(m.sword_trial_choices,'{}'::jsonb));
 total_moral:=coalesce(m.righteousness,0)+coalesce(m.evil_qi,0);alignment_score:=(coalesce(m.righteousness,0)-coalesce(m.evil_qi,0))/greatest(10,total_moral)+choice_score/greatest(10,choice_count*4);alignment_tier:=case when total_moral<20 then 0 when total_moral<100 then 1 when total_moral<500 then 2 else 3 end;alignment_strength:=(array[0,.04,.07,.1]::numeric[])[alignment_tier+1];
 if alignment_tier>0 then alignment:=case when alignment_score>=.18 then 'righteous' when alignment_score<=-.18 then 'evil' else 'balance' end;end if;
 guard_power:=(1+least(.2,righteous_marks*.02))*case when alignment='righteous'then 1+alignment_strength else 1 end;attack_power:=case when alignment='evil'then 1+alignment_strength else 1 end;hp_power:=case when alignment='righteous'then 1+alignment_strength*.6 else 1 end;precision:=case when alignment='balance'then 1+alignment_strength else 1 end;
 max_hp:=round(greatest(125,120+greatest(0,root_bone)*4)*case when b.injury='internal'and b.injury_until>now()then .85 else 1 end*hp_power);attack:=greatest(12,true_qi*5)*attack_power;body_attack:=greatest(12,(root_bone*2+physique*3)*(1+least(.3,floor(greatest(0,p.body_level)/4.0)*.0375)))*attack_power;defense:=greatest(0,physique*20)*guard_power;evasion:=greatest(0,agility)*3*precision;accuracy:=greatest(0,spiritual_power)*3*precision;critical:=least(.5,least(.45,(greatest(0,spiritual_power)*3)/(greatest(0,spiritual_power)*3+3000))+evil_marks*.005);damage_reduction:=case when alignment='righteous'then alignment_strength*.5 when alignment='evil'then -alignment_strength*.35 else 0 end;second_move:=case when alignment='balance'then alignment_strength else 0 end;
 return jsonb_build_object('maxHp',max_hp,'attack',attack,'qiAttack',attack,'bodyAttack',body_attack,'defense',defense,'evasion',evasion,'accuracy',accuracy,'crit',critical,'damageReduction',damage_reduction,'alignmentSecondMove',second_move);
end $$;

alter function private.arena_validate_server_progression(uuid,text,jsonb) rename to arena_validate_server_progression_final_core;
create or replace function private.arena_validate_server_progression(p_user uuid,p_channel text,p_snapshot jsonb)
returns void language plpgsql stable security definer set search_path='' as $$
declare expected jsonb;provided jsonb;k text;
begin
 perform private.arena_validate_server_progression_final_core(p_user,p_channel,p_snapshot);expected:=private.server_combat_stats(p_user,p_channel,coalesce(p_snapshot->>'active_path',''));provided:=p_snapshot->'stats';
 foreach k in array array['maxHp','attack','qiAttack','bodyAttack','defense','evasion','accuracy','crit','damageReduction','alignmentSecondMove']loop if abs(coalesce((provided->>k)::numeric,-999999999)-coalesce((expected->>k)::numeric,0))>.000001 then raise exception '衍生戰鬥屬性與伺服器重算結果不一致';end if;end loop;
end $$;
revoke all on function private.server_combat_stats(uuid,text,text),private.arena_validate_server_progression_final_core(uuid,text,jsonb),private.arena_validate_server_progression(uuid,text,jsonb) from public,anon,authenticated;
