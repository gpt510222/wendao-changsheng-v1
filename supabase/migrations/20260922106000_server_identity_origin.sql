create table if not exists private.player_identity_states(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 origin text not null check(origin in('家族子弟','流浪孤兒','亡命草寇','深山獵戶','寒窗學子')),
 revision bigint not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,channel)
);
alter table private.player_identity_states enable row level security;
revoke all on private.player_identity_states from public,anon,authenticated;

create or replace function private.origin_core(p_origin text) returns jsonb
language sql immutable set search_path='' as $$select case p_origin
 when '流浪孤兒' then '{"trueQi":3,"rootBone":4,"physique":4,"agility":4,"spiritualPower":7,"comprehension":3,"fortune":10}'::jsonb
 when '亡命草寇' then '{"trueQi":3,"rootBone":8,"physique":8,"agility":6,"spiritualPower":3,"comprehension":0,"fortune":5}'::jsonb
 when '深山獵戶' then '{"trueQi":1,"rootBone":6,"physique":7,"agility":7,"spiritualPower":4,"comprehension":2,"fortune":8}'::jsonb
 when '寒窗學子' then '{"trueQi":6,"rootBone":4,"physique":2,"agility":4,"spiritualPower":10,"comprehension":6,"fortune":3}'::jsonb
 else '{"trueQi":5,"rootBone":5,"physique":5,"agility":5,"spiritualPower":5,"comprehension":5,"fortune":5}'::jsonb end$$;

create or replace function public.player_identity_bootstrap(p_channel text,p_legacy_origin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());i private.player_identity_states;chosen text;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 chosen:=case when p_legacy_origin in('家族子弟','流浪孤兒','亡命草寇','深山獵戶','寒窗學子') then p_legacy_origin else '家族子弟' end;
 insert into private.player_identity_states(user_id,channel,origin) values(uid,p_channel,chosen) on conflict do nothing;
 select * into i from private.player_identity_states where user_id=uid and channel=p_channel;
 return jsonb_build_object('revision',i.revision,'origin',i.origin,'baseCore',private.origin_core(i.origin));
end $$;

create or replace function public.player_new_character_initialize_v2(p_channel text,p_name text,p_origin text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;identity jsonb;
begin
 if p_origin not in('家族子弟','流浪孤兒','亡命草寇','深山獵戶','寒窗學子') then raise exception '出身資料不正確';end if;
 result:=public.player_new_character_initialize(p_channel,p_name);
 identity:=public.player_identity_bootstrap(p_channel,p_origin);
 return result||jsonb_build_object('identity',identity);
end $$;

revoke execute on function public.player_new_character_initialize(text,text) from authenticated;
revoke execute on function public.player_identity_bootstrap(text,text),public.player_new_character_initialize_v2(text,text,text) from public,anon;
grant execute on function public.player_identity_bootstrap(text,text),public.player_new_character_initialize_v2(text,text,text) to authenticated;
revoke all on function private.origin_core(text) from public,anon,authenticated;
