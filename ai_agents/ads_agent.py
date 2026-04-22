import json
import os
from typing import List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from common import get_brand_dna, get_universal_system_prompt

class AdsAgent:
    def __init__(self, brand_profile: Dict):
        self.brand_dna = get_brand_dna(brand_profile)

    def analyze_posts_for_ads(self, posts: List[Dict]) -> List[Dict]:
        """
        Analyzes a list of posts and returns a list of recommendations for ads.
        Each recommendation includes: id, caption, reasoning, budget, duration, reach, audience, engagement.
        """
        if not posts:
            return []

        prompt = f"""
{self.brand_dna}

==================================================
🤖 AI AGENT: AD STRATEGIST & MEDIA BUYER
==================================================

TASK:
Analyze the following Instagram posts from the last 15 days. Identify posts that have high "Viral Potential" and should be boosted as ads to maximize ROI.

EVALUATION CRITERIA:
1. Engagement Rate: Posts with engagement higher than average.
2. Content Quality: Hook-driven captions or high-value reels.
3. Scalability: Topics that appeal to a broader audience beyond current followers.

INPUT POSTS:
{json.dumps(posts, indent=2)}

OUTPUT FORMAT (JSON ONLY):
Return a list of recommendations. Only include posts that are a "YES" for boosting.
Each item must have:
- id: The original post ID
- caption: Original caption (truncated if long)
- emoji: A representative emoji for the content (e.g. 🎬 for reels, 📸 for images)
- engagement: Current engagement rate (e.g. "8.2%")
- reasoning: Why this post? (e.g. "Outperforming average by 3x")
- budget: Suggested budget in INR (e.g. "₹500")
- duration: Suggested duration (e.g. "4 days")
- reach: Estimated reach range (e.g. "8,000-12,000")
- audience: Target audience brief (e.g. "Fashion Enthusiasts · 18-35 · Mumbai")

EXAMPLE:
[
  {{
    "id": "123",
    "caption": "The secret to...",
    "emoji": "🎬",
    "engagement": "10.5%",
    "reasoning": "This post has a 90% save-rate, indicating high value. Boosting will drive mass profile visits.",
    "budget": "₹1000",
    "duration": "5 days",
    "reach": "15,000-25,000",
    "audience": "Skincare Lovers · India · 20-40"
  }}
]
"""
        print("\n" + "="*50)
        print("🤖 AI AGENT: AD STRATEGIST (PROMPT)")
        print("="*50)
        print(prompt)
        
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
            res = llm.invoke([
                SystemMessage(content=get_universal_system_prompt("Ad Strategist & Media Buyer")),
                HumanMessage(content=prompt)
            ])
            response = res.content
            if isinstance(response, list):
                response = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in response])
            
            print("\n" + "="*50)
            print("🤖 AI AGENT: AD STRATEGIST (RESPONSE)")
            print("="*50)
            print(response)

            # Clean response from markdown if present
            clean_res = response.replace('```json', '').replace('```', '').strip()
            return json.loads(clean_res)
        except Exception as e:
            print(f"Error parsing Ads Agent response: {e}")
            return []

def get_ads_recommendations(brand_profile: Dict, posts: List[Dict]):
    agent = AdsAgent(brand_profile)
    return agent.analyze_posts_for_ads(posts)
