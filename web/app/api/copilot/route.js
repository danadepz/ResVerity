import { NextResponse } from 'next/server';
import { supabase, useSupabase } from '@/lib/supabase';
import { readLocalDb } from '@/lib/localDb';
import { GoogleGenAI } from '@google/generative-ai';

export async function POST(request) {
    try {
        const body = await request.json();
        const { query } = body;
        if (!query) {
            return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }

        let publishedPapers = [];
        
        if (useSupabase) {
            try {
                const { data: subs } = await supabase.from('submissions').select('*').eq('status', 'PUBLISHED');
                if (subs) {
                    for (const s of subs) {
                        const { data: tags } = await supabase.from('tags').select('*').eq('submission_id', s.id);
                        publishedPapers.push({
                            title: s.title,
                            abstract: s.abstract,
                            tags: tags ? tags.map(t => ({ name: t.tag_name })) : []
                        });
                    }
                }
            } catch (e) {
                console.error("Supabase failed inside copilot, defaulting to local DB:", e);
            }
        }

        if (publishedPapers.length === 0) {
            const localData = readLocalDb();
            publishedPapers = localData.filter(s => s.status === 'PUBLISHED');
        }

        // Format context
        let papersText = "";
        for (const p of publishedPapers) {
            const tagsStr = p.tags.map(t => t.name).join(", ");
            papersText += `Title: ${p.title}\nAbstract: ${p.abstract}\nTags: ${tagsStr}\n\n`;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                const ai = new GoogleGenAI({ apiKey });
                const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `
                You are the ResVerity AI Copilot, a research discovery assistant. The user is asking: "${query}"
                
                Here is the list of published academic research outputs in the repository:
                ${papersText}
                
                Analyze the request and list the most relevant papers. Write a friendly, conversational response summarizing how they fit. Refer to them by title. Keep it to 3-4 sentences.
                If no papers are relevant, explain that we don't have matching research on that topic yet.
                `;

                const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
                return NextResponse.json({ response: result.response.text().trim() });
            } catch (e) {
                console.error("Gemini Copilot Error, using local fallback matcher:", e);
            }
        }

        // Local Rule Matcher Fallback
        const queryWords = query.toLowerCase().split(/\s+/);
        const matches = [];
        for (const p of publishedPapers) {
            let score = 0;
            for (const word of queryWords) {
                if (p.title.toLowerCase().includes(word) || p.abstract.toLowerCase().includes(word)) {
                    score++;
                }
            }
            if (score > 0) {
                matches.push(p);
            }
        }

        if (matches.length > 0) {
            const recList = matches.map(p => `- **${p.title}**: ${p.abstract.substring(0, 120)}...`).join("\n");
            return NextResponse.json({ response: `I found the following matching papers in our directory:\n\n${recList}\n\nFeel free to request access to collaborate with the student authors!` });
        } else {
            return NextResponse.json({ response: `I couldn't find any published research matching '${query}' in our database. Try searching for topics like 'farming', 'retail', or 'credentials'.` });
        }
    } catch (e) {
        console.error("Copilot route error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
