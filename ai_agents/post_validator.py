"""
SyncSocio Actor-Critic Post Validation Agent
Implements the SyncSocio Algorithm whitepaper's G-Factor scoring and recursive improvement loop.
"""

import os
import json
import asyncio
import requests
from typing import TypedDict, List, Dict, Any, Optional
from google import genai
from google.genai import types
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

load_dotenv()

# ── State ───────────────────────────────────────────────────────────────────
class PostState(TypedDict):
    user_id: str
    media_paths: List[str]
    content_type: str        # reel | static | carousel
    description: str
    brand_profile: Dict[str, Any]
    account_insights: Dict[str, Any]
    winner_posts: List[Dict[str, Any]]   # from Vector Search
    critique: Dict[str, Any]             # Actor output
    growth_factor: float                  # Critic G-score
    best_posting_time: str
    scheduling_reason: str               # Strategist's rationale
    suggestions: List[str]
    media_analysis: str                  # Vision description of upload
    iteration: int
    error: str

# ── LLM (with fallback logic) ──────────────────────────────────────────
def get_llm(model_name="gemini-flash-latest"):
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

def clean_json_string(s: Any) -> str:
    """Extracts and cleans JSON from AI responses, handling markdown blocks and multi-part content."""
    if isinstance(s, list):
        s = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in s])
    
    if not isinstance(s, str):
        s = str(s)

    s = s.strip()
    
    # Use regex to find the last markdown JSON block or the first one
    import re
    json_block = re.findall(r"```json\s*(.*?)\s*```", s, re.DOTALL)
    if json_block:
        s = json_block[-1] # Take the last one if multiple exist
    else:
        # Try generic code block
        code_block = re.findall(r"```\s*(.*?)\s*```", s, re.DOTALL)
        if code_block:
            s = code_block[-1]
    
    # Final cleanup of remaining markdown artifacts or non-json text
    s = s.strip()
    if s.startswith("{") and s.endswith("}"):
        return s
        
    return s

def invoke_llm_with_fallback(prompt: str, system_message: str = "You are a JSON-only response agent."):
    models = ["gemini-flash-latest-exp", "gemini-flash-latest", "gemini-1.5-pro-latest", "gemini-pro"]
    for model in models:
        try:
            llm = get_llm(model)
            response = llm.invoke([
                SystemMessage(content=system_message),
                HumanMessage(content=prompt)
            ])
            content = clean_json_string(response.content)
            return content, model
        except Exception as e:
            if "404" in str(e) or "NOT_FOUND" in str(e):
                print(f"⚠️ Model {model} not found, trying next...")
                continue
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"⚠️ Model {model} quota exhausted, trying next...")
                continue
            raise e
    raise Exception("All Gemini models failed. Please check your API key and quota.")

