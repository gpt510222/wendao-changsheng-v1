-- Server-authoritative player state foundation.
-- Legacy browser saves are retained for migration only and are never trusted
-- by rankings, arena, ascension, or other competitive systems.
create table if not exists private.player_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  revision bigint not null default 1 check (revision > 0),
  trust_status text not null default 'legacy_unverified' check (trust_status in ('legacy_unverified','verified','quarantined')),
  legacy_state jsonb,
  authoritative_state jsonb not null default '{}'::jsonb,
  last_settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,channel),
  check (legacy_state is null or jsonb_typeof(legacy_state)='object'),
  check (jsonb_typeof(authoritative_state)='object')
);

create table if not exists private.player_state_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  revision bigint not null,
  event_type text not null,
  request_id uuid not null default gen_random_uuid(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id,channel,request_id)
);

alter table private.player_states enable row level security;
alter table private.player_state_events enable row level security;
revoke all on private.player_states,private.player_state_events from public,anon,authenticated;

create or replace function public.player_state_bootstrap(p_channel text,p_legacy_state jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data private.player_states; player_name text; initial_settled_at timestamptz:=now();
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
  if p_legacy_state is null or jsonb_typeof(p_legacy_state)<>'object' or pg_column_size(p_legacy_state)>5242880 then raise exception 'invalid legacy state'; end if;
  player_name:=left(trim(coalesce(p_legacy_state->>'name','')),20);
  if player_name='' then raise exception 'character name required'; end if;
  if coalesce(p_legacy_state->>'lastSave','') ~ '^[0-9]{10,16}$' then
    initial_settled_at:=greatest(now()-interval '24 hours',least(now(),to_timestamp((p_legacy_state->>'lastSave')::numeric/1000)));
  end if;
  insert into private.player_states(user_id,channel,legacy_state,authoritative_state,last_settled_at)
  values(uid,p_channel,p_legacy_state,jsonb_build_object('name',player_name,'schema_version',1),initial_settled_at)
  on conflict(user_id,channel) do nothing;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel;
  if row_data.revision=1 and not exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel) then
    insert into private.player_state_events(user_id,channel,revision,event_type,payload)
    values(uid,p_channel,1,'legacy_bootstrap',jsonb_build_object('bytes',pg_column_size(p_legacy_state)));
  end if;
  return jsonb_build_object('revision',row_data.revision,'trust_status',row_data.trust_status,'last_settled_at',row_data.last_settled_at,'state',row_data.authoritative_state);
end $$;

create or replace function public.player_state_get(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data private.player_states;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel;
  if row_data.user_id is null then return null; end if;
  return jsonb_build_object('revision',row_data.revision,'trust_status',row_data.trust_status,'last_settled_at',row_data.last_settled_at,'state',row_data.authoritative_state);
end $$;

create or replace function public.player_state_claim_elapsed(p_channel text,p_expected_revision bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); row_data private.player_states; elapsed_seconds int;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_request_id is null then raise exception 'invalid request'; end if;
  select * into row_data from private.player_states where user_id=uid and channel=p_channel for update;
  if row_data.user_id is null then raise exception 'player state not initialized'; end if;
  if row_data.revision<>p_expected_revision then raise exception 'state revision conflict'; end if;
  if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id) then
    return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',0,'duplicate',true);
  end if;
  elapsed_seconds:=least(86400,greatest(0,floor(extract(epoch from now()-row_data.last_settled_at))::int));
  update private.player_states set revision=revision+1,last_settled_at=now(),updated_at=now()
  where user_id=uid and channel=p_channel returning * into row_data;
  insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)
  values(uid,p_channel,row_data.revision,'elapsed_window_claimed',p_request_id,jsonb_build_object('elapsed_seconds',elapsed_seconds));
  return jsonb_build_object('revision',row_data.revision,'elapsed_seconds',elapsed_seconds,'duplicate',false,'server_time',now());
end $$;

revoke execute on function public.player_state_bootstrap(text,jsonb),public.player_state_get(text),public.player_state_claim_elapsed(text,bigint,uuid) from public,anon;
grant execute on function public.player_state_bootstrap(text,jsonb),public.player_state_get(text),public.player_state_claim_elapsed(text,bigint,uuid) to authenticated;
