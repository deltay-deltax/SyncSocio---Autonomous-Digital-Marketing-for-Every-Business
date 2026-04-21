import os
import json
import re
from typing import TypedDict, Dict, Any, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

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
    brand = state.get("brand_info", {})
    posts = state.get("historical_posts", [])
    
    brand_name = brand.get("brandName", "Unknown")
    category = brand.get("businessCategory", "General")
    
    history_context = ""
    if posts:
        total_reach = sum(float(p.get("reach", 0)) for p in posts)
        avg_reach = total_reach / len(posts) if len(posts) > 0 else 0
        history_context = f"Found {len(posts)} recent posts. Average Reach: {avg_reach:.1f}."
        
        # Determine best performing format
        format_performance = {}
        for p in posts:
            fmt = p.get('type', 'Static')
            format_performance[fmt] = format_performance.get(fmt, []) + [float(p.get('reach', 0))]
            
        best_format = "Reel"
        best_reach = 0
        for fmt, reaches in format_performance.items():
            avg = sum(reaches) / len(reaches)
            if avg > best_reach:
                best_reach = avg
                best_format = fmt
        
        history_context += f" Best performing format historically: {best_format} (Avg Reach: {best_reach:.1f})."
    else:
        history_context = "No historical post data available. Focus on standard discovery algorithms (heavy short-form video)."

    prompt = f"""
    You are a Data Analyst for an Instagram Growth Agency.
    Analyze this brand's scenario and output a concise strategic insight paragraph on what content format they should focus on for maximum growth.
    
    BRAND: {brand_name}
    CATEGORY: {category}
    HISTORY: {history_context}
    
    OUTPUT: Just the insight paragraph.
    """
    print("\n" + "="*50)
    print("AI AGENT: MIX ANALYST")
    print("RAW DATA:", json.dumps({"brand": brand, "posts_count": len(posts)}, indent=2))
    print("="*50)
    print("CONSTRUCTED PROMPT:")
    print(prompt)
    print("="*50 + "\n")

    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke([
            SystemMessage(content="You are a data analyst. Be concise and strategic."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        return {"insights": content.strip(), "prompts": [prompt]}
    except Exception as e:
        print(f"Error in Analyst: {e}")
        return {"insights": "Focus on high-quality visual storytelling.", "prompts": [prompt]}

def strategist_node(state: MixState):
    """Takes insights and decides the exact 7-day mix."""
    brand = state.get("brand_info", {})
    insights = state.get("insights", "")
    
    prompt = f"""
    You are the Lead Content Strategist. Based on the Analyst's insights, determine the PERFECT 7-day content mix.
    
    BRAND: {brand.get("brandName", "Unknown")}
    CATEGORY: {brand.get("businessCategory", "General")}
    ANALYST INSIGHTS: {insights}
    
    RULES:
    1. Must total EXACTLY 7 posts.
    2. Format as valid JSON only. NO intro, NO outro.
    3. Keys must be exactly: "reels", "image", "carousel".
    
    Output Format:
    {{
        "reels": 4,
        "image": 2,
        "carousel": 1
    }}
    """
    print("\n" + "="*50)
    print("AI AGENT: MIX STRATEGIST PROMPT")
    print("="*50)
    print(prompt)
    print("="*50 + "\n")

    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        res = llm.invoke([
            SystemMessage(content="You compute the exact social media mix. Output JSON only."),
            HumanMessage(content=prompt)
        ])
        content = res.content
        if isinstance(content, list):
            content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
            
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            mix = json.loads(json_match.group())
        else:
            mix = json.loads(content)
            
        return {"proposed_mix": mix, "prompts": state.get("prompts", []) + [prompt]}
    except Exception as e:
        print(f"Error in Strategist: {e}")
        fallback = {"reels": 3, "image": 2, "carousel": 2}
        return {"proposed_mix": fallback, "prompts": state.get("prompts", []) + [prompt]}

def validator_node(state: MixState):
    """Ensures the mix sums to 7."""
    mix = state.get("proposed_mix", {"reels": 4, "image": 2, "carousel": 1})
    
    reels = mix.get("reels", 0)
    image = mix.get("image", 0)
    carousel = mix.get("carousel", 0)
    
    total = reels + image + carousel
    
    # Auto-correction to ensure it always equals 7
    if total != 7:
        if reels >= 4:
            # Scale down
            reels = 7 - (image + carousel)
            if reels < 0:
                reels = 4
                image = 2
                carousel = 1
        elif total < 7:
            diff = 7 - total
            reels += diff
        else:
            reels = 4
            image = 2
            carousel = 1
            
    final_mix = {
        "reel": reels,         # Notice we change to singular names if the frontend prefers or keep as is?
        "image": image,
        "carousel": carousel,
        "reels": reels,        # Keeping plural for back-compatibility
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
    initial_state = {
        "brand_info": {
            "brandName": payload.get("brandName", "Unknown"),
            "businessCategory": payload.get("businessCategory", "General")
        },
        "historical_posts": payload.get("historical_posts", []),
        "insights": "",
        "proposed_mix": {},
        "final_mix": {},
        "error": ""
    }
    
    result = mix_app.invoke(initial_state)
    return {
        "mix": result.get("final_mix", {"reels": 3, "image": 2, "carousel": 2}),
        "prompts": result.get("prompts", [])
    }
