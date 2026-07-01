-- =====================================================================
-- ResVerity — seed the remaining sample research into Supabase.
-- Run this ONCE in the SQL Editor if your directory looks empty after
-- connecting. (schema.sql already seeded paper #1: IoT Microclimate.)
-- Mirrors lib/localDb.js so the demo data matches the local fallback.
-- Re-running will create duplicates — run only once.
-- =====================================================================

-- Paper #2 — Predictive Analytics (PUBLISHED, shows on public directory)
with s as (
    insert into submissions (title, abstract, visibility_tier, status, uploaded_by, created_at)
    values (
        'Predictive Analytics for Small Business Supply Chains',
        'Applying lightweight linear regression model scripts to sales data from local sari-sari stores to forecast optimal inventory requirements.',
        'PUBLIC_ABSTRACT', 'PUBLISHED', 'maria.negosyo@uc.edu.ph', '2026-06-20'
    )
    returning id
),
co as (
    insert into co_authors (submission_id, email, has_approved)
    select id, 'carlos.santos@uc.edu.ph', true from s
)
insert into tags (submission_id, tag_name, tag_type)
select id, 'SDG 8: Decent Work & Growth', 'SDG' from s
union all
select id, 'AI & Analytics', 'TECH' from s;

-- Paper #3 — Micro-Credentials (INSTITUTIONAL + PENDING).
-- Hidden from the public landing by design; visible in the portal.
with s as (
    insert into submissions (title, abstract, visibility_tier, status, uploaded_by, created_at)
    values (
        'Decentralized Micro-Credentials and Certificate Registry',
        'A secure verification architecture designed to store academic credentials using digital signatures, solving transcript fraud in local colleges.',
        'INSTITUTIONAL', 'PENDING_VERIFICATION', 'jane.doe@uc.edu.ph', '2026-06-30'
    )
    returning id
),
co as (
    insert into co_authors (submission_id, email, has_approved)
    select id, 'author.delacruz@uc.edu.ph', false from s
    union all
    select id, 'mark.smith@uc.edu.ph', false from s
)
insert into tags (submission_id, tag_name, tag_type)
select id, 'SDG 9: Industry & Innovation', 'SDG' from s
union all
select id, 'Cybersecurity', 'TECH' from s;
