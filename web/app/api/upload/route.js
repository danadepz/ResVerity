import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Parse PDF text layers using pdf-parse
        let pdfText = "";
        try {
            const data = await pdfParse(buffer);
            pdfText = data.text;
        } catch (e) {
            console.error("PDF Parsing error:", e);
        }

        // Parse title from PDF first line or filename
        const lines = pdfText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
        const parsedTitle = lines[0] ? lines[0] : file.name.replace(".pdf", "").replace(/[_-]/g, " ");
        const parsedAbstract = pdfText.substring(0, 1000) || "Abstract could not be extracted automatically.";

        // AI Tagging / Classification
        const tags = await classifyResearch(parsedTitle, parsedAbstract);

        return NextResponse.json({
            filename: file.name,
            title: parsedTitle.substring(0, 200),
            abstract: parsedAbstract,
            tags: tags
        });
    } catch (error) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function classifyResearch(title, abstract) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            const ai = new GoogleGenerativeAI(apiKey);
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
            
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
