create table if not exists private.player_progression_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  revision bigint not null default 1 check (revision>0),
  cultivation_awakened boolean not null default false,
  spirit_path_opened boolean not null default false,
  sword_path_opened boolean not null default false,
  body_path_opened boolean not null default false,
  spirit_level integer not null default 0 check (spirit_level between 0 and 228),
  sword_level integer not null default 0 check (sword_level between 0 and 228),
  body_level integer not null default 0 check (body_level between 0 and 228),
  sword_trial_wins integer not null default 0 check (sword_trial_wins between 0 and 228),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,channel)
);
alter table private.player_progression_states enable row level security;
revoke all on private.player_progression_states from public,anon,authenticated;

create or replace function public.player_progression_bootstrap(p_channel text,p_progress jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); p private.player_progression_states;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or jsonb_typeof(p_progress)<>'object' then raise exception 'invalid request';end if;
  insert into private.player_progression_states(user_id,channel,cultivation_awakened,spirit_path_opened,sword_path_opened,body_path_opened,spirit_level,sword_level,body_level,sword_trial_wins)
  values(uid,p_channel,
    coalesce((p_progress->>'cultivationAwakened')::boolean,false),
    coalesce((p_progress->>'spiritPathOpened')::boolean,false),
    coalesce((p_progress->>'swordPathOpened')::boolean,false),
    coalesce((p_progress->>'bodyPathOpened')::boolean,false),
    least(228,greatest(0,coalesce((p_progress->>'spiritLevel')::int,0))),
    least(228,greatest(0,coalesce((p_progress->>'swordLevel')::int,0))),
    least(228,greatest(0,coalesce((p_progress->>'bodyLevel')::int,0))),
    least(228,greatest(0,coalesce((p_progress->>'swordTrialWins')::int,0)))
  ) on conflict(user_id,channel) do nothing;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
  return jsonb_build_object('revision',p.revision,'cultivationAwakened',p.cultivation_awakened,'spiritPathOpened',p.spirit_path_opened,'swordPathOpened',p.sword_path_opened,'bodyPathOpened',p.body_path_opened,'spiritLevel',p.spirit_level,'swordLevel',p.sword_level,'bodyLevel',p.body_level,'swordTrialWins',p.sword_trial_wins);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid progression state';
end $$;

revoke execute on function public.player_progression_bootstrap(text,jsonb) from public,anon;
grant execute on function public.player_progression_bootstrap(text,jsonb) to authenticated;
