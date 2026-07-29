import os
import requests
import io
import json
import re
from typing import TypedDict, List, Dict, Any
# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, END
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI
# pyrefly: ignore [missing-import]
from langchain_core.messages import HumanMessage, SystemMessage
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types
# pyrefly: ignore [missing-import]
from PIL import Image
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from prompt_manager import get_formatted_prompt

load_dotenv()

from post_validator import critic_node as post_critic_node # Reuse logic if applicable

# ── SaaS profile injection (for non-D2C brands) ───────────────────────────────
try:
    from saas_agents.saas_profiles import get_saas_profile
    _SAAS_PROFILES_AVAILABLE = True
except ImportError:
    _SAAS_PROFILES_AVAILABLE = False
    def get_saas_profile(cat): return None

# State definition
class GraphState(TypedDict):
    brand_info: Dict[str, Any]
    product_brief: Dict[str, str] # { name, description, category }
    suggested_mix: Dict[str, int] # { reels, static, carousel }
    custom_instruction: str # User's custom post instruction
    reasoning: str
    content_calendar: List[Dict[str, Any]]
    strategy_critique: Dict[str, Any]
    error: str

def analyze_brand_mix(brand_info: Dict[str, Any]):
    """
    Agent that decides the content mix. 
    """
    plan = brand_info.get('selectedPlan', 'SyncSocio Starter')
    duration_weeks = brand_info.get('durationWeeks', 1)
    base_count = 3 if 'Starter' in plan else 7
    post_count = base_count * duration_weeks

    brand_loc = brand_info.get('location')
    brand_country = 'Unknown'
    if isinstance(brand_loc, dict):
        brand_country = brand_loc.get('country') or brand_info.get('country') or 'Unknown'
    else:
        brand_country = brand_info.get('country') or 'Unknown'

    prompt = f"""
    You are a Senior Social Media Strategist. Analyze the following brand profile and determine the optimal {post_count}-day content mix for Instagram growth.
    
    BRAND PROFILE:
    - Name: {brand_info.get('brandName')}
    - Country: {brand_country}
    - Category: {(brand_info.get("otherCategory") if brand_info.get("businessCategory") == "Other" and brand_info.get("otherCategory") else brand_info.get("businessCategory", "General"))}
    - Tone: {brand_info.get('brandTone')}
    - USP: {brand_info.get('usp')}
    - Goal: {brand_info.get('mainGoal')}
    
    TASK:
    1. Distribute {post_count} posts across (Reels, Static Images, Carousels).
    2. Prioritize Reels for discovery and Carousels for engagement/education.
    3. Provide a 1-2 sentence "reasoning" for this specific mix based on the brand's goal and category.
    4. Set "carouselSlides" to strictly 3 if carousels are recommended.
    
    OUTPUT FORMAT: RETURN ONLY VALID JSON.
    {{
      "reels": number,
      "static": number,
      "carousel": number,
      "carouselSlides": number, 
      "reasoning": "..."
    }}
    """
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke([
            SystemMessage(content=f"You are a JSON-only response strategist. Total posts must equal {post_count}."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)
            
        # Ensure total is correct
        total = result.get('reels', 0) + result.get('static', 0) + result.get('carousel', 0)
        if total != post_count:
             result['reels'] = post_count - (result.get('static', 0) + result.get('carousel', 0))
             if result['reels'] < 0: result['reels'] = 0
             
        return result
    except Exception as e:
        print(f"Error in analyze_brand_mix: {e}")
        if post_count <= 3:
            return {
              "reels": 1,
              "static": 1,
              "carousel": 1,
              "carouselSlides": 3, 
              "reasoning": "Balanced Starter mix: 1 Reel, 1 Static, 1 Carousel."
            }
        return {
          "reels": 4,
          "static": 1,
          "carousel": 2,
          "carouselSlides": 3, 
          "reasoning": "Standard high-growth mix: 4 Reels for discovery, 2 Carousels for education, and 1 Static for brand presence."
        }

# Node 1: Strategy Planner (The Strategist)
def planner_node(state: GraphState):
    brand = state['brand_info']
    brief = state['product_brief']
    custom_instruction = state.get('custom_instruction', '')
    rejected_items = state.get('rejected_items', [])
    mix = state.get('suggested_mix', {"reels": 3, "static": 2, "carousel": 2})
    
    plan = brand.get('selectedPlan', 'SyncSocio Starter')
    duration_weeks = state.get('duration_weeks', 1)
    base_count = 3 if 'Starter' in plan else 7
    post_count = base_count * duration_weeks
    auto_posts = post_count - 1 if custom_instruction else post_count

    is_regeneration = len(rejected_items) > 0

    if is_regeneration:
        post_count = len(rejected_items)
        auto_posts = 0
        
        # Build strict prompts for the rejected items
        regen_prompts = []
        for i, item in enumerate(rejected_items):
            pt = item.get('prompt', '').strip()
            orig_title = item.get('originalTitle', 'Unknown Topic')
            orig_type = item.get('originalType', 'Unknown Type')
            
            if pt:
                regen_prompts.append(f"Post {i+1} REPLACEMENT: You are replacing an old post titled '{orig_title}' ({orig_type}). USER CHANGE REQUEST: {pt}")
            else:
                regen_prompts.append(f"Post {i+1} REPLACEMENT: You are replacing an old post titled '{orig_title}' ({orig_type}). Generate a completely new, higher-impact version of this.")
                
        custom_section = f"""
    🎯 REGENERATION MODE ACTIVE:
    You are replacing {post_count} rejected posts. 
    Maintain the overall 7-day flow but upgrade these specific items based on the context:
    {chr(10).join(regen_prompts)}
    """
    else:
        # Build custom instruction section
        custom_section = ""
        if custom_instruction and custom_instruction.strip():
            custom_section = f"""
        
        🎯 CRITICAL USER INSTRUCTION:
        The user has provided a SPECIFIC POST REQUEST that MUST be included in the {post_count}-day calendar:
        "{custom_instruction}"
        
        YOU MUST:
        - Generate {auto_posts} posts autonomously based on the brand strategy
        - Generate 1 post that DIRECTLY addresses the user's custom instruction above
        - The custom post should naturally fit into the {post_count}-day flow
        - Determine the best format (Reel/Static/Carousel) for the custom instruction based on its content
        - Ensure the custom post still follows the strategic mix constraints
        """

    # Build rich brand context — no truncation
    product_name = brief.get('name', '').strip()
    product_description = brief.get('description', '').strip()
    images = brief.get('images', [])
    images_count = len(images)
    max_img_idx = max(0, images_count - 1)
    target_audiences = ', '.join(brand.get('targetAudiences', [])) if brand.get('targetAudiences') else 'General audience'

    product_brief_section = ""
    if product_name or product_description:
        product_brief_section = f"""
    ═══════════ PRODUCT BRIEF ═══════════
    PRODUCT NAME: {product_name if product_name else "Not specified"}
    FULL DESCRIPTION / HOOK: {product_description if product_description else "Not specified"}
    INDUSTRY PILL: {brief.get('category', 'Not specified')}
    PRODUCT IMAGES ATTACHED: {images_count}
        """
    else:
        product_brief_section = """
    ═══════════ PRODUCT BRIEF ═══════════
    (No specific product details provided. Autonomously generate premium, high-impact content focusing on the core Brand Dossier, USP, and Pain Points.)
        """

    product_images_guideline = ""
    if images_count > 0:
        product_images_guideline = f"\n- Also, look at the {images_count} attached product images to understand the packaging, design details, texture, and colors, and refer to or describe them accurately in your hooks and strategy."

    # ── SaaS mode: build content directive if applicable ──────────────────
    saas_strategy_section = ""
    if _SAAS_PROFILES_AVAILABLE:
        saas_profile = get_saas_profile((brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", "")))
        if saas_profile:
            saas_strategy_section = f"""
    ═══════════ SaaS/SERVICES BRAND CONTENT DIRECTIVE ═══════════
    This is a SaaS/Services/Consulting brand. DO NOT generate:
    - Consumer product unboxing or D2C product posts
    - Festival discount/sale posts
    - Lifestyle stock photo concepts
    
    CONTENT PILLARS to use: {', '.join(saas_profile['content_pillars'])}
    AD FRAMEWORKS to apply: {', '.join(saas_profile['ad_frameworks'])}
    VISUAL STYLE: {saas_profile['visual_style']}
    COPY TONE: {saas_profile['copy_tone']}
    CTA STYLE: {saas_profile['cta_style']}
    AVOID: {saas_profile['avoid']}
    
    All posts must feel professional, B2B-oriented, and insight-driven.
    Use thought leadership, case studies, frameworks, and metric-driven hooks.
    ═══════════════════════════════════════════════════════════════
    """

    loc = brand.get('location')
    country = 'Unknown'
    if isinstance(loc, dict):
        country = loc.get('country') or brand.get('country') or 'Unknown'
    else:
        country = brand.get('country') or 'Unknown'

    prompt = f"""
    You are the Lead Strategist for SyncSocio AI. Your goal is to create a high-impact {post_count}-post content strategy.
    Read the FULL brand dossier below and use EVERY detail to craft hyper-relevant, on-brand content.

    ═══════════ BRAND DOSSIER ═══════════
    BRAND NAME: {brand.get('brandName')}
    COUNTRY: {country}
    INDUSTRY / CATEGORY: {(brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", ''))}
    BRAND TONE: {brand.get('brandTone', 'Luxury/Premium')}
    VISUAL VIBE: {brand.get('visualVibe', 'Modern')}
    BRAND KEYWORDS: {brand.get('brandKeywords', '')}
    MAIN GOAL: {brand.get('mainGoal', 'Growth')}
    USP (Unique Selling Proposition): {brand.get('usp', 'Not specified')}
    TARGET PAIN POINT: {brand.get('painPoint', 'Not specified')}
    TARGET AUDIENCES: {target_audiences}
    BRAND COLORS: Primary: {brand.get('primaryColor', '#2563EB')}, Secondary: {brand.get('secondaryColor', '#60A5FA')}
    (Use these colors as the primary visual palette)

    {product_brief_section}
    {saas_strategy_section}
    {custom_section}
    
    ═══════════ STRATEGIC CONSTRAINTS ═══════════
    CONTENT MIX (STRICT — DO NOT DEVIATE):
    - {mix.get('reels')} REELS
    - {mix.get('static')} STATIC IMAGES
    - {mix.get('carousel')} CAROUSELS
    Total: {post_count} Items.

    ═══════════ STRATEGY GUIDELINES ═══════════
    - Every post title and hook must reference the PRODUCT by name or clear implication.{product_images_guideline}
    - The hook must solve the TARGET PAIN POINT or speak to the USP.
    - Vary emotional tone (curiosity → authority → FOMO → social proof → aspiration → education → urgency).
    - Each hook must be scroll-stopping: use numbers, questions, bold claims, or hot takes.
    - Consider the TARGET AUDIENCES when choosing topics — speak their language.
    
    ═══════════ OUTPUT SPEC (per day) ═══════════
    1. topic: A short viral title mentioning the product/brand
    2. format: (Reel / Static Image / Carousel)
    3. content_hook: A HIGH-ENGAGEMENT scroll-stopping hook (2-3 sentences). This is the caption hook — make it irresistible.
    4. why: Brief strategic reason for this post's placement
    5. carousel_slides: (Only if format is Carousel) An integer representing the number of slides in the carousel. Set this to strictly 3. DO NOT return an array or list of strings.
    6. optimal_time: The best time to post (e.g., "06:00 PM", "09:30 AM"). IMPORTANT: Vary the time strategically across the 7 days — do NOT use the same time for every post. Mix morning, afternoon, and evening slots based on the content type (e.g., Reels peak in evenings, educational Carousels perform well mid-morning).
    7. is_custom: (true/false) Mark as true ONLY for the post that addresses the user's custom instruction
    8. g_score: A number from 0-10 representing the "Viral Potential" of this post.
    9. verdict: A short 1-word or 2-word strategic label (e.g., "High Impact", "Viral", "Educational", "Conversion Focus").
    10. product_image_index: A number (0 to {max_img_idx}) representing the index of the uploaded product image that is most relevant for this post (e.g., use swatch/texture image for a post talking about consistency/feel, front bottle image for a reveal post, ingredients/back view for educational post). If no images are uploaded, default to 0.
    
    Output Format: RETURN ONLY A VALID JSON LIST OF {post_count} OBJECTS. NO commentary.
    """
    
    try:
        # Prepare multimodal content if images are present
        human_content = [{"type": "text", "text": prompt}]
        if images:
            for img_b64 in images:
                if "base64," in img_b64:
                    img_b64 = img_b64.split("base64,")[1]
                human_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                })

        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([
            SystemMessage(content=f"You are a JSON-only response strategist. Output exactly {post_count} content items."),
            HumanMessage(content=human_content)
        ])
        
        # Extract and parse JSON
        content = response.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])

        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if json_match:
            calendar = json.loads(json_match.group())
        else:
            calendar = json.loads(content)

        # Sanitize carousel_slides to prevent validation errors (e.g. if LLM returns a list of strings)
        for item in calendar:
            fmt = item.get('format', '').lower()
            if 'carousel' in fmt:
                c_slides = item.get('carousel_slides')
                if isinstance(c_slides, list):
                    item['carousel_slides'] = len(c_slides)
                else:
                    try:
                        item['carousel_slides'] = int(c_slides)
                    except:
                        item['carousel_slides'] = 3
            else:
                item['carousel_slides'] = 0
            
        return {"content_calendar": calendar}
    except Exception as e:
        return {"error": str(e)}

