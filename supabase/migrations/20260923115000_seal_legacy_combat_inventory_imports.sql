alter function public.player_identity_bootstrap(text,text) rename to player_identity_bootstrap_unsealed;
revoke all on function public.player_identity_bootstrap_unsealed(text,text) from public,anon,authenticated;
create function public.player_identity_bootstrap(p_channel text,p_legacy_origin text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;origin_value text;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('origin',p_legacy_origin)else private.sealed_legacy_state(uid,p_channel)end;origin_value:=coalesce(source->>'origin','家族子弟');return public.player_identity_bootstrap_unsealed(p_channel,origin_value);end $$;
revoke all on function public.player_identity_bootstrap(text,text)from public,anon;grant execute on function public.player_identity_bootstrap(text,text)to authenticated;

alter function public.player_artifact_bootstrap(text,jsonb,text) rename to player_artifact_bootstrap_unsealed;
revoke all on function public.player_artifact_bootstrap_unsealed(text,jsonb,text) from public,anon,authenticated;
create function public.player_artifact_bootstrap(p_channel text,p_legacy_owned jsonb,p_legacy_equipped text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;owned jsonb;equipped text;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('ownedArtifacts',p_legacy_owned,'equippedArtifact',p_legacy_equipped)else private.sealed_legacy_state(uid,p_channel)end;owned:=coalesce(source->'ownedArtifacts','[]'::jsonb);equipped:=coalesce(source->>'equippedArtifact','');return public.player_artifact_bootstrap_unsealed(p_channel,owned,equipped);end $$;
revoke all on function public.player_artifact_bootstrap(text,jsonb,text)from public,anon;grant execute on function public.player_artifact_bootstrap(text,jsonb,text)to authenticated;

alter function public.player_book_arts_bootstrap(text,jsonb) rename to player_book_arts_bootstrap_unsealed;
revoke all on function public.player_book_arts_bootstrap_unsealed(text,jsonb) from public,anon,authenticated;
create function public.player_book_arts_bootstrap(p_channel text,p_legacy_arts jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;arts jsonb;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('learnedArts',p_legacy_arts)else private.sealed_legacy_state(uid,p_channel)end;arts:=coalesce(source->'learnedArts','[]'::jsonb);return public.player_book_arts_bootstrap_unsealed(p_channel,arts);end $$;
revoke all on function public.player_book_arts_bootstrap(text,jsonb)from public,anon;grant execute on function public.player_book_arts_bootstrap(text,jsonb)to authenticated;

alter function public.player_equipment_bootstrap(text,jsonb,jsonb) rename to player_equipment_bootstrap_unsealed;
revoke all on function public.player_equipment_bootstrap_unsealed(text,jsonb,jsonb) from public,anon,authenticated;
create function public.player_equipment_bootstrap(p_channel text,p_legacy_items jsonb,p_legacy_equipped jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;items jsonb;equipped jsonb;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('equipmentInventory',p_legacy_items,'equippedItems',p_legacy_equipped)else private.sealed_legacy_state(uid,p_channel)end;items:=coalesce(source->'equipmentInventory','[]'::jsonb);equipped:=coalesce(source->'equippedItems','{}'::jsonb);return public.player_equipment_bootstrap_unsealed(p_channel,items,equipped);end $$;
revoke all on function public.player_equipment_bootstrap(text,jsonb,jsonb)from public,anon;grant execute on function public.player_equipment_bootstrap(text,jsonb,jsonb)to authenticated;

alter function public.player_weaving_bootstrap(text,integer,integer) rename to player_weaving_bootstrap_unsealed;
revoke all on function public.player_weaving_bootstrap_unsealed(text,integer,integer) from public,anon,authenticated;
create function public.player_weaving_bootstrap(p_channel text,p_legacy_bag_rank integer,p_legacy_mending_silk integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;bag_rank integer;mending_silk integer;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('bagRank',p_legacy_bag_rank,'mendingSilk',p_legacy_mending_silk)else private.sealed_legacy_state(uid,p_channel)end;bag_rank:=coalesce((source->>'bagRank')::integer,1);mending_silk:=coalesce((source->>'mendingSilk')::integer,0);return public.player_weaving_bootstrap_unsealed(p_channel,bag_rank,mending_silk);exception when invalid_text_representation or numeric_value_out_of_range then raise exception '儲物舊存檔資料不正確';end $$;
revoke all on function public.player_weaving_bootstrap(text,integer,integer)from public,anon;grant execute on function public.player_weaving_bootstrap(text,integer,integer)to authenticated;

alter function public.player_sect_arts_bootstrap(text,jsonb,integer) rename to player_sect_arts_bootstrap_unsealed;
revoke all on function public.player_sect_arts_bootstrap_unsealed(text,jsonb,integer) from public,anon,authenticated;
create function public.player_sect_arts_bootstrap(p_channel text,p_legacy_arts jsonb,p_legacy_capacity integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;arts jsonb;capacity integer;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('learnedArts',p_legacy_arts,'artsCapacity',p_legacy_capacity)else private.sealed_legacy_state(uid,p_channel)end;arts:=coalesce(source->'learnedArts','[]'::jsonb)||coalesce(source->'learnedSectMoves','[]'::jsonb);capacity:=coalesce((source->>'artsCapacity')::integer,8);return public.player_sect_arts_bootstrap_unsealed(p_channel,arts,capacity);exception when invalid_text_representation or numeric_value_out_of_range then raise exception '門派功法舊存檔資料不正確';end $$;
revoke all on function public.player_sect_arts_bootstrap(text,jsonb,integer)from public,anon;grant execute on function public.player_sect_arts_bootstrap(text,jsonb,integer)to authenticated;

alter function public.player_combat_loadout_bootstrap(text,text,jsonb) rename to player_combat_loadout_bootstrap_unsealed;
revoke all on function public.player_combat_loadout_bootstrap_unsealed(text,text,jsonb) from public,anon,authenticated;
create function public.player_combat_loadout_bootstrap(p_channel text,p_legacy_embryo text,p_legacy_moves jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;embryo text;moves jsonb;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('swordEmbryo',p_legacy_embryo,'swordMoves',p_legacy_moves)else private.sealed_legacy_state(uid,p_channel)end;embryo:=coalesce(source->>'swordEmbryo','');moves:=coalesce(source->'swordMoves','[]'::jsonb);return public.player_combat_loadout_bootstrap_unsealed(p_channel,embryo,moves);end $$;
revoke all on function public.player_combat_loadout_bootstrap(text,text,jsonb)from public,anon;grant execute on function public.player_combat_loadout_bootstrap(text,text,jsonb)to authenticated;

alter function public.player_sword_state_bootstrap(text,text,integer,integer,integer,text) rename to player_sword_state_bootstrap_unsealed;
revoke all on function public.player_sword_state_bootstrap_unsealed(text,text,integer,integer,integer,text) from public,anon,authenticated;
create function public.player_sword_state_bootstrap(p_channel text,p_legacy_name text,p_legacy_nurture integer,p_legacy_intent integer,p_legacy_insight integer,p_legacy_intent_type text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());source jsonb;
begin if uid is null then raise exception '需要重新登入';end if;source:=case when coalesce(current_setting('app.server_character_initialize',true),'')='1'then jsonb_build_object('swordName',p_legacy_name,'swordNurtureLevel',p_legacy_nurture,'swordIntent',p_legacy_intent,'swordInsight',p_legacy_insight,'swordIntentType',p_legacy_intent_type)else private.sealed_legacy_state(uid,p_channel)end;return public.player_sword_state_bootstrap_unsealed(p_channel,coalesce(source->>'swordName',''),coalesce((source->>'swordNurtureLevel')::integer,0),coalesce((source->>'swordIntent')::integer,0),coalesce((source->>'swordInsight')::integer,0),coalesce(source->>'swordIntentType',''));exception when invalid_text_representation or numeric_value_out_of_range then raise exception '本命劍舊存檔資料不正確';end $$;
revoke all on function public.player_sword_state_bootstrap(text,text,integer,integer,integer,text)from public,anon;grant execute on function public.player_sword_state_bootstrap(text,text,integer,integer,integer,text)to authenticated;

