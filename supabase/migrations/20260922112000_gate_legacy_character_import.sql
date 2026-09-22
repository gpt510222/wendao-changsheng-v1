create table if not exists private.legacy_character_import_eligibility(user_id uuid primary key references auth.users(id) on delete cascade,granted_at timestamptz not null default now());
insert into private.legacy_character_import_eligibility(user_id) select id from auth.users on conflict do nothing;
alter table private.legacy_character_import_eligibility enable row level security;revoke all on private.legacy_character_import_eligibility from public,anon,authenticated;

create or replace function private.guard_player_state_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('app.server_character_initialize',true),'')<>'1' and not exists(select 1 from private.legacy_character_import_eligibility where user_id=new.user_id) then raise exception '新帳號必須使用伺服器建角流程';end if;return new;
end $$;
drop trigger if exists guard_player_state_insert on private.player_states;
create trigger guard_player_state_insert before insert on private.player_states for each row execute function private.guard_player_state_insert();

create or replace function public.player_new_character_initialize_v2(p_channel text,p_name text,p_origin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());result jsonb;identity jsonb;preseed boolean;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_origin not in('家族子弟','流浪孤兒','亡命草寇','深山獵戶','寒窗學子') then raise exception '出身資料不正確';end if;
 select exists(select 1 from private.player_resource_wallets where user_id=uid and channel=p_channel)or exists(select 1 from private.player_progression_states where user_id=uid and channel=p_channel)or exists(select 1 from private.player_body_states where user_id=uid and channel=p_channel)or exists(select 1 from private.player_cave_states where user_id=uid and channel=p_channel)or exists(select 1 from private.player_identity_states where user_id=uid and channel=p_channel)or exists(select 1 from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel)or exists(select 1 from private.player_art_profiles where user_id=uid and channel=p_channel)or exists(select 1 from private.player_equipment_profiles where user_id=uid and channel=p_channel) into preseed;
 if preseed and not exists(select 1 from private.player_states where user_id=uid and channel=p_channel) then raise exception '偵測到不完整的預載角色資料，請建立新的登入工作階段';end if;
 perform set_config('app.server_character_initialize','1',true);result:=public.player_new_character_initialize(p_channel,p_name);identity:=public.player_identity_bootstrap(p_channel,p_origin);return result||jsonb_build_object('identity',identity);
end $$;

revoke all on function private.guard_player_state_insert() from public,anon,authenticated;
revoke execute on function public.player_new_character_initialize_v2(text,text,text) from public,anon;grant execute on function public.player_new_character_initialize_v2(text,text,text) to authenticated;
