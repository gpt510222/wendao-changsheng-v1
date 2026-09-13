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
alter table public.arena_profiles enable row level security;
alter table public.arena_daily enable row level security;
alter table public.arena_matches enable row level security;
alter table public.arena_rewards enable row level security;
revoke all on public.arena_profiles,public.arena_daily,public.arena_matches,public.arena_rewards from anon,authenticated;

create or replace function private.arena_week_start() returns date language sql stable set search_path='' as $$
 select (date_trunc('week',timezone('Asia/Taipei',now())))::date
$$;
create or replace function private.arena_rollover(p_channel text) returns void language plpgsql security definer set search_path='' as $$
declare current_week date:=private.arena_week_start(); old_week date;
begin
 perform pg_advisory_xact_lock(hashtext('wendao-arena-'||p_channel));
 select min((snapshot->>'week_start')::date) into old_week from public.arena_profiles where channel=$1 and snapshot ? 'week_start';
 if old_week is null or old_week>=current_week then return; end if;
 insert into public.arena_rewards(user_id,channel,week_start,rank,stone_bundle_count)
 select user_id,p_channel,old_week,rn,
   case when rn<=10 then 16-rn when rn<=20 then 5 when rn<=30 then 4 when rn<=40 then 3 else 2 end
 from (select user_id,row_number() over(order by score desc,wins desc,reached_at asc) rn
       from public.arena_profiles where channel=$1 and (wins+losses)>0) ranked
 where rn<=50 on conflict do nothing;
 update public.arena_profiles set score=1000,wins=0,losses=0,reached_at=now(),
   snapshot=jsonb_set(snapshot,'{week_start}',to_jsonb(current_week::text)),updated_at=now()
 where channel=$1;
end $$;

create or replace function private.arena_seed_ranked_profiles(p_channel text) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.arena_profiles(user_id,channel,player_name,snapshot)
 select r.user_id,p_channel,r.player_name,
   jsonb_build_object(
    'eligible',true,
    'highest_realm',case
      when coalesce(r.body_level,0)/4.0>=greatest(coalesce(r.spirit_level,0)/10.0,coalesce(r.sword_level,0)/10.0) then '煉體・第'||(floor(coalesce(r.body_level,0)/4)+1)::int||'境'||(mod(coalesce(r.body_level,0),4)+1)::int||'階'
      when coalesce(r.sword_level,0)>=coalesce(r.spirit_level,0) then '淬劍・第'||(floor(coalesce(r.sword_level,0)/10)+1)::int||'境'||(mod(coalesce(r.sword_level,0),10)+1)::int||'階'
      else '練氣・第'||(floor(coalesce(r.spirit_level,0)/10)+1)::int||'境'||(mod(coalesce(r.spirit_level,0),10)+1)::int||'階' end,
    'combat_power',greatest(1,r.combat_power),'gender','男','sword_embryo','',
    'moves',jsonb_build_array(jsonb_build_object('name','凝念馭元','min',0.86,'max',1.04),jsonb_build_object('name','抱元守一','min',0.92,'max',1.08)),
    'stats',jsonb_build_object('maxHp',greatest(125,round(sqrt(greatest(1,r.combat_power))*16)),'attack',greatest(12,round(sqrt(greatest(1,r.combat_power))*1.8)),'defense',greatest(0,round(sqrt(greatest(1,r.combat_power))*.65)),'evasion',60,'accuracy',75,'crit',8,'damageReduction',0),
    'week_start',private.arena_week_start()::text,'rank_seeded',true)
 from public.player_rankings r
 where (coalesce(r.spirit_level,0)>=40 or coalesce(r.sword_level,0)>=40 or coalesce(r.body_level,0)>=16)
   and (case when p_channel='formal' then r.game_version like 'v1.0.0%' else r.game_version like '20260902-49%' end)
 on conflict(user_id) do nothing;
end $$;

create or replace function public.arena_sync_profile(p_channel text,p_name text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); result jsonb; wk date:=private.arena_week_start();
begin
 if uid is null then raise exception 'authentication required'; end if;
 if p_channel not in ('formal','test') then raise exception 'invalid channel'; end if;
 perform private.arena_rollover(p_channel);
 p_snapshot:=coalesce(p_snapshot,'{}'::jsonb)||jsonb_build_object('week_start',wk::text);
 insert into public.arena_profiles(user_id,channel,player_name,snapshot)
 values(uid,p_channel,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_snapshot)
 on conflict(user_id) do update set channel=excluded.channel,player_name=excluded.player_name,snapshot=excluded.snapshot,updated_at=now();
 select jsonb_build_object('score',score,'wins',wins,'losses',losses) into result from public.arena_profiles where user_id=uid;
 return result;
end $$;

create or replace function public.arena_opponents(p_channel text)
returns table(user_id uuid,player_name text,score int,snapshot jsonb) language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); my_score int:=1000;
begin
 perform private.arena_rollover(p_channel);
 perform private.arena_seed_ranked_profiles(p_channel);
 select p.score into my_score from public.arena_profiles p where p.user_id=uid and p.channel=$1;
 return query select p.user_id,p.player_name,p.score,p.snapshot from public.arena_profiles p
 where p.channel=$1 and p.user_id<>uid and coalesce((p.snapshot->>'eligible')::boolean,false)=true
 order by abs(p.score-coalesce(my_score,1000)),random() limit 30;
