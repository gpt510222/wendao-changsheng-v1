create or replace function private.player_bag_capacity(p_user_id uuid,p_channel text)
returns integer language sql stable set search_path=''as $$
 select 100+(least(19,greatest(1,coalesce((select bag_rank from private.player_weaving_states where user_id=p_user_id and channel=p_channel),1)))-1)*50
$$;

create or replace function private.guard_player_item_capacity()
returns trigger language plpgsql security definer set search_path=''as $$
declare used_slots bigint;capacity integer;old_amount bigint:=0;
begin
 if new.amount<0 then raise exception '道具數量不正確';end if;
 if tg_op='UPDATE'then old_amount:=old.amount;end if;
 if new.amount<=old_amount then return new;end if;
 perform pg_advisory_xact_lock(hashtext(new.user_id::text||'-bag-capacity-'||new.channel));
 select coalesce(sum(ceil((case when item_key=new.item_key then new.amount else amount end)::numeric/9999)),0)
 into used_slots
 from private.player_mail_item_balances
 where user_id=new.user_id and channel=new.channel;
 if tg_op='INSERT'and not exists(select 1 from private.player_mail_item_balances where user_id=new.user_id and channel=new.channel and item_key=new.item_key)then
  used_slots:=used_slots+ceil(new.amount::numeric/9999);
 end if;
 capacity:=private.player_bag_capacity(new.user_id,new.channel);
 if used_slots>capacity then raise exception '儲物袋容量不足，請先騰出空間';end if;
 return new;
end$$;

drop trigger if exists guard_player_item_capacity on private.player_mail_item_balances;
create trigger guard_player_item_capacity before insert or update of amount on private.player_mail_item_balances for each row execute function private.guard_player_item_capacity();

revoke all on function private.player_bag_capacity(uuid,text),private.guard_player_item_capacity()from public,anon,authenticated;
