import os
import json
import re
from typing import TypedDict, Dict, Any, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from common import get_brand_dna, get_universal_system_prompt

class MixState(TypedDict):
    brand_info: Dict[str, Any]
    historical_posts: List[Dict[str, Any]]
    insights: str
    proposed_mix: Dict[str, int]
    final_mix: Dict[str, int]
    prompts: List[str]
    error: str

def analyst_node(state: MixState):
    """Analyzes the brand profile and historical data to derive growth insights."""
    brand_dna = get_brand_dna(state)
    
    prompt = f"""
{brand_dna}

TASK:
Analyze the data above. Provide a high-level Strategic Growth Insight. 
Balance the local brand performance with GLOBAL INSTAGRAM TRENDS (e.g., the current dominance of Reels for discovery and Carousels for retention).
Identify where the brand is playing it too safe and where it can capitalize on viral formats.

OUTPUT: Just 2-3 sentences of pure, trend-conscious strategic insight.
"""
    print("\n" + "="*50)
    print("🤖 AI AGENT: CONTENT ANALYST")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke([
            SystemMessage(content=get_universal_system_prompt("Data Analyst")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        
        print(f"OUTPUT RECEIVED:\n{content.strip()}")
        print("="*50 + "\n")
        return {"insights": content.strip(), "prompts": [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return {"insights": "Focus on high-engagement visual storytelling.", "prompts": [prompt]}

def strategist_node(state: MixState):
    """Takes insights and decides the exact 7-day mix."""
    brand_dna = get_brand_dna(state)
    insights = state.get("insights", "")
    
    prompt = f"""
{brand_dna}
ANALYST INSIGHTS: {insights}

TASK:
Based on the brand's identity, performance history, and CURRENT GLOBAL INSTAGRAM TRENDS, determine the optimal 7-day content mix.

GLOBAL MANDATE:
1. Discovery (REELS): Essential for reaching non-followers. Even if local data is sparse, prioritize Reels for growth.
2. Retention (CAROUSELS): Best for community building and deep engagement.
3. Aesthetic (IMAGES): Maintain brand presence and visual vibe.

The total must be EXACTLY 7 posts. If local data is limited, default to a Growth-First mix (High Reels/Carousels).

JSON FORMAT ONLY:
{{
    "reels": number,
    "image": number,
    "carousel": number
}}
"""
    print("\n" + "="*50)
    print("🚀 AI AGENT: MIX STRATEGIST")
    print("="*50)
    print(f"PROMPT PASSED:\n{prompt}")
    print("-" * 30)
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke([
            SystemMessage(content=get_universal_system_prompt("Lead Content Strategist")),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
            
        print(f"OUTPUT RECEIVED:\n{content}")
        print("="*50 + "\n")
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        mix = json.loads(json_match.group()) if json_match else json.loads(content)
        return {"proposed_mix": mix, "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return {"proposed_mix": {}, "prompts": state.get("prompts", []) + [prompt]}


def validator_node(state: MixState):
    """Ensures the mix sums to 7 proportionally."""
    mix = state.get("proposed_mix", {})
    if not mix:
        mix = {"reels": 3, "image": 2, "carousel": 2} # Very basic fallback if all else fails
    
    reels = mix.get("reels", mix.get("reel", 0))
    image = mix.get("image", mix.get("images", 0))
    carousel = mix.get("carousel", mix.get("carousels", 0))
    
    total = reels + image + carousel
    
    if total == 0:
        reels, image, carousel = 3, 2, 2
        total = 7

    # Proportional scaling to 7
    factor = 7 / total
    reels = round(reels * factor)
    image = round(image * factor)
    carousel = 7 - (reels + image) # Guarantee 7

    # Ensure no negative numbers
    if carousel < 0:
        carousel = 0
        # re-balance
        if reels > image: reels -= 1
        else: image -= 1
        carousel = 7 - (reels + image)

    final_mix = {
        "reel": reels,
        "image": image,
        "carousel": carousel,
        "reels": reels,
        "images": image,
        "carousels": carousel
    }
    
    return {"final_mix": final_mix}

# Build the LangGraph workflow
workflow = StateGraph(MixState)

workflow.add_node("analyst", analyst_node)
workflow.add_node("strategist", strategist_node)
workflow.add_node("validator", validator_node)

workflow.set_entry_point("analyst")
workflow.add_edge("analyst", "strategist")
workflow.add_edge("strategist", "validator")
workflow.add_edge("validator", END)

mix_app = workflow.compile()

def predict_brand_mix(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Entrypoint for the mix agent API.
    """
    brand_data = payload.get("brand_info", payload)
    initial_state = {
        "brand_info": brand_data,
        "historical_posts": payload.get("historical_posts", []),
        "insights": "",
        "proposed_mix": {},
        "final_mix": {},
        "error": ""
    }
    
    result = mix_app.invoke(initial_state)
    return {
        "mix": result.get("final_mix", {}),
        "prompts": result.get("prompts", [])
    }
