create table if not exists private.player_artifact_states(
 user_id uuid not null references auth.users(id) on delete cascade,channel text not null check(channel in('formal','test')),
 owned jsonb not null default '[]'::jsonb check(jsonb_typeof(owned)='array'),equipped text not null default '',
 legacy_imported boolean not null default false,revision bigint not null default 1,updated_at timestamptz not null default now(),
 primary key(user_id,channel)
);
alter table private.player_artifact_states enable row level security;
revoke all on private.player_artifact_states from public,anon,authenticated;
create or replace function private.artifact_allowed(p_id text) returns boolean language sql immutable set search_path='' as $$select p_id in('mountain-river-seal','sun-moon-wheel','four-poles-stele')$$;
create or replace function private.artifact_snapshot(a private.player_artifact_states) returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('revision',a.revision,'owned',a.owned,'equipped',a.equipped)$$;

create or replace function public.player_artifact_bootstrap(p_channel text,p_legacy_owned jsonb,p_legacy_equipped text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());a private.player_artifact_states;m private.player_mainline_states;allowed_count integer;clean jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or jsonb_typeof(coalesce(p_legacy_owned,'[]'))<>'array' then raise exception '法寶資料不正確';end if;
 insert into private.player_artifact_states(user_id,channel) values(uid,p_channel) on conflict do nothing;select * into a from private.player_artifact_states where user_id=uid and channel=p_channel for update;select * into m from private.player_mainline_states where user_id=uid and channel=p_channel;
 if m.user_id is null then raise exception '主線進度尚未建立';end if;
 if not a.legacy_imported then
  allowed_count:=(case when m.cleared_stage>=6 then 1 else 0 end)+(case when m.cleared_stage>=12 then 1 else 0 end)+(case when m.cleared_stage>=18 then 1 else 0 end);
  select coalesce(jsonb_agg(id),'[]'::jsonb) into clean from (select distinct value#>>'{}' id from jsonb_array_elements(coalesce(p_legacy_owned,'[]')) where private.artifact_allowed(value#>>'{}') limit allowed_count) q;
  update private.player_artifact_states set owned=clean,equipped=case when clean?p_legacy_equipped then p_legacy_equipped else '' end,legacy_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into a;
 end if;return private.artifact_snapshot(a);
end $$;

create or replace function public.player_artifact_command(p_channel text,p_action text,p_artifact text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());a private.player_artifact_states;m private.player_mainline_states;allowed_count integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') or p_action not in('claim','equip') or p_request_id is null then raise exception '法寶請求不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id) then raise exception '重複的法寶請求';end if;
 select * into a from private.player_artifact_states where user_id=uid and channel=p_channel for update;select * into m from private.player_mainline_states where user_id=uid and channel=p_channel;
 if a.user_id is null or not a.legacy_imported or m.user_id is null then raise exception '伺服器法寶資料尚未建立';end if;
 if p_action='claim' then
  if not private.artifact_allowed(p_artifact) or a.owned?p_artifact then raise exception '法寶選擇不正確';end if;
  allowed_count:=(case when m.cleared_stage>=6 then 1 else 0 end)+(case when m.cleared_stage>=12 then 1 else 0 end)+(case when m.cleared_stage>=18 then 1 else 0 end);
  if jsonb_array_length(a.owned)>=allowed_count then raise exception '尚無可認主的器臺';end if;
  update private.player_artifact_states set owned=owned||jsonb_build_array(p_artifact),equipped=p_artifact,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into a;
 else
  if coalesce(p_artifact,'')<>'' and not a.owned?p_artifact then raise exception '尚未持有此法寶';end if;
  update private.player_artifact_states set equipped=coalesce(p_artifact,''),revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into a;
 end if;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload) values(uid,p_channel,a.revision,'artifact_'||p_action,p_request_id,jsonb_build_object('artifact',p_artifact));
 return private.artifact_snapshot(a);
end $$;
revoke all on function private.artifact_allowed(text),private.artifact_snapshot(private.player_artifact_states) from public,anon,authenticated;
revoke execute on function public.player_artifact_bootstrap(text,jsonb,text),public.player_artifact_command(text,text,text,uuid) from public,anon;
grant execute on function public.player_artifact_bootstrap(text,jsonb,text),public.player_artifact_command(text,text,text,uuid) to authenticated;