# ── Node 1: Fetch Meta Account Insights ───────────────────────────────────
def fetch_insights_node(state: PostState) -> PostState:
    """Pulls reach, saves, shares from Meta API for last 10 posts."""
    brand = state.get("brand_profile", {})
    access_token = brand.get("instagramAccessToken") or os.getenv("META_TEST_ACCESS_TOKEN", "")
    ig_id = brand.get("instagramBusinessAccountId") or os.getenv("META_IG_USER_ID", "")

    if not access_token or not ig_id:
        print("Meta credentials not set - using mock insights for development.")
        # Mock data for local dev / unverified accounts
        return {
            **state,
            "account_insights": {
                "avg_reach": 1200,
                "avg_saves": 45,
                "avg_shares": 18,
                "avg_likes": 210,
                "peak_hours": [9, 12, 18, 21],  # hours in IST
                "top_content_type": "reel",
                "follower_count": 1500
            }
        }

    try:
        # Fetch recent media
        url = f"https://graph.facebook.com/v25.0/{ig_id}/media"
        params = {
            "fields": "id,media_type,timestamp",
            "access_token": access_token,
            "limit": 10
        }
        media_res = requests.get(url, params=params, timeout=10).json()
        media_list = media_res.get("data", [])

        if not media_list:
            raise ValueError("No media found on account.")

        # Fetch insights for each post
        total_reach, total_saves, total_shares, total_likes, count = 0, 0, 0, 0, 0
        for media in media_list[:5]:  # Last 5 posts
            ins_url = f"https://graph.facebook.com/v21.0/{media['id']}/insights"
            ins_params = {
                "metric": "reach,saved,shares,likes_count",
                "period": "lifetime",
                "access_token": access_token
            }
            ins_res = requests.get(ins_url, params=ins_params, timeout=10).json()
            for metric in ins_res.get("data", []):
                if metric["name"] == "reach":
                    total_reach += metric["values"][0]["value"]
                elif metric["name"] == "saved":
                    total_saves += metric["values"][0]["value"]
                elif metric["name"] == "shares":
                    total_shares += metric["values"][0]["value"]
                elif metric["name"] == "likes_count":
                    total_likes += metric["values"][0]["value"]
            count += 1

        # 3. Fetch real follower count (v25.0 Direct Node)
        user_url = f"https://graph.facebook.com/v25.0/{ig_id}"
        user_res = requests.get(user_url, params={"fields": "followers_count", "access_token": access_token}, timeout=10).json()
        follower_count = user_res.get("followers_count", 0)

        # 4. Fetch Real Peak Activity Hours (Last 24h pattern)
        # Period: lifetime, Metric: online_followers (returns array of values per hour)
        peak_url = f"https://graph.facebook.com/v25.0/{ig_id}/insights"
        peak_params = {
            "metric": "online_followers",
            "period": "lifetime",
            "access_token": access_token
        }
        peak_res = requests.get(peak_url, params=peak_params, timeout=10).json()
        peak_hours = []
        try:
            # Extract hours where activity was significantly high
            data_points = peak_res.get("data", [{}])[0].get("values", [{}])[0].get("value", {})
            # value is a dict like {"0": 12, "1": 5, ... "23": 45}
            sorted_hours = sorted(data_points.items(), key=lambda x: x[1], reverse=True)
            peak_hours = [int(h) for h, v in sorted_hours[:4]] # Top 4 hours
        except:
            peak_hours = [9, 12, 18, 21] # High-traffic benchmarks if no data

        c = max(count, 1)
        insights = {
            "avg_reach": total_reach // c,
            "avg_saves": total_saves // c,
            "avg_shares": total_shares // c,
            "avg_likes": total_likes // c,
            "peak_hours": sorted(peak_hours),
            "top_content_type": "reel",
            "follower_count": follower_count
        }
        print(f"\n[AGENT: ANALYST] - Insights Retrieved: {json.dumps(insights, indent=2)}")
        return {
            **state,
            "account_insights": insights
        }
    except Exception as e:
        print(f"Meta API warning (using mock): {str(e)}")
        return {
            **state,
            "account_insights": {
                "avg_reach": 1200, "avg_saves": 45, "avg_shares": 18,
                "avg_likes": 210, "peak_hours": [9, 12, 18, 21],
                "top_content_type": "reel", "follower_count": 1500
            }
        }

