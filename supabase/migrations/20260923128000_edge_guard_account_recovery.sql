create table if not exists private.account_recovery_network_attempts(
 ip_hash text not null check(ip_hash~'^[0-9a-f]{64}$'),
 channel text not null check(channel in('formal','test')),
 failed_count integer not null default 0,
 window_started timestamptz not null default now(),
 locked_until timestamptz,
 updated_at timestamptz not null default now(),
 primary key(ip_hash,channel)
);
alter table private.account_recovery_network_attempts enable row level security;
revoke all on private.account_recovery_network_attempts from public,anon,authenticated;

create or replace function public.recover_account_edge(p_new_user uuid,p_recovery_hash text,p_channel text,p_ip_hash text)
returns jsonb language plpgsql security definer set search_path=''as $$
declare a private.account_recovery_network_attempts;result jsonb;failed integer;backup_table text;
begin
 if coalesce((select auth.role()),'')<>'service_role'then raise exception '未授權的恢復請求';end if;
 if p_new_user is null or not exists(select 1 from auth.users where id=p_new_user)then raise exception '登入工作階段無效';end if;
 if p_channel not in('formal','test')or p_recovery_hash!~'^[0-9a-f]{64}$'or p_ip_hash!~'^[0-9a-f]{64}$'then raise exception '恢復請求格式不正確';end if;
 perform pg_advisory_xact_lock(hashtext(p_ip_hash||'-recovery-network-'||p_channel));
 insert into private.account_recovery_network_attempts(ip_hash,channel)values(p_ip_hash,p_channel)on conflict do nothing;
 select * into a from private.account_recovery_network_attempts where ip_hash=p_ip_hash and channel=p_channel for update;
 if a.window_started<now()-interval'2 hours'then update private.account_recovery_network_attempts set failed_count=0,window_started=now(),locked_until=null,updated_at=now()where ip_hash=p_ip_hash and channel=p_channel returning * into a;end if;
 if a.locked_until is not null and a.locked_until>now()then return jsonb_build_object('recoveryError','此網路的恢復嘗試過多，請於兩小時後再試','lockedUntil',a.locked_until);end if;
 perform set_config('request.jwt.claim.sub',p_new_user::text,true);
 backup_table:=case when p_channel='formal'then'public.account_recovery_backups'else'public.test_account_recovery_backups'end;
 result:=private.recover_account_channel(p_recovery_hash,p_channel,backup_table);
 if result?'recoveryError'then
  failed:=a.failed_count+1;
  update private.account_recovery_network_attempts set failed_count=failed,locked_until=case when failed>=10 then now()+interval'2 hours'else null end,updated_at=now()where ip_hash=p_ip_hash and channel=p_channel;
  if failed>=10 then result:=jsonb_build_object('recoveryError','此網路的恢復嘗試過多，已鎖定兩小時','lockedUntil',now()+interval'2 hours');end if;
 else delete from private.account_recovery_network_attempts where ip_hash=p_ip_hash and channel=p_channel;
 end if;
 return result;
end$$;

revoke execute on function public.recover_formal_account(text),public.recover_test_account(text)from public,anon,authenticated;
revoke all on function public.recover_account_edge(uuid,text,text,text)from public,anon,authenticated;
grant execute on function public.recover_account_edge(uuid,text,text,text)to service_role;
