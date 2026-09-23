alter table public.arena_profiles add constraint arena_profiles_channel_valid check(channel in('formal','test'))not valid;
alter table public.arena_daily add constraint arena_daily_channel_valid check(channel in('formal','test'))not valid;
alter table public.arena_matches add constraint arena_matches_channel_valid check(channel in('formal','test'))not valid;
alter table public.arena_rewards add constraint arena_rewards_channel_valid check(channel in('formal','test'))not valid;
alter table private.arena_name_owners add constraint arena_name_owners_channel_valid check(channel in('formal','test'))not valid;
alter table private.arena_week_state add constraint arena_week_state_channel_valid check(channel in('formal','test'))not valid;

alter table public.arena_profiles validate constraint arena_profiles_channel_valid;
alter table public.arena_daily validate constraint arena_daily_channel_valid;
alter table public.arena_matches validate constraint arena_matches_channel_valid;
alter table public.arena_rewards validate constraint arena_rewards_channel_valid;
alter table private.arena_name_owners validate constraint arena_name_owners_channel_valid;
alter table private.arena_week_state validate constraint arena_week_state_channel_valid;
