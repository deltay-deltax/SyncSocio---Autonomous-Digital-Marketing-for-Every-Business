"""
saas_festival_agent.py
──────────────────────
Transforms festival/seasonal calendar posts into SaaS-appropriate
thought-leadership or brand-milestone content.

Instead of: "Diwali Sale — 40% OFF! 🪔"
Generates:  "Diwali: A season of new beginnings. Here's how [Brand] is lighting
             up our clients' growth this quarter. 🚀"

Instead of: "Happy New Year! 🎉" with a generic greeting
Generates:  "2025 wrapped: 10,000+ hours saved for our clients. Here's what's
             coming in 2026. 🎯"
"""

import os
import random
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fal_visual_engine import generate_fal_image_gpt2
from saas_agents.saas_profiles import get_saas_profile

# ── Aspect ratio → FAL image_size mapping ────────────────────────────────────
ASPECT_TO_FAL_SIZE: Dict[str, str] = {
    "1:1":  "square_hd",
    "4:5":  "portrait_4_3",
    "9:16": "portrait_16_9",
    "16:9": "landscape_16_9",
    "2:3":  "portrait_4_3",
}

# ── SaaS Festival transformation map ─────────────────────────────────────────
# Each festival gets a SaaS-appropriate reframe angle
FESTIVAL_SAAS_REFRAMES = {
    "diwali": [
        "Season of new beginnings — here's how we're lighting up growth for our clients",
        "Diwali: a celebration of light in dark times. Our clients' results this season speak for themselves",
        "The festival of light is also the season of bold decisions. Here's one that paid off",
    ],
    "christmas": [
        "The gift of efficiency: what we helped our clients achieve this year",
        "Year-end reflection: the moments that defined our clients' growth journey",
        "This Christmas, we're grateful for every team that trusted us with their growth",
    ],
    "new_year": [
        "2025 wrapped. Here's what the numbers actually looked like",
        "New year, new goals. Here's the framework we use to set them",
        "The most important thing you can do in January: this",
    ],
    "holi": [
        "Every colour has a role. So does every part of your strategy",
        "Holi: a reminder that the boldest combinations create the most impact",
        "Colour your Q2 with intention. Here's our planning framework",
    ],
    "independence_day": [
        "Independence from manual processes. The story of how our clients got there",
        "75 years of independence — and the next wave of Indian businesses is here",
        "Freedom means choosing how you grow. Here's how we help",
    ],
    "default": [
        "Every milestone is an opportunity to reflect and re-set",
        "Here's what this season taught us about growing smarter",
        "Celebrating with purpose: what this moment means for our community",
    ],
}


def _get_festival_reframe(festival_name: str) -> str:
    """Pick a SaaS-appropriate angle for the festival."""
    festival_lower = festival_name.lower().replace(" ", "_").replace("-", "_")
    angles = FESTIVAL_SAAS_REFRAMES.get(festival_lower, FESTIVAL_SAAS_REFRAMES["default"])
    return random.choice(angles)


def _build_saas_festival_image_prompt(
    brand_doc: Dict[str, Any],
    festival_name: str,
    idea: Optional[str],
    aspect: str,
    index: int,
    total: int,
    language: str,
) -> tuple:
    brand_name = brand_doc.get("brandName", "Brand")
    category   = brand_doc.get("businessCategory", "Services")
    primary_color  = brand_doc.get("primaryColor", "#2563EB")
    secondary_color = brand_doc.get("secondaryColor", "#60A5FA")
    brand_tone = brand_doc.get("brandTone", "Professional")
    logo = brand_doc.get("logo", "")

    reframe = _get_festival_reframe(festival_name)
    idea_line = f"Campaign idea: {idea}" if idea and idea.strip() else ""
    logo_inst = " Incorporate the brand logo cleanly on the creative. Do not assume or add any fake logos or text."

    image_prompt = f"""
BRAND: {brand_name} — {category} company.
Tone: {brand_tone}.
Colors: {primary_color} / {secondary_color}.

FESTIVAL / SEASONAL EVENT: {festival_name}
{idea_line}

Create a premium, highly aesthetic festival celebration post for this service business.
{logo_inst}
Aspect ratio: {aspect}. Commercial photography quality.
Make the visual thematic to the festival but modern and professional.
Any text on the image must be in {language}.
""".strip()
    return image_prompt, reframe


