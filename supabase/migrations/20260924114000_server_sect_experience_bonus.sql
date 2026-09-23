create or replace function private.sect_experience_bonus(p_user uuid,p_channel text)
returns numeric language sql stable security definer set search_path=''as $$
 select least(.5,count(*)*.05)from(
  select h.sect_name from private.player_sect_histories h where h.user_id=p_user and h.channel=p_channel and h.sect_rank>=2
  union
  select s.sect_name from private.player_sect_states s where s.user_id=p_user and s.channel=p_channel and s.sect_name<>''and s.sect_rank>=2
 )experienced
$$;

create or replace function private.sect_progress_snapshot(s private.player_sect_states)returns jsonb language sql stable set search_path=''as $$
 select private.sect_snapshot(s)||jsonb_build_object('sectMerit',s.sect_merit::text,'sectContribution',s.sect_contribution::text,'prestige',s.prestige::text,'sectTask',s.task_id,'transmissionUntil',s.transmission_until,'sectExperienceBonus',private.sect_experience_bonus(s.user_id,s.channel))
$$;

create or replace function private.settle_sect_progress(p_uid uuid,p_channel text)
returns jsonb language plpgsql security definer set search_path=''as $$
declare s private.player_sect_states;w private.player_resource_wallets;t record;years integer:=0;stone_gain numeric:=0;experience_bonus numeric:=0;annual_gain integer:=0;
begin
 select * into s from private.player_sect_states where user_id=p_uid and channel=p_channel for update;select * into w from private.player_resource_wallets where user_id=p_uid and channel=p_channel for update;
 if s.user_id is null or w.user_id is null then return'{}'::jsonb;end if;
 years:=least(35040,greatest(0,floor(extract(epoch from now()-s.task_settled_at)/900)::integer));
 if years>0 then
  select * into t from private.sect_task_values(s.task_id);
  if t.realm is not null then experience_bonus:=private.sect_experience_bonus(p_uid,p_channel);annual_gain:=least(50,floor(t.gain*(1+experience_bonus)));s.sect_merit:=s.sect_merit+years*annual_gain;s.sect_contribution:=s.sect_contribution+years*annual_gain;s.prestige:=s.prestige+years*t.prestige;stone_gain:=years*t.stone;w.spirit_stone:=w.spirit_stone+stone_gain;end if;
  update private.player_sect_states set sect_merit=s.sect_merit,sect_contribution=s.sect_contribution,prestige=s.prestige,task_settled_at=task_settled_at+make_interval(secs=>years*900),revision=revision+1,updated_at=now()where user_id=p_uid and channel=p_channel returning * into s;
  if stone_gain>0 then update private.player_resource_wallets set spirit_stone=w.spirit_stone,revision=revision+1,updated_at=now()where user_id=p_uid and channel=p_channel returning * into w;end if;
 end if;
 return jsonb_build_object('sect',private.sect_progress_snapshot(s),'wallet',private.cangji_wallet_json(w),'years',years,'stoneGain',stone_gain::text);
end$$;

revoke all on function private.sect_experience_bonus(uuid,text),private.sect_progress_snapshot(private.player_sect_states),private.settle_sect_progress(uuid,text)from public,anon,authenticated;
