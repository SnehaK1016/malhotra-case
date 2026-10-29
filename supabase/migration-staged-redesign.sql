-- The Malhotra Case: staged redesign (Round 1 warm-up, Round 2 guided tasks, Round 3 SQL questions).
-- Additive and safe to re-run on a live database. Run it BEFORE deploying this build. Nothing is deleted or changed.
alter table progress add column if not exists stages jsonb not null default '{}'::jsonb;
