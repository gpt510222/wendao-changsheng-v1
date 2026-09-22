create or replace function private.make_encounter(p_kind text,p_marker integer,p_path text,p_level integer,p_serial bigint,p_progress private.player_progression_states) returns jsonb
language plpgsql volatile set search_path='' as $$
declare scene integer;title text;story text;actions text[];tier integer;scale integer;reward_id text;reward_key text;pill text;prefix text:='';event_id text;
begin
 scene:=case when p_kind='year' then array_position(array[10,30,50,100,300,500,1000],p_marker)-1 else floor(random()*6)::integer end;
 if scene=0 then title:='雨夜古亭';story:='山雨封路，亭中一名負傷散修護著半袋物資，遠處追兵的火把正穿過雨幕。';actions:=array['替他引開追兵','取走無主之物','辨明因果再處置'];
 elsif scene=1 then title:='枯井劍鳴';story:='荒村枯井每逢夜半便傳出劍鳴。井底既有殘劍，也纏著多年未散的怨念。';actions:=array['封存怨念安撫亡魂','吞納怨氣淬礪己身','參悟劍痕後悄然離去'];
 elsif scene=2 then title:='山祠餘火';story:='傾圮山祠中尚有一點香火，兩名旅人正為僅存的乾糧爭執不休。';actions:=array['分糧勸和','以威勢奪取供物','各取所需不問善惡'];
 elsif scene=3 then title:='古道遺囊';story:='古道旁留著一只染塵行囊，內有修行物資，也有一封尚未送達的家書。';actions:=array['送還行囊與家書','留下物資焚去書信','先送信再收取酬勞'];
 elsif scene=4 then title:='月下問劍';story:='無名劍客攔在月下，只問你出劍是為護人、勝人，還是見證萬般變化。';actions:=array['劍為止戈','劍為爭勝','劍隨本心'];
 else title:='渡口妖影';story:='夜渡將開，船家說水下有妖。岸邊富戶願出重金先行，流民卻無力付費。';actions:=array['護送眾人一同渡河','收下重金只護富戶','先查水勢另尋生路'];end if;
 tier:=least(8,greatest(1,p_progress.spirit_level/10+1,p_progress.sword_level/10+1,p_progress.body_level/4+1));
 scale:=greatest(2,least(40,floor(greatest(0,p_marker)/20.0)::integer+tier*2));
 case mod(greatest(0,p_marker)+p_serial,6) when 0 then reward_id:='mainlineFoodBag';reward_key:='mainlineFoodBag';when 1 then reward_id:='mainlineWoodBag';reward_key:='mainlineWoodBag';when 2 then reward_id:='mainlineIronBag';reward_key:='mainlineIronBag';when 3 then reward_id:='main-material-xuansi';reward_key:='mainlineMaterial_xuansi';when 4 then reward_id:='main-material-xuanjuan';reward_key:='mainlineMaterial_xuanjuan';else reward_id:='main-material-xuanpi';reward_key:='mainlineMaterial_xuanpi';end case;
 pill:='tribPill'||tier;
 if p_kind='year' then prefix:=p_marker||'年・';elsif p_kind='realm' then prefix:=case p_path when 'spirit' then '練氣' when 'sword' then '淬劍' else '煉體' end||'破境・';story:='大境界方定，尚未散盡的天地氣機引來一段因緣。'||story;end if;
 event_id:=p_kind||'-'||coalesce(p_path,'')||'-'||p_marker||'-'||p_serial;
 return jsonb_build_object('id',event_id,'kind',p_kind,'year',p_marker,'realmLevel',p_level,'title',prefix||title,'text',story,'choices',jsonb_build_array(
  jsonb_build_object('path','righteous','label',actions[1],'moral',jsonb_build_object('righteousness',3),'rewards',jsonb_build_array(jsonb_build_object('item',reward_id,'itemKey',reward_key,'amount',scale)),'result','你守住了心中準則，也得了一份善緣。','tier',tier),
  jsonb_build_object('path','evil','label',actions[2],'moral',jsonb_build_object('evilQi',3),'rewards',jsonb_build_array(jsonb_build_object('item',pill,'itemKey',pill,'amount',greatest(1,ceil(tier/3.0)::integer))),'result','你以利刃奪得機緣，煞氣也隨之沉入道心。','tier',tier),
  jsonb_build_object('path','balance','label',actions[3],'moral',jsonb_build_object('righteousness',1,'evilQi',1),'rewards',jsonb_build_array(jsonb_build_object('item',reward_id,'itemKey',reward_key,'amount',greatest(1,ceil(scale*.7)::integer))),'result','你未執一端，在因果之間取得了自己的答案。','tier',tier)
 ));
end $$;

create or replace function public.player_encounter_sync(p_channel text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());s private.player_encounter_states;p private.player_progression_states;current_year integer;mark integer;path text;level_value integer;key text;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-encounter-'||p_channel));
 insert into private.player_encounter_states(user_id,channel) values(uid,p_channel) on conflict do nothing;
 select * into s from private.player_encounter_states where user_id=uid and channel=p_channel for update;
 select * into p from private.player_progression_states where user_id=uid and channel=p_channel;
 if p.user_id is null then raise exception '伺服器修行進度尚未建立';end if;
 current_year:=greatest(0,floor(extract(epoch from now()-s.started_at)/900)::integer);
 foreach mark in array array[10,30,50,100,300,500,1000] loop
  if current_year>=mark and not s.year_milestones@>to_jsonb(array[mark]) and jsonb_array_length(s.queue)<12 then s.serial:=s.serial+1;s.queue:=s.queue||jsonb_build_array(private.make_encounter('year',mark,null,null,s.serial,p));s.year_milestones:=s.year_milestones||to_jsonb(mark);end if;
 end loop;
 foreach path in array array['spirit','sword','body'] loop
  level_value:=case path when 'spirit' then p.spirit_level when 'sword' then p.sword_level else p.body_level end;
  if level_value>=10 then for level_mark in 1..floor(level_value/10.0)::integer loop key:=path||'-'||level_mark*10;if not s.realm_milestones?key and jsonb_array_length(s.queue)<12 then s.serial:=s.serial+1;s.queue:=s.queue||jsonb_build_array(private.make_encounter('realm',current_year,path,level_mark*10,s.serial,p));s.realm_milestones:=jsonb_set(s.realm_milestones,array[key],'true'::jsonb,true);end if;end loop;end if;
 end loop;
 if now()>=s.next_random_at and jsonb_array_length(s.queue)<3 then s.serial:=s.serial+1;s.queue:=s.queue||jsonb_build_array(private.make_encounter('random',current_year,null,null,s.serial,p));s.next_random_at:=now()+interval '30 minutes'+random()*interval '30 minutes';end if;
 update private.player_encounter_states set queue=s.queue,year_milestones=s.year_milestones,realm_milestones=s.realm_milestones,next_random_at=s.next_random_at,serial=s.serial,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into s;
 return private.encounter_snapshot(s);
end $$;
