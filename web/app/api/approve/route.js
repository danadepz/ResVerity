import { NextResponse } from 'next/server';
import { supabase, useSupabase } from '@/lib/supabase';
import { readLocalDb, writeLocalDb } from '@/lib/localDb';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const submissionId = parseInt(searchParams.get('submission_id'));
        const email = searchParams.get('email');

        if (!submissionId || !email) {
            return NextResponse.json({ error: 'Missing submission_id or email parameters' }, { status: 400 });
        }

        if (useSupabase) {
            try {
                // Record approval
                await supabase.from('co_authors').update({ has_approved: true }).eq('submission_id', submissionId).eq('email', email);
                
                // Check if all approved
                const { data: coAuthors } = await supabase.from('co_authors').select('*').eq('submission_id', submissionId);
                const allApproved = coAuthors.every(a => a.has_approved);
                
                if (allApproved) {
                    await supabase.from('submissions').update({ status: 'PUBLISHED' }).eq('id', submissionId);
                    return NextResponse.json({ status: 'published' });
                }
                return NextResponse.json({ status: 'approved' });
            } catch (e) {
                console.error("Supabase approval error:", e);
            }
        }

        // Local SQLite/JSON Fallback
        const localData = readLocalDb();
        const sub = localData.find(s => s.id === submissionId);
        if (sub) {
            const author = sub.coAuthors.find(a => a.email === email);
            if (author) {
                author.approved = true;
            }
            // Check if all are now approved
            const allApproved = sub.coAuthors.every(a => a.approved);
            if (allApproved) {
                sub.status = 'PUBLISHED';
            }
            writeLocalDb(localData);
            return NextResponse.json({ status: allApproved ? 'published' : 'approved' });
        }

        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    } catch (e) {
        console.error("Approve API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
