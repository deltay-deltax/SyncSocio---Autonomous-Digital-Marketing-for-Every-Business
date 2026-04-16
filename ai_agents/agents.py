import os
import requests
import io
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# State definition
class GraphState(TypedDict):
    brand_info: Dict[str, Any]
    content_calendar: List[Dict[str, Any]]
    image_paths: Dict[str, str]
    error: str

# Node 1: Strategy Planner
def planner_node(state: GraphState):
    brand = state['brand_info']
    
    prompt = f"""
    You are an expert Social Media Strategist. Your goal is to create a 7-day content calendar for the following brand:
    
    Brand Name: {brand.get('brandName')}
    Niche: {brand.get('businessCategory')}
    Goal: {brand.get('mainGoal')}
    Target Audience: {', '.join(brand.get('targetAudiences', []))}
    Brand Tone: {brand.get('brandTone')}
    Visual Vibe: {brand.get('visualVibe')}
    Content Mix: {brand.get('contentMix', {}).get('education', 50)}% Education, {brand.get('contentMix', {}).get('promotion', 50)}% Promotion
    Platforms: {', '.join(brand.get('socialPlatforms', []))}
    
    Task: Generate a 7-day content schedule. For each day, provide:
    1. Day (e.g., Monday)
    2. Topic (A catchy title or theme)
    3. Format (e.g., Reel, Carousel, Static Post, Story)
    4. Content (A short caption, hook, or text for the post)
    
    Constraint: Focus on high-engagement topics.
    
    Output Format: RETURN ONLY A VALID JSON LIST OF OBJECTS.
    Example:
    [
      {{"day": "Monday", "topic": "Tech Maintenance", "format": "Reel", "content": "Keep it clean..."}},
      ...
    ]
    """
    
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([
            SystemMessage(content="You are a JSON-only response agent."),
            HumanMessage(content=prompt)
        ])
        
        # Clean response if necessary (Gemini sometimes adds markdown blocks)
        content = response.content
        
        # If response is a list of blocks, extract the text part
        if isinstance(content, list) and len(content) > 0:
            if isinstance(content[0], dict) and "text" in content[0]:
                content = content[0]["text"]
            elif isinstance(content[0], str):
                content = content[0]
        
        if isinstance(content, str):
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            elif content.startswith("```"):
                content = content[3:-3].strip()
        
        import json
        if isinstance(content, str):
            calendar = json.loads(content)
        else:
            calendar = content # Already a list/dict
            
        return {"content_calendar": calendar}
    except Exception as e:
        return {"error": str(e)}

# Node 2: Visual Illustrator
def visual_illustrator_node(state: GraphState):
    calendar = state['content_calendar']
    brand = state['brand_info']
    
    # We only curate the visual prompt for the first day for this test
    target_day = calendar[0]
    
    prompt = f"""
    You are a professional Creative Director and AI Prompt Engineer.
    Task: Create a high-end, aesthetic image generation prompt for an Instagram Static Post.
    
    Post Topic: {target_day['topic']}
    Post Content: {target_day['content']}
    Brand Identity: {brand.get('brandName')} - {brand.get('brandTone')}
    Visual Vibe: {brand.get('visualVibe')}
    
    Instructions for your high-quality prompt:
    1. Focus on "Instagram Aesthetic": minimalist, clean, high-end photography.
    2. Specify lighting (e.g., soft natural light, cinematic shadows).
    3. Specify composition (e.g., flat-lay, close-up, rule of thirds).
    4. Specify technical details (e.g., shot on 35mm lens, 8k resolution, shallow depth of field).
    5. Ensure it attracts customers for tech repair/maintenance.
    
    RETURN ONLY THE FINAL PROMPT STRING. NO EXPLANATIONS.
    """
    
    try:
        print(f"Illustrator Agent: Designing visual for {target_day['day']}...")
        llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke(prompt)
        
        # Safe extraction of text content
        clean_prompt = response.content
        if isinstance(clean_prompt, list) and len(clean_prompt) > 0:
            if isinstance(clean_prompt[0], dict) and "text" in clean_prompt[0]:
                clean_prompt = clean_prompt[0]["text"]
            elif isinstance(clean_prompt[0], str):
                clean_prompt = clean_prompt[0]
            elif hasattr(clean_prompt[0], "text"):
                clean_prompt = clean_prompt[0].text
        
        # Update the first item with the high-quality prompt
        if isinstance(clean_prompt, str):
            calendar[0]['visual_prompt'] = clean_prompt.strip()
        else:
            calendar[0]['visual_prompt'] = str(clean_prompt)
        
        return {"content_calendar": calendar}
    except Exception as e:
        print(f"Illustrator Error: {str(e)}")
        return {"error": str(e)}


# Build the Graph (Content Strategy only)
workflow = StateGraph(GraphState)

workflow.add_node("planner", planner_node)
workflow.add_node("illustrator", visual_illustrator_node)

workflow.set_entry_point("planner")
workflow.add_edge("planner", "illustrator")
workflow.add_edge("illustrator", END)

# Compile
app = workflow.compile()

def generate_strategy(brand_info: Dict[str, Any]):
    initial_state = {
        "brand_info": brand_info,
        "content_calendar": [],
        "image_paths": {},
        "error": ""
    }
    result = app.invoke(initial_state)
    return result
