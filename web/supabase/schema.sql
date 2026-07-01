-- =====================================================================
-- ResVerity — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Matches the columns used by app/api/* and lib/localDb.js.
-- =====================================================================

-- ------------------------------- TABLES -------------------------------

create table if not exists submissions (
    id             bigint generated always as identity primary key,
    title          text not null,
    abstract       text not null,
    visibility_tier text not null default 'PUBLIC_ABSTRACT',  -- PUBLIC_ABSTRACT | INSTITUTIONAL | OPEN_ACCESS
    status         text not null default 'PENDING_VERIFICATION', -- PENDING_VERIFICATION | PUBLISHED | REJECTED
    uploaded_by    text,
    pdf_url        text,
    created_at     timestamptz not null default now()
);

create table if not exists co_authors (
    id            bigint generated always as identity primary key,
    submission_id bigint not null references submissions(id) on delete cascade,
    email         text not null,
    has_approved  boolean not null default false
);

create table if not exists tags (
    id            bigint generated always as identity primary key,
    submission_id bigint not null references submissions(id) on delete cascade,
    tag_name      text not null,
    tag_type      text not null   -- 'SDG' | 'TECH'
);

create index if not exists idx_co_authors_submission on co_authors(submission_id);
create index if not exists idx_tags_submission        on tags(submission_id);

-- ----------------------- ROW LEVEL SECURITY ---------------------------
-- The app authenticates users itself (no Supabase Auth yet) and talks to
-- the DB with the browser-safe *publishable* key, which maps to the
-- `anon` role. These permissive policies let the app read/write.
-- NOTE: fine for a demo/hackathon. Tighten before production
-- (e.g. once real Supabase Auth is wired into the portal login).

alter table submissions enable row level security;
alter table co_authors  enable row level security;
alter table tags        enable row level security;

drop policy if exists "resverity anon submissions" on submissions;
drop policy if exists "resverity anon co_authors"  on co_authors;
drop policy if exists "resverity anon tags"        on tags;

create policy "resverity anon submissions" on submissions
    for all using (true) with check (true);
create policy "resverity anon co_authors" on co_authors
    for all using (true) with check (true);
create policy "resverity anon tags" on tags
    for all using (true) with check (true);

-- --------------------------- OPTIONAL SEED ----------------------------
-- Gives the public landing directory something to show immediately.
-- Safe to skip (the portal can create submissions on its own).

with s as (
    insert into submissions (title, abstract, visibility_tier, status, uploaded_by, created_at)
    values (
        'IoT-Based Microclimate Monitoring for Urban Farms',
        'This research presents a wireless sensor node deployment designed for monitoring soil humidity, ambient temperature, and sunlight levels in Cebu community spaces. Using a low-cost microcontroller grid, the system reports real-time parameters to an open-source analytics dashboard.',
        'OPEN_ACCESS', 'PUBLISHED', 'student.farmer@uc.edu.ph', '2026-06-15'
    )
    returning id
)
insert into tags (submission_id, tag_name, tag_type)
select id, 'SDG 11: Sustainable Cities', 'SDG' from s
union all
select id, 'IoT & Hardware', 'TECH' from s;
