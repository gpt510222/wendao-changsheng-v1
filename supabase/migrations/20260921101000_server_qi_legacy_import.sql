alter table private.player_progression_states add column if not exists qi_runtime_imported boolean not null default false;

create or replace function public.player_qi_legacy_import(p_channel text,p_cycle text,p_marks jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid()); p private.player_progression_states; small_mark integer; origin_mark integer; still_mark integer; earned integer; rate numeric;
begin
  if uid is null then raise exception 'authentication required';end if;
  if p_channel not in ('formal','test') or p_cycle not in ('small','origin','still') or jsonb_typeof(p_marks)<>'object' then raise exception 'invalid request';end if;
  select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;
  if p.user_id is null then raise exception 'player state not initialized';end if;
  if not p.qi_runtime_imported then
    earned:=floor(p.spirit_level/10.0)::integer;
    small_mark:=least(earned,greatest(0,coalesce((p_marks->>'small')::integer,0)));
    origin_mark:=least(earned,greatest(0,coalesce((p_marks->>'origin')::integer,0)));
    still_mark:=least(earned,greatest(0,coalesce((p_marks->>'still')::integer,0)));
    if small_mark+origin_mark+still_mark>earned then raise exception 'invalid legacy marks';end if;
    update private.player_progression_states set qi_cycle=p_cycle,qi_mark_small=small_mark,qi_mark_origin=origin_mark,qi_mark_still=still_mark,qi_runtime_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into p;
  end if;
  rate:=private.refresh_qi_profile(uid,p_channel);
  return private.qi_runtime_snapshot(p,rate);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'invalid legacy qi state';
end $$;

revoke execute on function public.player_qi_legacy_import(text,text,jsonb) from public,anon;
grant execute on function public.player_qi_legacy_import(text,text,jsonb) to authenticated;
