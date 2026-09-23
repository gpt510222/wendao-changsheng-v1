create or replace function public.player_spirit_tribulation(
  p_channel text,p_expected_wallet_revision bigint,p_expected_progression_revision bigint,p_request_id uuid,
  p_foundation_bonus integer default 0,p_guard_level integer default 0,p_used_pills integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=(select auth.uid());w private.player_resource_wallets;p private.player_progression_states;m private.player_moral_states;item private.player_mail_item_balances;
 current_level integer;next_level integer;realm_index integer;base_chance integer;bonus integer;guard_level integer;max_pills integer;chance integer;cost numeric;loss_percent integer;loss numeric:=0;succeeded boolean;profile jsonb;base_rate numeric;old_eff numeric;new_eff numeric;pill_key text;remaining_pills bigint:=0;
begin
 if uid is null then raise exception 'authentication required';end if;if p_channel not in('formal','test')or p_request_id is null or p_used_pills is null or p_used_pills not between 0 and 20 then raise exception 'invalid tribulation parameters';end if;
 if exists(select 1 from private.player_state_events e where e.user_id=uid and e.channel=p_channel and e.request_id=p_request_id)then raise exception 'duplicate request';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-spirit-tribulation-'||p_channel));
 select * into w from private.player_resource_wallets where user_id=uid and channel=p_channel for update;select * into p from private.player_progression_states where user_id=uid and channel=p_channel for update;select * into m from private.player_moral_states where user_id=uid and channel=p_channel;
 if w.user_id is null or p.user_id is null then raise exception 'player state not initialized';end if;if w.revision<>p_expected_wallet_revision or p.revision<>p_expected_progression_revision then raise exception 'resource revision conflict';end if;if not p.spirit_path_opened then raise exception 'spirit path is not opened';end if;
 current_level:=p.spirit_level;next_level:=current_level+1;if current_level>=228 then raise exception 'level limit reached';end if;if next_level%10<>0 then raise exception 'not a major breakthrough';end if;
 cost:=private.path_upgrade_cost('spirit',current_level);if w.cultivation<cost then raise exception 'insufficient cultivation';end if;
 realm_index:=floor(next_level/10.0)::integer;base_chance:=case when realm_index<=6 then 50 when realm_index<=12 then 40 when realm_index<=17 then 30 else 20 end;
 bonus:=(case when p.qi_cycle='still'then 5 else 0 end)+least(8,p.qi_mark_still)+least(6,p.qi_focus);
 guard_level:=least(3,greatest(0,coalesce((m.qi_heart_traits->>'guard')::integer,0)));
 max_pills:=greatest(0,ceil((100-base_chance-bonus)/5.0)::integer);if p_used_pills>max_pills then raise exception 'too many tribulation pills';end if;
 pill_key:='tribPill'||realm_index;select * into item from private.player_mail_item_balances where user_id=uid and channel=p_channel and item_key=pill_key for update;
 if p_used_pills>coalesce(item.amount,0)then raise exception 'insufficient tribulation pills';end if;
 if p_used_pills>0 then update private.player_mail_item_balances set amount=amount-p_used_pills,updated_at=now()where user_id=uid and channel=p_channel and item_key=pill_key returning amount into remaining_pills;else remaining_pills:=coalesce(item.amount,0);end if;
 chance:=least(100,base_chance+bonus+p_used_pills*5);succeeded:=floor(random()*100)::integer<chance;profile:=coalesce(w.earning_profile,'{}'::jsonb);
 if succeeded then w.cultivation:=w.cultivation-cost;p.spirit_level:=next_level;old_eff:=private.path_efficiency(current_level);new_eff:=private.path_efficiency(next_level);base_rate:=coalesce((profile->>'base_cultivation_rate')::numeric,coalesce((profile->>'cultivation_rate')::numeric,0));base_rate:=floor(base_rate*new_eff/old_eff);profile:=profile||jsonb_build_object('base_cultivation_rate',base_rate::text,'cultivation_rate',floor(base_rate*(1+coalesce((profile->>'cave_cultivation_bonus')::numeric,0)))::text);
 else loss_percent:=50-guard_level*5;loss:=ceil(cost*loss_percent/100.0);w.cultivation:=greatest(0,w.cultivation-loss);end if;
 update private.player_resource_wallets set cultivation=w.cultivation,earning_profile=profile,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into w;
 update private.player_progression_states set spirit_level=p.spirit_level,qi_focus=0,revision=revision+1,updated_at=now()where user_id=uid and channel=p_channel returning * into p;
 insert into private.player_state_events(user_id,channel,revision,event_type,request_id,payload)values(uid,p_channel,p.revision,'spirit_tribulation_resolved',p_request_id,jsonb_build_object('success',succeeded,'level',current_level,'chance',chance,'foundation_bonus',bonus,'guard_level',guard_level,'used_pills',p_used_pills,'pill_key',pill_key,'cost',cost::text,'loss',loss::text,'wallet_revision',w.revision));
 return jsonb_build_object('success',succeeded,'chance',chance,'loss_percent',case when succeeded then 0 else loss_percent end,'itemBalances',jsonb_build_object(pill_key,remaining_pills),'wallet',private.wallet_snapshot(w),'progression',private.progression_snapshot(p));
end $$;
revoke execute on function public.player_spirit_tribulation(text,bigint,bigint,uuid,integer,integer,integer)from public,anon;
grant execute on function public.player_spirit_tribulation(text,bigint,bigint,uuid,integer,integer,integer)to authenticated;