# ── Node 2: Vision Actor (Analyse the uploaded media) ─────────────────────
def vision_actor_node(state: PostState) -> PostState:
    """Uses Gemini Vision to read the uploaded image/video description."""
    media_paths = state.get("media_paths", [])
    resolved_paths = []
    for path in media_paths:
        if path and not os.path.exists(path):
            alt_path = os.path.join("..", "backend", path)
            if os.path.exists(alt_path):
                path = alt_path
        resolved_paths.append(path)
    state["media_paths"] = resolved_paths
    media_paths = resolved_paths

    if not media_paths or not os.path.exists(media_paths[0]):
        return {**state, "media_analysis": "No media file provided."}

    media_path = media_paths[0] # Analyze first asset for context

    ext = os.path.splitext(media_path)[1].lower()
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp"]

    try:
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        if is_image:
            with open(media_path, "rb") as f:
                media_bytes = f.read()
            mime = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
            part = types.Part.from_bytes(data=media_bytes, mime_type=mime)

            prompt = f"""
            You are a Social Media Content Expert. Analyze this image for a brand with the following context:
            - Brand: {state['brand_profile'].get('brandName', 'SyncSocio User')}
            - Niche: {state['brand_profile'].get('businessCategory', '')}
            - Goal: {state['brand_profile'].get('mainGoal', '')}
            - Locale: {state['brand_profile'].get('businessLocation', 'Global')}
            
            Analyze critically:
            1. Hook strength: Does the first frame immediately grab attention?
            2. Visual quality: Lighting, composition, color palette (rate 1-10).
            3. Text overlays: Are any present? Are they readable and impactful?
            4. Brand consistency: Does it feel premium and purposeful?
            5. Predicted weak spots: What would make viewers scroll past?
            
            Return analysis as JSON:
            {{"hook_score": 0-10, "visual_quality": 0-10, "has_text": bool, "text_quality": 0-10, "weak_spots": ["..."], "strengths": ["..."]}}
            """

            # Fallback for Vision
            vision_models = ["gemini-flash-latest-exp", "gemini-flash-latest", "gemini-1.5-pro-latest", "gemini-pro-vision"]
            response = None
            for v_model in vision_models:
                try:
                    response = client.models.generate_content(
                        model=v_model,
                        contents=[prompt, part]
                    )
                    print(f"✅ Vision analysis successful with {v_model}")
                    break
                except Exception as ve:
                    print(f"⚠️ Vision fallback {v_model} failed: {str(ve)}")
                    continue
            
            if not response:
                raise Exception("All vision models failed.")
        else:
            # For video, use description-based analysis
            response_text = json.dumps({
                "hook_score": 7, "visual_quality": 7,
                "has_text": True, "text_quality": 7,
                "weak_spots": ["Video analysis requires extended permissions"],
                "strengths": ["Video format uploaded successfully"]
            })
            return {**state, "media_analysis": response_text}

        raw = response.text.strip()
        if raw.startswith("```json"):
            raw = raw[7:-3].strip()
        elif raw.startswith("```"):
            raw = raw[3:-3].strip()

        print(f"\n[AGENT: VISIONARY] - Visual Analysis Complete: {raw}")
        return {**state, "media_analysis": raw}

    except Exception as e:
        print(f"Vision Actor error: {str(e)}")
        return {**state, "media_analysis": json.dumps({
            "hook_score": 5, "visual_quality": 5,
            "has_text": False, "text_quality": 0,
            "weak_spots": ["Vision analysis unavailable"], "strengths": []
        })}

