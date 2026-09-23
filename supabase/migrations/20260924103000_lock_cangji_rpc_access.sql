alter table public.cangji_games enable row level security;
revoke all on table public.cangji_games from public,anon,authenticated;

revoke execute on function public.cangji_create_game(text,text,text,integer),public.cangji_accept_game(uuid,text,text),public.cangji_claim_game(uuid),public.cangji_cancel_game(uuid),public.cangji_claim_all_games(text),public.cangji_cancel_all_games(text)from public,anon;
grant execute on function public.cangji_create_game(text,text,text,integer),public.cangji_accept_game(uuid,text,text),public.cangji_claim_game(uuid),public.cangji_cancel_game(uuid),public.cangji_claim_all_games(text),public.cangji_cancel_all_games(text)to authenticated;
