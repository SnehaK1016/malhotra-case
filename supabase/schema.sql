-- The Malhotra Case: run once in the Supabase SQL editor.
create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  team_code text unique not null,
  team_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists progress (
  team_id uuid primary key references teams(id) on delete cascade,
  current_round int not null default 1,
  round_1_complete boolean not null default false,
  round_2_complete boolean not null default false,
  round_3_complete boolean not null default false,
  round_4_complete boolean not null default false,
  round_5_complete boolean not null default false,
  final_complete boolean not null default false,
  hints_used int not null default 0,
  penalty int not null default 0,
  wrong_attempts int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  entered_round int,
  paused_at timestamptz,
  paused_ms bigint not null default 0,
  clues_solved int[] not null default '{}',
  clue_hints int[] not null default '{}',
  clue_wrong int not null default 0,
  sealed_round int not null default 0,
  stages jsonb not null default '{}'::jsonb
);

-- Five round-entry codes per team, generated once by the app and never regenerated.
create table if not exists entry_codes (
  code text primary key,
  team_id uuid not null references teams(id) on delete cascade,
  round int not null check (round between 1 and 5),
  created_at timestamptz not null default now(),
  unique (team_id, round)
);

create table if not exists submissions (
  id uuid primary key,
  team_id uuid not null references teams(id) on delete cascade,
  round int not null,
  answer text not null,
  correct boolean not null,
  submitted_at timestamptz not null default now()
);

create table if not exists hint_usage (
  team_id uuid not null references teams(id) on delete cascade,
  round int not null,
  hint_no int not null,
  used_at timestamptz not null default now(),
  primary key (team_id, round, hint_no)
);

-- The app talks to Supabase only from the server using the service-role key.
-- Enable RLS with no policies so the anon key can never read these tables.
alter table teams enable row level security;
alter table progress enable row level security;
alter table submissions enable row level security;
alter table hint_usage enable row level security;
alter table entry_codes enable row level security;

-- Existing database from an earlier version? Run supabase/migration-room-route.sql instead of this file.

-- Upgrading a live database from the previous build? Run migration-room-route.sql (if not already run) and then migration-staged-redesign.sql.
