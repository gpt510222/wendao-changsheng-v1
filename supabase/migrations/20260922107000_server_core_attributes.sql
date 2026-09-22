alter table private.player_body_states
  add column if not exists breakthrough_bonus_total integer not null default 0
  check (breakthrough_bonus_total between 0 and 100000);

create or replace function private.capture_body_breakthrough_bonus()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.breakthrough_value > 0 and new.breakthrough_value = 0 then
    new.breakthrough_bonus_total := old.breakthrough_bonus_total + least(12, old.breakthrough_value);
  end if;
  return new;
end $$;

drop trigger if exists capture_body_breakthrough_bonus on private.player_body_states;
create trigger capture_body_breakthrough_bonus
before update of breakthrough_value on private.player_body_states
for each row execute function private.capture_body_breakthrough_bonus();

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
    v_root_bone:=v_root_bone+3+stage+(case when i%4=0 then 2*stage else 0 end);
    v_physique:=v_physique+3+stage+(case when i%4=0 then 2*stage else 0 end);
    if i%4=0 then v_true_qi:=v_true_qi+ceil(stage/2.0)::integer;end if;
    if i%4=3 then v_agility:=v_agility+ceil(stage/2.0)::integer;end if;
  end loop;
  for i in 1..greatest(0,p_sword) loop
    stage:=1+floor(floor(i/10.0)/4.0)::integer;
    v_agility:=v_agility+1+ceil(stage/2.0)::integer+(case when i%10=0 then 2*stage else 0 end);
    if i%2=0 then v_true_qi:=v_true_qi+stage;end if;
    if i%3=0 then v_spiritual_power:=v_spiritual_power+stage;end if;
    if i%10=0 then v_spiritual_power:=v_spiritual_power+2*stage;end if;
  end loop;
  return jsonb_build_object('trueQi',v_true_qi,'rootBone',v_root_bone,'physique',v_physique,'agility',v_agility,'spiritualPower',v_spiritual_power,'comprehension',v_comprehension,'fortune',0);
end $$;

create or replace function private.server_base_core(p_user uuid,p_channel text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i private.player_identity_states;p private.player_progression_states;b private.player_body_states;o jsonb;g jsonb;bonus integer;
begin
  select * into i from private.player_identity_states where user_id=p_user and channel=p_channel;
  select * into p from private.player_progression_states where user_id=p_user and channel=p_channel;
  select * into b from private.player_body_states where user_id=p_user and channel=p_channel;
  if i.user_id is null or p.user_id is null or b.user_id is null then raise exception '伺服器角色屬性尚未建立';end if;
  o:=private.origin_core(i.origin);g:=private.path_core_growth(p.spirit_level,p.body_level,p.sword_level);bonus:=b.breakthrough_bonus_total;
  return jsonb_build_object(
    'trueQi',(o->>'trueQi')::integer+(g->>'trueQi')::integer,
    'rootBone',(o->>'rootBone')::integer+(g->>'rootBone')::integer+bonus,
    'physique',(o->>'physique')::integer+(g->>'physique')::integer+bonus,
    'agility',(o->>'agility')::integer+(g->>'agility')::integer,
    'spiritualPower',(o->>'spiritualPower')::integer+(g->>'spiritualPower')::integer,
    'comprehension',(o->>'comprehension')::integer+(g->>'comprehension')::integer,
    'fortune',(o->>'fortune')::integer
  );
end $$;

create or replace function public.player_core_attributes_get(p_channel text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());p private.player_progression_states;b private.player_body_states;
begin
  if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
  select * into b from private.player_body_states where user_id=uid and channel=p_channel;
  return jsonb_build_object('baseCore',private.server_base_core(uid,p_channel),'progressionRevision',p.revision,'bodyRevision',b.revision,'bodyBreakthroughBonus',b.breakthrough_bonus_total);
end $$;

revoke all on function private.capture_body_breakthrough_bonus(),private.path_core_growth(integer,integer,integer),private.server_base_core(uuid,text) from public,anon,authenticated;
revoke execute on function public.player_core_attributes_get(text) from public,anon;
grant execute on function public.player_core_attributes_get(text) to authenticated;
