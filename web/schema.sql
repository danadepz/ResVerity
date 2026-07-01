-- ResVerity Database Schema Setup for Supabase / PostgreSQL

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    abstract TEXT NOT NULL,
    pdf_url VARCHAR(512),
    visibility_tier VARCHAR(50) DEFAULT 'PUBLIC_ABSTRACT', -- PUBLIC_ABSTRACT, INSTITUTIONAL, OPEN_ACCESS
    status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',    -- PENDING_VERIFICATION, PUBLISHED, REJECTED
    uploaded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create co_authors verification table
CREATE TABLE IF NOT EXISTS co_authors (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES submissions(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    has_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Create tags table for SDG / Tech Domain classification
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES submissions(id) ON DELETE CASCADE,
    tag_name VARCHAR(100) NOT NULL,
    tag_type VARCHAR(50) NOT NULL -- SDG, TECH
);

-- Enable RLS (Row-Level Security)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Select policies
-- Anyone can see basic metadata of public abstracts or fully open access papers
CREATE POLICY select_public_metadata ON submissions
    FOR SELECT
    USING (visibility_tier = 'PUBLIC_ABSTRACT' OR visibility_tier = 'OPEN_ACCESS' OR status = 'PUBLISHED');
