import os
import json
import re
from typing import TypedDict, List, Dict, Any
from datetime import datetime, timedelta
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# ── State ─────────────────────────────────────────────────────────────────────
class PlanState(TypedDict):
    brand_info: Dict[str, Any]
    mix: Dict[str, int]          # {reels, image, carousel}
    hourly_data: List[Dict]      # Instagram hourly activity if available
    timing_insights: str         # Analyst output
    raw_calendar: List[Dict]     # Strategist output
    final_plan: List[Dict]       # Validator / Formatter output
    prompts: List[str]          # Track all constructed prompts
    error: str

# ── Helpers ────────────────────────────────────────────────────────────────────
def _llm():
    return ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

def _extract_json_list(text: str) -> list:
    text = text.strip()
    if isinstance(text, list):
        return text
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        return json.loads(match.group())
    return json.loads(text)

def _get_day_name(d: datetime) -> str:
    return d.strftime("%a").upper()

def _get_date_str(d: datetime) -> str:
    return d.strftime("%b %d")

from common import get_brand_dna, get_universal_system_prompt

# ── Node 1: Timing Analyst ─────────────────────────────────────────────────────
def timing_analyst_node(state: PlanState) -> Dict:
    """
    Analyzes the brand profile and any available hourly data to
    recommend the two best posting windows for the week.
    """
    brand_dna = get_brand_dna(state)

    prompt = f"""
{brand_dna}

TASK:
Based on the brand category and performance history, recommend the optimal times to maximize reach and visibility for the India and Nepal (IST/NPT) audiences:
1. The BEST specific time to post Reels (discovery) to catch the regional traffic surge.
2. The BEST specific time to post Images/Carousels (engagement) for maximum dwell time.

OUTPUT: Just a clear recommendation for both types.
"""
    print("\n" + "="*50)
    print("⏰ AI AGENT: TIMING ANALYST")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        res = _llm().invoke([
            SystemMessage(content=get_universal_system_prompt("Social Media Timing Analyst")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print(f"OUTPUT RECEIVED:\n{content.strip()}")
        print("="*50 + "\n")
        return {"timing_insights": content.strip(), "prompts": [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return {
            "timing_insights": "Post Reels at 8:00 PM and Images at 11:00 AM.",
            "prompts": [prompt]
        }

# ── Node 2: Content Strategist ─────────────────────────────────────────────────
def content_strategist_node(state: PlanState) -> Dict:
    """
    Using the timing insights and content mix, generates a 7-day content
    calendar with topics, AI prompts, and posting times.
    """
    brand_dna = get_brand_dna(state)
    mix = state.get("mix", {})
    insights = state.get("timing_insights", "")

    # Build type sequence from mix
    reels_count = mix.get("reels", mix.get("reel", 3))
    image_count = mix.get("image", mix.get("images", 2))
    carousel_count = mix.get("carousel", mix.get("carousels", 2))

    today = datetime.now()
    dates = []
    for i in range(7):
        d = today + timedelta(days=i)
        dates.append({
            "day": _get_day_name(d),
            "date": _get_date_str(d),
            "iso": d.strftime("%Y-%m-%d")
        })

    prompt = f"""
{brand_dna}
    
TIMING RECOMMENDATION: {insights}

WEEKLY CONTENT MIX REQUIRED:
- {reels_count} Reels
- {image_count} Images (static)
- {carousel_count} Carousels (multi-slide)
Total: 7 posts over 7 days.

DATES TO SCHEDULE:
{json.dumps(dates, indent=2)}

TASK:
For EACH of the 7 days, create ONE post entry. Use exactly the types requested in the mix.
Timing: Ensure every post is scheduled at the exact time required to reach the maximum audience in India and Nepal (IST/NPT).

Each entry MUST have these exact keys:
- "day": short day name (e.g., "MON")
- "date": date string (e.g., "Apr 21")
- "iso_date": ISO date
- "type": "reel", "image", or "carousel"
- "topic": Compelling, benefit-driven title (max 10 words). Directly address the provided Pain Points and USP (Perfumes/Pricing).
- "optimalTime": Time when the audience will see it the most in India/Nepal (e.g., "6:30 PM").
- "prompt": A highly detailed, immersive 3-5 sentence production brief. For Reels, specify a scene-by-scene script breakdown. For Carousels, describe each slide's content and visual flow. Include specific instructions for lighting, typography overlays, and the energetic 'Foxeee' vibe.
- "why": Deep strategic reasoning (2-3 sentences) explaining how this specific content piece addresses the pain points to drive "Sell products / get orders" goal in the India/Nepal market.

OUTPUT ONLY A VALID JSON ARRAY.
"""
    print("\n" + "="*50)
    print("📅 AI AGENT: PLAN STRATEGIST")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        res = _llm().invoke([
            SystemMessage(content=get_universal_system_prompt("Lead Content Strategist")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print(f"OUTPUT RECEIVED:\n{content}")
        print("="*50 + "\n")
        calendar = _extract_json_list(content)
        return {"raw_calendar": calendar[:7], "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        fallback = _build_fallback(state.get("brand_info", {}), mix, today)
        return {"raw_calendar": fallback, "prompts": state.get("prompts", []) + [prompt]}


def _build_fallback(brand, mix, today):
    """Emergency fallback if LLM fails."""
    types = []
    reels = mix.get("reels", mix.get("reel", 3))
    images = mix.get("image", mix.get("images", 2))
    carousels = mix.get("carousel", mix.get("carousels", 2))
    types = (["reel"] * reels + ["image"] * images + ["carousel"] * carousels)[:7]
    
    topics = ["Brand story spotlight", "Top tips for success", "Behind the scenes", "Product showcase", "Community win", "Industry insight", "Weekend motivation"]
    prompts = [
        "A high-energy reel showcasing your brand story with dynamic cuts and upbeat music.",
        "A clean, minimal post highlighting your top tips with bold typography.",
        "A candid behind-the-scenes look at your process in action.",
        "A polished product showcase with natural lighting and soft background.",
        "A heartwarming community success story told through visuals.",
        "An educational carousel breaking down an industry trend with clear visuals.",
        "A feel-good motivational post to inspire your weekend audience."
    ]
    times = ["8:00 PM", "11:00 AM", "8:00 PM", "11:00 AM", "8:00 PM", "11:00 AM", "8:00 PM"]
    
    result = []
    for i in range(7):
        d = today + timedelta(days=i)
        result.append({
            "day": _get_day_name(d),
            "date": _get_date_str(d),
            "iso_date": d.strftime("%Y-%m-%d"),
            "type": types[i % len(types)],
            "topic": topics[i],
            "optimalTime": times[i],
            "prompt": prompts[i],
            "why": "Maintains optimal content variety for growth."
        })
    return result

# ── Node 3: Validator ──────────────────────────────────────────────────────────
def validator_node(state: PlanState) -> Dict:
    """
    Validates the calendar, ensures all 7 days are present with required
    fields, normalizes type names, and finalizes the plan.
    """
    raw = state.get("raw_calendar", [])
    brand = state.get("brand_info", {})
    mix = state.get("mix", {})
    
    type_map = {
        "reel": "reel", "reels": "reel", "video": "reel",
        "image": "image", "images": "image", "static": "image", "photo": "image",
        "carousel": "carousel", "carousels": "carousel", "album": "carousel"
    }
    
    today = datetime.now()
    finalized = []
    
    for i, item in enumerate(raw[:7]):
        d = today + timedelta(days=i)
        raw_type = str(item.get("type", "reel")).lower().strip()
        normalized_type = type_map.get(raw_type, "reel")
        
        finalized.append({
            "day": item.get("day", _get_day_name(d)),
            "date": item.get("date", _get_date_str(d)),
            "iso_date": item.get("iso_date", d.strftime("%Y-%m-%d")),
            "type": normalized_type,
            "topic": item.get("topic", f"Day {i+1} post for {brand.get('brandName', 'your brand')}"),
            "optimalTime": item.get("optimalTime", "8:00 PM" if i % 2 == 0 else "11:00 AM"),
            "prompt": item.get("prompt", "Create engaging content that resonates with your audience."),
            "why": item.get("why", "Maintains consistent posting schedule.")
        })
    
    # Pad to 7 if short
    while len(finalized) < 7:
        i = len(finalized)
        d = today + timedelta(days=i)
        finalized.append({
            "day": _get_day_name(d),
            "date": _get_date_str(d),
            "iso_date": d.strftime("%Y-%m-%d"),
            "type": "reel",
            "topic": f"Growth content - Day {i+1}",
            "optimalTime": "8:00 PM",
            "prompt": "Create an engaging reel that highlights your brand value.",
            "why": "Consistent posting for algorithmic growth."
        })
    
    return {"final_plan": finalized}

# ── Graph ──────────────────────────────────────────────────────────────────────
workflow = StateGraph(PlanState)
workflow.add_node("timing_analyst", timing_analyst_node)
workflow.add_node("content_strategist", content_strategist_node)
workflow.add_node("validator", validator_node)

workflow.set_entry_point("timing_analyst")
workflow.add_edge("timing_analyst", "content_strategist")
workflow.add_edge("content_strategist", "validator")
workflow.add_edge("validator", END)

plan_app = workflow.compile()

# ── Public API ──────────────────────────────────────────────────────────────────
def generate_weekly_plan(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entrypoint called from FastAPI.
    payload: { brandName, businessCategory, brandTone, mix: {reels, image, carousel}, hourly_data: [...] }
    """
    brand_data = payload.get("brand_info", payload)
    initial_state = {
        "brand_info": {
            "brandName": brand_data.get("brandName", "Unknown"),
            "businessCategory": brand_data.get("businessCategory", "General"),
            "brandTone": brand_data.get("brandTone", "Professional"),
        },
        "mix": payload.get("mix", {}),
        "hourly_data": payload.get("hourly_data", []),
        "timing_insights": "",
        "raw_calendar": [],
        "final_plan": [],
        "prompts": [],
        "error": ""
    }
    
    result = plan_app.invoke(initial_state)
    return {
        "plan": result.get("final_plan", []),
        "prompts": result.get("prompts", [])
    }
