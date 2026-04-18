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
    reasoning: str
    content_calendar: List[Dict[str, Any]]
    strategy_critique: Dict[str, Any]
    error: str

def analyze_brand_mix(brand_info: Dict[str, Any]):
    """
    Agent that decides the content mix (how many reels/photos/carousels) based on brand profile.
    """
    prompt = f"""
    You are the Velocity AI Content Strategist. Your task is to define the optimal 7-day content mix for a brand.
    
    BRAND DATA:
    - Name: {brand_info.get('brandName')}
    - Category: {brand_info.get('businessCategory')}
    - Tone: {brand_info.get('brandTone')}
    - Target: {brand_info.get('targetAudience')}
    - Goal: {brand_info.get('mainGoal')}
    
    TASK: 
    1. Decide how many Reels, Static Images, and Carousels should be in a 7-day launch period.
    2. Total items MUST be exactly 7.
    3. Provide a strategic reasoning string (max 2 sentences) starting with "Based on your profile..."
    
    Output Format: RETURN ONLY VALID JSON.
    {{
      "reels": 3,
      "static": 2,
      "carousel": 2,
      "carouselSlides": 3, 
      "reasoning": "Based on your luxury tone and preference for high engagement, we recommend a Reel-heavy approach to drive discovery."
    }}
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([
            SystemMessage(content="You are a JSON-only strategist."),
            HumanMessage(content=prompt)
        ])
        content = response.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = json.loads(content)
        return result
    except Exception as e:
        print(f"DEBUG: Mix Agent Error Detail: {e}")
        return {"reels": 3, "static": 2, "carousel": 2, "reasoning": "Using our high-performance default strategy mix."}

# Node 1: Strategy Planner (The Strategist)
def planner_node(state: GraphState):
    brand = state['brand_info']
    brief = state['product_brief']
    
    mix = state.get('suggested_mix', {"reels": 3, "static": 2, "carousel": 2})
    
    prompt = f"""
    You are the Lead Strategist for Velocity AI. Your goal is to create a high-impact 7-day content strategy for:
    
    BRAND: {brand.get('brandName')} ({brand.get('businessCategory', '')})
    PRODUCT: {brief.get('name')}
    BRIEF: {brief.get('description')}
    INDUSTRY PILL: {brief.get('category')}
    TONE: {brand.get('brandTone', 'Luxury/Premium')}
    BRAND COLORS: Primary: {brand.get('primaryColor', '#2563EB')}, Secondary: {brand.get('secondaryColor', '#60A5FA')}
    (Use these colors as the primary visual palette)
    
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
    5. carousel_slides: (Only if format is Carousel) Number of slides to generate (between 3-5).
    6. optimal_time: The best time to post (e.g., "06:00 PM", "09:30 AM") based on the topic and general audience activity.
    
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
def visual_illustrator_node(state: GraphState):
    calendar = state['content_calendar']
    brand = state['brand_info']
    brief = state['product_brief']
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
    
    print(f"Illustrator Agent: Designing 7 high-end visual prompts...")
    
    enriched_calendar = []
    for i, item in enumerate(calendar):
        # Map item format to our prompt manager library names
        format_for_engine = item.get('format', 'Static Image')
        if format_for_engine == 'Static Image': format_for_engine = 'images'
        elif format_for_engine == 'Reel': format_for_engine = 'reels'
        elif format_for_engine == 'Carousel': format_for_engine = 'carousels'
        
        # Use template - if no template, get_formatted_prompt returns a basic fallback
        base_prompt = get_formatted_prompt(
            format_type=format_for_engine,
            topic=item.get('topic', ''),
            brand_info={
                **brand,
                'PRODUCT_NAME': brief.get('name'),
                'PRODUCT_CATEGORY': brief.get('category'),
                'BRAND_COLOR_PRIMARY': brand.get('primaryColor', '#2563EB'),
                'BRAND_COLOR_SECONDARY': brand.get('secondaryColor', '#60A5FA')
            }
        )

        refinement_prompt = f"""
        TASK: Convert this into a high-end, 60-word cinematic prompt for NVIDIA FLUX.
        BRAND: {brand.get('brandName')}
        NICHE/CATEGORY: {brand.get('businessCategory')}
        TONE: {brand.get('brandTone')}
        PRODUCT: {brief.get('name')}
        PRODUCT CONTEXT: {brief.get('description')}
        
        VISUAL DNA:
        - Primary Color Atmosphere: {brand.get('primaryColor')}
        - Secondary Accents: {brand.get('secondaryColor')}
        
        STRICT OUTPUT RULES:
        - STYLE: Cinematic, professional studio lighting, depth of field.
        - STRICTLY NO TEXT, NO LOGOS, NO GIBBERISH.
        - Focus on textures and the high-end essence of the {brand.get('businessCategory')} niche.
        - Output ONLY the final visual description.
        - Must be under 600 characters.
        """
        
        print(f"DEBUG: Designer Prompt Context: Brand={brand.get('brandName')}, Category={brand.get('businessCategory')}")
        
        try:
            res = llm.invoke(refinement_prompt)
            final_prompt = res.content.strip()
            # If the LLM still returns a "Here is..." or similar, try to extract if markers exist
            if "---" in final_prompt:
                parts = final_prompt.split("---")
                final_prompt = parts[1].strip() if len(parts) > 1 else parts[0].strip()
            
            # Final truncation and cleansing
            item['visual_prompt'] = final_prompt[:790]
        except:
            item['visual_prompt'] = base_prompt[:790]
            
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

def generate_strategy(brand_info: Dict[str, Any], product_brief: Dict[str, str], suggested_mix: Dict[str, int] = None):
    initial_state = {
        "brand_info": brand_info,
        "product_brief": product_brief,
        "suggested_mix": suggested_mix or {"reels": 3, "static": 2, "carousel": 2},
        "content_calendar": [],
        "strategy_critique": {},
        "error": ""
    }
    result = app.invoke(initial_state)
    return result
