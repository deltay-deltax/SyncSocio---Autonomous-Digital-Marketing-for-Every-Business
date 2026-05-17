"""
AI Asset Generator Agent
Generates landing page content for DM automation flows using Gemini.
"""

import os
import json
import sys
from langchain_google_genai import ChatGoogleGenerativeAI

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")

def generate_asset_content(brand_profile: dict, post_topic: str, flow_context: dict = None) -> dict:
    """
    Generate flexible, intelligent content for any topic.
    
    The AI reasons about the best format, structure, and media needs based on the topic.
    Returns dict with dynamically structured content that the AI deems most effective.
    """
    print("\n" + "="*80)
    print("[AssetAgent] 🚀 STARTING ASSET GENERATION")
    print("="*80)
    
    print(f"\n[AssetAgent] 📋 Brand Profile: {json.dumps(brand_profile, indent=2)}")
    print(f"[AssetAgent] 🎯 Topic: {post_topic}")
    if flow_context:
        print(f"[AssetAgent] 🔗 Flow Context: {json.dumps(flow_context, indent=2)}")
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=GEMINI_API_KEY,
        temperature=0.8,
    )

    brand_name = brand_profile.get("brandName", "Brand")
    usp = brand_profile.get("usp", "")
    category = brand_profile.get("businessCategory", "General")

    prompt = f"""You are a world-class content strategist and writer for {brand_name}.

BRAND INFO:
- Name: {brand_name}
- Category: {category}
- Value: {usp}

TOPIC: {post_topic}

TASK:
Generate highly engaging, valuable content tailored to the topic above. Decide the best format, structure, and length based on what works best for this specific topic.

Consider:
- Should this be a guide, listicle, story, case study, deep dive, or something else?
- How many sections/points make sense? (not forced to 3 or any number)
- Do images/visuals make sense for this topic? If yes, describe them.
- What's the hook and how do you keep readers engaged?
- What's the perfect CTA that flows naturally from the content?

Return ONLY valid JSON (no markdown, no code fences):
{{
  "title": "Compelling, specific headline for this topic",
  "description": "Engaging opening that hooks the reader and explains why they should care",
  "contentType": "guide|listicle|story|case_study|deep_dive|other",
  "needsVisuals": true/false,
  "visualSuggestions": "If needsVisuals is true, describe 1-2 images or diagrams that would enhance this. If false, omit this field.",
  "mainContent": "The core, meaty content. Multiple paragraphs as needed. Rich, detailed, practical, brand-aligned.",
  "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "ctaText": "Natural, non-salesy call-to-action",
  "ctaDescription": "Why they should take this action after reading",
  "ogTitle": "Social preview title (max 60 chars)",
  "ogDescription": "Social preview desc (max 155 chars)"
}}

Generate content that is valuable, specific, and authentic. Avoid generic platitudes."""

    print("\n" + "-"*80)
    print("[AssetAgent] 📝 PROMPT BEING SENT TO GEMINI:")
    print("-"*80)
    print(prompt)
    print("-"*80 + "\n")
    
    try:
        print("[AssetAgent] ⏳ Waiting for LLM response...")
        response = llm.invoke(prompt)
        raw_content = response.content
        
        print("\n" + "-"*80)
        print("[AssetAgent] ✅ RAW LLM RESPONSE RECEIVED:")
        print("-"*80)
        
        # Handle response content
        if isinstance(raw_content, list):
            print(f"[AssetAgent] Response type: LIST with {len(raw_content)} parts")
            content_parts = []
            for idx, part in enumerate(raw_content):
                if isinstance(part, str):
                    print(f"  [Part {idx}] String: {part[:100]}...")
                    content_parts.append(part)
                elif isinstance(part, dict) and "text" in part:
                    print(f"  [Part {idx}] Dict with 'text': {part['text'][:100]}...")
                    content_parts.append(part["text"])
                else:
                    print(f"  [Part {idx}] Type: {type(part).__name__}")
            content = "".join(content_parts)
        else:
            print(f"[AssetAgent] Response type: {type(raw_content).__name__}")
            content = str(raw_content)
        
        print("\n[AssetAgent] 📄 FULL RAW CONTENT:")
        print(content)
        print("-"*80 + "\n")
            
        content = content.strip()

        # Extract JSON from response
        print("[AssetAgent] 🔍 Extracting JSON...")
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        
        print(f"  First '{{' at index: {start_idx}")
        print(f"  Last '}}' at index: {end_idx}")
        
        if start_idx != -1 and end_idx != -1:
            json_str = content[start_idx:end_idx + 1]
            print(f"  Extracted JSON length: {len(json_str)} chars")
            print(f"\n[AssetAgent] 📋 EXTRACTED JSON STRING:")
            print("-"*80)
            print(json_str)
            print("-"*80 + "\n")
            content = json_str
        else:
            print("[AssetAgent] ⚠️  Warning: No JSON braces found in response")
            print("[AssetAgent] Attempting to parse raw content as JSON...")

        print("[AssetAgent] 🔄 Parsing JSON...")
        result = json.loads(content)
        
        print("[AssetAgent] ✅ JSON parsed successfully!")
        print(f"\n[AssetAgent] 📊 PARSED RESULT:")
        print("-"*80)
        print(json.dumps(result, indent=2))
        print("-"*80 + "\n")

        # Validate essential fields
        required = ["title", "description", "mainContent", "ctaText"]
        print(f"[AssetAgent] ✓ Validating required fields: {required}")
        
        for key in required:
            if key not in result or not result[key]:
                print(f"  ⚠️  Missing or empty: {key} - using fallback")
                result[key] = f"Content for: {post_topic}"
            else:
                print(f"  ✓ {key}: OK")

        # Ensure optionals exist
        if "ogTitle" not in result:
            result["ogTitle"] = result.get("title", "")[:60]
        if "ogDescription" not in result:
            result["ogDescription"] = result.get("description", "")[:155]
        if "contentType" not in result:
            result["contentType"] = "guide"
        if "keyTakeaways" not in result:
            result["keyTakeaways"] = []

        return result

    except json.JSONDecodeError as e:
        print(f"[AssetAgent] JSON parse error: {e}")
        return {
            "title": f"Content: {post_topic}",
            "description": f"Valuable content about {post_topic}",
            "mainContent": f"Invalid response format. Please try again.",
            "ctaText": f"Learn More About {brand_name}",
            "contentType": "guide",
            "keyTakeaways": [],
            "ogTitle": f"Content: {post_topic}",
            "ogDescription": f"Discover {brand_name}",
        }
    except Exception as e:
        print(f"[AssetAgent] Error: {e}")
        return {
            "title": f"Content: {post_topic}",
            "description": f"Valuable content about {post_topic}",
            "mainContent": f"Error generating content. Please try again.",
            "ctaText": f"Learn More About {brand_name}",
            "contentType": "guide",
            "keyTakeaways": [],
            "ogTitle": f"Content: {post_topic}",
            "ogDescription": f"Discover {brand_name}",
        }
