-- ============================================================
-- 001_initial.sql — Complete schema for video submissions app
-- ============================================================

-- Helper function: generate random 6-char alphanumeric short code
create or replace function generate_short_code() returns text as $$
  select substring(md5(random()::text) from 1 for 6);
$$ language sql;

-- ============================================================
-- TABLE: submissions
-- ============================================================
create table if not exists submissions (
  id               uuid        primary key default gen_random_uuid(),
  url              text        not null,
  platform         text        not null check (platform in ('youtube', 'tiktok')),
  submitter_username text      not null,
  status           text        not null default 'pending'
                               check (status in ('pending', 'approved', 'rejected')),
  submitted_at     timestamptz not null default now()
);

-- ============================================================
-- TABLE: short_links
-- ============================================================
create table if not exists short_links (
  id            uuid        primary key default gen_random_uuid(),
  code          text        not null unique,
  submission_id uuid        not null references submissions(id) on delete cascade,
  original_url  text        not null,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: download_jobs
-- ============================================================
create table if not exists download_jobs (
  id            uuid        primary key default gen_random_uuid(),
  submission_id uuid        not null references submissions(id) on delete cascade,
  status        text        not null default 'queued'
                            check (status in ('queued', 'processing', 'done', 'error')),
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table submissions   enable row level security;
alter table short_links   enable row level security;
alter table download_jobs enable row level security;

-- --- submissions ---
-- Anonymous users: INSERT only (public form submissions)
create policy "anon_insert_submissions"
  on submissions
  for insert
  to anon
  with check (true);

-- Authenticated users: SELECT + UPDATE (admin moderation)
create policy "auth_select_submissions"
  on submissions
  for select
  to authenticated
  using (true);

create policy "auth_update_submissions"
  on submissions
  for update
  to authenticated
  using (true)
  with check (true);

-- --- short_links ---
-- Anonymous users: SELECT (needed for redirect route /r/[code])
create policy "anon_select_short_links"
  on short_links
  for select
  to anon
  using (true);

-- Authenticated users: SELECT + INSERT (admin creates links on approval)
create policy "auth_select_short_links"
  on short_links
  for select
  to authenticated
  using (true);

create policy "auth_insert_short_links"
  on short_links
  for insert
  to authenticated
  with check (true);

-- --- download_jobs ---
-- Authenticated users: SELECT + INSERT + UPDATE (admin downloads)
create policy "auth_select_download_jobs"
  on download_jobs
  for select
  to authenticated
  using (true);

create policy "auth_insert_download_jobs"
  on download_jobs
  for insert
  to authenticated
  with check (true);

create policy "auth_update_download_jobs"
  on download_jobs
  for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- INDEXES (performance)
-- ============================================================
create index if not exists idx_submissions_status       on submissions(status);
create index if not exists idx_submissions_submitted_at on submissions(submitted_at);
create index if not exists idx_short_links_code         on short_links(code);
create index if not exists idx_short_links_submission   on short_links(submission_id);
create index if not exists idx_download_jobs_submission on download_jobs(submission_id);
create index if not exists idx_download_jobs_status     on download_jobs(status);
