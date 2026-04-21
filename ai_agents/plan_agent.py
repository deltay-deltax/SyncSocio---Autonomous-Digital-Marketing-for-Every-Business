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

# ── Node 1: Timing Analyst ─────────────────────────────────────────────────────
def timing_analyst_node(state: PlanState) -> Dict:
    """
    Analyzes the brand profile and any available hourly data to
    recommend the two best posting windows for the week.
    """
    brand = state.get("brand_info", {})
    hourly = state.get("hourly_data", [])

    hourly_ctx = "No live follower hourly data available."
    if hourly:
        top_hours = sorted(hourly, key=lambda x: x.get("value", 0), reverse=True)[:5]
        hourly_ctx = f"Top engagement hours: {[h.get('hour') for h in top_hours]}"

    prompt = f"""
    You are a Social Media Timing Analyst.

    BRAND: {brand.get("brandName", "Unknown")} | CATEGORY: {brand.get("businessCategory", "General")}
    HOURLY INSIGHTS: {hourly_ctx}

    Based on the brand category and available data, recommend:
    1. The BEST time to post Reels (high-reach format).
    2. The BEST time to post Images/Carousels.
    
    Use general best practices if no live data:
    - Reels: 6 PM – 9 PM (peak discovery)
    - Images/Carousels: 9 AM – 12 PM (morning scroll)
    """

    print("\n" + "="*50)
    print("AI AGENT: TIMING ANALYST PROMPT")
    print("="*50)
    print(prompt)
    print("="*50 + "\n")

    try:
        res = _llm().invoke([
            SystemMessage(content="You are a concise social-media timing analyst."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print("TIMING ANALYST RESPONSE:")
        print(content)
        print("="*50 + "\n")
        
        return {"timing_insights": content.strip(), "prompts": [prompt]}
    except Exception as e:
        print(f"Error in Timing Analyst: {e}")
        return {
            "timing_insights": "Post Reels at 8:00 PM for maximum reach. Post Images and Carousels at 11:00 AM for morning engagement.",
            "prompts": [prompt],
            "error": str(e)
        }

# ── Node 2: Content Strategist ─────────────────────────────────────────────────
def content_strategist_node(state: PlanState) -> Dict:
    """
    Using the timing insights and content mix, generates a 7-day content
    calendar with topics, AI prompts, and posting times.
    """
    brand = state.get("brand_info", {})
    mix = state.get("mix", {"reels": 3, "image": 2, "carousel": 2})
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
    You are the Lead Content Strategist for a social media agency.

    BRAND: {brand.get("brandName", "Unknown")}
    CATEGORY: {brand.get("businessCategory", "General")}
    TONE: {brand.get("brandTone", "Professional")}
    
    TIMING RECOMMENDATION: {insights}

    WEEKLY CONTENT MIX:
    - {reels_count} Reels
    - {image_count} Images (static)
    - {carousel_count} Carousels (multi-slide)
    Total: 7 posts over 7 days.

    DATES TO SCHEDULE:
    {json.dumps(dates, indent=2)}

    For EACH of the 7 days, create ONE post entry. Strictly alternate types to use exactly:
    - {reels_count} Reels, {image_count} Images, {carousel_count} Carousels.
    
    Each entry MUST have these exact keys:
    - "day": The short day name (e.g., "MON")
    - "date": The date string (e.g., "Apr 21")  
    - "iso_date": ISO format date (e.g., "2024-04-21")
    - "type": "reel", "image", or "carousel"
    - "topic": A catchy, engaging title (max 8 words)
    - "optimalTime": Best time to post this type (e.g., "8:00 PM" or "11:00 AM")
    - "prompt": A detailed creative prompt describing EXACTLY what content to create (2 sentences)
    - "why": One-line strategic reason for this post

    IMPORTANT: Output ONLY a valid JSON array of 7 objects. No intro, no explanation.
    """

    print("\n" + "="*50)
    print("AI AGENT: CONTENT STRATEGIST PROMPT")
    print("="*50)
    print(prompt)
    print("="*50 + "\n")

    try:
        res = _llm().invoke([
            SystemMessage(content="You are a JSON-only strategist. Output a list of exactly 7 content objects."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
            
        print("CONTENT STRATEGIST RESPONSE:")
        print(content)
        print("="*50 + "\n")
        
        calendar = _extract_json_list(content)
        return {"raw_calendar": calendar[:7], "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        print(f"Error in Content Strategist: {e}")
        # Fallback plan
        fallback = _build_fallback(brand, mix, today)
        return {"raw_calendar": fallback, "prompts": state.get("prompts", []) + [prompt], "error": str(e)}

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
    initial_state = {
        "brand_info": {
            "brandName": payload.get("brandName", "Unknown"),
            "businessCategory": payload.get("businessCategory", "General"),
            "brandTone": payload.get("brandTone", "Professional"),
        },
        "mix": payload.get("mix", {"reels": 3, "image": 2, "carousel": 2}),
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
