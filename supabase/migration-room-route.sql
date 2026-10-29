-- The Malhotra Case: room route upgrade.
-- Safe to run on a live database: it only ADDS a table and columns. No rows are deleted or changed,
-- and it can be run more than once. Run it in the Supabase SQL editor BEFORE deploying the new build.

create table if not exists entry_codes (
  code text primary key,
  team_id uuid not null references teams(id) on delete cascade,
  round int not null check (round between 1 and 5),
  created_at timestamptz not null default now(),
  unique (team_id, round)
);
alter table entry_codes enable row level security;

alter table progress add column if not exists entered_round int;          -- null = row from before the upgrade (the app derives it)
alter table progress add column if not exists paused_at timestamptz;
alter table progress add column if not exists paused_ms bigint not null default 0;
alter table progress add column if not exists clues_solved int[] not null default '{}';
alter table progress add column if not exists clue_hints int[] not null default '{}';
alter table progress add column if not exists clue_wrong int not null default 0;
alter table progress add column if not exists sealed_round int not null default 0;

-- Round 4 questions and Round 5 finale progress (added with the C4 → Lab → B2 → B1 → B3 route update)
alter table progress add column if not exists stages jsonb not null default '{}'::jsonb;
