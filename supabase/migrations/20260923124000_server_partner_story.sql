create table if not exists private.player_partner_stories(
 user_id uuid not null references auth.users(id)on delete cascade,channel text not null check(channel in('formal','test')),
 partner_name text not null default'',partner_gender text not null check(partner_gender in('男','女')),partner_route text not null check(partner_route in('qi','sword','body')),personality text not null check(personality in('warm','reserved','free','devoted')),
 chapter integer not null default 0 check(chapter between 0 and 10),bond integer not null default 0 check(bond between -5 and 5),accord integer not null default 0 check(accord between -5 and 5),flags jsonb not null default'{}'::jsonb,
 next_available_at timestamptz not null,completed boolean not null default false,ending text not null default'',legacy_imported boolean not null default false,revision bigint not null default 1,updated_at timestamptz not null default now(),primary key(user_id,channel),check(jsonb_typeof(flags)='object'));
alter table private.player_partner_stories enable row level security;revoke all on private.player_partner_stories from public,anon,authenticated;

create or replace function private.partner_story_snapshot(s private.player_partner_stories)returns jsonb language sql stable set search_path=''as $$select jsonb_build_object('revision',s.revision,'name',s.partner_name,'gender',s.partner_gender,'route',s.partner_route,'personality',s.personality,'chapter',s.chapter,'bond',s.bond,'accord',s.accord,'flags',s.flags,'nextAvailableAt',s.next_available_at,'completed',s.completed,'ending',s.ending,'serverTime',now())$$;

create or replace function private.partner_chapter_score(p_chapter integer,p_choices jsonb)returns jsonb language plpgsql immutable set search_path=''as $$
declare data jsonb:='[
 [[[0,0,""],[0,0,"leave"]],[[0,0,""],[0,0,""],[0,0,""]],[[0,0,""],[0,0,""],[0,0,""]]],
 [[[1,1,""],[1,1,""],[0,-1,""]],[[1,0,""],[0,1,""],[1,0,""]]],
 [[[1,0,""],[0,1,""],[-1,0,""]],[[0,1,""],[0,2,""],[0,-1,""]],[[1,0,""],[1,2,""],[0,1,""],[1,2,""]]],
 [[[2,1,""],[1,1,""],[0,1,"skip"]],[[1,1,""],[0,2,""],[0,1,""]],[[0,1,""],[1,1,""],[2,0,""],[-1,0,""]]],
 [[[2,2,"rely"],[1,0,""],[-1,0,""]],[[1,0,""],[2,0,""],[0,1,""],[-1,0,""]],[[2,0,"rely"],[1,1,""],[-1,0,""],[1,1,""]]],
 [[[1,1,"care"],[1,0,"care"],[1,1,"care"],[0,1,""]],[[2,0,""],[1,1,""],[0,2,""],[-1,0,""]]],
 [[[2,0,""],[1,1,"possible"],[-1,0,""],[0,1,""]],[[1,2,""],[0,0,""],[2,1,"possible"]]],
 [[[2,0,""],[1,1,""],[1,0,""],[-1,1,""]],[[2,0,""],[1,1,""],[0,1,""]],[[1,1,"welcome"],[1,0,""],[0,1,""]]],
 [[[1,2,""],[2,0,""],[1,-1,""],[0,1,""]],[[1,2,""],[1,1,""],[2,0,""],[-2,0,""]],[[2,1,""],[0,2,""],[1,1,""]]]
 ]'::jsonb;chapter_data jsonb;effect jsonb;idx integer;choice integer;bond_sum integer:=0;accord_sum integer:=0;out_flags jsonb:='{}'::jsonb;flag text;
