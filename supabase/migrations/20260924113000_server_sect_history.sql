create table if not exists private.player_sect_histories(
 user_id uuid not null references auth.users(id) on delete cascade,
 channel text not null check(channel in('formal','test')),
 sect_name text not null,
 sect_rank integer not null default 0 check(sect_rank between 0 and 4),
 acting_leader boolean not null default false,
 sect_merit numeric not null default 0 check(sect_merit>=0),
 sect_contribution numeric not null default 0 check(sect_contribution>=0),
 task_id text not null default'',
 updated_at timestamptz not null default now(),
 primary key(user_id,channel,sect_name)
);

alter table private.player_sect_histories enable row level security;
revoke all on private.player_sect_histories from public,anon,authenticated;

alter function public.player_sect_membership(text,text,text,text,uuid)rename to player_sect_membership_without_history;
revoke all on function public.player_sect_membership_without_history(text,text,text,text,uuid)from public,anon,authenticated;

create or replace function public.player_sect_membership(p_channel text,p_action text,p_sect_name text default null,p_invitation_key text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;result jsonb;leaving_name text;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or p_action not in('join','leave')or p_request_id is null then raise exception '門派請求不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-membership-'||p_channel));
 select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;
 if s.user_id is null then raise exception '伺服器門派狀態尚未建立';end if;
 if p_action='leave'then
  result:=private.settle_sect_progress(uid,p_channel);select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;leaving_name:=s.sect_name;
  if leaving_name<>''then insert into private.player_sect_histories(user_id,channel,sect_name,sect_rank,acting_leader,sect_merit,sect_contribution,task_id)
   values(uid,p_channel,leaving_name,s.sect_rank,s.acting_leader,s.sect_merit,s.sect_contribution,s.task_id)
   on conflict(user_id,channel,sect_name)do update set sect_rank=excluded.sect_rank,acting_leader=excluded.acting_leader,sect_merit=excluded.sect_merit,sect_contribution=excluded.sect_contribution,task_id=excluded.task_id,updated_at=now();end if;
 end if;
 result:=public.player_sect_membership_without_history(p_channel,p_action,p_sect_name,p_invitation_key,p_request_id);
 if p_action='join'then
  update private.player_sect_states s0 set sect_rank=h.sect_rank,acting_leader=h.acting_leader,sect_merit=h.sect_merit,sect_contribution=h.sect_contribution,task_id=h.task_id,task_settled_at=now(),revision=s0.revision+1,updated_at=now()
  from private.player_sect_histories h where s0.user_id=uid and s0.channel=p_channel and h.user_id=uid and h.channel=p_channel and h.sect_name=p_sect_name;
  select * into s from private.player_sect_states where user_id=uid and channel=p_channel;
  result:=jsonb_set(result,'{sect}',private.sect_progress_snapshot(s),true);
 end if;
 return result;
end$$;

revoke execute on function public.player_sect_membership(text,text,text,text,uuid)from public,anon;
grant execute on function public.player_sect_membership(text,text,text,text,uuid)to authenticated;
