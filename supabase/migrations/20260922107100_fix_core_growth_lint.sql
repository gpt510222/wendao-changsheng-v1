create or replace function private.path_core_growth(p_spirit integer,p_body integer,p_sword integer)
returns jsonb language plpgsql stable set search_path='' as $$
declare stage integer;realm integer;v_true_qi integer:=0;v_root_bone integer:=0;v_physique integer:=0;v_agility integer:=0;v_spiritual_power integer:=0;v_comprehension integer:=0;
begin
 for i in 1..greatest(0,p_spirit) loop
  stage:=1+floor(floor(i/10.0)/4.0)::integer;realm:=floor(i/10.0)::integer;
  v_true_qi:=v_true_qi+2+stage;v_root_bone:=v_root_bone+1+ceil(stage/2.0)::integer;
  if i%3=0 then v_agility:=v_agility+stage;v_spiritual_power:=v_spiritual_power+stage;end if;
  if i%10=0 then v_spiritual_power:=v_spiritual_power+2*stage;v_comprehension:=v_comprehension+1+floor(realm/5.0)::integer;end if;
  if i%5=0 then v_physique:=v_physique+ceil(stage/2.0)::integer;end if;
 end loop;
 for i in 1..greatest(0,p_body) loop
  realm:=floor(i/4.0)::integer;stage:=1+floor(realm/4.0)::integer;
  v_root_bone:=v_root_bone+3+stage+(case when i%4=0 then 2*stage else 0 end);v_physique:=v_physique+3+stage+(case when i%4=0 then 2*stage else 0 end);
  if i%4=0 then v_true_qi:=v_true_qi+ceil(stage/2.0)::integer;end if;if i%4=3 then v_agility:=v_agility+ceil(stage/2.0)::integer;end if;
 end loop;
 for i in 1..greatest(0,p_sword) loop
  stage:=1+floor(floor(i/10.0)/4.0)::integer;v_agility:=v_agility+1+ceil(stage/2.0)::integer+(case when i%10=0 then 2*stage else 0 end);
  if i%2=0 then v_true_qi:=v_true_qi+stage;end if;if i%3=0 then v_spiritual_power:=v_spiritual_power+stage;end if;if i%10=0 then v_spiritual_power:=v_spiritual_power+2*stage;end if;
 end loop;
 return jsonb_build_object('trueQi',v_true_qi,'rootBone',v_root_bone,'physique',v_physique,'agility',v_agility,'spiritualPower',v_spiritual_power,'comprehension',v_comprehension,'fortune',0);
end $$;
