import os
import json
import sqlite3
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

from parser import extract_text_from_pdf
from tagger import classify_research

# Load environment configuration
load_dotenv()

app = FastAPI(title="ResVerity Backend API")

# Enable CORS for direct local file index.html testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
use_supabase = bool(SUPABASE_URL and SUPABASE_KEY)

# Local DB initialization (Fallback)
LOCAL_DB = "resverity.db"
def init_local_db():
    conn = sqlite3.connect(LOCAL_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            abstract TEXT NOT NULL,
            pdf_url TEXT,
            visibility_tier TEXT,
            status TEXT,
            uploaded_by TEXT,
            date TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS co_authors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER,
            email TEXT,
            approved INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER,
            tag_name TEXT,
            tag_type TEXT
        )
    """)
    conn.commit()
    conn.close()

if not use_supabase:
    print("Supabase credentials not found. Operating with local SQLite database.")
    init_local_db()
else:
    print("Supabase integration enabled.")
    from supabase import create_client, Client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Submission schemas
class CoAuthorModel(BaseModel):
    email: str
    approved: bool = False

class TagModel(BaseModel):
    name: str
    type: str

class SubmissionCreate(BaseModel):
    title: str
    abstract: str
    visibility: str
    uploaded_by: str
    co_authors: List[str]

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Parses PDF text and triggers auto NLP categorization tagging.
    """
    contents = await file.read()
    extracted_text = extract_text_from_pdf(contents)
    
    # Try parsing title from the first lines
    lines = [l.strip() for l in extracted_text.split("\n") if l.strip()]
    parsed_title = lines[0] if lines else file.filename.replace(".pdf", "").replace("_", " ").title()
    
    # Generate abstract snippet
    parsed_abstract = extracted_text[:1000] if len(extracted_text) > 100 else "Abstract could not be extracted automatically."
    
    # Run NLP classifier
    tags = classify_research(parsed_title, parsed_abstract)
    
    return {
        "filename": file.filename,
        "title": parsed_title,
        "abstract": parsed_abstract,
        "tags": tags
    }

@app.post("/api/submit")
async def create_submission(data: SubmissionCreate):
    """
    Saves metadata, co-authors, and generated tags to database.
    """
    import datetime
    today = datetime.date.today().isoformat()
    
    if use_supabase:
        try:
            # Insert submission
            sub_res = supabase.table("submissions").insert({
                "title": data.title,
                "abstract": data.abstract,
                "visibility_tier": data.visibility,
                "status": "PENDING_VERIFICATION",
                "uploaded_by": data.uploaded_by
            }).execute()
            
            sub_id = sub_res.data[0]["id"]
            
            # Insert Co-Authors
            co_author_data = [{"submission_id": sub_id, "email": email, "has_approved": False} for email in data.co_authors]
            if co_author_data:
                supabase.table("co_authors").insert(co_author_data).execute()
                
            # Classify tags & write
            tags = classify_research(data.title, data.abstract)
            tag_data = [{"submission_id": sub_id, "tag_name": t["name"], "tag_type": t["type"]} for t in tags]
            if tag_data:
                supabase.table("tags").insert(tag_data).execute()
                
            return {"status": "success", "submission_id": sub_id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # SQLite storage
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO submissions (title, abstract, visibility_tier, status, uploaded_by, date) VALUES (?, ?, ?, ?, ?, ?)",
            (data.title, data.abstract, data.visibility, "PENDING_VERIFICATION", data.uploaded_by, today)
        )
        sub_id = cursor.lastrowid
        
        for email in data.co_authors:
            cursor.execute("INSERT INTO co_authors (submission_id, email, approved) VALUES (?, ?, 0)", (sub_id, email))
            
        tags = classify_research(data.title, data.abstract)
        for t in tags:
            cursor.execute("INSERT INTO tags (submission_id, tag_name, tag_type) VALUES (?, ?, ?)", (sub_id, t["name"], t["type"]))
            
        conn.commit()
        conn.close()
        
        return {"status": "success", "submission_id": sub_id}

@app.get("/api/submissions")
async def get_submissions():
    """
    Returns all submissions alongside co-author status & tags.
    """
    if use_supabase:
        try:
            subs = supabase.table("submissions").select("*").execute().data
            for s in subs:
                # Merge fields for consistency with state shape
                s["visibility"] = s.pop("visibility_tier")
                s["uploadedBy"] = s.pop("uploaded_by")
                s["date"] = s.pop("created_at").split("T")[0]
                
                # Fetch co-authors
                co_authors = supabase.table("co_authors").select("*").eq("submission_id", s["id"]).execute().data
                s["coAuthors"] = [{"email": a["email"], "approved": a["has_approved"]} for a in co_authors]
                
                # Fetch tags
                tags = supabase.table("tags").select("*").eq("submission_id", s["id"]).execute().data
                s["tags"] = [{"name": t["tag_name"], "type": t["tag_type"]} for t in tags]
                
            return subs
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # SQLite fetch
        conn = sqlite3.connect(LOCAL_DB)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM submissions")
        subs = [dict(row) for row in cursor.fetchall()]
        
        for s in subs:
            # Map database keys to frontend schema
            s["visibility"] = s.pop("visibility_tier")
            s["uploadedBy"] = s.pop("uploaded_by")
            
            sub_id = s["id"]
            cursor.execute("SELECT email, approved FROM co_authors WHERE submission_id = ?", (sub_id,))
            s["coAuthors"] = [{"email": row["email"], "approved": bool(row["approved"])} for row in cursor.fetchall()]
            
            cursor.execute("SELECT tag_name as name, tag_type as type FROM tags WHERE submission_id = ?", (sub_id,))
            s["tags"] = [dict(row) for row in cursor.fetchall()]
            
        conn.close()
        return subs

@app.post("/api/approve")
async def approve_submission(submission_id: int, email: str):
    """
    Registers a co-author's verification signature. Upgrades paper to PUBLISHED if cleared.
    """
    if use_supabase:
        try:
            # Record approval
            supabase.table("co_authors").update({"has_approved": True}).eq("submission_id", submission_id).eq("email", email).execute()
            
            # Check if all approved
            co_authors = supabase.table("co_authors").select("*").eq("submission_id", submission_id).execute().data
            all_approved = all(a["has_approved"] for a in co_authors)
            
            if all_approved:
                supabase.table("submissions").update({"status": "PUBLISHED"}).eq("id", submission_id).execute()
                return {"status": "published"}
            return {"status": "approved"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        conn = sqlite3.connect(LOCAL_DB)
        cursor = conn.cursor()
        
        cursor.execute("UPDATE co_authors SET approved = 1 WHERE submission_id = ? AND email = ?", (submission_id, email))
        
        # Check if all approved
        cursor.execute("SELECT approved FROM co_authors WHERE submission_id = ?", (submission_id,))
        approvals = [row[0] for row in cursor.fetchall()]
        all_approved = all(bool(x) for x in approvals)
        
        if all_approved:
            cursor.execute("UPDATE submissions SET status = 'PUBLISHED' WHERE id = ?", (submission_id,))
            conn.commit()
            conn.close()
            return {"status": "published"}
            
        conn.commit()
        conn.close()
        return {"status": "approved"}
