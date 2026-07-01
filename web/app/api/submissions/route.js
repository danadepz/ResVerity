import { NextResponse } from 'next/server';
import { supabase, useSupabase } from '@/lib/supabase';
import { readLocalDb, writeLocalDb } from '@/lib/localDb';

export async function GET() {
    if (useSupabase) {
        try {
            const { data: subs, error } = await supabase.from('submissions').select('*');
            if (error) throw error;
            
            const results = [];
            for (const s of subs) {
                // Fetch coAuthors
                const { data: coAuthors } = await supabase.from('co_authors').select('*').eq('submission_id', s.id);
                // Fetch tags
                const { data: tags } = await supabase.from('tags').select('*').eq('submission_id', s.id);
                
                results.push({
                    id: s.id,
                    title: s.title,
                    abstract: s.abstract,
                    visibility: s.visibility_tier,
                    status: s.status,
                    uploadedBy: s.uploaded_by,
                    date: s.created_at.split('T')[0],
                    coAuthors: coAuthors ? coAuthors.map(a => ({ email: a.email, approved: a.has_approved })) : [],
                    tags: tags ? tags.map(t => ({ name: t.tag_name, type: t.tag_type })) : []
                });
            }
            return NextResponse.json(results);
        } catch (e) {
            console.error("Supabase Submissions GET failed, falling back to local database:", e);
        }
    }
    
    // SQLite/JSON Fallback
    const localData = readLocalDb();
    return NextResponse.json(localData);
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { title, abstract, visibility, uploaded_by, co_authors, pdf_url } = body;
        
        if (!title || !abstract) {
            return NextResponse.json({ error: 'Title and Abstract are required' }, { status: 400 });
        }

        const dateString = new Date().toISOString().split('T')[0];

        if (useSupabase) {
            try {
                const { data: subData, error: subErr } = await supabase.from('submissions').insert({
                    title,
                    abstract,
                    visibility_tier: visibility,
                    status: 'PENDING_VERIFICATION',
                    uploaded_by,
                    pdf_url
                }).select();
                
                if (subErr) throw subErr;
                const subId = subData[0].id;

                const coAuthorInserts = co_authors.map(email => ({
                    submission_id: subId,
                    email,
                    has_approved: false
                }));
                if (coAuthorInserts.length > 0) {
                    await supabase.from('co_authors').insert(coAuthorInserts);
                }

                // AI Tag Generation (Mock/Rule-based for insert speed)
                const tags = generateSimpleTags(title, abstract);
                const tagInserts = tags.map(t => ({
                    submission_id: subId,
                    tag_name: t.name,
                    tag_type: t.type
                }));
                if (tagInserts.length > 0) {
                    await supabase.from('tags').insert(tagInserts);
                }

                return NextResponse.json({ status: 'success', id: subId });
            } catch (e) {
                console.error("Supabase insert error, saving locally instead:", e);
            }
        }

        // Local SQLite/JSON Fallback
        const localData = readLocalDb();
        const nextId = localData.length > 0 ? Math.max(...localData.map(s => s.id)) + 1 : 1;
        
        const newSubmission = {
            id: nextId,
            title,
            abstract,
            visibility,
            status: 'PENDING_VERIFICATION',
            uploadedBy: uploaded_by,
            coAuthors: co_authors.map(email => ({ email, approved: false })),
            tags: generateSimpleTags(title, abstract),
            date: dateString,
            pdfUrl: pdf_url
        };
        
        localData.push(newSubmission);
        writeLocalDb(localData);

        return NextResponse.json({ status: 'success', id: nextId });
    } catch (e) {
        console.error("Submissions POST error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

function generateSimpleTags(title, abstract) {
    const text = (title + " " + abstract).toLowerCase();
    const tags = [];

    if (text.includes("city") || text.includes("cities") || text.includes("urban") || text.includes("traffic") || text.includes("community")) {
        tags.push({ name: "SDG 11: Sustainable Cities", type: "SDG" });
    } else if (text.includes("business") || text.includes("industry") || text.includes("automation") || text.includes("infrastructure") || text.includes("innovation")) {
        tags.push({ name: "SDG 9: Industry & Innovation", type: "SDG" });
    } else {
        tags.push({ name: "SDG 4: Quality Education", type: "SDG" });
    }

    if (text.includes("nlp") || text.includes("predictive") || text.includes("ml") || text.includes("learning") || text.includes("neural") || text.includes("intelligence")) {
        tags.push({ name: "AI & Analytics", type: "TECH" });
    } else if (text.includes("cryptographic") || text.includes("security") || text.includes("blockchain")) {
        tags.push({ name: "Cybersecurity", type: "TECH" });
    } else {
        tags.push({ name: "Data Systems", type: "TECH" });
    }
    return tags;
}
