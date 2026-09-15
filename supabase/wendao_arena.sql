-- 問道臺：非即時玩家切磋、積分、每日次數、戰錄與每週結算
create table if not exists public.arena_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  channel text not null,
  player_name text not null,
  score integer not null default 1000 check(score>=0),
  wins integer not null default 0,
  losses integer not null default 0,
  reached_at timestamptz not null default now(),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.arena_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  play_date date not null,
  free_used integer not null default 0,
  stone_bought integer not null default 0,
  jade_bought integer not null default 0,
  bought_available integer not null default 0,
  primary key(user_id,play_date)
);
create table if not exists public.arena_matches (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  challenger_id uuid not null references auth.users(id) on delete cascade,
  defender_id uuid not null references auth.users(id) on delete cascade,
  challenger_name text not null,
  defender_name text not null,
  challenger_snapshot jsonb not null,
  defender_snapshot jsonb not null,
  status text not null default 'pending' check(status in ('pending','finished')),
  winner_id uuid,
  challenger_delta integer not null default 0,
  defender_delta integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create table if not exists public.arena_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  week_start date not null,
  rank integer not null,
  stone_bundle_count integer not null,
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(user_id,channel,week_start)
);

-- Preserve existing scores and today's purchases while separating channels.
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='arena_daily' and column_name='channel') then
  alter table public.arena_daily add column channel text not null default 'formal';
  update public.arena_daily d set channel=p.channel from public.arena_profiles p where p.user_id=d.user_id;
  alter table public.arena_daily drop constraint arena_daily_pkey;
  alter table public.arena_daily add primary key(user_id,channel,play_date);
 end if;
 if (select cardinality(conkey) from pg_constraint where conrelid='public.arena_profiles'::regclass and contype='p')=1 then
  alter table public.arena_profiles drop constraint arena_profiles_pkey;
  alter table public.arena_profiles add primary key(user_id,channel);
 end if;
end $$;

alter table public.arena_profiles enable row level security;
alter table public.arena_daily enable row level security;
alter table public.arena_matches enable row level security;
alter table public.arena_rewards enable row level security;
revoke all on public.arena_profiles,public.arena_daily,public.arena_matches,public.arena_rewards from anon,authenticated;

create table if not exists private.arena_name_owners (
  channel text not null,
  normalized_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key(channel,normalized_name)
);
create table if not exists private.arena_week_state (
  channel text primary key,
  week_start date not null
);
alter table private.arena_name_owners enable row level security;
alter table private.arena_week_state enable row level security;
revoke all on private.arena_name_owners,private.arena_week_state from public,anon,authenticated;

insert into private.arena_name_owners(channel,normalized_name,user_id)
select channel,lower(trim(player_name)),user_id from (
 select p.*,row_number() over(partition by channel,lower(trim(player_name)) order by score desc,updated_at desc,user_id) rn
 from public.arena_profiles p
) ranked where rn=1
on conflict(channel,normalized_name) do nothing;

create or replace function private.arena_canonical(p_channel text)
returns setof public.arena_profiles language sql stable security definer set search_path='' as $$
 select p.* from public.arena_profiles p
 join private.arena_name_owners o on o.channel=p.channel and o.normalized_name=lower(trim(p.player_name)) and o.user_id=p.user_id
 where p.channel=$1
$$;

create or replace function private.arena_week_start() returns date language sql stable set search_path='' as $$
 select (date_trunc('week',timezone('Asia/Taipei',now())))::date