# Node 2: Visual Illustrator (The Actor/Generator)
def generate_brand_visual_dna(brand_info: Dict[str, Any]):
    """
    Dedicated agent to distill the full brand profile (Identity + Color + Tone) into a 200-char DNA string.
    """
    loc = brand_info.get('location')
    country = 'Unknown'
    if isinstance(loc, dict):
        country = loc.get('country') or brand_info.get('country') or 'Unknown'
    else:
        country = brand_info.get('country') or 'Unknown'

    prompt = f"""
    Distill this brand's entire identity into a 200-character DNA string for an image generator.
    YOU MUST INCLUDE:
    1. What the brand actually is/does.
    2. The core color palette (Primary & Secondary).
    3. The brand tone and emotional vibe.
    
    BRAND DATA:
    - Name: {brand_info.get('brandName')}
    - Country: {country}
    - Category: {(brand_info.get("otherCategory") if brand_info.get("businessCategory") == "Other" and brand_info.get("otherCategory") else brand_info.get("businessCategory", "General"))}
    - Tone: {brand_info.get('brandTone')}
    - Primary Color: {brand_info.get('primaryColor')}
    - Secondary Color: {brand_info.get('secondaryColor')}
    - Main Goal: {brand_info.get('mainGoal')}
    
    OUTPUT: RETURN ONLY THE 200 CHAR IDENTITY STRING. NO INTRO.
    """
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke(prompt)
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        return content.strip()[:200]
    except:
        return f"Style: {brand_info.get('brandTone')}. Palette: {brand_info.get('primaryColor')}, {brand_info.get('secondaryColor')}."[:200]

