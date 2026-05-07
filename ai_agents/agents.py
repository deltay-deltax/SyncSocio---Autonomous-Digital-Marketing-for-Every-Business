import os
import requests
import io
import json
import re
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv
from prompt_manager import get_formatted_prompt

load_dotenv()

from post_validator import critic_node as post_critic_node # Reuse logic if applicable

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
    ENFORCED CREDIT SAVING MODE: 1 Static, 1 Carousel, 5 Reels.
    """
    return {
      "reels": 5,
      "static": 1,
      "carousel": 1,
      "carouselSlides": 2, 
      "reasoning": "Credit-saving calibrated mix: 1 Static, 1 Carousel (2 Slides), 5 Reels."
    }

# Node 1: Strategy Planner (The Strategist)
def planner_node(state: GraphState):
    brand = state['brand_info']
    brief = state['product_brief']
    custom_instruction = state.get('custom_instruction', '')
    
    mix = state.get('suggested_mix', {"reels": 5, "static": 1, "carousel": 1})
    
    # Build custom instruction section
    custom_section = ""
    if custom_instruction and custom_instruction.strip():
        custom_section = f"""
    
    🎯 CRITICAL USER INSTRUCTION:
    The user has provided a SPECIFIC POST REQUEST that MUST be included in the 7-day calendar:
    "{custom_instruction}"
    
    YOU MUST:
    - Generate 6 posts autonomously based on the brand strategy
    - Generate 1 post that DIRECTLY addresses the user's custom instruction above
    - The custom post should naturally fit into the 7-day flow
    - Determine the best format (Reel/Static/Carousel) for the custom instruction based on its content
    - Ensure the custom post still follows the strategic mix constraints
    """
    
    prompt = f"""
    You are the Lead Strategist for Velocity AI. Your goal is to create a high-impact 7-day content strategy for:
    
    BRAND: {brand.get('brandName')} ({brand.get('businessCategory', '')})
    PRODUCT: {brief.get('name')}
    BRIEF: {str(brief.get('description', ''))[:200]}
    INDUSTRY PILL: {brief.get('category')}
    TONE: {brand.get('brandTone', 'Luxury/Premium')}
    BRAND COLORS: Primary: {brand.get('primaryColor', '#2563EB')}, Secondary: {brand.get('secondaryColor', '#60A5FA')}
    (Use these colors as the primary visual palette)
    {custom_section}
    
    STRATEGIC MIX (STRICT CONSTRAINT):
    You MUST include exactly:
    - {mix.get('reels')} REELS
    - {mix.get('static')} STATIC IMAGES
    - {mix.get('carousel')} CAROUSELS
    
    Total: 7 Items.
    
    For each day, provide:
    1. topic: A short viral title
    2. format: (Reel / Static Image / Carousel)
    3. content_hook: A high-engagement hook for the post
    4. why: Brief strategic reason for this post
    5. carousel_slides: (Only if format is Carousel) ALWAYS set to 2 to preserve credits.
    6. optimal_time: The best time to post (e.g., "06:00 PM", "09:30 AM") based on the topic and general audience activity.
    7. is_custom: (true/false) Mark as true ONLY for the post that addresses the user's custom instruction
    
    Output Format: RETURN ONLY A VALID JSON LIST OF 7 OBJECTS.
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([
            SystemMessage(content="You are a JSON-only response strategist. Output a list of 7 content items."),
            HumanMessage(content=prompt)
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
            
        return {"content_calendar": calendar}
    except Exception as e:
        return {"error": str(e)}

# Node 2: Visual Illustrator (The Actor/Generator)
def generate_brand_visual_dna(brand_info: Dict[str, Any]):
    """
    Dedicated agent to distill the full brand profile (Identity + Color + Tone) into a 200-char DNA string.
    """
    prompt = f"""
    Distill this brand's entire identity into a 200-character DNA string for an image generator.
    YOU MUST INCLUDE:
    1. What the brand actually is/does.
    2. The core color palette (Primary & Secondary).
    3. The brand tone and emotional vibe.
    
    BRAND DATA:
    - Name: {brand_info.get('brandName')}
    - Category: {brand_info.get('businessCategory')}
    - Tone: {brand_info.get('brandTone')}
    - Primary Color: {brand_info.get('primaryColor')}
    - Secondary Color: {brand_info.get('secondaryColor')}
    - Main Goal: {brand_info.get('mainGoal')}
    
    OUTPUT: RETURN ONLY THE 200 CHAR IDENTITY STRING. NO INTRO.
    """
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
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
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
    
    # Layer 1: Foundation (Dynamic based on Category)
    category_raw = brand.get("businessCategory", "other").lower()
    is_luxury_cpg = any(k in category_raw for k in ["cosmetic", "beauty", "jewel", "food", "drink", "cpg"])
    
    if is_luxury_cpg:
        # High-end studio look for luxury/food
        universal_base = "Professional cinematic studio product photography, 8k, medium format, 90mm macro lens. Three-point lighting (Key, Fill, Rim). Sharp textures, no artifacts."
    else:
        # Organic, real-world look for services/startups
        universal_base = "Raw, authentic high-fidelity photography, candid shot, real-world environment, natural ambient lighting, organic textures, non-studio, shot on 35mm lens."

    # Layer 2: Brand DNA (Synthesized by Agent, Fixed ~200 chars)
    print(f"Brand Agent: Distilling holistic identity for {brand.get('brandName')}...")
    brand_dna = generate_brand_visual_dna(brand)
    brand_dna = brand_dna[:200]

    print(f"Illustrator Agent: Designing high-fidelity visual payloads for {brand.get('brandName')}...")
    
    enriched_calendar = []
    for i, item in enumerate(calendar):
        fmt = item.get('format', '').lower()
        topic = item.get('topic', 'General Awareness')
        
        # Layer 3: Strategic Context (Topic + Product Info) - Fixed ~150 chars
        p_name = brief.get('name', 'Product')
        if not p_name or p_name.strip() == "": p_name = "[PRODUCT_NAME_MISSING]"
        p_desc = str(brief.get('description', ''))[:200]
        if not p_desc or p_desc.strip() == "": p_desc = "[PRODUCT_DESC_MISSING]"
        
        # Format: Topic: [Topic]. Product: [Name] ([Desc]).
        strategic_context = f"Topic: {topic}. Product: {p_name} ({p_desc})."
        strategic_context = strategic_context[:200]

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
            
            OUTPUT FORMAT: RETURN ONLY VALID JSON.
            {{
              "visual_description": "...",
              "slides": [
                {{
                  "slide_scene_variation": "...",
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
                category_raw = brand.get("businessCategory", "other").lower()
                is_luxury_cpg = any(k in category_raw for k in ["cosmetic", "makeup", "beauty", "jewel", "food", "drink", "cpg"])
                
                if is_luxury_cpg:
                    style_modifier = "3D render, sleek, premium studio lighting, hyper-realistic 8k, glassmorphism, depth of field"
                else:
                    style_modifier = "realistic, natural, high-fidelity film photography, candid, authentic, organic shadows, non-studio environment, shun all 3D styles, no rendered effects, shot on 35mm lens"

                # Prepare slides data
                item['slides_metadata'] = []
                for s in visual_data.get('slides', []):
                    v_prompt = f"{universal_base} {brand_dna} {strategic_context} Style: {style_modifier}. Scene: {s.get('slide_scene_variation', '') or scene_base}"
                    item['slides_metadata'].append({
                        "visual_prompt": v_prompt[:795],
                        "headline": s.get('headline', ''),
                        "subtext": s.get('subtext', ''),
                        "position": s.get('position', 'center')
                    })
                
                # Fallback / Legacy field
                item['visual_prompt'] = item['slides_metadata'][0]['visual_prompt'] if item['slides_metadata'] else f"{universal_base} {brand_dna} {strategic_context}"[:795]
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
                category_raw = brand.get("businessCategory", "other").lower()
                style_mod = "realistic, cinematic lighting, 4k 60fps"
                if any(k in category_raw for k in ["cosmetic", "jewel", "food", "cpg"]):
                    style_mod = "sleek 3D motion, premium studio lighting, hyper-realistic"

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
    You are the Velocity Algorithm Critic. Analyze this 7-day content strategy.
    
    BRAND: {brand.get('brandName')}
    PRODUCT: {brief.get('name')}
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
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
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

def generate_strategy(brand_info: Dict[str, Any], product_brief: Dict[str, str], suggested_mix: Dict[str, int] = None, custom_instruction: str = ""):
    initial_state = {
        "brand_info": brand_info,
        "product_brief": product_brief,
        "suggested_mix": suggested_mix or {"reels": 3, "static": 2, "carousel": 2},
        "custom_instruction": custom_instruction or "",
        "content_calendar": [],
        "strategy_critique": {},
        "error": ""
    }
    result = app.invoke(initial_state)
    return result
