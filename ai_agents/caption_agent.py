import os
import json
import re
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

# ── State ─────────────────────────────────────────────────────────────────────
class CaptionState(TypedDict):
    brand_info: Dict[str, Any]
    posts: List[Dict]           # 7-day plan items
    raw_captions: List[Dict]    # CaptionWriter output
    final_captions: List[Dict]  # HashtagRefinement output
    prompts: List[str]         # Track all constructed prompts
    error: str

# ── Helpers ────────────────────────────────────────────────────────────────────
def _llm():
    return ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

def _extract_json_list(text: str) -> list:
    text = text.strip()
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        return json.loads(match.group())
    return json.loads(text)

# ── Node 1: Caption Writer ─────────────────────────────────────────────────────
def caption_writer_node(state: CaptionState) -> Dict:
    """
    For each of the 7 posts, writes an engaging Instagram caption
    tailored to the brand tone and post type.
    """
    brand = state.get("brand_info", {})
    posts = state.get("posts", [])

    posts_summary = "\n".join([
        f"Day {i+1}: [{p.get('type','reel').upper()}] {p.get('topic','')} | Prompt: {p.get('prompt','')}"
        for i, p in enumerate(posts)
    ])

    prompt = f"""
    You are a professional Instagram Caption Writer for a social media agency.

    BRAND: {brand.get("brandName", "Unknown")}
    CATEGORY: {brand.get("businessCategory", "General")}
    TONE: {brand.get("brandTone", "Professional")}

    Write an Instagram caption for EACH of these 7 posts:
    {posts_summary}

    For each post, write:
    - A compelling, engaging caption that matches the brand tone (2-4 sentences)
    - Start with a hook (first line grabs attention)
    - End with a clear call-to-action
    - Use emojis sparingly but effectively

    Output ONLY a valid JSON array of 7 objects, each with:
    - "day_index": (0-6, matching the post order above)
    - "caption": The full Instagram caption text
    """
    try:
        print("\n" + "="*50)
        print("CAPTION WRITER NODE PROMPT:")
        print(prompt)
        print("="*50 + "\n")
        
        res = _llm().invoke([
            SystemMessage(content="You are a JSON-only Instagram caption writer. Output a list of 7 caption objects."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print("CAPTION WRITER RESPONSE:")
        print(content)
        print("="*50 + "\n")
        
        captions = _extract_json_list(content)
        return {"raw_captions": captions[:7], "prompts": [prompt]}
    except Exception as e:
        # Fallback captions
        fallback = []
        for i, post in enumerate(posts):
            fallback.append({
                "day_index": i,
                "caption": f"✨ {post.get('topic', 'Exciting content')} — crafted with purpose and precision. Follow for more insights that matter. 🔖 Save this post for later!"
            })
        return {"raw_captions": fallback, "prompts": [prompt], "error": str(e)}

# ── Node 2: Hashtag Analyst & Refiner ─────────────────────────────────────────
def hashtag_refinement_node(state: CaptionState) -> Dict:
    """
    For each post + caption, generates a strategic hashtag set that
    maximizes reach. Mix of high-volume, mid-tier, and niche hashtags.
    Then refines the caption if needed.
    """
    brand = state.get("brand_info", {})
    posts = state.get("posts", [])
    raw_captions = state.get("raw_captions", [])

    # Build a combined context for hashtag generation
    combined = []
    for i, post in enumerate(posts):
        # Match caption by index
        caption_obj = next((c for c in raw_captions if c.get("day_index") == i), {})
        combined.append({
            "index": i,
            "type": post.get("type", "reel"),
            "topic": post.get("topic", ""),
            "caption": caption_obj.get("caption", ""),
            "category": brand.get("businessCategory", "General")
        })

    posts_ctx = json.dumps(combined, indent=2)

    prompt = f"""
    You are an expert Instagram Hashtag Strategist.

    BRAND CATEGORY: {brand.get("businessCategory", "General")}
    BRAND TONE: {brand.get("brandTone", "Professional")}

    For EACH of the following posts, generate the PERFECT hashtag set to maximize reach and discoverability:
    {posts_ctx}

    Hashtag strategy per post:
    - 5 HIGH-VOLUME hashtags (1M+ posts) for broad reach
    - 8 MID-TIER hashtags (100K-1M posts) for targeted reach  
    - 5 NICHE hashtags (10K-100K posts) for engaged community
    Total: 18 hashtags per post

    Also review and optionally improve the caption for engagement.

    Output ONLY a valid JSON array of 7 objects, each with:
    - "day_index": (0-6)
    - "caption": The final refined caption (keep or improve)
    - "hashtags": A single string of all 18 hashtags separated by spaces
    - "hashtag_strategy": One sentence explaining why these hashtags maximize reach
    """
    try:
        print("\n" + "="*50)
        print("HASHTAG REFINEMENT NODE PROMPT:")
        print(prompt)
        print("="*50 + "\n")
        
        res = _llm().invoke([
            SystemMessage(content="You are a JSON-only hashtag strategist. Output a list of 7 objects."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print("HASHTAG REFINEMENT RESPONSE:")
        print(content)
        print("="*50 + "\n")
        
        refined = _extract_json_list(content)

        # Merge into final structure
        final = []
        for i, post in enumerate(posts):
            refined_item = next((r for r in refined if r.get("day_index") == i), {})
            raw_caption = next((c for c in raw_captions if c.get("day_index") == i), {})
            final.append({
                "day_index": i,
                "caption": refined_item.get("caption", raw_caption.get("caption", "")),
                "hashtags": refined_item.get("hashtags", "#content #instagram #growth"),
                "hashtag_strategy": refined_item.get("hashtag_strategy", "Balanced mix for maximum reach.")
            })
        return {"final_captions": final, "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        # Fallback hashtags
        final = []
        for i, post in enumerate(posts):
            raw_caption = next((c for c in raw_captions if c.get("day_index") == i), {})
            category = brand.get("businessCategory", "business").lower().replace(" ", "")
            final.append({
                "day_index": i,
                "caption": raw_caption.get("caption", ""),
                "hashtags": f"#{category} #instagram #content #growth #socialmedia #marketing #business #entrepreneur #branding #reels #viral #trending #explore #fyp #instagood",
                "hashtag_strategy": "General growth hashtags as fallback."
            })
        return {"final_captions": final, "prompts": state.get("prompts", []) + [prompt], "error": str(e)}

# ── Graph ──────────────────────────────────────────────────────────────────────
workflow = StateGraph(CaptionState)
workflow.add_node("caption_writer", caption_writer_node)
workflow.add_node("hashtag_refinement", hashtag_refinement_node)

workflow.set_entry_point("caption_writer")
workflow.add_edge("caption_writer", "hashtag_refinement")
workflow.add_edge("hashtag_refinement", END)

caption_app = workflow.compile()

# ── Public API ──────────────────────────────────────────────────────────────────
def generate_captions_and_hashtags(payload: Dict[str, Any]) -> List[Dict]:
    """
    Main entrypoint called from FastAPI.
    payload: { brandName, businessCategory, brandTone, posts: [...7 plan items] }
    """
    initial_state = {
        "brand_info": {
            "brandName": payload.get("brandName", "Unknown"),
            "businessCategory": payload.get("businessCategory", "General"),
            "brandTone": payload.get("brandTone", "Professional"),
        },
        "posts": payload.get("posts", []),
        "raw_captions": [],
        "final_captions": [],
        "prompts": [],
        "error": ""
    }

    result = caption_app.invoke(initial_state)
    return {
        "captions": result.get("final_captions", []),
        "prompts": result.get("prompts", [])
    }
