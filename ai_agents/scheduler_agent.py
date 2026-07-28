import os
import json
import re
from typing import Dict, Any, List
from datetime import datetime, timedelta
import pytz
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from common import get_brand_dna, get_universal_system_prompt

def _llm():
    return ChatGoogleGenerativeAI(
        model="gemini-flash-lite-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

def _extract_json_list(text: str) -> list:
    text = text.strip()
    if isinstance(text, list):
        return text
    # Clean markdown fences
    if text.startswith("```json"):
        text = text[7:-3].strip()
    elif text.startswith("```"):
        text = text[3:-3].strip()
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        return json.loads(match.group())
    return json.loads(text)

def optimize_schedule(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Intelligently assigns posting dates and times to selected posts
    based on follower activity, brand profile, and performance metrics.
    """
    brand_dna = get_brand_dna(payload)
    posts = payload.get("posts", [])
    start_date_str = payload.get("startDate")
    end_date_str = payload.get("endDate")
    platforms = payload.get("platforms", {"instagram": True, "facebook": False})

    # Parse start and end dates
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
    except Exception as e:
        # Fallback if parsing fails
        start_date = datetime.now()
        end_date = start_date + timedelta(days=len(posts) or 1)

    # List of days within date range
    date_list = []
    curr = start_date
    while curr <= end_date:
        date_list.append(curr.strftime("%Y-%m-%d (%a)"))
        curr += timedelta(days=1)

    # If date_list is empty, default to at least start_date
    if not date_list:
        date_list = [start_date.strftime("%Y-%m-%d (%a)")]

    # Create posts information
    posts_info = []
    for idx, p in enumerate(posts):
        posts_info.append({
            "index": idx,
            "id": p.get("_id") or p.get("id"),
            "type": p.get("type", "image"),
            "idea": p.get("idea", ""),
            "caption_preview": p.get("caption", "")[:100] + "..." if p.get("caption") else ""
        })

    prompt = f"""
{brand_dna}

SCHEDULING PARAMETERS:
- Date Range: {start_date_str} to {end_date_str}
- Available Posting Days: {json.dumps(date_list)}
- Target Platforms: {json.dumps(platforms)}
- Selected Posts to Schedule:
{json.dumps(posts_info, indent=2)}

TASK:
Analyze the Brand DNA, Performance Metrics, and Follower Activity to distribute these {len(posts)} posts optimally across the given Date Range.

RULES & CONSTRAINTS:
1. Spacing: Distribute the posts evenly throughout the dates. Avoid scheduling multiple posts on the exact same date and time slot unless the date range is too short (fewer days than number of posts).
2. Follower Peak Activity: Match the post times with the peak online follower hours listed in the Follower Activity section (or standard engagement peaks if not available).
3. Target Platforms: Consider target platforms (Instagram, Facebook) for timing optimization.
4. Output format: You MUST return a JSON array of objects, one for each post.

Each object in the array MUST contain:
- "id": The post's ID string (exactly as passed in the Selected Posts)
- "scheduledAt": The recommended date and time in ISO 8601 format with timezone offset for India/Kolkata (IST), e.g., "YYYY-MM-DDTHH:MM:00+05:30". Note: Use times matching the peak activity.
- "reason": A 1-2 sentence explanation of why this specific date and time slot was chosen for this content type.
- "logic": 2-3 brief bullet points outlining the strategic scheduling rationale.

OUTPUT ONLY A VALID JSON ARRAY.
"""
    print("\n" + "="*50)
    print("⏰ AI AGENT: INSTAGRAM SCHEDULER")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)

    try:
        res = _llm().invoke([
            SystemMessage(content=get_universal_system_prompt("Social Media Scheduling Analyst")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print(f"OUTPUT RECEIVED:\n{content.strip()}")
        print("="*50 + "\n")
        
        schedule_results = _extract_json_list(content)
        return schedule_results
    except Exception as e:
        print(f"❌ SCHEDULER ERROR: {e}")
        # Build a safe default schedule
        fallback_results = []
        ist = pytz.timezone("Asia/Kolkata")
        today = datetime.now(ist)
        for idx, p in enumerate(posts):
            post_id = p.get("_id") or p.get("id")
            days_to_add = idx
            target_date = start_date + timedelta(days=days_to_add)
            # Default to 6:00 PM (18:00) as peak
            scheduled_dt = target_date.replace(hour=18, minute=0, second=0, microsecond=0)
            # If scheduled_dt is in the past, push it to future days
            if scheduled_dt <= datetime.now():
                scheduled_dt += timedelta(days=1)
            scheduled_dt = ist.localize(scheduled_dt) if not scheduled_dt.tzinfo else scheduled_dt
            fallback_results.append({
                "id": post_id,
                "scheduledAt": scheduled_dt.isoformat(),
                "reason": "Default scheduling based on universal activity benchmark.",
                "logic": ["Peak hour mapping", "Sequential spacing"]
            })
        return fallback_results