begin
 if p_chapter not between 1 and 9 or jsonb_typeof(p_choices)<>'array'then raise exception '章節選擇不正確';end if;chapter_data:=data->(p_chapter-1);
 if p_chapter=1 and jsonb_array_length(p_choices)=1 and(p_choices->>0)::integer=1 then return jsonb_build_object('bond',0,'accord',0,'flags','{}'::jsonb);end if;
 if jsonb_array_length(p_choices)<>jsonb_array_length(chapter_data)then raise exception '章節選擇數量不正確';end if;
 for idx in 0..jsonb_array_length(chapter_data)-1 loop choice:=(p_choices->>idx)::integer;if choice<0 or choice>=jsonb_array_length(chapter_data->idx)then raise exception '章節選擇不存在';end if;effect:=chapter_data->idx->choice;bond_sum:=bond_sum+(effect->>0)::integer;accord_sum:=accord_sum+(effect->>1)::integer;flag:=effect->>2;if flag<>''then out_flags:=jsonb_set(out_flags,array[flag],'true'::jsonb,true);end if;end loop;
 return jsonb_build_object('bond',bond_sum,'accord',accord_sum,'flags',out_flags);
exception when invalid_text_representation then raise exception '章節選擇不正確';end$$;

create or replace function public.player_partner_story_bootstrap(p_channel text)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());source jsonb;legacy jsonb;s private.player_partner_stories;player_created timestamptz;player_gender text;legacy_gender text;
begin
 if uid is null or p_channel not in('formal','test')then raise exception '請求資料不正確';end if;perform pg_advisory_xact_lock(hashtext(uid::text||'-partner-story-'||p_channel));
 select created_at into player_created from private.player_states where user_id=uid and channel=p_channel;select gender into player_gender from private.player_identity_states where user_id=uid and channel=p_channel;if player_created is null then raise exception '角色尚未建立';end if;
 insert into private.player_partner_stories(user_id,channel,partner_gender,partner_route,personality,next_available_at)values(uid,p_channel,case player_gender when'男'then'女'else'男'end,(array['qi','sword','body'])[1+floor(random()*3)::integer],(array['warm','reserved','free','devoted'])[1+floor(random()*4)::integer],player_created+interval '48 hours')on conflict do nothing;
 select * into s from private.player_partner_stories where user_id=uid and channel=p_channel for update;
 if not s.legacy_imported then source:=private.sealed_legacy_state(uid,p_channel);legacy:=source->'partnerStory';if jsonb_typeof(legacy)='object'then legacy_gender:=legacy->>'gender';update private.player_partner_stories set partner_name=left(coalesce(legacy->>'name',''),8),partner_gender=case when legacy_gender in('男','女')then legacy_gender else partner_gender end,partner_route=case when legacy->>'route'in('qi','sword','body')then legacy->>'route'else partner_route end,personality=case when legacy->>'personality'in('warm','reserved','free','devoted')then legacy->>'personality'else personality end,chapter=least(10,greatest(0,coalesce((legacy->>'chapter')::integer,0))),bond=least(5,greatest(-5,coalesce((legacy->>'bond')::integer,0))),accord=least(5,greatest(-5,coalesce((legacy->>'accord')::integer,0))),flags=case when jsonb_typeof(legacy->'flags')='object'then legacy->'flags'else'{}'::jsonb end,completed=coalesce((legacy->>'completed')::boolean,false),ending=left(coalesce(legacy->>'ending',''),20),next_available_at=case when coalesce((legacy->>'chapter')::integer,0)>0 then now()else next_available_at end,legacy_imported=true,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;else update private.player_partner_stories set legacy_imported=true where user_id=uid and channel=p_channel returning * into s;end if;end if;
 return private.partner_story_snapshot(s);
exception when invalid_text_representation or numeric_value_out_of_range then raise exception '封存因緣資料不正確';end$$;