$$;
create or replace function private.arena_rollover(p_channel text) returns void language plpgsql security definer set search_path='' as $$
declare current_week date:=private.arena_week_start(); old_week date;
begin
 perform pg_advisory_xact_lock(hashtext('wendao-arena-'||p_channel));
 select week_start into old_week from private.arena_week_state where channel=p_channel for update;
 if old_week is null then
   insert into private.arena_week_state(channel,week_start) values(p_channel,current_week) on conflict(channel) do nothing;
   return;
 end if;
 if old_week>=current_week then return; end if;
 insert into public.arena_rewards(user_id,channel,week_start,rank,stone_bundle_count)
 select user_id,p_channel,old_week,rn,
   case when rn<=10 then 16-rn when rn<=20 then 5 when rn<=30 then 4 when rn<=40 then 3 else 2 end
 from (select user_id,row_number() over(order by score desc,wins desc,reached_at asc) rn
       from private.arena_canonical(p_channel) where (wins+losses)>0) ranked
 where rn<=50 on conflict do nothing;
 -- Keep every valid profile on the new weekly board.  Give tied 1000-point
 -- profiles a one-time random, stable order instead of hiding the board.
 update public.arena_profiles set score=1000,wins=0,losses=0,
   reached_at=now()+(random()*interval '7 days'),
   snapshot=jsonb_set(snapshot,'{week_start}',to_jsonb(current_week::text)),updated_at=now()
 where channel=$1;
 update private.arena_week_state set week_start=current_week where channel=p_channel;
end $$;

create or replace function private.arena_seed_ranked_profiles(p_channel text) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Legacy function retained for compatibility. Real profiles are uploaded by
 -- eligible clients; ranking-only records cannot reconstruct five attributes.
 return;
end $$;

create or replace function public.arena_sync_profile(p_channel text,p_name text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); result jsonb; wk date:=private.arena_week_start();
begin
 if uid is null then raise exception 'authentication required'; end if;
 if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
 perform private.arena_rollover(p_channel);
 if p_snapshot->>'schema_version' is distinct from '2' or not(p_snapshot ? 'core') then
   raise exception '請重新整理遊戲以更新問道臺';
 end if;
 if jsonb_array_length(p_snapshot->'moves') not between 1 and 2 then raise exception '請先配置招式'; end if;
 if not (p_snapshot->'core' ?& array['trueQi','rootBone','physique','agility','spiritualPower']) then raise exception '戰鬥屬性不完整'; end if;
 if not (p_snapshot->'stats' ?& array['maxHp','attack','defense','evasion','accuracy','crit','qiAttack','bodyAttack']) then raise exception '戰鬥屬性不完整'; end if;
 if (p_snapshot#>>'{stats,maxHp}')::numeric<=0 or (p_snapshot#>>'{stats,crit}')::numeric not between 0 and 1 then raise exception '戰鬥屬性不正確'; end if;
 p_snapshot:=p_snapshot||jsonb_build_object('week_start',wk::text,'captured_at',floor(extract(epoch from now())*1000));
 insert into private.arena_name_owners(channel,normalized_name,user_id)
 values(p_channel,lower(trim(left(coalesce(nullif(trim(p_name),''),'無名修士'),20))),uid)
 on conflict(channel,normalized_name) do nothing;
 -- Five-minute snapshots are immutable between refreshes.
 if exists(select 1 from public.arena_profiles p where p.user_id=uid and p.channel=p_channel
   and p.snapshot->>'schema_version'='2' and (p.snapshot->>'captured_at')::numeric>extract(epoch from now()-interval '5 minutes')*1000) then
   select jsonb_build_object('score',p.score) into result from public.arena_profiles p where p.user_id=uid and p.channel=p_channel;
   return result;
 end if;
 insert into public.arena_profiles(user_id,channel,player_name,snapshot)
 values(uid,p_channel,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_snapshot)
 on conflict(user_id,channel) do update set channel=excluded.channel,player_name=excluded.player_name,snapshot=excluded.snapshot,updated_at=now();
 select jsonb_build_object('score',score,'wins',wins,'losses',losses) into result from public.arena_profiles where user_id=uid and channel=p_channel;
 return result;
end $$;

create or replace function public.arena_opponents(p_channel text)
returns table(user_id uuid,player_name text,score int,snapshot jsonb) language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); my_score int:=1000;
begin
 perform private.arena_rollover(p_channel);
 perform private.arena_seed_ranked_profiles(p_channel);
 select p.score into my_score from public.arena_profiles p where p.user_id=uid and p.channel=$1;
 return query select p.user_id,p.player_name,p.score,p.snapshot from private.arena_canonical(p_channel) p
 where p.user_id<>uid and p.snapshot->>'schema_version'='2' and p.snapshot->>'eligible'='true'
 and lower(trim(p.player_name))<>(select lower(trim(me.player_name)) from public.arena_profiles me where me.user_id=uid and me.channel=p_channel)
 order by abs(p.score-coalesce(my_score,1000)),random() limit 30;
