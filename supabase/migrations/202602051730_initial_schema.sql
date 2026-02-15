create extension if not exists pgcrypto;

-- Keep profile IDs aligned with Supabase Auth user IDs for strict ownership checks.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sessions_title_length check (char_length(title) between 1 and 200)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  token_count integer not null default 0 check (token_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_content_length check (char_length(content) between 1 and 40000)
);

create table if not exists memory_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_summary_length check (char_length(summary) between 1 and 20000)
);

create table if not exists user_usage_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_active_sessions integer not null default 10 check (max_active_sessions between 1 and 1000),
  max_messages_per_session integer not null default 200 check (max_messages_per_session between 10 and 50000),
  max_images integer not null default 100 check (max_images between 1 and 100000),
  daily_token_limit integer not null default 100000 check (daily_token_limit between 1000 and 10000000),
  max_image_size_bytes integer not null default 10485760 check (max_image_size_bytes between 1048576 and 104857600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_usage_counters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_count_today integer not null default 0 check (token_count_today >= 0),
  active_sessions integer not null default 0 check (active_sessions >= 0),
  total_images integer not null default 0 check (total_images >= 0),
  reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  storage_bucket text not null default 'media',
  storage_path text not null,
  mime_type text not null,
  file_size_bytes integer not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_unique_path unique (storage_bucket, storage_path)
);

create table if not exists photo_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_asset_id uuid not null references media_assets(id) on delete cascade,
  edited_asset_id uuid references media_assets(id) on delete set null,
  prompt text not null,
  model text not null,
  status text not null default 'completed' check (status in ('queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_edits_prompt_length check (char_length(prompt) between 1 and 4000)
);

-- Updated-at helper trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on profiles;
create trigger set_updated_at_profiles before update on profiles for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_sessions on sessions;
create trigger set_updated_at_sessions before update on sessions for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_messages on messages;
create trigger set_updated_at_messages before update on messages for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_memory_summaries on memory_summaries;
create trigger set_updated_at_memory_summaries before update on memory_summaries for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_usage_limits on user_usage_limits;
create trigger set_updated_at_user_usage_limits before update on user_usage_limits for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_user_usage_counters on user_usage_counters;
create trigger set_updated_at_user_usage_counters before update on user_usage_counters for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_media_assets on media_assets;
create trigger set_updated_at_media_assets before update on media_assets for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_photo_edits on photo_edits;
create trigger set_updated_at_photo_edits before update on photo_edits for each row execute function public.set_updated_at();

-- Indexes for typical reads by owner and recency.
create index if not exists idx_sessions_user_active_updated on sessions(user_id, is_active, updated_at desc);
create index if not exists idx_messages_session_created on messages(session_id, created_at asc);
create index if not exists idx_memory_summaries_session on memory_summaries(session_id);
create index if not exists idx_media_assets_user_created on media_assets(user_id, created_at desc);
create index if not exists idx_photo_edits_user_created on photo_edits(user_id, created_at desc);
create index if not exists idx_photo_edits_source_asset on photo_edits(source_asset_id, created_at desc);

alter table profiles enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table memory_summaries enable row level security;
alter table user_usage_limits enable row level security;
alter table user_usage_counters enable row level security;
alter table media_assets enable row level security;
alter table photo_edits enable row level security;

-- Profiles: each authenticated user can only manage their own row.
drop policy if exists "profiles owner read/write" on profiles;
create policy "profiles owner read/write"
on profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

-- Sessions belong directly to auth.users.
drop policy if exists "sessions owner read/write" on sessions;
create policy "sessions owner read/write"
on sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Messages are owned via their parent session.
drop policy if exists "messages owner read/write" on messages;
create policy "messages owner read/write"
on messages
for all
using (
  exists (
    select 1 from sessions s
    where s.id = messages.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from sessions s
    where s.id = messages.session_id
      and s.user_id = auth.uid()
  )
);

-- Memory summaries are owned via session ownership.
drop policy if exists "memory summaries owner read/write" on memory_summaries;
create policy "memory summaries owner read/write"
on memory_summaries
for all
using (
  exists (
    select 1 from sessions s
    where s.id = memory_summaries.session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from sessions s
    where s.id = memory_summaries.session_id
      and s.user_id = auth.uid()
  )
);

-- Limits/counters are per-user.
drop policy if exists "usage limits owner read/write" on user_usage_limits;
create policy "usage limits owner read/write"
on user_usage_limits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "usage counters owner read/write" on user_usage_counters;
create policy "usage counters owner read/write"
on user_usage_counters
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Assets and edits are per-user, with edit rows also constrained to owned assets.
drop policy if exists "media assets owner read/write" on media_assets;
create policy "media assets owner read/write"
on media_assets
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "photo edits owner read/write" on photo_edits;
create policy "photo edits owner read/write"
on photo_edits
for all
using (
  auth.uid() = user_id
  and exists (
    select 1 from media_assets a
    where a.id = photo_edits.source_asset_id
      and a.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from media_assets a
    where a.id = photo_edits.source_asset_id
      and a.user_id = auth.uid()
  )
  and (
    photo_edits.edited_asset_id is null
    or exists (
      select 1 from media_assets e
      where e.id = photo_edits.edited_asset_id
        and e.user_id = auth.uid()
    )
  )
);
