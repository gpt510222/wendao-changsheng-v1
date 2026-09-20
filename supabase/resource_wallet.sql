-- One-time legacy import boundary for the server-authoritative resource wallet.
create table if not exists private.player_resource_wallets (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('formal','test')),
  revision bigint not null default 1 check (revision > 0),
  migration_status text not null default 'migrating' check (migration_status in ('migrating','active','quarantined')),
  cultivation numeric(78,0) not null default 0 check (cultivation >= 0),
  sword_essence numeric(78,0) not null default 0 check (sword_essence >= 0),
  aura numeric(78,0) not null default 0 check (aura >= 0),
  spirit_stone numeric(78,0) not null default 0 check (spirit_stone >= 0),
  food numeric(78,0) not null default 0 check (food >= 0),
  wood numeric(78,0) not null default 0 check (wood >= 0),
  meteor_iron numeric(78,0) not null default 0 check (meteor_iron >= 0),
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,channel)
);
alter table private.player_resource_wallets enable row level security;
revoke all on private.player_resource_wallets from public,anon,authenticated;

create or replace function private.legacy_resource_amount(p_resources jsonb,p_key text)
returns numeric language plpgsql immutable set search_path='' as $$
declare raw text;
begin
  raw:=coalesce(p_resources->>p_key,'0');
  if raw !~ '^[0-9]+$' then return 0; end if;
  return least(raw::numeric,1e60::numeric);
exception when others then return 0;
end $$;

create or replace function public.player_resource_wallet_bootstrap(p_channel text,p_resources jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); wallet private.player_resource_wallets;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') or p_resources is null or jsonb_typeof(p_resources)<>'object' then raise exception 'invalid request'; end if;
  insert into private.player_resource_wallets(user_id,channel,cultivation,sword_essence,aura,spirit_stone,food,wood,meteor_iron)
  values(uid,p_channel,private.legacy_resource_amount(p_resources,'free'),private.legacy_resource_amount(p_resources,'swordEssence'),private.legacy_resource_amount(p_resources,'aura'),private.legacy_resource_amount(p_resources,'spiritStone'),private.legacy_resource_amount(p_resources,'food'),private.legacy_resource_amount(p_resources,'wood'),private.legacy_resource_amount(p_resources,'meteorIron'))
  on conflict(user_id,channel) do nothing;
  select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel;
  if wallet.revision=1 and not exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.event_type='resource_wallet_legacy_import') then
    insert into private.player_state_events(user_id,channel,revision,event_type,payload)
    values(uid,p_channel,1,'resource_wallet_legacy_import',jsonb_build_object('wallet_revision',wallet.revision));
  end if;
  return jsonb_build_object('revision',wallet.revision,'migration_status',wallet.migration_status,'resources',jsonb_build_object('free',wallet.cultivation::text,'swordEssence',wallet.sword_essence::text,'aura',wallet.aura::text,'spiritStone',wallet.spirit_stone::text,'food',wallet.food::text,'wood',wallet.wood::text,'meteorIron',wallet.meteor_iron::text));
end $$;

create or replace function public.player_resource_wallet_get(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); wallet private.player_resource_wallets;
begin
  if uid is null then raise exception 'authentication required'; end if;
  if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
  select * into wallet from private.player_resource_wallets where user_id=uid and channel=p_channel;
  if wallet.user_id is null then return null; end if;
  return jsonb_build_object('revision',wallet.revision,'migration_status',wallet.migration_status,'resources',jsonb_build_object('free',wallet.cultivation::text,'swordEssence',wallet.sword_essence::text,'aura',wallet.aura::text,'spiritStone',wallet.spirit_stone::text,'food',wallet.food::text,'wood',wallet.wood::text,'meteorIron',wallet.meteor_iron::text));
end $$;

revoke execute on function public.player_resource_wallet_bootstrap(text,jsonb),public.player_resource_wallet_get(text) from public,anon;
grant execute on function public.player_resource_wallet_bootstrap(text,jsonb),public.player_resource_wallet_get(text) to authenticated;