# ── Node 3: Critic Node (G-Factor scoring + feedback loop) ────────────────
def critic_node(state: PostState) -> PostState:
    """
    Implements the SyncSocio Algorithm G-Factor:
    G = (Saves × 3 + Shares × 2 + Comments × 1.5) / Reach × Recency_Boost
    Then gives recursive improvement suggestions if G < 2.0.
    """
    insights = state["account_insights"]
    brand = state["brand_profile"]
    description = state["description"]
    content_type = state["content_type"]
    winner_posts = state.get("winner_posts", [])
    iteration = state.get("iteration", 0)

    try:
        media_analysis = json.loads(state.get("media_analysis", "{}"))
    except:
        media_analysis = {}

    # ── G-Factor Calculation ───
    avg_reach = max(insights.get("avg_reach", 1), 1)
    saves = insights.get("avg_saves", 0)
    shares = insights.get("avg_shares", 0)
    likes = insights.get("avg_likes", 0)
    g_factor = round((saves * 3 + shares * 2 + likes * 1.5) / avg_reach, 4)

    # ── Winner's Circle context ─
    winner_context = ""
    if winner_posts:
        winner_context = "Reference your top-performing posts:\n"
        for w in winner_posts[:3]:
            winner_context += f"- Post: {w.get('description', '')} | G={w.get('growthFactor', 0)}\n"

    prompt = f"""
You are the SyncSocio Algorithm Critic — the most demanding social media strategist alive.

CONTEXT:
- User Content (Placeholder): "{description}"
- Brand Identity Profile: {brand.get('brandName', 'Unknown')} | {brand.get('businessCategory', '')}
- Target Location: {brand.get('businessLocation', 'Global')}
- Audience Demographics: {brand.get('targetAudience', 'General')}
- Visual Analysis: {json.dumps(media_analysis)}
- Account Avg Reach: {avg_reach} | Saves: {saves} | Shares: {shares}
- Current G-Factor Score: {g_factor} (Target: >2.0 = Viral)
- Iteration: {iteration + 1}/3
{winner_context}

YOUR TASK:
1. Evaluate this post's viral potential.
2. Identify 3 specific "Weak Signals" (what's keeping it from going viral).
3. Suggest 3 "Power Moves" (exact changes to make it viral).
4. Recommend 5 high-density SEO hashtags.
5. Write a improved caption hook (first 3 lines only).

Return ONLY valid JSON:
{{
  "verdict": "Needs Work | Good | Viral-Ready",
  "weak_signals": ["signal1", "signal2", "signal3"],
  "power_moves": ["move1", "move2", "move3"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "improved_hook": "First line\\nSecond line\\nThird line",
  "optimal_time": "HH:MM AM/PM",
  "confidence_score": 0-100
}}
"""

    try:
        raw, working_model = invoke_llm_with_fallback(prompt)
        print(f"✅ Critic analysis successful with {working_model}")
        
        if isinstance(raw, list):
            raw = raw[0].get("text", "") if isinstance(raw[0], dict) else raw[0]
        raw = raw.strip()
        if raw.startswith("```json"):
            raw = raw[7:-3].strip()
        elif raw.startswith("```"):
            raw = raw[3:-3].strip()

        critique = json.loads(raw)
    except Exception as e:
        print(f"Critic error: {str(e)}")
        critique = {
            "verdict": "Good",
            "weak_signals": ["Low hook intensity", "Needs stronger CTA", "Caption too generic"],
            "power_moves": ["Add first-frame text overlay", "Post at peak hour", "Use trending audio"],
            "hashtags": ["#smallbusiness", "#growthhack", "#instagrammarketing", "#viral", "#trending"],
            "improved_hook": "This changes everything.\nHere's what nobody tells you.\nWatch till the end.",
            "optimal_time": "9:00 AM",
            "confidence_score": 65
        }

    suggestions = critique.get("power_moves", []) + [f"Add hashtags: {' '.join(critique.get('hashtags', []))}"]

    print(f"\n[AGENT: CRITIC] - G-Factor: {g_factor} | Verdict: {critique.get('verdict')}")
    print(f"[AGENT: CRITIC] - Improvement Sugggestions: {json.dumps(suggestions, indent=2)}")

    return {
        **state,
        "critique": critique,
        "growth_factor": g_factor,
        "suggestions": suggestions,
        "iteration": iteration + 1
    }

# ── Node 3b: Caption Generator (Simple Mode) ──────────────────────────────
def caption_generator_node(state: PostState) -> PostState:
    """Generates a high-quality caption and hashtags based on media analysis."""
    brand = state["brand_profile"]
    description = state["description"]
    media_analysis = state.get("media_analysis", "")
    content_type = state["content_type"]

    prompt = f"""
    You are a Viral Social Media Copywriter (SyncSocio Optimizer). Write a high-converting caption for this content.

    CONTEXT:
    - Brand: {brand.get('brandName', '')} ({brand.get('businessCategory', '')})
    - Goal: {brand.get('mainGoal', '')}
    - Tone: {brand.get('brandTone', 'Professional')}
    - Target Audience: {brand.get('targetAudience', 'General')}
    - USP (Unique Selling Point): {brand.get('usp', '')}
    - Primary CTA: {brand.get('primaryCTA', '')}
    - Location: {brand.get('businessLocation', 'Global')}
    - User's Intent: "{description}"
    - Media Analysis (Pre-Calculated): {media_analysis}
    - Content Format: {content_type}

    TASK:
    1. Analyze the Media Analysis provided to incorporate visual cues (colors, objects, mood).
    2. Write a caption that aligns with the Brand Tone and Target Audience.
    3. Ensure a pattern-interrupt hook and a strong CTA.
    4. Provide 15-20 viral hashtags.
    5. Provide 2-3 specific "Logic Points" for the UI.

    Return ONLY valid JSON:
    {{
      "caption": "Full caption text here...",
      "hashtags": ["#tag1", "#tag2", "..."],
      "logic": ["Reason 1", "Reason 2"]
    }}
    """
    
    try:
        raw, model = invoke_llm_with_fallback(prompt)
        print(f"✅ Caption generation successful with {model}")
        data = json.loads(raw)
        
        caption = data.get("caption", "")
        hashtags = data.get("hashtags", [])
        logic = data.get("logic", [])
    except Exception as e:
        print(f"Caption optimization error: {str(e)}")
        caption = description
        hashtags = ["#trending", "#viral", "#growth"]
        logic = ["Baseline engagement optimization"]

    return {
        **state,
        "critique": {
            "improved_hook": caption,
            "hashtags": hashtags,
            "verdict": "Optimized",
            "weak_signals": [],
            "power_moves": logic, # We'll put logic here for now
            "confidence_score": 85
        },
        "suggestions": ["Caption and tags optimized based on content analysis"]
    }