create or replace function public.player_partner_story_complete(p_channel text,p_chapter integer,p_choices jsonb,p_name text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_partner_stories;score jsonb;delta_b integer;delta_a integer;delay_min integer;delay_max integer;
begin
 if uid is null or p_channel not in('formal','test')or p_request_id is null then raise exception '因緣請求不正確';end if;if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的章節請求';end if;
 select * into s from private.player_partner_stories where user_id=uid and channel=p_channel for update;if s.user_id is null or s.completed or p_chapter<>s.chapter+1 or p_chapter not between 1 and 9 then raise exception '目前無法完成此章';end if;if now()<s.next_available_at then raise exception '因緣尚未到來';end if;
 score:=private.partner_chapter_score(p_chapter,p_choices);if p_chapter=1 and not(jsonb_array_length(p_choices)=1 and(p_choices->>0)::integer=1)then if length(trim(coalesce(p_name,'')))not between 1 and 8 or trim(p_name)~'[[:space:][:cntrl:]]'then raise exception '請填寫正確的道侶姓名';end if;s.partner_name:=trim(p_name);elsif p_chapter=1 and s.partner_name=''then s.partner_name:=case s.partner_gender when'男'then'沈硯'else'蘇晚'end;end if;
 delta_b:=case when(score->>'bond')::integer>=2 then 1 when(score->>'bond')::integer<=-2 then -1 else 0 end;delta_a:=case when(score->>'accord')::integer>=2 then 1 when(score->>'accord')::integer<=-2 then -1 else 0 end;
 delay_min:=(array[8,12,16,24,32,24,16,12,8])[p_chapter];delay_max:=(array[24,36,48,72,96,72,48,36,24])[p_chapter];
 update private.player_partner_stories set partner_name=s.partner_name,chapter=p_chapter,bond=least(5,greatest(-5,bond+delta_b)),accord=least(5,greatest(-5,accord+delta_a)),flags=flags||(score->'flags'),next_available_at=now()+make_interval(secs=>(delay_min+floor(random()*(delay_max-delay_min+1)))::integer*900),revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'partner_story_chapter',p_request_id,jsonb_build_object('chapter',p_chapter,'choices',p_choices));return private.partner_story_snapshot(s);
end$$;

create or replace function public.player_partner_story_ending(p_channel text,p_accept boolean,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=''as $$
declare uid uuid:=(select auth.uid());s private.player_partner_stories;ps private.player_partner_states;eligible boolean;flag_count integer;ending_value text;
begin
 if uid is null or p_channel not in('formal','test')or p_request_id is null then raise exception '因緣請求不正確';end if;if exists(select 1 from private.player_state_events where user_id=uid and channel=p_channel and request_id=p_request_id)then raise exception '重複的結緣請求';end if;
 select * into s from private.player_partner_stories where user_id=uid and channel=p_channel for update;if s.user_id is null or s.completed or s.chapter<>9 or now()<s.next_available_at then raise exception '目前無法決定結局';end if;
 select count(*)into flag_count from jsonb_each(s.flags)f where f.key in('rely','care','possible','welcome')and f.value='true'::jsonb;eligible:=s.bond>=3 and s.accord>=3 and flag_count>=2;
 if p_accept and not eligible then raise exception '兩心尚未同道';end if;ending_value:=case when p_accept then'與君同行'when eligible then'自選獨行'when s.bond>=3 then'有情未同道'when s.accord>=3 then'同道未有情'else'各自長生'end;
 update private.player_partner_stories set chapter=10,completed=true,ending=ending_value,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into s;
 if p_accept then insert into private.player_partner_states(user_id,channel,established,partner_name,partner_gender,partner_route,personality,partnered_at_year,legacy_imported)values(uid,p_channel,true,s.partner_name,s.partner_gender,s.partner_route,s.personality,greatest(0,floor(extract(epoch from now()-(select created_at from private.player_states where user_id=uid and channel=p_channel))/900)::bigint),true)on conflict(user_id,channel)do update set established=true,partner_name=excluded.partner_name,partner_gender=excluded.partner_gender,partner_route=excluded.partner_route,personality=excluded.personality,partnered_at_year=excluded.partnered_at_year,revision=private.player_partner_states.revision+1,updated_at=now()returning * into ps;end if;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,s.revision,'partner_story_ending',p_request_id,jsonb_build_object('ending',ending_value));return jsonb_build_object('story',private.partner_story_snapshot(s),'partner',case when ps.user_id is null then null else private.partner_snapshot(ps)end);
end$$;

revoke all on function private.partner_story_snapshot(private.player_partner_stories),private.partner_chapter_score(integer,jsonb)from public,anon,authenticated;
revoke execute on function public.player_partner_story_bootstrap(text),public.player_partner_story_complete(text,integer,jsonb,text,uuid),public.player_partner_story_ending(text,boolean,uuid)from public,anon;
grant execute on function public.player_partner_story_bootstrap(text),public.player_partner_story_complete(text,integer,jsonb,text,uuid),public.player_partner_story_ending(text,boolean,uuid)to authenticated;