def visual_illustrator_node(state: GraphState):
    calendar = state['content_calendar']
    brand = state['brand_info']
    brief = state['product_brief']
    llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
    
    # Layer 1: Foundation (Dynamic based on Category)
    category_raw = (brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", "other")).lower()
    is_luxury_cpg = any(k in category_raw for k in ["cosmetic", "beauty", "jewel", "food", "drink", "cpg"])

    # ── SaaS/Services/Consulting override ────────────────────────────────
    _saas_profile_vis = get_saas_profile((brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", ""))) if _SAAS_PROFILES_AVAILABLE else None
    _is_saas_vis = _saas_profile_vis is not None

    if _is_saas_vis:
        # SaaS brands get workspace/UI-first aesthetics, never studio product shots
        universal_base = (
            "Clean professional workspace photography or UI dashboard screenshot. "
            "Natural light from a large window. Light oak desk, monitor with product UI visible. "
            "No product packaging. No consumer lifestyle props. Minimal, premium, B2B feel."
        )
    elif is_luxury_cpg:
        # High-end studio look for luxury/food
        universal_base = "Professional cinematic studio product photography, 8k, medium format, 90mm macro lens. Three-point lighting (Key, Fill, Rim). Sharp textures, no artifacts."
    else:
        # Organic, real-world look for services/startups
        universal_base = "Raw, authentic high-fidelity photography, candid shot, real-world environment, natural ambient lighting, organic textures, non-studio, shot on 35mm lens."

    loc = brand.get('location')
    country = 'Unknown'
    if isinstance(loc, dict):
        country = loc.get('country') or brand.get('country') or 'Unknown'
    else:
        country = brand.get('country') or 'Unknown'

    # Layer 2: Brand DNA — structured directly from brand fields (no LLM compression, no char cap)
    # The previous LLM-distillation step was discarding color, USP, audience, and pain point data.
    print(f"Brand Agent: Assembling structured DNA for {brand.get('brandName')}...")
    brand_dna = (
        f"Brand: {brand.get('brandName')}. "
        f"Country: {country}. "
        f"Category: {(brand.get('otherCategory') if brand.get('businessCategory') == 'Other' and brand.get('otherCategory') else brand.get('businessCategory', 'General'))}. "
        f"Tone: {brand.get('brandTone')}. "
        f"Primary Color: {brand.get('primaryColor')}. "
        f"Secondary Color: {brand.get('secondaryColor')}. "
        f"USP: {brand.get('usp')}. "
        f"Pain Point: {brand.get('painPoint')}. "
        f"Visual Vibe: {brand.get('visualVibe')}."
    )

    print(f"Illustrator Agent: Designing high-fidelity visual payloads for {brand.get('brandName')}...")
    
    enriched_calendar = []
    for i, item in enumerate(calendar):
        fmt = item.get('format', '').lower()
        topic = item.get('topic', 'General Awareness')
        
        # Layer 3: Strategic Context (Topic + Product Info) - Fixed ~150 chars
        p_name = brief.get('name', '').strip()
        p_desc = brief.get('description', '').strip()
        
        if p_name and p_desc:
            strategic_context = f"Topic: {topic}. Product: {p_name} ({p_desc})."
        elif p_name:
            strategic_context = f"Topic: {topic}. Product: {p_name}."
        elif p_desc:
            strategic_context = f"Topic: {topic}. Context: {p_desc}."
        else:
            # Fallback to USP and businessCategory if no product context is provided
            brand_usp = brand.get('usp', '').strip()
            if brand_usp:
                strategic_context = f"Topic: {topic}. Brand USP: {brand_usp}."
            else:
                strategic_context = f"Topic: {topic}. Category: {(brand.get('otherCategory') if brand.get('businessCategory') == 'Other' and brand.get('otherCategory') else brand.get('businessCategory', 'General'))}."
        
        # strategic_context: no hard char-cap — preserve full product context for image model
        # (scene_base[:250] cap on the final LLM scene output is retained below)

        # Apply specific layering only to images and carousels
        if 'static' in fmt or 'image' in fmt or 'carousel' in fmt:
            is_carousel = 'carousel' in fmt
            slides_count = item.get('carousel_slides', 2) if is_carousel else 1
            
            refinement_prompt = f"""
            TASK: Create a super-detailed cinematic visual description and text overlays for this {"carousel" if is_carousel else "image"}.
            SCENE TOPIC: {topic}
            HOOK: {item.get('content_hook')}
            DETAILS: {item.get('why')}
            SLIDES: {slides_count}
            
            STRICT RULES:
            - RADICAL UNIQUENESS: Every slide MUST have a different headline and subtext. Progress the story (e.g., Slide 1: Hook, Slide 2: Problem, Slide 3: Solution).
            - DO NOT REPEAT: Never use the same headline twice in one carousel.
            - NO BRACKETS: Do not use [] brackets.
            - PURE COPY: Provide only the final text that should appear on the image.
            - Focus on lighting, textures, material physics, and placement.
            - For text overlays: Provide a unique 'headline', 'subtext', and 'position' for each slide.
            - DO NOT use meta-labels like 'Headline:' or 'Subject:' in the image description itself.
            - PRODUCT TARGETING: Only set "features_product" to true if the product is explicitly required visually in this slide. For titles, text-heavy steps, or non-product scenes, set it to false.
            
            OUTPUT FORMAT: RETURN ONLY VALID JSON.
            {{
              "visual_description": "...",
              "slides": [
                {{
                  "slide_scene_variation": "...",
                  "features_product": true,
                  "headline": "...",
                  "subtext": "...",
                  "position": "..."
                }}
              ]
            }}
            """
            
            try:
                res = llm.invoke([
                    SystemMessage(content="You are a visual director and copywriter. Output only JSON."),
                    HumanMessage(content=refinement_prompt)
                ])
                content = res.content
                if isinstance(content, list):
                    content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
                
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    visual_data = json.loads(json_match.group())
                else:
                    visual_data = json.loads(content)
                
                scene_base = visual_data.get('visual_description', '')[:250]
                
                # Determine industry for style injection
                category_raw = (brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", "other")).lower()
                is_luxury_cpg = any(k in category_raw for k in ["cosmetic", "makeup", "beauty", "jewel", "food", "drink", "cpg"])
                
                if _is_saas_vis:
                    style_modifier = (
                        "clean professional workspace, natural daylight, UI dashboard visible, "
                        "minimal props, no product packaging, premium B2B aesthetic, "
                        "high-fidelity photography, not 3D rendered"
                    )
                elif is_luxury_cpg:
                    style_modifier = "3D render, sleek, premium studio lighting, hyper-realistic 8k, glassmorphism, depth of field"
                else:
                    style_modifier = "realistic, natural, high-fidelity film photography, candid, authentic, organic shadows, non-studio environment, shun all 3D styles, no rendered effects, shot on 35mm lens"

                # Prepare slides data
                item['slides_metadata'] = []
                for s in visual_data.get('slides', []):
                    scene = s.get('slide_scene_variation', '') or scene_base
                    v_prompt = f"{scene}. {style_modifier}. Brand vibe: {brand_dna}. {universal_base}"
                    item['slides_metadata'].append({
                        "visual_prompt": v_prompt[:795],
                        "headline": s.get('headline', ''),
                        "subtext": s.get('subtext', ''),
                        "position": s.get('position', 'center')
                    })
                
                # Fallback / Legacy field
                item['visual_prompt'] = item['slides_metadata'][0]['visual_prompt'] if item['slides_metadata'] else f"{scene_base}. {style_modifier}. Brand vibe: {brand_dna}. {universal_base}"[:795]
                item['detailed_visual_description'] = scene_base
                
                # DETAILED CONSOLE LOGGING
                print(f"\n" + "="*60)
                print(f"🚀 AI ARTIFACT GENERATION: DAY {i+1} ({fmt})")
                print(f"📌 TOPIC: {topic}")
                print(f"---" + "-"*57)
                print(f"🎨 LAYER 1 (Foundation): {universal_base[:120]}...")
                print(f"🧬 LAYER 2 (Identity DNA): {brand_dna}")
                print(f"📦 LAYER 3 (Strategic Context): {strategic_context}")
                print(f"🔥 SLIDES GENERATED: {len(item.get('slides_metadata', []))}")
                print("="*60 + "\n")

            except Exception as e:
                print(f"DEBUG: Illustrator Error: {e}")
                item['visual_prompt'] = f"{universal_base} {brand_dna} {strategic_context}"[:795]
                item['slides_metadata'] = [{
                    "visual_prompt": item['visual_prompt'],
                    "headline": topic,
                    "subtext": item.get('content_hook', ''),
                    "position": "center"
                }]
        else:
            # Enhanced Reel Prompting
            refinement_prompt = f"""
            TASK: Create a super-detailed cinematic MOTION/VIDEO description for a Reel.
            TOPIC: {topic}
            HOOK: {item.get('content_hook')}
            DETAILS: {item.get('why')}
            
            RULES:
            - Describe camera movements, transitions, and specific visual actions.
            - Ensure it feels viral and high-energy.
            - Provide ONLY the detailed description.
            """
            try:
                res = llm.invoke([
                    SystemMessage(content="You are a cinematic director. Output only the prompt."),
                    HumanMessage(content=refinement_prompt)
                ])
                content = res.content
                if isinstance(content, list):
                    content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
                
                # Determine industry style for video
                category_raw = (brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", "other")).lower()
                if _is_saas_vis:
                    style_mod = (
                        "clean workspace B-roll, natural light, UI screen visible, "
                        "slow pan, professional, no product packaging, B2B SaaS aesthetic"
                    )
                elif any(k in category_raw for k in ["cosmetic", "jewel", "food", "cpg"]):
                    style_mod = "sleek 3D motion, premium studio lighting, hyper-realistic"
                else:
                    style_mod = "realistic, cinematic lighting, 4k 60fps"

                item['visual_prompt'] = f"Video Prompt ({style_mod}): {content.strip()[:2000]}"
                item['detailed_visual_description'] = content.strip()
            except:
                item['visual_prompt'] = f"Vibrant social media motion content for {p_name}: {item.get('topic')}"
            
            item['slides_metadata'] = []
            
        enriched_calendar.append(item)
        
    return {"content_calendar": enriched_calendar}




# Node 3: Strategy Critic (The Validator)
def strategy_critic_node(state: GraphState):
    calendar = state['content_calendar']
    brand = state['brand_info']
    brief = state['product_brief']
    
    prompt = f"""
    You are the SyncSocio Algorithm Critic. Analyze this 7-day content strategy.
    
    BRAND: {brand.get('brandName')}
    PRODUCT: {brief.get('name') if brief.get('name') else 'Not specified (focus on core brand and category: ' + (brand.get("otherCategory") if brand.get("businessCategory") == "Other" and brand.get("otherCategory") else brand.get("businessCategory", '')) + ')'}
    STRATEGY: {json.dumps(calendar, indent=2)}
    
    TASK:
    1. Score the overall "G-Factor" (Viral Potential) from 1-10.
    2. Provide 3 "Power Moves" to make this launch more successful.
    3. Identify any "Gaps" (e.g., 'Needs more human face presence', 'Lighting too dim in prompts').
    
    Output Format: RETURN ONLY VALID JSON.
    {{
      "g_factor": 9.2,
      "verdict": "Viral-Ready",
      "power_moves": ["Move 1", "Move 2", "Move 3"],
      "gaps": ["Gap 1", "Gap 2"]
    }}
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([
            SystemMessage(content="You are a JSON-only response critic."),
            HumanMessage(content=prompt)
        ])
        
        content = response.content
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            critique = json.loads(json_match.group())
        else:
            critique = json.loads(content)
            
        return {"strategy_critique": critique}
    except Exception as e:
        return {"strategy_critique": {"g_factor": 7.5, "verdict": "Solid", "power_moves": ["AI Validation Fallback Active"]}}

# Build the Graph
workflow = StateGraph(GraphState)

workflow.add_node("planner", planner_node)
workflow.add_node("illustrator", visual_illustrator_node)
workflow.add_node("critic", strategy_critic_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "illustrator")
workflow.add_edge("illustrator", "critic")
workflow.add_edge("critic", END)

app = workflow.compile()

def generate_strategy(brand_info: Dict[str, Any], product_brief: Dict[str, str], suggested_mix: Dict[str, int] = None, custom_instruction: str = "", **kwargs):
    # Prepare initial state
    state = {
        "brand_info": brand_info,
        "product_brief": product_brief,
        "suggested_mix": suggested_mix or {},
        "custom_instruction": custom_instruction or "",
        "duration_weeks": kwargs.get("duration_weeks", 1),
        "rejected_items": kwargs.get("rejected_items", []),
        "reasoning": "",
        "content_calendar": [],
        "strategy_critique": {},
        "error": ""
    }
    result = app.invoke(state)
    return result