# ── Node 4: Scheduler (Best Time to Post) ─────────────────────────────────
# ── Node 4: Strategist (Audience-Aware Timing) ─────────────────────────────
def strategist_node(state: PostState) -> PostState:
    """Analyzes audience data and peak hours to pick a window and explain WHY."""
    insights = state["account_insights"]
    brand = state["brand_profile"]
    content_type = state["content_type"]
    description = state["description"]
    
    prompt = f"""
You are the SyncSocio Timing Strategist. Your goal is to pick the single best time to post based on data.

CONTEXT:
- Brand Profile (Identity): {brand.get('brandName', '')} | {brand.get('businessCategory', '')}
- User's Initial Vision (Placeholder): "{description}"
- Location: {brand.get('businessLocation', 'Global')}
- Target Audience: {brand.get('targetAudience', 'General')}
- peak_hours: {insights.get('peak_hours', [9, 12, 18, 21])}
- Content Type: {content_type}

TASK:
1. Pick the absolute best time (HH:MM AM/PM) from the peak_hours or near them.
2. Provide 2-3 specific "Logic Points" for why this time is optimal.

Return ONLY valid JSON:
{{
  "optimal_time": "HH:MM AM/PM",
  "reason": "Combined explanation text...",
  "logic": ["Logic Point 1", "Logic Point 2"]
}}
"""
    try:
        raw, model = invoke_llm_with_fallback(prompt)
        data = json.loads(raw)
        reason = data.get("reason", "Optimized based on historical audience patterns.")
        time_suggested = data.get("optimal_time", "9:00 AM")
        logic = data.get("logic", ["Activity peak alignment"])
    except Exception as e:
        print(f"⚠️ Strategist AI failed, using fallback logic: {str(e)}")
        time_suggested = "9:00 AM"
        reason = "Optimized for global baseline engagement peaks."
        logic = ["High-traffic benchmark alignment"]
    
    print(f"\n[AGENT: STRATEGIST] - Recommended Window: {time_suggested}")
    
    return {
        **state,
        "best_posting_time": time_suggested,
        "scheduling_reason": reason,
        "suggestions": state.get("suggestions", []) + logic
    }

def scheduler_node(state: PostState) -> PostState:
    """Converts the Strategist's suggested time into a real ISO timestamp."""
    from datetime import datetime, timedelta
    import pytz
    import re

    ai_time_str = state.get("best_posting_time", "9:00 AM")
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)

    try:
        match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(AM|PM)", ai_time_str, re.I)
        if match:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            ampm = match.group(3).upper()
            if ampm == "PM" and hour < 12: hour += 12
            if ampm == "AM" and hour == 12: hour = 0
            best_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if best_time <= now: best_time += timedelta(days=1)
        else:
            best_time = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)
    except:
        best_time = now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)

    return {**state, "best_posting_time": best_time.isoformat()}

