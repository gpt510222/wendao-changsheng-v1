create or replace function public.player_jade_bootstrap(p_channel text,p_legacy_balance bigint default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=(select auth.uid());w private.player_jade_wallets;grant_total bigint:=0;opening bigint:=0;
begin
 if uid is null then raise exception '需要重新登入';end if;if p_channel not in('formal','test') then raise exception '版本不正確';end if;
 perform pg_advisory_xact_lock(hashtext(uid::text||'-jade-'||p_channel));insert into private.player_jade_wallets(user_id,channel) values(uid,p_channel) on conflict do nothing;select * into w from private.player_jade_wallets where user_id=uid and channel=p_channel for update;
 if not w.legacy_imported then
  if p_channel='formal' then select coalesce(sum(amount),0) into grant_total from public.jade_grants where user_id=uid;opening:=least(grant_total,greatest(0,coalesce(p_legacy_balance,0)));else opening:=least(99999,greatest(99999,coalesce(p_legacy_balance,0)));end if;
  update private.player_jade_wallets set balance=balance+opening,legacy_imported=true,revision=revision+1,updated_at=now() where user_id=uid and channel=p_channel returning * into w;
  insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata) values(uid,p_channel,opening,w.balance,'legacy_import','opening',jsonb_build_object('grant_cap',grant_total)) on conflict do nothing;
 end if;
 update public.jade_grants set status='claimed',claimed_at=coalesce(claimed_at,now()) where user_id=uid and status='pending';return private.jade_wallet_snapshot(w);
end $$;

create or replace function public.admin_issue_jade(p_public_uid text,p_amount bigint,p_order_ref text,p_note text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare target_user uuid;grant_id uuid;w private.player_jade_wallets;
begin
 if not private.is_jade_admin() then raise exception 'not authorized';end if;if p_amount<1 or p_amount>10000000 then raise exception 'invalid amount';end if;select user_id into target_user from public.player_accounts where public_uid=upper(trim(p_public_uid)) and release_channel='v1';if target_user is null then raise exception 'player UID not found';end if;
 perform pg_advisory_xact_lock(hashtext(target_user::text||'-jade-formal'));insert into public.jade_grants(user_id,public_uid,amount,order_ref,note,created_by,status,claimed_at) values(target_user,upper(trim(p_public_uid)),p_amount,trim(p_order_ref),coalesce(p_note,''),(select auth.uid()),'claimed',now()) returning id into grant_id;
 insert into private.player_jade_wallets(user_id,channel,balance,legacy_imported) values(target_user,'formal',p_amount,false) on conflict(user_id,channel) do update set balance=private.player_jade_wallets.balance+excluded.balance,revision=private.player_jade_wallets.revision+1,updated_at=now() returning * into w;
 insert into private.gem_ledger(user_id,channel,amount,balance_after,event_type,source_ref,metadata) values(target_user,'formal',p_amount,w.balance,'admin_grant',grant_id::text,jsonb_build_object('order_ref',trim(p_order_ref),'note',coalesce(p_note,''),'admin',(select auth.uid())));return grant_id;
end $$;
