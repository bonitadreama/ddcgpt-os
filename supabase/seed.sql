-- Dev-only seed helpers for local Supabase.
-- Replace these UUIDs with real auth.users IDs created in your local environment.

-- Example user IDs (must exist in auth.users before running inserts below)
-- 11111111-1111-1111-1111-111111111111
-- 22222222-2222-2222-2222-222222222222

insert into profiles (id, email, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'demo1@example.com', 'Demo User 1'),
  ('22222222-2222-2222-2222-222222222222', 'demo2@example.com', 'Demo User 2')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

insert into user_usage_limits (user_id, max_active_sessions, max_messages_per_session, max_images, daily_token_limit)
values
  ('11111111-1111-1111-1111-111111111111', 10, 200, 100, 100000),
  ('22222222-2222-2222-2222-222222222222', 10, 200, 100, 100000)
on conflict (user_id) do nothing;

insert into user_usage_counters (user_id, token_count_today, active_sessions, total_images)
values
  ('11111111-1111-1111-1111-111111111111', 0, 0, 0),
  ('22222222-2222-2222-2222-222222222222', 0, 0, 0)
on conflict (user_id) do nothing;
