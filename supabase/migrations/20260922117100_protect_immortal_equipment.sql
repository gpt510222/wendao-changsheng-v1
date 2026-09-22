create or replace function private.guard_immortal_equipment_delete()returns trigger language plpgsql set search_path='' as $$begin if old.immortal then raise exception '仙品裝備不可出售或刪除';end if;return old;end$$;
drop trigger if exists guard_immortal_equipment_delete on private.player_equipment_items;
create trigger guard_immortal_equipment_delete before delete on private.player_equipment_items for each row execute function private.guard_immortal_equipment_delete();
revoke all on function private.guard_immortal_equipment_delete()from public,anon,authenticated;
