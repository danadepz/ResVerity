import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';
import { supabase, useSupabase } from '@/lib/supabase';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Parse PDF text layers using pdf-parse v2
        let pdfText = "";
        try {
            const parser = new PDFParse({ data: new Uint8Array(buffer) });
            const textResult = await parser.getText();
            await parser.destroy();
            // Drop the "-- 1 of 3 --" page markers pdf-parse v2 inserts
            pdfText = textResult.text.replace(/^\s*-- \d+ of \d+ --\s*$/gm, "");
        } catch (e) {
            console.error("PDF Parsing error:", e);
        }

        // Upload PDF to Supabase Storage if active
        let pdfUrl = "";
        if (useSupabase) {
            try {
                const uniqueFileName = `${Date.now()}_${file.name}`;
                const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from('research-outputs')
                    .upload(uniqueFileName, buffer, {
                        contentType: 'application/pdf',
                        upsert: true
                    });
                
                if (uploadErr) throw uploadErr;
                
                const { data: urlData } = supabase.storage
                    .from('research-outputs')
                    .getPublicUrl(uniqueFileName);
                    
                pdfUrl = urlData.publicUrl;
            } catch (e) {
                console.error("Supabase Storage upload failed:", e);
            }
        }

        const parsedTitle = extractTitle(pdfText, file.name);
        const parsedAbstract = extractAbstract(pdfText) || "Abstract could not be extracted automatically.";

        // AI Tagging / Classification
        const tags = await classifyResearch(parsedTitle, parsedAbstract);

        return NextResponse.json({
            filename: file.name,
            title: parsedTitle.substring(0, 200),
            abstract: parsedAbstract,
            tags: tags,
            pdf_url: pdfUrl
        });
    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function extractTitle(pdfText, fileName) {
    const fallback = fileName.replace(/\.pdf$/i, "").replace(/[_-]/g, " ").trim();
    if (!pdfText) return fallback;

    // A person's name: 2-6 capitalized words including a middle initial ("Darwin A. Delima")
    const isAuthorLine = (line) =>
        /^(?:[A-Z][\w'’.\-]*[\s,]+){1,5}[A-Z][\w'’\-]+\.?$/.test(line) && /\b[A-Z]\.(\s|$)/.test(line);
    const isAffiliationLine = (line) =>
        /@|\buniversity\b|\bcolleges?\b|\bdepartment\b|\binstitutes?\b|\bschool\b|\bcampus\b|\bfaculty\b/i.test(line);

    // Titles often wrap across several lines; join leading lines and stop at
    // a blank line, the abstract heading, or the author/affiliation block.
    // If the author block comes first (title is a cover image), use the filename.
    const rawLines = pdfText.replace(/\r/g, "").split("\n");
    const titleLines = [];
    for (const raw of rawLines) {
        const line = raw.trim();
        if (!line) {
            if (titleLines.length > 0) break;
            continue;
        }
        if (/^abstract\b/i.test(line) || isAuthorLine(line) || isAffiliationLine(line)) break;
        titleLines.push(line);
        if (titleLines.join(" ").length > 150) break;
    }
    const title = titleLines.join(" ").replace(/\s+/g, " ").trim();
    return title.length >= 8 ? title : fallback;
}

function extractAbstract(pdfText) {
    if (!pdfText) return "";
    const text = pdfText.replace(/\r/g, "");

    // Find the "Abstract" heading (handles "Abstract", "ABSTRACT:", "Abstract—...")
    const startMatch = text.match(/\babstract\b[\s:.\-–—]*/i);
    if (startMatch) {
        const rest = text.substring(startMatch.index + startMatch[0].length);
        // Capture until the next section heading (Keywords / Index Terms / Introduction)
        const endMatch = rest.match(/\n\s*(keywords?|key words|index terms|general terms|(?:[1I][\s.):\-–—]{0,4})?introduction)\b/i);
        const abstract = (endMatch ? rest.substring(0, endMatch.index) : rest.substring(0, 1500))
            .replace(/\s+/g, " ")
            .trim();
        if (abstract.length >= 40) return abstract.substring(0, 2000);
    }

    // No abstract heading found: fall back to the first chunk of body text
    return text.replace(/\s+/g, " ").trim().substring(0, 1000);
}

async function classifyResearch(title, abstract) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const prompt = `
            Analyze the following research title and abstract. 
            Classify it into:
            1. The most relevant United Nations Sustainable Development Goal (SDG) (e.g. 'SDG 9: Industry & Innovation', 'SDG 11: Sustainable Cities').
            2. The primary technological/thematic domain (e.g. 'AI & Analytics', 'Cybersecurity', 'IoT & Hardware', 'Data Systems').
            
            Title: ${title}
            Abstract: ${abstract}
            
            Format the response exactly as a comma-separated list of tags with type prefixes like:
            SDG: SDG name, TECH: Tech name
            `;
            const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
            const responseText = result.response.text().trim();
            
            const tags = [];
            for (const part of responseText.split(',')) {
                const cleanPart = part.trim();
                if (cleanPart.toLowerCase().startsWith("sdg:")) {
                    tags.push({ name: cleanPart.substring(4).trim(), type: "SDG" });
                } else if (cleanPart.toLowerCase().startsWith("tech:")) {
                    tags.push({ name: cleanPart.substring(5).trim(), type: "TECH" });
                }
            }
            if (tags.length > 0) return tags;
        } catch (e) {
            console.error("Gemini AI API classification failure, using local fallbacks:", e);
        }
    }
    return runLocalRules(title, abstract);
}

function runLocalRules(title, abstract) {
    const text = (title + " " + abstract).toLowerCase();
    const tags = [];

    if (text.includes("city") || text.includes("cities") || text.includes("urban") || text.includes("traffic") || text.includes("community")) {
        tags.push({ name: "SDG 11: Sustainable Cities", type: "SDG" });
    } else if (text.includes("business") || text.includes("industry") || text.includes("automation") || text.includes("infrastructure") || text.includes("innovation")) {
        tags.push({ name: "SDG 9: Industry & Innovation", type: "SDG" });
    } else if (text.includes("economic") || text.includes("growth") || text.includes("finance") || text.includes("market")) {
        tags.push({ name: "SDG 8: Decent Work & Growth", type: "SDG" });
    } else {
        tags.push({ name: "SDG 4: Quality Education", type: "SDG" });
    }

    if (text.includes("nlp") || text.includes("predictive") || text.includes("ml") || text.includes("learning") || text.includes("neural") || text.includes("intelligence")) {
        tags.push({ name: "AI & Analytics", type: "TECH" });
    } else if (text.includes("cryptographic") || text.includes("security") || text.includes("blockchain") || text.includes("privacy")) {
        tags.push({ name: "Cybersecurity", type: "TECH" });
    } else if (text.includes("iot") || text.includes("sensor") || text.includes("hardware") || text.includes("arduino")) {
        tags.push({ name: "IoT & Hardware", type: "TECH" });
    } else {
        tags.push({ name: "Data Systems", type: "TECH" });
    }

    return tags;
}