def _generate_festival_caption(
    brand_doc: Dict[str, Any],
    festival_name: str,
    reframe: str,
    idea: Optional[str],
    profile: Optional[dict],
    language: str,
) -> str:
    """Generates a thought-leadership festival caption using Gemini."""
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.75,
        )
        brand_name = brand_doc.get("brandName", "Brand")
        cta = profile["cta_style"] if profile else "Book a Call | Learn More"
        sys_msg = (
            f"You are a B2B brand strategist writing Instagram captions in {language}. "
            f"Write a professional {festival_name} post for a SaaS/Consulting brand. "
            "The post must:\n"
            "1. Open with the festival greeting but immediately pivot to a brand/business insight.\n"
            "2. Share a genuine reflection, milestone, or framework (NOT a discount).\n"
            "3. End with a soft CTA: " + cta + "\n"
            "4. Include 4-6 professional B2B hashtags.\n"
            "NO sale language. NO urgency. NO discount copy. "
            "Output ONLY the caption. No markdown, no quotes."
        )
        user_msg = (
            f"Brand: {brand_name}\n"
            f"Festival: {festival_name}\n"
            f"Post angle: {reframe}\n"
            f"\n\n"
            "Write the caption now."
        )

        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        content = response.content
        if isinstance(content, list):
            content = "".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in content
            )
        return content.strip()

    except Exception as e:
        print(f"[SaaSFestivalAgent] ❌ Caption failed: {e}")
        return (
            f"Wishing you a meaningful {festival_name} from the entire {brand_doc.get('brandName', '')} team. "
            "Here's to continued growth and impact. 🎯 #b2b #growth #celebration"
        )


def generate_saas_festival_images(
    brand_doc: Dict[str, Any],
    count: int,
    aspect_ratio: str,
    idea: Optional[str],
    ref_images: List[str],
    language: str = "english",
) -> List[Dict[str, Any]]:
    """
    Main entry point for festival image generation in SaaS mode.

    Festival posts are transformed into:
    - Brand milestone/reflection posts
    - Thought-leadership seasonal content
    - Community appreciation posts
    
    NOT: discount sales, product giveaways, consumer promotions
    """
    fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
    profile = get_saas_profile(brand_doc.get("businessCategory", ""))

    # Extract festival name from idea (the idea field carries the festival name
    # in the festival tab workflow)
    festival_name = idea or "the season"

    print(f"\n[SaaSFestivalAgent] 🎉 Generating {count} festival posts | festival='{festival_name}'")

    tasks = []
    for i in range(count):
        image_prompt, reframe = _build_saas_festival_image_prompt(
            brand_doc=brand_doc,
            festival_name=festival_name,
            idea=idea,
            aspect=aspect_ratio,
            index=i,
            total=count,
            language=language,
        )
        tasks.append((image_prompt, reframe, i))

    def run_festival_task(task):
        image_prompt, reframe, index = task
        ref = ref_images[index % len(ref_images)] if ref_images else None
        if ref and not ref.startswith("http") and not ref.startswith("data:"):
            ref = "data:image/jpeg;base64," + ref

        print(f"\n[SaaSFestivalAgent] 🖼  Festival post {index+1}/{count}")
        print(f"[SaaSFestivalAgent] 📐 Angle: {reframe}")

        # Generate caption
        caption = _generate_festival_caption(
            brand_doc=brand_doc,
            festival_name=festival_name,
            reframe=reframe,
            idea=idea,
            profile=profile,
            language=language,
        )

        try:
            result = generate_fal_image_gpt2(
                prompt=image_prompt,
                image=None,
                image_size=fal_size,
            )
            return {
                "image": result["image"],
                "caption": caption,
                "type": "image",
                "template": f"Festival: {festival_name}",
                "index": index,
            }
        except Exception as e:
            print(f"[SaaSFestivalAgent] ❌ Post {index+1} failed: {e}")
            return {
                "image": None,
                "caption": caption,
                "type": "image",
                "error": str(e),
                "index": index,
            }

    print(f"[SaaSFestivalAgent] 🚀 Running {count} festival posts in parallel...")
    with ThreadPoolExecutor(max_workers=count) as executor:
        thread_results = list(executor.map(run_festival_task, tasks))

    thread_results.sort(key=lambda x: x["index"])
    results = []
    for r in thread_results:
        del r["index"]
        results.append(r)

    print(f"[SaaSFestivalAgent] ✅ Done — {len(results)} festival post(s) generated")
    return results
