"""
brand_verifier_agent.py
────────────────────────
A lightweight LangGraph agent that:
1. Receives the brand profile dict
2. Checks if the business category qualifies as SaaS/Services/Consulting
3. If yes → uses Gemini Flash to synthesize a "SaaS Brand Intelligence Report"
   that summarises the brand's value propositions, target personas, and
   recommended content mix in SaaS terms
4. Returns an enriched brand context dict that is injected into prompt builders

Usage:
    from saas_agents.brand_verifier_agent import verify_and_enrich_brand
    enriched = verify_and_enrich_brand(brand_doc)
    # enriched["saas_profile"]        → the profile dict (or None)
    # enriched["saas_directive"]      → the directive string (or "")
    # enriched["saas_intelligence"]   → LLM-generated brand intelligence (or "")
    # enriched["is_saas"]             → bool
"""

import os
import json
import re
from typing import Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

from saas_agents.saas_profiles import (
    get_saas_profile,
    is_saas_brand,
    build_saas_directive,
)


def verify_and_enrich_brand(brand_doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point.

    Args:
        brand_doc: Full brand profile dict from MongoDB

    Returns:
        Dict with keys:
            is_saas (bool)
            saas_profile (dict | None)
            saas_directive (str)
            saas_intelligence (str)  — LLM-generated context
    """
    category = brand_doc.get("businessCategory", "")
    brand_name = brand_doc.get("brandName", "Brand")

    # ── Step 1: Resolve profile ───────────────────────────────────────────
    profile = get_saas_profile(category)

    if not profile:
        # Not a SaaS/Services/Consulting brand — pass through unchanged
        return {
            "is_saas": False,
            "saas_profile": None,
            "saas_directive": "",
            "saas_intelligence": "",
        }

    # ── Step 2: Build the base directive ─────────────────────────────────
    directive = build_saas_directive(profile, brand_name)

    # ── Step 3: Run LLM to generate brand intelligence ────────────────────
    intelligence = _generate_brand_intelligence(brand_doc, profile)

    print(f"[BrandVerifier] ✅ SaaS mode active for '{brand_name}' [{category}]")
    print(f"[BrandVerifier] 📋 Profile pillars: {', '.join(profile['content_pillars'])}")

    return {
        "is_saas": True,
        "saas_profile": profile,
        "saas_directive": directive,
        "saas_intelligence": intelligence,
    }


def _generate_brand_intelligence(brand_doc: Dict[str, Any], profile: dict) -> str:
    """
    Uses Gemini Flash to produce a concise brand intelligence brief in SaaS terms.
    This gets injected into image/video/carousel prompts to add brand-specific richness.
    """
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.3,
        )

        system_msg = (
            "You are a B2B brand strategist. "
            "Analyze the given brand profile and output a concise 150-word intelligence brief "
            "written specifically for a SaaS/Services/Consulting company. "
            "The brief must describe: "
            "1. The core value proposition in one sentence. "
            "2. The primary target persona (job title, pain, goal). "
            "3. Three specific content angles that will resonate on LinkedIn/Instagram. "
            "4. One visual concept that avoids all product packaging or D2C lifestyle photography. "
            "Output ONLY the brief. No JSON, no headings, no labels."
        )

        usp = brand_doc.get("usp", "")
        pain = brand_doc.get("painPoint", "")
        tone = brand_doc.get("brandTone", "")
        audiences = ", ".join(brand_doc.get("targetAudiences", []))
        category = brand_doc.get("businessCategory", "")
        brand_name = brand_doc.get("brandName", "Brand")

        user_msg = (
            f"Brand: {brand_name}\n"
            f"Category: {category}\n"
            f"USP: {usp}\n"
            f"Pain point solved: {pain}\n"
            f"Brand tone: {tone}\n"
            f"Target audiences: {audiences}\n"
            f"Content pillars available: {', '.join(profile['content_pillars'])}\n\n"
            "Write the brand intelligence brief now."
        )

        response = llm.invoke([
            SystemMessage(content=system_msg),
            HumanMessage(content=user_msg),
        ])

        content = response.content
        if isinstance(content, list):
            content = "".join(
                p.get("text", "") if isinstance(p, dict) else str(p)
                for p in content
            )
        return content.strip()[:800]

    except Exception as e:
        print(f"[BrandVerifier] ⚠️ Intelligence generation failed: {e}")
        # Return a clean fallback brief based on the profile data alone
        return (
            f"{brand_doc.get('brandName', 'Brand')} is a {brand_doc.get('businessCategory', 'professional services')} "
            f"company helping clients achieve {brand_doc.get('mainGoal', 'growth')}. "
            f"USP: {brand_doc.get('usp', 'Exceptional service and results')}. "
            f"Tone: {brand_doc.get('brandTone', 'Professional and authoritative')}."
        )
