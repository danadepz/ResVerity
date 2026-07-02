import { NextResponse } from 'next/server';
import { supabase, useSupabase } from '@/lib/supabase';
import { readLocalDb } from '@/lib/localDb';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
                const ai = new GoogleGenerativeAI(apiKey);
                const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

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
        const queryLower = query.toLowerCase();
        
        // Smart Contextual Fallback for "What does it do" / Explanations
        if (queryLower.includes("what does it do") || queryLower.includes("explain") || queryLower.includes("how does it work")) {
            const iotFarm = publishedPapers.find(p => p.title.toLowerCase().includes("farm") || p.title.toLowerCase().includes("iot"));
            const retail = publishedPapers.find(p => p.title.toLowerCase().includes("supply") || p.title.toLowerCase().includes("business") || p.title.toLowerCase().includes("retail"));
            const credentials = publishedPapers.find(p => p.title.toLowerCase().includes("credentials") || p.title.toLowerCase().includes("certificate"));

            if (queryLower.includes("farm") || queryLower.includes("monitoring") || (iotFarm && !retail && !credentials)) {
                return NextResponse.json({
                    response: `The **IoT-Based Microclimate Monitoring** project deploys low-cost microcontroller nodes inside urban Cebu community gardens. It parses sensor inputs (soil humidity, temperature, sunlight) and uploads parameters to a central analytics portal so farmers know exactly when to water crops.`
                });
            } else if (queryLower.includes("business") || queryLower.includes("supply") || queryLower.includes("store")) {
                return NextResponse.json({
                    response: `The **Predictive Analytics for Small Business** system processes sales data from local sari-sari stores. It runs linear regression scripts to predict inventory demands, helping owners optimize cash flow and prevent stock wastes.`
                });
            } else if (credentials) {
                return NextResponse.json({
                    response: `The **Decentralized Micro-Credentials** registry stores digital signatures of university diplomas and certificates on a secure validation ledger. This allows employers to instantly check output authenticity and solves certificate forgery.`
                });
            }
        }

        // Standard Keyword filtering
        const stopWords = new Set(['what', 'does', 'it', 'do', 'the', 'a', 'is', 'for', 'on', 'in', 'to', 'and', 'of', 'with', 'about', 'how', 'can', 'you', 'me', 'find', 'show', 'tell', 'help']);
        const queryWords = queryLower
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 1 && !stopWords.has(w));
            
        if (queryWords.length === 0) {
            return NextResponse.json({ 
                response: "I'm here to help you search Cebu's HEI repository! Try asking about specific topics like 'farming', 'retail supply chain', 'SDG 11', or 'credentials'." 
            });
        }

        const matches = [];
        for (const p of publishedPapers) {
            let score = 0;
            const textToSearch = (p.title + " " + p.abstract + " " + p.tags.map(t => t.name).join(" ")).toLowerCase();
            for (const word of queryWords) {
                const regex = new RegExp(`\\b${word}\\b`, 'i');
                if (regex.test(textToSearch)) {
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
