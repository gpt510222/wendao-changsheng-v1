alter table private.player_sect_states add column if not exists pending_sect_name text,add column if not exists pending_sect_expires_at timestamptz,add column if not exists visited_sects text[]not null default'{}';

create or replace function public.player_sect_search(p_channel text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;p private.player_progression_states;c record;max_star integer;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_request_id is null then raise exception '門派尋訪請求不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-membership-'||p_channel));select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if s.user_id is null or p.user_id is null then raise exception '伺服器角色狀態尚未建立';end if;if s.sect_name<>''then raise exception '已有門派';end if;if s.last_left_at is not null and s.last_left_at>now()-interval'45 minutes'then raise exception '門派尋訪尚在冷卻';end if;
 if s.pending_sect_name is not null and s.pending_sect_expires_at>now()then select * into c from private.sect_catalog()where name=s.pending_sect_name;else max_star:=least(9,greatest(p.spirit_level/10+1,p.sword_level/10+1,p.body_level/4+1));select * into c from private.sect_catalog()where star<=max_star order by(-ln(greatest(random(),.0000001))/case when name=any(s.visited_sects)then 1 else 3 end)limit 1;if c.name is null then raise exception '目前沒有可尋訪門派';end if;update private.player_sect_states set pending_sect_name=c.name,pending_sect_expires_at=now()+interval'10 minutes',updated_at=now()where user_id=uid and channel=p_channel returning * into s;end if;
 return jsonb_build_object('name',c.name,'star',c.star,'faction',c.faction,'expiresAt',s.pending_sect_expires_at);
end$$;

alter function public.player_sect_membership(text,text,text,text,uuid)rename to player_sect_membership_without_search_ticket;
create or replace function public.player_sect_membership(p_channel text,p_action text,p_sect_name text default null,p_invitation_key text default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_sect_states;result jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test')or p_action not in('join','leave')or p_request_id is null then raise exception '門派請求不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-sect-membership-'||p_channel));select * into s from private.player_sect_states where user_id=uid and channel=p_channel for update;if s.user_id is null then raise exception '伺服器門派狀態尚未建立';end if;
 if p_action='join'and p_invitation_key is null and(s.pending_sect_name is distinct from p_sect_name or s.pending_sect_expires_at is null or s.pending_sect_expires_at<now())then raise exception '請先由伺服器尋訪門派';end if;
 result:=public.player_sect_membership_without_search_ticket(p_channel,p_action,p_sect_name,p_invitation_key,p_request_id);
 update private.player_sect_states set pending_sect_name=null,pending_sect_expires_at=null,visited_sects=case when p_action='join'and not(coalesce(p_sect_name,'')=any(visited_sects))then array_append(visited_sects,p_sect_name)else visited_sects end,updated_at=now()where user_id=uid and channel=p_channel;
 return result;
end$$;

revoke all on function public.player_sect_membership_without_search_ticket(text,text,text,text,uuid)from public,anon,authenticated;
revoke execute on function public.player_sect_search(text,uuid),public.player_sect_membership(text,text,text,text,uuid)from public,anon;
grant execute on function public.player_sect_search(text,uuid),public.player_sect_membership(text,text,text,text,uuid)to authenticated;
