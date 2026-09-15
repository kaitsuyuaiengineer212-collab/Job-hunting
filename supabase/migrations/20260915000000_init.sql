-- Custom (user-created) exercises. Default exercises live in the app code and are not synced.
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  created_at timestamptz not null default now()
);

-- One row per logged workout day. exercise_logs mirrors the app's ExerciseLog[] shape:
-- [{ "exerciseId": string, "sets": [{ "weight": number, "reps": number }] }]
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  exercise_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Weekly menu templates. exercises mirrors MenuExercise[]:
-- [{ "exerciseId": string, "targetSets": number, "targetReps": number }]
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  weekdays int[] not null default '{}',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- One row per user: bodyweight + per-exercise goal weights ({ [exerciseId]: number }).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bodyweight_kg numeric,
  goals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists sessions_user_date_idx on public.sessions (user_id, date);
create index if not exists exercises_user_idx on public.exercises (user_id);
create index if not exists menus_user_idx on public.menus (user_id);

alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.menus enable row level security;
alter table public.profiles enable row level security;

create policy "exercises_owner_all" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_owner_all" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "menus_owner_all" on public.menus
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
