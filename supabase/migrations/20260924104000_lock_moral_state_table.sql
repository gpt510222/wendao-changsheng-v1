alter table private.player_moral_states enable row level security;
revoke all on table private.player_moral_states from public,anon,authenticated;