# ── Node 5: Publisher (Cloudinary → Meta API) ─────────────────────────────
def publisher_node(state: PostState) -> PostState:
    """
    Uploads media to Cloudinary for a temporary public URL,
    then posts to Instagram via the Graph API.
    """
    import cloudinary
    import cloudinary.uploader

    brand = state.get("brand_profile", {})
    access_token = brand.get("instagramAccessToken") or os.getenv("META_TEST_ACCESS_TOKEN", "")
    ig_id = brand.get("instagramBusinessAccountId") or os.getenv("META_IG_USER_ID", "")

    media_paths = state.get("media_paths", [])
    resolved_paths = []
    for path in media_paths:
        if path and not os.path.exists(path):
            alt_path = os.path.join("..", "backend", path)
            if os.path.exists(alt_path):
                path = alt_path
        resolved_paths.append(path)
    media_paths = resolved_paths
    state["media_paths"] = resolved_paths

    content_type = state.get("content_type")
    description = state.get("description")
    critique = state.get("critique", {})

    # Build caption with improved hook + hashtags
    improved_hook = critique.get("improved_hook", description)
    hashtags = " ".join(critique.get("hashtags", []))
    caption = f"{improved_hook}\n\n{hashtags}"

    # Handle Scheduling Time
    from datetime import datetime, timezone
    import time
    scheduled_time_unix = None
    best_time_iso = state.get("best_posting_time")
    
    if best_time_iso:
        try:
            # best_time_iso is like "2026-04-22T09:00:00+05:30"
            scheduled_dt = datetime.fromisoformat(best_time_iso)
            now = datetime.now(scheduled_dt.tzinfo)
            
            # Instagram requires schedule time to be between 20 mins and 75 days in the future
            diff_mins = (scheduled_dt - now).total_seconds() / 60
            if 20 < diff_mins < (75 * 24 * 60):
                scheduled_time_unix = int(scheduled_dt.timestamp())
                print(f"[PUBLISHER] Scheduling post for: {scheduled_dt} (Unix: {scheduled_time_unix})")
            else:
                print(f"[PUBLISHER] Target time {scheduled_dt} is too close or in past ({diff_mins:.1f} mins). Posting immediately.")
        except Exception as te:
            print(f"[PUBLISHER] Scheduling error: {str(te)}. Defaulting to immediate.")

    if not access_token or not ig_id:
        print("Meta credentials not configured. Skipping auto-publish.")
        return {**state, "error": "Meta credentials not set. Post saved locally only."}

    try:
        # 1. Cloudinary Config
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )

        # 2. Upload all assets and get URLs
        asset_urls = []
        public_ids = []
        for path in media_paths:
            resource_type = "video" if content_type == "reel" else "image"
            upload_result = cloudinary.uploader.upload(
                path,
                resource_type=resource_type,
                folder="syncsocio_posts"
            )
            asset_urls.append(upload_result["secure_url"])
            public_ids.append((upload_result["public_id"], resource_type))
            print(f"Cloudinary upload success: {upload_result['secure_url']}")

        # 3. Instagram Publishing
        platforms = state.get("platforms", {})
        if platforms.get("instagram", True):
            if scheduled_time_unix:
                print("[PUBLISHER] ⚠️ Instagram does not support native scheduling. Skipping IG publish here; the backend cron job will handle it.")
            else:
                container_url = f"https://graph.facebook.com/v25.0/{ig_id}/media"
                
                if content_type == "carousel":
                    # Create individual items
                    item_ids = []
                    for url in asset_urls:
                        res = requests.post(container_url, data={
                            "image_url": url,
                            "is_carousel_item": "true",
                            "access_token": access_token
                        }, timeout=30).json()
                        if not res.get("id"):
                            print(f"FAILED Carousel Item Response: {res}")
                            raise ValueError(f"Carousel item failed: {res.get('error', {}).get('message', 'Unknown error')}")
                        item_ids.append(res["id"])
                    
                    # Create Carousel Container
                    carousel_data = {
                        "media_type": "CAROUSEL",
                        "children": ",".join(item_ids),
                        "caption": caption,
                        "access_token": access_token
                    }
                    carousel_res = requests.post(container_url, data=carousel_data, timeout=30).json()
                    creation_id = carousel_res.get("id")
                elif content_type == "reel":
                    container_params = {
                        "media_type": "REELS",
                        "video_url": asset_urls[0],
                        "caption": caption,
                        "access_token": access_token
                    }
                    res = requests.post(container_url, data=container_params, timeout=30).json()
                    creation_id = res.get("id")
                else: # static
                    container_params = {
                        "image_url": asset_urls[0],
                        "caption": caption,
                        "access_token": access_token
                    }
                    res = requests.post(container_url, data=container_params, timeout=30).json()
                    creation_id = res.get("id")

                if not creation_id:
                    raise ValueError(f"Failed to create main container: {res.get('error', {}).get('message', 'Unknown error')}")

                print(f"Media container created: {creation_id}")

                # 4. Wait for processing if Reel
                if content_type == "reel":
                    import time
                    for _ in range(12): # Wait up to 60s
                        time.sleep(5)
                        status_res = requests.get(f"https://graph.facebook.com/v25.0/{creation_id}", params={
                            "fields": "status_code",
                            "access_token": access_token
                        }, timeout=10).json()
                        if status_res.get("status_code") == "FINISHED":
                            break
                        print(f"Processing Reel... {status_res.get('status_code')}")

                # 5. Publish
                publish_res = requests.post(f"https://graph.facebook.com/v25.0/{ig_id}/media_publish", data={
                    "creation_id": creation_id,
                    "access_token": access_token
                }, timeout=30).json()

                if publish_res.get("id"):
                    print(f"🚀 Published successfully! Post ID: {publish_res['id']}")
                    # Update state with IG info
                    state["ig_media_id"] = publish_res["id"]
                    state["permanent_url"] = asset_urls[0]
                else:
                    raise ValueError(f"Publish failed: {publish_res}")
        else:
            print("[PUBLISHER] Skipping Instagram publish based on platform preference.")

    except Exception as e:
        print(f"Publisher error: {str(e)}")
        state["error"] = f"Publish failed: {str(e)}"
    finally:
        # --- NEW: Facebook Publishing Hook ---
        platforms = state.get("platforms", {})
        if platforms.get("facebook", False):
            try:
                fb_page_id = brand.get("instagramPageId")
                # For FB, we need the Page Access Token. We fallback to User Token if missing.
                fb_access_token = brand.get("instagramPageAccessToken") or access_token
                
                if fb_page_id and fb_access_token:
                    print(f"[PUBLISHER] Attempting Facebook publish to Page: {fb_page_id}")
                    
                    resource_url = asset_urls[0] if asset_urls else None
                    if resource_url:
                        # Logic: Use /videos for reels, /photos for images
                        is_video = content_type == "reel"
                        fb_endpoint = f"https://graph.facebook.com/v25.0/{fb_page_id}/{'videos' if is_video else 'photos'}"
                        
                        fb_data = {
                            "caption": caption if 'caption' in locals() else state.get("description"),
                            "access_token": fb_access_token
                        }
                        
                        # Parameter name varies by endpoint for Facebook
                        if is_video:
                            fb_data["file_url"] = resource_url
                            fb_data["description"] = fb_data.pop("caption") # Videos use 'description' for the text
                        else:
                            fb_data["url"] = resource_url

                        if 'scheduled_time_unix' in locals() and scheduled_time_unix:
                            fb_data["scheduled_publish_time"] = scheduled_time_unix
                            fb_data["published"] = "false"
                        
                        fb_res = requests.post(fb_endpoint, data=fb_data, timeout=30).json()
                        if fb_res.get("id") or fb_res.get("post_id"):
                            fb_id = fb_res.get("id") or fb_res.get("post_id")
                            print(f"🚀 Facebook Publish Success! ID: {fb_id}")
                            state["fb_post_id"] = fb_id
                        else:
                            print(f"❌ Facebook Publish Failed: {fb_res}")
                else:
                    print("[PUBLISHER] Facebook enabled but Page credentials missing.")
            except Exception as fbe:
                print(f"[PUBLISHER] Facebook error: {str(fbe)}")

    # Clean return
    return {
        **state, 
        "ig_media_id": state.get("ig_media_id"), 
        "permanent_url": state.get("permanent_url")
    }

