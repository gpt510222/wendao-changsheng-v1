-- 藏機局：非即時猜拳設局、押注託管、應局結算與設局方領獎
create table if not exists public.cangji_games (
  id uuid primary key default gen_random_uuid(),
  channel text not null check(channel in ('formal','test')),
  creator_id uuid not null references auth.users(id) on delete cascade,
  creator_name text not null,
  creator_choice text not null check(creator_choice in ('rock','scissors','paper')),
  wager integer not null check(wager between 5000 and 30000 and wager % 500=0),
  status text not null default 'open' check(status in ('open','resolved','cancelled')),
  responder_id uuid references auth.users(id) on delete set null,
  responder_name text,
  responder_choice text check(responder_choice in ('rock','scissors','paper')),
  winner_id uuid,
  fee integer not null default 0,
  creator_payout integer not null default 0,
  responder_payout integer not null default 0,
  creator_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists cangji_games_open_idx on public.cangji_games(channel,status,created_at desc);
create index if not exists cangji_games_creator_idx on public.cangji_games(creator_id,channel,created_at desc);
alter table public.cangji_games enable row level security;
revoke all on public.cangji_games from anon,authenticated;

create or replace function private.cangji_creator_wins(a text,b text)
returns boolean language sql immutable set search_path='' as $$
 select (a='rock' and b='scissors') or (a='scissors' and b='paper') or (a='paper' and b='rock')
$$;

create or replace function public.cangji_create_game(p_channel text,p_name text,p_choice text,p_wager integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); game_id uuid;
begin
 if uid is null then raise exception '請重新登入後再設局'; end if;
 if p_channel not in ('formal','test') or p_choice not in ('rock','scissors','paper') then raise exception '設局內容不正確'; end if;
 if p_wager not between 5000 and 30000 or p_wager%500<>0 then raise exception '押注須為5,000至30,000，並以500為單位'; end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-cangji-'||p_channel));
 if (select count(*) from public.cangji_games where creator_id=uid and channel=p_channel and status='open')>=5 then
   raise exception '待應之局已達上限 5/5';
 end if;
 insert into public.cangji_games(channel,creator_id,creator_name,creator_choice,wager)
 values(p_channel,uid,left(coalesce(nullif(trim(p_name),''),'無名修士'),20),p_choice,p_wager)
 returning id into game_id;
 return jsonb_build_object('id',game_id,'wager',p_wager);
end $$;

create or replace function public.cangji_open_games(p_channel text)
returns table(id uuid,creator_name text,wager integer,created_at timestamptz)
language sql security definer set search_path='' as $$
 select g.id,g.creator_name,g.wager,g.created_at
 from public.cangji_games g
 where g.channel=$1 and g.status='open' and g.creator_id<>(select auth.uid())
 order by g.created_at desc
$$;

create or replace function public.cangji_accept_game(p_game uuid,p_name text,p_choice text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); g public.cangji_games; creator_won boolean; tied boolean; house_fee integer; winner uuid; cp integer; rp integer;
begin
 if uid is null then raise exception '請重新登入後再應局'; end if;
 if p_choice not in ('rock','scissors','paper') then raise exception '請選擇出拳'; end if;
 select * into g from public.cangji_games where id=p_game for update;
 if g.id is null or g.status<>'open' then raise exception '此局已被其他道友應下'; end if;
 if g.creator_id=uid then raise exception '不可應自己設下的局'; end if;
 tied:=g.creator_choice=p_choice;
 creator_won:=private.cangji_creator_wins(g.creator_choice,p_choice);
 house_fee:=case when tied then 0 else floor(g.wager*.02)::integer end;
 winner:=case when tied then null when creator_won then g.creator_id else uid end;
 cp:=case when tied then g.wager when creator_won then g.wager*2-house_fee else 0 end;
 rp:=case when tied then g.wager when creator_won then 0 else g.wager*2-house_fee end;
 update public.cangji_games set status='resolved',responder_id=uid,
   responder_name=left(coalesce(nullif(trim(p_name),''),'無名修士'),20),responder_choice=p_choice,
   winner_id=winner,fee=house_fee,creator_payout=cp,responder_payout=rp,resolved_at=now()
 where id=g.id;
 return jsonb_build_object('id',g.id,'creator_name',g.creator_name,'creator_choice',g.creator_choice,
   'responder_choice',p_choice,'outcome',case when tied then 'draw' when creator_won then 'loss' else 'win' end,
   'wager',g.wager,'payout',rp,'fee',house_fee,'resolved_at',now());
end $$;

create or replace function public.cangji_creator_games(p_channel text)
returns table(id uuid,status text,opponent_name text,creator_choice text,responder_choice text,wager integer,outcome text,payout integer,fee integer,claimed boolean,created_at timestamptz,resolved_at timestamptz)
language sql security definer set search_path='' as $$
 select g.id,g.status,g.responder_name,g.creator_choice,
   case when g.status='resolved' then g.responder_choice else null end,g.wager,
   case when g.status<>'resolved' then null when g.winner_id is null then 'draw' when g.winner_id=g.creator_id then 'win' else 'loss' end,
   g.creator_payout,g.fee,g.creator_claimed,g.created_at,g.resolved_at
 from public.cangji_games g where g.creator_id=(select auth.uid()) and g.channel=$1 and g.status<>'cancelled'
 order by g.created_at desc
$$;

create or replace function public.cangji_claim_game(p_game uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); g public.cangji_games;
begin
 select * into g from public.cangji_games where id=p_game and creator_id=uid for update;
 if g.id is null or g.status<>'resolved' then raise exception '此局尚未結算'; end if;
 if g.creator_claimed then raise exception '此局已領取'; end if;
 update public.cangji_games set creator_claimed=true where id=g.id;
 return jsonb_build_object('id',g.id,'payout',g.creator_payout,'fee',g.fee,
   'outcome',case when g.winner_id is null then 'draw' when g.winner_id=uid then 'win' else 'loss' end);
end $$;

create or replace function public.cangji_cancel_game(p_game uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); g public.cangji_games;
begin
 select * into g from public.cangji_games where id=p_game and creator_id=uid for update;
 if g.id is null or g.status<>'open' then raise exception '此局已有人應下，無法撤回'; end if;
 update public.cangji_games set status='cancelled',cancelled_at=now() where id=g.id;
 return jsonb_build_object('id',g.id,'refund',g.wager);
end $$;

create or replace function public.cangji_claim_all_games(p_channel text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); total_payout bigint:=0; claimed_count integer:=0;
begin
 if uid is null then raise exception '請重新登入後再領取'; end if;
 if p_channel not in ('formal','test') then raise exception '藏機局版本不正確'; end if;
 with claimed as (
   update public.cangji_games
   set creator_claimed=true
   where creator_id=uid and channel=p_channel and status='resolved' and creator_claimed=false
   returning creator_payout
 )
 select coalesce(sum(creator_payout),0),count(*) into total_payout,claimed_count from claimed;
 return jsonb_build_object('payout',total_payout,'count',claimed_count);
end $$;

revoke execute on function public.cangji_create_game(text,text,text,integer),public.cangji_open_games(text),public.cangji_accept_game(uuid,text,text),public.cangji_creator_games(text),public.cangji_claim_game(uuid),public.cangji_cancel_game(uuid),public.cangji_claim_all_games(text) from public,anon;
grant execute on function public.cangji_create_game(text,text,text,integer),public.cangji_open_games(text),public.cangji_accept_game(uuid,text,text),public.cangji_creator_games(text),public.cangji_claim_game(uuid),public.cangji_cancel_game(uuid),public.cangji_claim_all_games(text) to authenticated;
revoke all on function private.cangji_creator_wins(text,text) from public,anon,authenticated;
