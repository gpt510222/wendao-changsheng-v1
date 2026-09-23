create or replace function private.guard_pending_battle_attempts()
returns trigger language plpgsql security definer set search_path=''as $$
declare pending_count integer;
begin
 if new.status<>'pending'then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.user_id::text||'-pending-'||new.channel||'-'||tg_table_name));
 execute format('update private.%I set status=''expired'' where user_id=$1 and channel=$2 and status=''pending'' and created_at<now()-interval''15 minutes''',tg_table_name)using new.user_id,new.channel;
 execute format('select count(*) from private.%I where user_id=$1 and channel=$2 and status=''pending''',tg_table_name)into pending_count using new.user_id,new.channel;
 if pending_count>=3 then raise exception '待結算戰鬥過多，請先完成目前戰鬥';end if;
 return new;
end$$;

create index if not exists sword_trial_attempts_pending_idx on private.sword_trial_attempts(user_id,channel,status,created_at);
create index if not exists body_trial_attempts_pending_idx on private.body_trial_attempts(user_id,channel,status,created_at);
create index if not exists mainline_attempts_pending_idx on private.mainline_attempts(user_id,channel,status,created_at);
create index if not exists sect_spar_attempts_pending_idx on private.sect_spar_attempts(user_id,channel,status,created_at);
create index if not exists sect_master_attempts_pending_idx on private.sect_master_attempts(user_id,channel,status,created_at);
create index if not exists immortal_battle_attempts_pending_idx on private.immortal_battle_attempts(user_id,channel,status,created_at);

drop trigger if exists guard_pending_attempts on private.sword_trial_attempts;
create trigger guard_pending_attempts before insert on private.sword_trial_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.body_trial_attempts;
create trigger guard_pending_attempts before insert on private.body_trial_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.mainline_attempts;
create trigger guard_pending_attempts before insert on private.mainline_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.sect_spar_attempts;
create trigger guard_pending_attempts before insert on private.sect_spar_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.sect_master_attempts;
create trigger guard_pending_attempts before insert on private.sect_master_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.ascension_attempts;
create trigger guard_pending_attempts before insert on private.ascension_attempts for each row execute function private.guard_pending_battle_attempts();
drop trigger if exists guard_pending_attempts on private.immortal_battle_attempts;
create trigger guard_pending_attempts before insert on private.immortal_battle_attempts for each row execute function private.guard_pending_battle_attempts();

revoke all on function private.guard_pending_battle_attempts()from public,anon,authenticated;
