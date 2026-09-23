-- PostgreSQL grants EXECUTE on newly-created functions to PUBLIC unless the
-- default privilege is changed.  Keep player APIs on explicit authenticated
-- grants and make future backend helpers private by default.
alter default privileges in schema public revoke execute on functions from public;
revoke execute on all functions in schema public from public, anon;

-- Administrative functions remain callable only by authenticated sessions;
-- each routine performs its own jade_admins membership check.
grant execute on function public.admin_issue_jade(text,bigint,text,text) to authenticated;
grant execute on function public.admin_recent_jade_grants() to authenticated;