end $$;

create or replace function public.arena_buy_attempt(p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); d date:=(timezone('Asia/Taipei',now()))::date; row_data public.arena_daily;
begin
 if p_kind not in ('stone','jade') then raise exception 'invalid purchase'; end if;
 insert into public.arena_daily(user_id,play_date) values(uid,d) on conflict do nothing;
 select * into row_data from public.arena_daily where user_id=uid and play_date=d for update;
 if p_kind='stone' and row_data.stone_bought>=5 then raise exception 'stone purchase limit'; end if;
 if p_kind='jade' and row_data.jade_bought>=5 then raise exception 'jade purchase limit'; end if;
 update public.arena_daily set stone_bought=stone_bought+(p_kind='stone')::int,
 jade_bought=jade_bought+(p_kind='jade')::int,bought_available=bought_available+1
 where user_id=uid and play_date=d returning * into row_data;
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
 if exists(select 1 from public.arena_matches where challenger_id=uid and defender_id=p_defender and created_at>=date_trunc('day',timezone('Asia/Taipei',now())) at time zone 'Asia/Taipei') then raise exception 'already challenged today'; end if;
 insert into public.arena_daily(user_id,play_date) values(uid,d) on conflict do nothing;
 select * into daily from public.arena_daily where user_id=uid and play_date=d for update;
 if daily.free_used<10 then update public.arena_daily set free_used=free_used+1 where user_id=uid and play_date=d;
 elsif daily.bought_available>0 then update public.arena_daily set bought_available=bought_available-1 where user_id=uid and play_date=d;
 else raise exception 'no attempts'; end if;
 insert into public.arena_matches(channel,challenger_id,defender_id,challenger_name,defender_name,challenger_snapshot,defender_snapshot)
 values(p_channel,uid,p_defender,me.player_name,foe.player_name,me.snapshot,foe.snapshot) returning id into match_id;
 return jsonb_build_object('match_id',match_id,'opponent',foe.snapshot,'opponent_name',foe.player_name,'opponent_score',foe.score);
end $$;

create or replace function public.arena_finish_match(p_match uuid,p_won boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); m public.arena_matches; a public.arena_profiles; d public.arena_profiles; expected numeric; delta int;
begin
 select * into m from public.arena_matches where id=p_match and challenger_id=uid for update;
 if m.id is null or m.status<>'pending' then raise exception 'invalid match'; end if;
 if m.created_at<now()-interval '30 minutes' then raise exception 'match expired'; end if;
 select * into a from public.arena_profiles where user_id=m.challenger_id for update;
 select * into d from public.arena_profiles where user_id=m.defender_id for update;
 expected:=1/(1+power(10,(d.score-a.score)/400.0));
 delta:=round(32*((case when p_won then 1 else 0 end)-expected));
 if p_won then delta:=greatest(5,least(30,delta)); else delta:=-greatest(5,least(30,abs(delta))); end if;
 update public.arena_profiles set score=greatest(0,score+delta),wins=wins+(p_won)::int,losses=losses+((not p_won))::int,
 reached_at=case when delta>0 then now() else reached_at end,updated_at=now() where user_id=m.challenger_id;
 update public.arena_profiles set score=greatest(0,score-delta),wins=wins+((not p_won))::int,losses=losses+(p_won)::int,
 reached_at=case when delta<0 then now() else reached_at end,updated_at=now() where user_id=m.defender_id;
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
 insert into public.arena_daily(user_id,play_date) values(uid,d) on conflict do nothing;
 select * into dayrow from public.arena_daily where user_id=uid and play_date=d;
 if coalesce(p.wins,0)+coalesce(p.losses,0)>0 then
  select count(*)+1 into own_rank from public.arena_profiles x where x.channel=$1 and (x.wins+x.losses)>0 and (x.score>p.score or x.score=p.score and (x.wins>p.wins or x.wins=p.wins and x.reached_at<p.reached_at));
 end if;
 return jsonb_build_object('score',coalesce(p.score,1000),'wins',coalesce(p.wins,0),'losses',coalesce(p.losses,0),'rank',own_rank,
 'free_remaining',greatest(0,10-dayrow.free_used),'bought_available',dayrow.bought_available,'stone_bought',dayrow.stone_bought,'jade_bought',dayrow.jade_bought);
end $$;

create or replace function public.arena_rankings(p_channel text)
returns table(rank bigint,player_name text,score int,wins int,losses int) language sql security definer set search_path='' as $$
 select * from (select row_number() over(order by score desc,wins desc,reached_at asc) rank,player_name,score,wins,losses
 from public.arena_profiles where channel=$1 and (wins+losses)>0) r where rank<=50
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
revoke execute on function public.arena_sync_profile(text,text,jsonb),public.arena_opponents(text),public.arena_buy_attempt(text),public.arena_begin_challenge(text,uuid),public.arena_finish_match(uuid,boolean),public.arena_status(text),public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text) from public,anon;
grant execute on function public.arena_sync_profile(text,text,jsonb),public.arena_opponents(text),public.arena_buy_attempt(text),public.arena_begin_challenge(text,uuid),public.arena_finish_match(uuid,boolean),public.arena_status(text),public.arena_rankings(text),public.arena_history(text),public.arena_claim_rewards(text) to authenticated;
