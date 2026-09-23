create or replace function private.player_bag_used_slots(p_user_id uuid,p_channel text)
returns bigint language sql stable set search_path=''as $$
 select coalesce((select sum(ceil(amount::numeric/9999))from private.player_mail_item_balances where user_id=p_user_id and channel=p_channel),0)
  +coalesce((select count(*)from private.player_equipment_items where user_id=p_user_id and channel=p_channel and not equipped),0)
$$;

create or replace function private.guard_player_item_capacity()
returns trigger language plpgsql security definer set search_path=''as $$
declare used_slots bigint;capacity integer;old_amount bigint:=0;existing_amount bigint;
begin
 if new.amount<0 then raise exception '道具數量不正確';end if;
 if tg_op='UPDATE'then old_amount:=old.amount;end if;
 if new.amount<=old_amount then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.user_id::text||'-bag-capacity-'||new.channel));
 select amount into existing_amount from private.player_mail_item_balances where user_id=new.user_id and channel=new.channel and item_key=new.item_key;
 used_slots:=private.player_bag_used_slots(new.user_id,new.channel)
  -ceil(coalesce(existing_amount,0)::numeric/9999)+ceil(new.amount::numeric/9999);
 if used_slots>private.player_bag_capacity(new.user_id,new.channel)then raise exception '儲物袋容量不足，請先騰出空間';end if;
 return new;
end$$;

create or replace function private.guard_new_equipment_capacity()
returns trigger language plpgsql security definer set search_path=''as $$
begin
 if new.equipped then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.user_id::text||'-bag-capacity-'||new.channel));
 if private.player_bag_used_slots(new.user_id,new.channel)+1>private.player_bag_capacity(new.user_id,new.channel)then raise exception '儲物袋容量不足，無法放入新裝備';end if;
 return new;
end$$;

drop trigger if exists guard_new_equipment_capacity on private.player_equipment_items;
create trigger guard_new_equipment_capacity before insert on private.player_equipment_items for each row execute function private.guard_new_equipment_capacity();

alter function public.player_equipment_set(text,text,boolean,uuid)rename to player_equipment_set_without_capacity;
revoke all on function public.player_equipment_set_without_capacity(text,text,boolean,uuid)from public,anon,authenticated;
create function public.player_equipment_set(p_channel text,p_item_id text,p_equip boolean,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());item private.player_equipment_items;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-bag-capacity-'||p_channel));
 select * into item from private.player_equipment_items where user_id=uid and channel=p_channel and item_id=p_item_id;
 if item.item_id is null then raise exception '找不到此裝備';end if;
 if not p_equip and item.equipped and private.player_bag_used_slots(uid,p_channel)+1>private.player_bag_capacity(uid,p_channel)then raise exception '儲物袋容量不足，無法卸下裝備';end if;
 return public.player_equipment_set_without_capacity(p_channel,p_item_id,p_equip,p_request_id);
end$$;

revoke all on function private.player_bag_used_slots(uuid,text),private.guard_new_equipment_capacity()from public,anon,authenticated;
revoke execute on function public.player_equipment_set(text,text,boolean,uuid)from public,anon;
grant execute on function public.player_equipment_set(text,text,boolean,uuid)to authenticated;
