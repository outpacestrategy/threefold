-- Threefold Database Schema

-- Profiles table
create table if not exists tf_profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  identity_type text not null default 'other',
  identity_statement text not null default '',
  focus_areas text[] not null default '{}',
  ai_tone text not null default 'supportive',
  onboarding_complete boolean not null default false,
  push_token text,
  created_at timestamptz not null default now()
);

alter table tf_profiles enable row level security;

create policy "Users can read own profile"
  on tf_profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on tf_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on tf_profiles for update
  using (auth.uid() = id);

-- Day entries table
create table if not exists tf_day_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date text not null,
  hard_goal text not null default '',
  routine_goal text not null default '',
  new_goal text not null default '',
  hard_complete boolean not null default false,
  routine_complete boolean not null default false,
  new_complete boolean not null default false,
  reflection text,
  sleep_rating int,
  checked_in boolean not null default false,
  ai_insight text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table tf_day_entries enable row level security;

create policy "Users can read own entries"
  on tf_day_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on tf_day_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on tf_day_entries for update
  using (auth.uid() = user_id);

-- Friend requests table
create table if not exists tf_friend_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goal_type text not null,
  friend_name text not null default '',
  friend_phone text not null default '',
  status text not null default 'pending',
  suggested_goal text,
  created_at timestamptz not null default now()
);

alter table tf_friend_requests enable row level security;

-- Anyone with the ID can read the request (for the friend page)
create policy "Anyone can read friend requests by id"
  on tf_friend_requests for select
  using (true);

-- Anyone can update (for friend response from web page)
create policy "Anyone can update friend requests"
  on tf_friend_requests for update
  using (true);

-- Only the user can insert their own requests
create policy "Users can insert own friend requests"
  on tf_friend_requests for insert
  with check (auth.uid() = user_id);
