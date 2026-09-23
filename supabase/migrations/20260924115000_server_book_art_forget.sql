create or replace function public.player_book_art_forget(p_channel text,p_art_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());e private.player_permanent_consumable_effects;remaining jsonb;titles jsonb;equipped text;
begin
 if uid is null then raise exception '需要重新登入';end if;
 if p_channel not in('formal','test')or private.book_art_tier(p_art_id)is null or p_request_id is null then raise exception '功法資料不正確';end if;
 if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的遺忘請求';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-book-arts-'||p_channel));
 select * into e from private.player_permanent_consumable_effects where user_id=uid and channel=p_channel for update;
 if e.user_id is null or not e.learned_books?p_art_id then raise exception '尚未習得此功法';end if;
 select coalesce(jsonb_agg(value),'[]'::jsonb)into remaining from jsonb_array_elements(e.learned_books)value where value#>>'{}'<>p_art_id;
 update private.player_permanent_consumable_effects set learned_books=remaining,art_levels=art_levels-p_art_id,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into e;
 titles:=private.player_unlocked_titles(uid,p_channel);update private.player_identity_states set equipped_title='none',revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel and equipped_title<>'none'and not titles?equipped_title returning equipped_title into equipped;
 perform private.refresh_resource_profile_authoritative(uid,p_channel);
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,e.revision,'book_art_forgotten',p_request_id,jsonb_build_object('artId',p_art_id));
 select equipped_title into equipped from private.player_identity_states where user_id=uid and channel=p_channel;
 return jsonb_build_object('effects',private.permanent_consumable_snapshot(e),'titles',jsonb_build_object('unlocked',titles,'equipped',coalesce(equipped,'none'),'allArtsMastered',false));
end$$;

revoke execute on function public.player_book_art_forget(text,text,uuid)from public,anon;
grant execute on function public.player_book_art_forget(text,text,uuid)to authenticated;