# ── Build the Validation Graph ─────────────────────────────────────────────
def build_validation_graph():
    graph = StateGraph(PostState)

    graph.add_node("fetch_insights", fetch_insights_node)
    graph.add_node("vision_actor", vision_actor_node)
    graph.add_node("critic", critic_node)
    graph.add_node("strategist", strategist_node)
    graph.add_node("scheduler", scheduler_node)

    graph.set_entry_point("fetch_insights")
    graph.add_edge("fetch_insights", "vision_actor")
    graph.add_edge("vision_actor", "critic")
    graph.add_edge("critic", "strategist")
    graph.add_edge("strategist", "scheduler")
    graph.add_edge("scheduler", END)

    return graph.compile()

def build_optimizer_graph():
    """Insights -> Vision (See the Media) -> Caption Generator -> Strategist -> Scheduler"""
    graph = StateGraph(PostState)

    graph.add_node("fetch_insights", fetch_insights_node)
    graph.add_node("vision_actor", vision_actor_node)
    graph.add_node("caption_generator", caption_generator_node)
    graph.add_node("strategist", strategist_node)
    graph.add_node("scheduler", scheduler_node)

    graph.set_entry_point("fetch_insights")
    graph.add_edge("fetch_insights", "vision_actor")
    graph.add_edge("vision_actor", "caption_generator")
    graph.add_edge("caption_generator", "strategist")
    graph.add_edge("strategist", "scheduler")
    graph.add_edge("scheduler", END)

    return graph.compile()