end $$;

drop function if exists public.arena_buy_attempt(text);
create or replace function public.arena_buy_attempt(p_kind text,p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); d date:=(timezone('Asia/Taipei',now()))::date; row_data public.arena_daily;
begin
 if uid is null or p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
 if p_kind not in ('stone','jade') then raise exception 'invalid purchase'; end if;
 insert into public.arena_daily(user_id,channel,play_date) values(uid,p_channel,d) on conflict do nothing;
 select * into row_data from public.arena_daily where user_id=uid and channel=p_channel and play_date=d for update;
 if p_kind='stone' and row_data.stone_bought>=5 then raise exception 'stone purchase limit'; end if;
 if p_kind='jade' and row_data.jade_bought>=5 then raise exception 'jade purchase limit'; end if;
 update public.arena_daily set stone_bought=stone_bought+(p_kind='stone')::int,
 jade_bought=jade_bought+(p_kind='jade')::int,bought_available=bought_available+1
 where user_id=uid and channel=p_channel and play_date=d returning * into row_data;
 return to_jsonb(row_data);
end $$;

create or replace function public.arena_begin_challenge(p_channel text,p_defender uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); d date:=(timezone('Asia/Taipei',now()))::date; daily public.arena_daily; me public.arena_profiles; foe public.arena_profiles; match_id uuid;
begin
 if uid=p_defender then raise exception 'cannot challenge self'; end if;
 perform private.arena_rollover(p_channel);
 perform private.arena_seed_ranked_profiles(p_channel);
 select * into me from public.arena_profiles where user_id=uid and channel=$1;
 select * into foe from public.arena_profiles where user_id=p_defender and channel=$1;
 if me.user_id is null or foe.user_id is null then raise exception 'opponent unavailable'; end if;
 if me.snapshot->>'schema_version' is distinct from '2' or foe.snapshot->>'schema_version' is distinct from '2' then raise exception '對手尚未更新戰鬥屬性，請刷新名單'; end if;
 if me.snapshot->>'eligible'<>'true' or foe.snapshot->>'eligible'<>'true' then raise exception '境界尚未達到問道臺門檻'; end if;
 if not exists(select 1 from private.arena_canonical(p_channel) p where p.user_id=p_defender) or lower(trim(me.player_name))=lower(trim(foe.player_name)) then raise exception '舊存檔不列入挑戰，請刷新名單'; end if;
 insert into public.arena_daily(user_id,channel,play_date) values(uid,p_channel,d) on conflict do nothing;
 select * into daily from public.arena_daily where user_id=uid and channel=p_channel and play_date=d for update;
 if daily.free_used<10 then update public.arena_daily set free_used=free_used+1 where user_id=uid and channel=p_channel and play_date=d;
 elsif daily.bought_available>0 then update public.arena_daily set bought_available=bought_available-1 where user_id=uid and channel=p_channel and play_date=d;
 else raise exception 'no attempts'; end if;
 insert into public.arena_matches(channel,challenger_id,defender_id,challenger_name,defender_name,challenger_snapshot,defender_snapshot)
 values(p_channel,uid,p_defender,me.player_name,foe.player_name,me.snapshot,foe.snapshot) returning id into match_id;
 return jsonb_build_object('match_id',match_id,'challenger',me.snapshot,'opponent',foe.snapshot,'opponent_name',foe.player_name,'opponent_score',foe.score);
end $$;

