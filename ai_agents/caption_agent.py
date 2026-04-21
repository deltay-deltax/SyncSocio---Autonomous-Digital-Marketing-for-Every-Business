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

from common import get_brand_dna, get_universal_system_prompt

# ── Node 1: Caption Writer ─────────────────────────────────────────────────────
def caption_writer_node(state: CaptionState) -> Dict:
    """
    For each of the 7 posts, writes an engaging Instagram caption
    tailored to the brand tone and post type.
    """
    brand_dna = get_brand_dna(state)
    posts = state.get("posts", [])

    posts_summary = "\n".join([
        f"Post {i+1}: [{p.get('type','reel').upper()}] {p.get('topic','')} | Creative Direction: {p.get('prompt','')}"
        for i, p in enumerate(posts)
    ])

    prompt = f"""
{brand_dna}

TASK:
Write an Instagram caption for EACH of these 7 posts:
{posts_summary}

For each post, write a compelling, high-conversion caption that matches the brand tone.
Include a hook, value-driven body, and a clear call-to-action.

OUTPUT ONLY A VALID JSON ARRAY of 7 objects:
- "day_index": (0-6)
- "caption": Full text
"""
    print("\n" + "="*50)
    print("✍️ AI AGENT: CAPTION WRITER")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        res = _llm().invoke([
            SystemMessage(content=get_universal_system_prompt("Professional Instagram Caption Writer")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print(f"OUTPUT RECEIVED:\n{content.strip()}")
        print("="*50 + "\n")
        captions = _extract_json_list(content)
        return {"raw_captions": captions[:7], "prompts": [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        fallback = []
        for i, post in enumerate(posts):
            fallback.append({
                "day_index": i,
                "caption": f"✨ {post.get('topic', 'Exciting content')} — Follow for more!"
            })
        return {"raw_captions": fallback, "prompts": [prompt]}

# ── Node 2: Hashtag Analyst & Refiner ─────────────────────────────────────────
def hashtag_refinement_node(state: CaptionState) -> Dict:
    """
    For each post + caption, generates a strategic hashtag set that
    maximizes reach.
    """
    brand_dna = get_brand_dna(state)
    posts = state.get("posts", [])
    raw_captions = state.get("raw_captions", [])

    combined = []
    for i, post in enumerate(posts):
        caption_obj = next((c for c in raw_captions if c.get("day_index") == i), {})
        combined.append({
            "index": i,
            "type": post.get("type", "reel"),
            "topic": post.get("topic", ""),
            "caption": caption_obj.get("caption", "")
        })

    prompt = f"""
{brand_dna}

TASK:
For EACH of the following posts, generate the PERFECT hashtag set (mix of reach tiers) and optionally refine the caption.
Posts: {json.dumps(combined, indent=2)}

OUTPUT ONLY A VALID JSON ARRAY of 7 objects:
- "day_index": (0-6)
- "caption": Final refined caption
- "hashtags": String of 15-20 hashtags
- "hashtag_strategy": One sentence explanation
"""
    print("\n" + "="*50)
    print("🏷️ AI AGENT: HASHTAG REFINER")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        res = _llm().invoke([
            SystemMessage(content=get_universal_system_prompt("Expert Instagram Hashtag Strategist")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        
        print(f"OUTPUT RECEIVED:\n{content}")
        print("="*50 + "\n")
        refined = _extract_json_list(content)

        final = []
        for i, post in enumerate(posts):
            refined_item = next((r for r in refined if r.get("day_index") == i), {})
            raw_caption = next((c for c in raw_captions if c.get("day_index") == i), {})
            final.append({
                "day_index": i,
                "caption": refined_item.get("caption", raw_caption.get("caption", "")),
                "hashtags": refined_item.get("hashtags", "#content #instagram #growth"),
                "hashtag_strategy": refined_item.get("hashtag_strategy", "Balanced mix.")
            })
        return {"final_captions": final, "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        final = []
        for i, post in enumerate(posts):
            raw_caption = next((c for c in raw_captions if c.get("day_index") == i), {})
            final.append({
                "day_index": i,
                "caption": raw_caption.get("caption", ""),
                "hashtags": "#instagram #growth #content",
                "hashtag_strategy": "Fallback."
            })
        return {"final_captions": final, "prompts": state.get("prompts", []) + [prompt]}


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
