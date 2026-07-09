"""
saas_campaign_copy.py
──────────────────────
WhatsApp and Email campaign copy generation for SaaS/Services/Consulting brands.

Overrides the D2C copy style with:
- B2B professional tone
- ROI-driven, metric-focused body copy
- No discount/sale language
- Professional HTML email templates (dark accent, clean typography)
"""

import os
import json
from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from saas_agents.saas_profiles import get_saas_profile


def generate_saas_campaign_copy(
    brand_doc: Dict[str, Any],
    layout: str,
    idea: Optional[str],
    language: str = "english",
) -> Dict[str, str]:
    """
    Generates B2B-appropriate WhatsApp or Email campaign copy.

    Returns:
        dict with 'body' and (for email) 'subject'
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.7,
    )

    brand_name = brand_doc.get("brandName", "Brand")
    website    = brand_doc.get("website", "")
    usp        = brand_doc.get("usp", "")
    primary    = brand_doc.get("primaryColor", "#2563EB")
    secondary  = brand_doc.get("secondaryColor", "#60A5FA")
    profile    = get_saas_profile((brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")))
    cta        = profile["cta_style"] if profile else "Book a Call | Learn More"

    idea_focus_instruction = ""
    if idea and idea.strip():
        idea_focus_instruction = f"""
[CRITICAL - HIGH PRIORITY CAMPAIGN FOCUS]
The user has specified a custom campaign idea: "{idea}".
You MUST write the campaign (subject line, headline, email body topic/body copy, and CTA context) directly and specifically around this idea.
DO NOT write a generic brand overview. Focus the message context exclusively on executing this idea: "{idea}".
"""

    if layout == "whatsapp":
        sys_msg = (
            f"You are a B2B WhatsApp copywriter writing in {language}. "
            "Write a professional WhatsApp broadcast message for a SaaS/Consulting brand. "
            "The message must:\n"
            "1. Open with a sharp insight or stat (not a greeting).\n"
            "2. Deliver the value proposition in 2-3 short lines.\n"
            "3. Include a CTA: " + cta + "\n"
            + (f"4. Include the website link: {website}\n" if website else "") +
            "Tone: Professional, direct, conversational. Use minimal emojis (1-2 max). "
            "NO sale/discount language. NO urgency/FOMO. "
            "CRITICAL: You MUST base the campaign copy and message directly on the user's custom 'Campaign idea' if it is provided. Prioritize this specific idea over generic pitches.\n"
            "Output ONLY a valid JSON object with key 'body'. "
            "Strict Rule: Plain text only. No HTML."
        )
        user_msg = (
            f"Brand: {brand_name}\nUSP: {usp}\n"
            f"{idea_focus_instruction}\n\n"
            "Write the WhatsApp message now."
        )

    else:  # email
        sys_msg = (
            f"You are a B2B email marketer writing in {language}. "
            "Write a professional email campaign for a SaaS/Consulting brand. "
            "Output ONLY a valid JSON object with keys 'subject' and 'body'. "
            "The 'body' must be a premium HTML email using inline CSS. "
            "Structure: styled header with brand color, short value-prop paragraph, "
            "2-3 benefit bullet points, a prominent CTA button, professional footer. "
            "CTA options: " + cta + ". "
            + (f"CTA link href: {website}. " if website else "") +
            f"Brand primary color: {primary}. Secondary: {secondary}. "
            "Do NOT include <html>, <head>, or <body> tags — only the inner <div>. "
            "NO discount percentages. NO sale language. NO urgency countdown. "
            "Footer: Include only USP values and an unsubscribe note. "
            "CRITICAL: You MUST base the campaign copy, email body topic, and subject line directly on the user's custom 'Campaign idea' if it is provided. Prioritize this specific idea over generic pitches.\n"
            "Strict Rule: Do NOT invent pricing, shipping policies, or promotions."
        )
        user_msg = (
            f"Brand: {brand_name}\nUSP: {usp}\n"
            f"{idea_focus_instruction}\n\n"
            "Write the email campaign now."
        )

    print(f"\n{'='*80}")
    print(f"[SaaSCampaignCopy] ✍️ Generating {layout} copy for {brand_name}...")
    print(f"{'='*80}\n")

    try:
        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        content = response.content
        if isinstance(content, list):
            content = "".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in content
            )
        text = content.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

    except Exception as e:
        print(f"[SaaSCampaignCopy] ❌ LLM failed: {e}")
        return {
            "subject": f"New from {brand_name}",
            "body": (
                f"Hi there,\n\n"
                f"We help businesses like yours achieve more with less.\n\n"
                f"USP: {usp}\n\n"
                f"{idea or ''}\n\n"
                f"Ready to explore? {cta}\n\n"
                f"Best,\nTeam {brand_name}"
            ),
        }