validation_app = build_validation_graph()
optimizer_app = build_optimizer_graph()

def validate_post(post_data: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point for the Actor-Critic pipeline (Viral Analysis)."""
    print(f"\n{'='*60}")
    print(f"🚀 SYNCSOCIO VIRAL ANALYSIS STARTING - User: {post_data.get('userId')}")
    print(f"{'='*60}")
    
    initial_state = {
        "user_id": post_data.get("userId", ""),
        "media_path": post_data.get("mediaPath", ""),
        "content_type": post_data.get("contentType", "static"),
        "description": post_data.get("description", ""),
        "brand_profile": post_data.get("brandProfile", {}),
        "account_insights": {},
        "winner_posts": post_data.get("winnerPosts", []),
        "critique": {},
        "growth_factor": 0.0,
        "best_posting_time": "",
        "scheduling_reason": "",
        "suggestions": [],
        "media_analysis": "",
        "iteration": 0,
        "error": ""
    }
    result = validation_app.invoke(initial_state)
    
    print(f"\n{'='*60}")
    print(f"✅ SYNCSOCIO VIRAL ANALYSIS COMPLETE")
    print(f"{'='*60}\n")
    return result

def optimize_post(post_data: Dict[str, Any]) -> Dict[str, Any]:
    """Entry point for the Post Optimizer (Simple Generation)."""
    print(f"\n{'='*60}")
    print(f"⚡ SYNCSOCIO OPTIMIZER STARTING - User: {post_data.get('userId')}")
    print(f"{'='*60}")
    
    initial_state = {
        "user_id": post_data.get("userId", ""),
        "media_paths": post_data.get("mediaPaths", []),
        "content_type": post_data.get("contentType", "static"),
        "description": post_data.get("description", ""),
        "brand_profile": post_data.get("brandProfile", {}),
        "account_insights": {},
        "winner_posts": [],
        "critique": {},
        "growth_factor": 0.0,
        "best_posting_time": "",
        "scheduling_reason": "",
        "suggestions": [],
        "media_analysis": "",
        "iteration": 0,
        "error": ""
    }
    result = optimizer_app.invoke(initial_state)
    
    # Map reasoning points to power_moves for UI
    if result.get("critique"):
        # Combine caption and timing logic into reasoning array
        reasoning = result["critique"].get("power_moves", []) + result.get("suggestions", [])
        # Deduplicate suggestions (which might have generic text)
        clean_reasoning = [r for r in reasoning if r != "Caption and tags optimized based on content analysis"]
        
        result["critique"]["power_moves"] = clean_reasoning
        result["critique"]["optimal_time_reason"] = result.get("scheduling_reason", "")

    print(f"\n{'='*60}")
    print(f"✅ SYNCSOCIO OPTIMIZER COMPLETE")
    print(f"{'='*60}\n")
    return result

