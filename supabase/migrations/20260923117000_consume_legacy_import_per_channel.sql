create table if not exists private.legacy_character_import_consumptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  consumed_at timestamptz not null default now(),
  primary key (user_id,channel)
);

insert into private.legacy_character_import_consumptions(user_id,channel,consumed_at)
select user_id,channel,coalesce(created_at,now())
from private.player_states
on conflict (user_id,channel) do nothing;

alter table private.legacy_character_import_consumptions enable row level security;
revoke all on private.legacy_character_import_consumptions from public,anon,authenticated;

create or replace function private.guard_player_state_insert()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce(current_setting('app.server_character_initialize',true),'')='1' then
    return new;
  end if;

  -- The browser reconnect path calls INSERT ... ON CONFLICT DO NOTHING.  Let an
  -- already-created character reach the conflict handler without consuming a
  -- second migration ticket.
  if exists (
    select 1 from private.player_states
    where user_id=new.user_id and channel=new.channel
  ) then
    return new;
  end if;

  if not exists (
    select 1 from private.legacy_character_import_eligibility
    where user_id=new.user_id
  ) then
    raise exception '新帳號必須使用伺服器建角流程';
  end if;

  insert into private.legacy_character_import_consumptions(user_id,channel)
  values(new.user_id,new.channel)
  on conflict (user_id,channel) do nothing;

  if not found then
    raise exception '此版本的舊存檔匯入資格已使用';
  end if;
  return new;
end $$;

revoke all on function private.guard_player_state_insert() from public,anon,authenticated;
