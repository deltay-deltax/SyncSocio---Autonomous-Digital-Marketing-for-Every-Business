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
        Each recommendation includes: id, caption, reasoning, budget, duration, reach, audience, engagement,
        and a detailed 'targeting' object with all Meta Ads fields.
        """
        if not posts:
            return []

        prompt = f"""
{self.brand_dna}

==================================================
🤖 AI AGENT: AD STRATEGIST & MEDIA BUYER
==================================================

TASK:
Analyze the following Instagram posts from the last 30 days.
Your job is to identify the TOP 2–3 posts that should be boosted as paid ads to maximize ROI.

IMPORTANT RULES:
- You MUST recommend at least 1 post (pick the best performer even if engagement seems low — new/small accounts still benefit from boosting).
- Recommend a maximum of 3 posts.
- Rank them from best to worst boost candidate.
- If all posts have zero reach (common for new accounts or test accounts), base your recommendation on caption quality, content type, and brand fit.
- Never return an empty list if posts are provided.

EVALUATION CRITERIA (in order of priority):
1. Engagement Rate: Higher is better. Even 1%+ is worth boosting for growing accounts.
2. Content Quality: Hook-driven captions, high-value reels, strong CTAs.
3. Brand Fit & Scalability: Topics that appeal to a broader audience beyond current followers.
4. Post Type: Reels > Carousels > Images (for reach potential).

INPUT POSTS:
{json.dumps(posts, indent=2)}

OUTPUT FORMAT (JSON ONLY — no markdown, no explanation outside the array):
Return a JSON array of 1-3 recommendations. Each item must have ALL of these fields:

TOP-LEVEL FIELDS:
- id: The original post ID
- caption: Original caption (truncated to 120 chars if long)
- emoji: A representative emoji (use: reel=video camera, image=camera, product=shopping bag, infographic=chart, educational=graduation cap)
- engagement: Current engagement rate as a string (e.g. "8.2%")
- reasoning: 2-3 sentences explaining why this post should be boosted and what result to expect
- budget: Suggested total budget in INR (e.g. "Rs.500" for small, "Rs.2000" for larger accounts)
- duration: Suggested campaign duration (e.g. "3 days" or "7 days")
- reach: Estimated reach range (e.g. "5,000-10,000")
- audience: ONE-LINE summary e.g. "Skincare Lovers - 20-40 - India" (used as card subtitle)

TARGETING OBJECT (nested under key "targeting") — this is the full Meta Ads setup:
- objective: ONE of: Reach, Traffic, Engagement, Video Views, Lead Generation, Conversions
- ageMin: minimum age number (e.g. 18)
- ageMax: maximum age number (e.g. 45)
- gender: "All", "Men", or "Women"
- locations: array of strings — specific cities or countries (e.g. ["Mumbai", "Delhi", "Bangalore"] or ["India"])
- interests: array of 4-7 specific Meta interest category names (e.g. ["Skin care", "Beauty", "Cosmetics", "Online shopping"])
- behaviors: array of 2-4 Meta behavior targeting options (e.g. ["Engaged shoppers", "Small business owners"])
- placements: array from: Instagram Feed, Instagram Reels, Instagram Stories, Instagram Explore, Facebook Feed, Audience Network
- language: array of languages (e.g. ["Hindi", "English"] or ["English"])
- customAudience: string — describe a Lookalike or Custom Audience if applicable, or "None"
- callToAction: ONE of: Learn More, Shop Now, Sign Up, Contact Us, Watch More, Send Message, Download
- adFormat: ONE of: Single Video, Single Image, Carousel, Stories, Reels Ad
- campaignNote: 1 sentence tip for the ad creative or copy

EXAMPLE:
[
  {{
    "id": "123",
    "caption": "The secret to glowing skin in 3 steps...",
    "emoji": "🎬",
    "engagement": "10.5%",
    "reasoning": "This reel outperforms the account average by 3x. High save count signals evergreen content. Boosting will amplify reach to cold audiences who match your buyer profile.",
    "budget": "Rs.1500",
    "duration": "5 days",
    "reach": "15,000-25,000",
    "audience": "Skincare Lovers - 20-40 - India",
    "targeting": {{
      "objective": "Reach",
      "ageMin": 20,
      "ageMax": 40,
      "gender": "Women",
      "locations": ["Mumbai", "Delhi", "Bangalore", "Hyderabad"],
      "interests": ["Skin care", "Beauty", "Cosmetics", "Natural skin care", "Dermatology"],
      "behaviors": ["Engaged shoppers", "Instagram users who engaged with beauty content"],
      "placements": ["Instagram Reels", "Instagram Feed", "Instagram Stories"],
      "language": ["Hindi", "English"],
      "customAudience": "Lookalike 1% of existing followers",
      "callToAction": "Learn More",
      "adFormat": "Single Video",
      "campaignNote": "Open with a before/after hook in the first 2 seconds and add bold text captions for silent-mode viewers."
    }}
  }}
]
"""
        print("\n" + "="*50)
        print("🤖 AI AGENT: AD STRATEGIST (PROMPT)")
        print("="*50)
        print(prompt)
        
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
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
