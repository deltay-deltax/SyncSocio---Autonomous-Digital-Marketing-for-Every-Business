import json
from typing import Dict, Any

def get_brand_dna(payload: Dict[str, Any]) -> str:
    """
    Constructs a rich 'Brand DNA' string from the full profile and metrics.
    No hardcoded strategy here—just grounding the agent in reality.
    """
    brand = payload.get("brand_info", payload) # Support both flat and nested
    posts = payload.get("historical_posts", [])
    
    # 1. Core Identity
    dna = f"BRAND IDENTITY:\n"
    dna += f"- Name: {brand.get('brandName', 'Unknown')}\n"
    dna += f"- Category: {brand.get('businessCategory', 'General Business')}\n"
    dna += f"- Tone: {brand.get('brandTone', 'Professional')}\n"
    dna += f"- Visual Vibe: {brand.get('visualVibe', 'Clean and Modern')}\n"
    dna += f"- Primary Brand Color: {brand.get('primaryColor', '#2563EB')}\n"
    dna += f"- Secondary Brand Color: {brand.get('secondaryColor', '#60A5FA')}\n"
    dna += f"- USP: {brand.get('usp', 'Not specified')}\n"
    
    # Handle Target Audience (Plural/Singular/Array)
    target = brand.get('targetAudiences', brand.get('targetAudience', 'General Instagram Users'))
    if isinstance(target, list):
        target = ", ".join(target)
    dna += f"- Target Audience: {target}\n"
    
    dna += f"- Pain Point to Address: {brand.get('painPoint', 'Not specified')}\n"
    dna += f"- Main Goal: {brand.get('mainGoal', 'Growth and Engagement')}\n"
    
    # 2. Performance Metrics (Ground Reality)
    dna += f"\nINSTAGRAM PERFORMANCE METRICS (PAST 30 DAYS):\n"
    if posts:
        total_reach = sum(float(p.get("reach", 0)) for p in posts)
        avg_reach = total_reach / len(posts)
        
        # Format breakdown
        formats = {}
        for p in posts:
            fmt = p.get('type', 'Static')
            if fmt not in formats: formats[fmt] = []
            formats[fmt].append(float(p.get('reach', 0)))
        
        dna += f"- Total Posts Analyzed: {len(posts)}\n"
        dna += f"- Average Reach per Post: {avg_reach:.1f}\n"
        for fmt, reaches in formats.items():
            avg_fmt = sum(reaches) / len(reaches)
            dna += f"- {fmt} Performance: Average Reach {avg_fmt:.1f} ({len(reaches)} posts)\n"
    else:
        dna += "- No historical metrics available. Use industry standard discovery-first approach.\n"
    
    # 3. Audience Engagement (Hourly)
    hourly = payload.get("hourly_data", [])
    dna += f"\nFOLLOWER ACTIVITY:\n"
    if hourly:
        top_hours = sorted(hourly, key=lambda x: x.get("value", 0), reverse=True)[:3]
        dna += f"- Peak Activity Hours: {', '.join([str(h.get('hour')) + ':00' for h in top_hours])}\n"
    else:
        dna += "- No hourly activity data. Use global peak times (6PM-9PM).\n"
        
    # 4. Recent History (Avoid Repetition)
    recent = payload.get("recent_topics", [])
    dna += f"\nRECENT TOPICS PLANNED (AVOID REPEATING THESE):\n"
    if recent:
        dna += "\n".join([f"- {t}" for t in recent])
    else:
        dna += "- No recent history found.\n"
        
    return dna

def get_universal_system_prompt(agent_role: str) -> str:
    """
    Sets the persona without hardcoding the specific strategy rules.
    """
    return f"""
You are the {agent_role} for SyncSocio, a high-end Autonomous Growth Engine for Instagram.
Your decisions must be rooted strictly in the provided BRAND DNA and PERFORMANCE METRICS.

Rules:
1. Do not use generic advice.
2. Every recommendation must be data-backed.
3. If reach for a specific format is low, pivot away from it.
4. Output must be extremely professional and growth-oriented.
5. If the user provided specific Brand DNA, that is your ONLY reality.
"""
