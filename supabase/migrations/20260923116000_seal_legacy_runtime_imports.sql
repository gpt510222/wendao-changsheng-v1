alter function public.player_qi_legacy_import(text,text,jsonb) rename to player_qi_legacy_import_unsealed;
revoke all on function public.player_qi_legacy_import_unsealed(text,text,jsonb)from public,anon,authenticated;
create function public.player_qi_legacy_import(p_channel text,p_cycle text,p_marks jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;cycle_value text;marks_value jsonb;
begin if uid is null then raise exception 'authentication required';end if;source:=private.sealed_legacy_state(uid,p_channel);cycle_value:=case when source->>'qiCycleMode'in('small','origin','still')then source->>'qiCycleMode'else'small'end;marks_value:=case when jsonb_typeof(source->'qiFoundationMarks')='object'then source->'qiFoundationMarks'else'{}'::jsonb end;return public.player_qi_legacy_import_unsealed(p_channel,cycle_value,marks_value);end $$;
revoke all on function public.player_qi_legacy_import(text,text,jsonb)from public,anon;grant execute on function public.player_qi_legacy_import(text,text,jsonb)to authenticated;

alter function public.player_immortal_bootstrap(text,jsonb) rename to player_immortal_bootstrap_unsealed;
revoke all on function public.player_immortal_bootstrap_unsealed(text,jsonb)from public,anon,authenticated;
create function public.player_immortal_bootstrap(p_channel text,p_legacy jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;im jsonb;residual jsonb;traces jsonb;
begin
 if uid is null then raise exception '需要重新登入';end if;source:=private.sealed_legacy_state(uid,p_channel);im:=case when jsonb_typeof(source#>'{ascension,immortalRealm}')='object'then source#>'{ascension,immortalRealm}'else'{}'::jsonb end;
 residual:=to_jsonb(greatest(0,coalesce((source->>'immortalResidualSourceCount')::bigint,(im->>'residualSource')::bigint,0)));traces:=to_jsonb(greatest(0,coalesce((source->>'immortalBarrenTraceCount')::bigint,(im->>'barrenTraces')::bigint,0)));im:=jsonb_set(jsonb_set(im,'{residualSource}',residual,true),'{barrenTraces}',traces,true);
 return public.player_immortal_bootstrap_unsealed(p_channel,im);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '仙界封存進度資料不正確';end $$;
revoke all on function public.player_immortal_bootstrap(text,jsonb)from public,anon;grant execute on function public.player_immortal_bootstrap(text,jsonb)to authenticated;

alter function public.player_divine_roaming(text,text,integer,integer,boolean,uuid) rename to player_divine_roaming_unsealed;
revoke all on function public.player_divine_roaming_unsealed(text,text,integer,integer,boolean,uuid)from public,anon,authenticated;
create function public.player_divine_roaming(p_channel text,p_action text,p_stage integer default null,p_total integer default null,p_legacy_unlocked boolean default false,p_request_id uuid default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;unlocked boolean;
begin if uid is null then raise exception '需要重新登入';end if;source:=private.sealed_legacy_state(uid,p_channel);unlocked:=coalesce((source->>'divineRoamingUnlocked')::boolean,false);return public.player_divine_roaming_unsealed(p_channel,p_action,p_stage,p_total,unlocked,p_request_id);exception when invalid_text_representation then raise exception '神念遠遊封存資料不正確';end $$;
revoke all on function public.player_divine_roaming(text,text,integer,integer,boolean,uuid)from public,anon;grant execute on function public.player_divine_roaming(text,text,integer,integer,boolean,uuid)to authenticated;

