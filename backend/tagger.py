import os
import re
import google.generativeai as genai

def classify_research(title: str, abstract: str) -> list:
    """
    Classifies research outputs to SDG targets and Technical Domains.
    Queries Gemini API if key is present, otherwise falls back to keyword mapping rules.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            Analyze the following research title and abstract. 
            Classify it into:
            1. The most relevant United Nations Sustainable Development Goal (SDG) (e.g. 'SDG 9: Industry & Innovation', 'SDG 11: Sustainable Cities').
            2. The primary technological/thematic domain (e.g. 'AI & Analytics', 'Cybersecurity', 'IoT & Hardware', 'Data Systems').
            
            Title: {title}
            Abstract: {abstract}
            
            Format the response exactly as a comma-separated list of tags with type prefixes like:
            SDG: SDG name, TECH: Tech name
            """
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            
            tags = []
            # Parse response
            for part in raw_text.split(','):
                part = part.strip()
                if part.lower().startswith("sdg:"):
                    tags.append({"name": part[4:].strip(), "type": "SDG"})
                elif part.lower().startswith("tech:"):
                    tags.append({"name": part[5:].strip(), "type": "TECH"})
            
            if tags:
                return tags
        except Exception as e:
            print(f"Gemini API Error, using local fallback parser: {e}")
            
    # Local fallback rule engine
    return run_local_rules(title, abstract)

def run_local_rules(title: str, abstract: str) -> list:
    text = (title + " " + abstract).lower()
    tags = []
    
    # SDG Mapping
    if any(k in text for k in ["city", "cities", "urban", "traffic", "transport", "community"]):
        tags.append({"name": "SDG 11: Sustainable Cities", "type": "SDG"})
    elif any(k in text for k in ["business", "industry", "automation", "manufacturing", "infrastructure", "innovation"]):
        tags.append({"name": "SDG 9: Industry & Innovation", "type": "SDG"})
    elif any(k in text for k in ["economic", "growth", "finance", "employment", "market"]):
        tags.append({"name": "SDG 8: Decent Work & Growth", "type": "SDG"})
    elif any(k in text for k in ["health", "medical", "disease", "patient", "clinical"]):
        tags.append({"name": "SDG 3: Good Health & Well-being", "type": "SDG"})
    else:
        tags.append({"name": "SDG 4: Quality Education", "type": "SDG"})
        
    # Tech Domain Mapping
    if any(k in text for k in ["nlp", "predictive", "ml", "learning", "neural", "intelligence", "regression"]):
        tags.append({"name": "AI & Analytics", "type": "TECH"})
    elif any(k in text for k in ["cryptographic", "security", "blockchain", "cyber", "privacy", "signature"]):
        tags.append({"name": "Cybersecurity", "type": "TECH"})
    elif any(k in text for k in ["iot", "sensor", "hardware", "arduino", "raspberry", "wireless"]):
        tags.append({"name": "IoT & Hardware", "type": "TECH"})
    else:
        tags.append({"name": "Data Systems", "type": "TECH"})
        
    return tags
