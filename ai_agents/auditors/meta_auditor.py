import os
import json
import re
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from .models import AuditorInput, AuditorResponse, PostMetric

class MetaAuditor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-flash-lite-latest", 
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )

    def calculate_format_efficiency(self, posts: List[PostMetric]) -> Dict[str, float]:
        """Calculates avg reach per format to determine efficiency."""
        stats = {"Reel": {"reach": 0, "count": 0}, "Static": {"reach": 0, "count": 0}, "Carousel": {"reach": 0, "count": 0}}
        
        for p in posts:
            if p.type in stats:
                stats[p.type]["reach"] += p.reach
                stats[p.type]["count"] += 1
        
        efficiency = {}
        for fmt, data in stats.items():
            efficiency[fmt] = data["reach"] / data["count"] if data["count"] > 0 else 0
            
        return efficiency

    async def audit_and_align(self, data: AuditorInput) -> AuditorResponse:
        efficiency = self.calculate_format_efficiency(data.historical_posts)
        
        # Sort efficiency to find the winner
        top_type = max(efficiency, key=efficiency.get) if any(efficiency.values()) else "Reel"
        
        prompt = f"""
        You are the 'SyncSocio Pulse' Auditor. Your goal is to analyze Instagram performance and suggest the optimal Content Mix.
        
        BRAND: {data.brandName} ({data.businessCategory})
        
        HISTORICAL PERFORMANCE (Avg Reach):
        - Reels: {efficiency.get('Reel', 0):.0f}
        - Static: {efficiency.get('Static', 0):.0f}
        - Carousel: {efficiency.get('Carousel', 0):.0f}
        
        CURRENT USER MIX:
        {json.dumps(data.current_mix, indent=2)}
        
        TASK (ACTOR-CRITIC LOOP):
        1. GLOBAL MANDATE: Focus on high-quality organic ads and consistent content posting. Do NOT mention or recommend Reels or Video content, as our platform currently does not support them.
        2. GROWTH BIAS: If local data is sparse (e.g. < 5 posts analyzed), suggest a balanced mix of Static and Carousel posts to build a steady organic presence. Stay humble about what our platform can provide.
        3. ACTOR: Propose a new % mix (Static, Carousel) that totals 100%. Keep reels at 0.
        4. CRITIC: If the user's top-performing format (highest reach) is under-represented, gently suggest a pivot towards it.
        5. NEURAL LEARNING: Identify 3 distinct "Learnings" about this brand's audience based on static and carousel organic content. Be specific (e.g. "Carousel posts before 12pm perform 30% better"). Do NOT mention Reels.
        
        OUTPUT FORMAT: RETURN ONLY VALID JSON.
        {{
          "predicted_mix": {{ "reels": 0, "static": 40, "carousel": 60 }},
          "recommendation": "...",
          "efficiency_score": 0.85,
          "top_performer_type": "{top_type}",
          "g_score": 9.2,
          "learnings": [
            {{ "category": "visual", "insight": "...", "confidence": 0.95 }},
            {{ "category": "timing", "insight": "...", "confidence": 0.88 }},
            {{ "category": "engagement", "insight": "...", "confidence": 0.92 }}
          ]
        }}
        CATEGORIES: visual, timing, audience, strategy, engagement.
        """

        try:
            response = self.llm.invoke([
                SystemMessage(content="You are a data-driven Instagram Strategist. Output only JSON."),
                HumanMessage(content=prompt)
            ])
            
            # Extract JSON from response
            content = response.content
            print(f"DEBUG: Raw Agent Response Content Type: {type(content)}")
            print(f"DEBUG: Raw Agent Response Content: {content}")

            if isinstance(content, list):
                # Handle cases where content is a list of parts/dicts
                processed_content = ""
                for part in content:
                    if isinstance(part, dict):
                        processed_content += part.get('text', '')
                    else:
                        processed_content += str(part)
                content = processed_content
            elif not isinstance(content, str):
                content = str(content)

            print(f"DEBUG: Processed Content for Regex: {content}")
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            
            if json_match:
                json_str = json_match.group()
                print(f"DEBUG: Found JSON Match: {json_str}")
                res_dict = json.loads(json_str)
            else:
                print("DEBUG: No JSON match found with regex, attempting direct parse.")
                res_dict = json.loads(content)
            
            return AuditorResponse(**res_dict)
            
        except Exception as e:
            print(f"Auditor Error: {str(e)}")
            # Fallback response
            return AuditorResponse(
                predicted_mix={"reels": 60, "static": 20, "carousel": 20},
                recommendation="Audit failed, using high-performance defaults.",
                efficiency_score=0.5,
                top_performer_type="Reel",
                g_score=7.0,
                learnings=[]
            )