create or replace function public.arena_finish_match(p_match uuid,p_won boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); m public.arena_matches; a public.arena_profiles; d public.arena_profiles; expected numeric; delta int;
begin
 select * into m from public.arena_matches where id=p_match and challenger_id=uid for update;
 if m.id is null or m.status<>'pending' then raise exception 'invalid match'; end if;
 if m.created_at<now()-interval '30 minutes' then raise exception 'match expired'; end if;
 select * into a from public.arena_profiles where user_id=m.challenger_id and channel=m.channel for update;
 select * into d from public.arena_profiles where user_id=m.defender_id and channel=m.channel for update;
 expected:=1/(1+power(10,(d.score-a.score)/400.0));
 delta:=round(32*((case when p_won then 1 else 0 end)-expected));
 if p_won then delta:=greatest(5,least(30,delta)); else delta:=-greatest(5,least(30,abs(delta))); end if;
 update public.arena_profiles set score=greatest(0,score+delta),wins=wins+(p_won)::int,losses=losses+((not p_won))::int,
 reached_at=case when delta>0 then now() else reached_at end,updated_at=now() where user_id=m.challenger_id and channel=m.channel;
 update public.arena_profiles set score=greatest(0,score-delta),wins=wins+((not p_won))::int,losses=losses+(p_won)::int,
 reached_at=case when delta<0 then now() else reached_at end,updated_at=now() where user_id=m.defender_id and channel=m.channel;
 update public.arena_matches set status='finished',winner_id=case when p_won then challenger_id else defender_id end,
 challenger_delta=delta,defender_delta=-delta,finished_at=now() where id=p_match;
 return jsonb_build_object('delta',delta,'score',greatest(0,a.score+delta));
end $$;

create or replace function public.arena_status(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); d date:=(timezone('Asia/Taipei',now()))::date; p public.arena_profiles; dayrow public.arena_daily; own_rank int;
begin
 perform private.arena_rollover(p_channel);
 select * into p from public.arena_profiles where user_id=uid and channel=$1;
 insert into public.arena_daily(user_id,channel,play_date) values(uid,p_channel,d) on conflict do nothing;
 select * into dayrow from public.arena_daily where user_id=uid and channel=p_channel and play_date=d;
 select ranked.rn into own_rank from (
  select row_number() over(order by c.score desc,c.wins desc,c.reached_at asc,c.user_id) rn,c.player_name
  from private.arena_canonical(p_channel) c
 ) ranked where lower(trim(ranked.player_name))=lower(trim(p.player_name));
 return jsonb_build_object('score',coalesce(p.score,1000),'wins',coalesce(p.wins,0),'losses',coalesce(p.losses,0),'rank',own_rank,
 'free_remaining',greatest(0,10-dayrow.free_used),'bought_available',dayrow.bought_available,'stone_bought',dayrow.stone_bought,'jade_bought',dayrow.jade_bought);
end $$;

create or replace function public.arena_rankings(p_channel text)
returns table(rank bigint,player_name text,score int,wins int,losses int) language sql security definer set search_path='' as $$
 select * from (select row_number() over(order by p.score desc,p.wins desc,p.reached_at asc,p.user_id) rank,p.player_name,p.score,p.wins,p.losses
 from private.arena_canonical(p_channel) p) r where r.rank<=50
$$;
create or replace function public.arena_history(p_channel text)
returns table(id uuid,challenger_name text,defender_name text,winner_id uuid,challenger_delta int,defender_delta int,created_at timestamptz,was_challenger boolean)
language sql security definer set search_path='' as $$
 select id,challenger_name,defender_name,winner_id,challenger_delta,defender_delta,created_at,challenger_id=(select auth.uid())
 from public.arena_matches where channel=$1 and status='finished' and ((select auth.uid())=challenger_id or (select auth.uid())=defender_id)
 order by finished_at desc limit 10
$$;
create or replace function public.arena_claim_rewards(p_channel text)
returns table(week_start date,rank int,stone_bundle_count int) language plpgsql security definer set search_path='' as $$
begin
 perform private.arena_rollover(p_channel);
 return query update public.arena_rewards set claimed=true where user_id=(select auth.uid()) and channel=$1 and not claimed
 returning arena_rewards.week_start,arena_rewards.rank,arena_rewards.stone_bundle_count;
end $$;
revoke execute on function public.arena_sync_profile(text,text,jsonb),public.arena_opponents(text),public.arena_buy_attempt(text,text),public.arena_begin_challenge(text,uuid),public.arena_finish_match(uuid,boolean),public.arena_status(text),public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text) from public,anon;
grant execute on function public.arena_sync_profile(text,text,jsonb),public.arena_opponents(text),public.arena_buy_attempt(text,text),public.arena_begin_challenge(text,uuid),public.arena_finish_match(uuid,boolean),public.arena_status(text),public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text) to authenticated;
revoke all on function private.arena_canonical(text) from public,anon,authenticated;
