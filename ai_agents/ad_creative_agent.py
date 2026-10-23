import os
import json
import requests
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from fal_visual_engine import generate_fal_image_gpt2
from common import get_brand_dna
from google import genai
from google.genai import types



# Phrases that indicate GPT-4o refused to describe the product image
_REFUSAL_PHRASES = [
    "i'm sorry, i can't",
    "i'm sorry, i cannot",
    "i can't assist",
    "i cannot assist",
    "i can't help",
    "i cannot help",
    "i'm unable to",
    "i am unable to",
    "i apologize",
    "not able to",
    "unable to provide",
    "can't provide",
    "cannot provide",
    "sorry, but i",
    "sorry, i'm not",
    "i don't feel comfortable",
    "i'm not able to",
]


def _is_refusal(text: str) -> bool:
    """Returns True if the text looks like a GPT-4o content-policy refusal."""
    lower = text.lower().strip()
    return any(phrase in lower for phrase in _REFUSAL_PHRASES)


def _generate_director_concepts(
    brand_doc: Dict,
    products: List[Dict],
    count: int,
    goal: str,
    angle: str,
    idea: str,
    aspect_ratio: str = "1:1",
    language: str = "English",
    brand_design_guide: str = "",
    post_format: str = "ad"
) -> List[Dict]:
    goal = {
        "convert": "purchases",
        "conversion": "purchases",
        "purchase": "purchases",
    }.get((goal or "discover").lower(), (goal or "discover").lower())
    brand_dna = get_brand_dna(brand_doc)
    brand_name = brand_doc.get("brandName", "the brand")
    visual_vibe = brand_doc.get("visualVibe", "Clean and modern")
    category = brand_doc.get("businessCategory", "consumer product")
    is_ecomm = any(k in category.lower() for k in ["ecommerce", "shop", "store", "product"])
    target_audience = (
        brand_doc.get("targetAudience")
        or brand_doc.get("targetAudiences")
        or "Infer the most relevant audience from the verified product information"
    )

    background_rule = ""
    if not is_ecomm:
        background_rule = f"\n\nCRITICAL RULE ON BACKGROUNDS: Since you are generating {count} creatives, exactly half of them (at least {count // 2}) MUST use a solid brand contrast color or a solid product-matching color as the background. Do not use complex scenes or natural environments for these; explicitly instruct the visual engine to use a highly aesthetic solid background.\n\n"

    # Build the verified product-intelligence block for the Art Director LLM.
    # The packaging description must be available before the brief is written,
    # otherwise the Director has to guess the product's palette and form.
    product_details = ""
    if products:
        # Only facts that can materially change the ad are carried into the
        # Director prompt. Full ingredients and long page copy add tokens but
        # rarely improve a static performance creative.
        optional_fact_fields = (
            ("Verified Benefits", ("verifiedBenefits", "keyBenefits", "benefits")),
            ("Proof Points", ("proofPoints",)),
            ("Offer", ("offerDetails",)),
            ("Guarantee", ("guarantee",)),
            ("Purchase Options", ("variantDetails",)),
            ("Specifications", ("specifications",)),
        )

        def _display_fact(value: Any) -> str:
            if isinstance(value, list):
                if value and isinstance(value[0], dict):
                    return ", ".join(f"{item.get('key', '')}: {item.get('value', '')}" for item in value[:4])
                return ", ".join(str(item)[:120] for item in value[:4] if item not in (None, ""))
            if isinstance(value, dict):
                return json.dumps(value, ensure_ascii=False)[:400]
            return str(value)[:240] if value not in (None, "") else ""

        # Force a single product context for the entire batch
        active_products = [products[0]] if products else []
        for index, p in enumerate(active_products, start=1):
            product_details += (
                f"PRODUCT 1\n"
                f"- Name: {p.get('name') or 'Unnamed product'}\n"
                f"- Description: {p.get('description', '')}\n"
                f"- Key Benefit: {p.get('keyBenefit', '')}\n"
                f"- Price: {p.get('price', '')}  Offer Price: {p.get('offerPrice', '')}\n"
            )
            for label, keys in optional_fact_fields:
                value = next((p.get(key) for key in keys if p.get(key) not in (None, "", [])), None)
                display = _display_fact(value)
                if display:
                    product_details += f"- {label}: {display}\n"

            appearance = (p.get("adVisualDescription") or p.get("visual_description") or "").strip()
            if appearance and not _is_refusal(appearance):
                product_details += f"- VERIFIED PRODUCT APPEARANCE: {appearance}\n"
            else:
                product_details += "- VERIFIED PRODUCT APPEARANCE: Not available; do not invent packaging details.\n"
            product_details += "\n"
    else:
        product_details = (
            f"- Custom Product/Focus: {idea if idea else 'A premium product from the brand'}\n"
            "- VERIFIED PRODUCT APPEARANCE: Not available; do not invent packaging details.\n\n"
        )

    # MakeLocalAds-style campaign portfolios. Their strongest captured batches
    # give every slot a different commercial job and visual grammar instead of
    # randomly sampling a framework pool.
    campaign_portfolios = {
        "discover": [
            {
                "code": "Dynamic-Kinetic",
                "framework": "Dynamic Kinetic Energy",
                "job": "Sensory product explosion",
            },
            {
                "code": "Infographic",
                "framework": "Infographic & Diagrammatic",
                "job": "Visual ingredient breakdown",
            },
            {
                "code": "AIDA",
                "framework": "Attention-Interest-Desire-Action (AIDA)",
                "job": "Memorable product upgrade",
            },
            {
                "code": "Graphic-Poster",
                "framework": "Graphic Poster / Sunburst",
                "job": "Iconic brand statement",
            },
            {
                "code": "FAB",
                "framework": "Feature-Benefit (FAB)",
                "job": "Benefit made visually tangible",
            },
            {
                "code": "PAS",
                "framework": "Problem-Agitate-Solve (PAS)",
                "job": "Recognizable daily-friction hook",
            },
            {
                "code": "Data-Vis",
                "framework": "Data Visualization / Bar Chart",
                "job": "Proof-driven comparison",
            },
            {
                "code": "Storytelling",
                "framework": "Storytelling / Narrative",
                "job": "Aspirational usage ritual",
            },
            {
                "code": "Ingredient-Macro",
                "framework": "Ingredient Spotlight / Macro-Texture",
                "job": "Visceral purity and texture showcase",
            },
            {
                "code": "Lifestyle-Flatlay",
                "framework": "Lifestyle Integration / Aesthetic Flat-lay",
                "job": "Contextualizing product in daily routine",
            },
            {
                "code": "Clinical-Science",
                "framework": "The Science Inside / Clinical Minimalist",
                "job": "Authority and active compound breakdown",
            },
            {
                "code": "Unboxing-Haul",
                "framework": "Premium Unboxing / Haul Spill",
                "job": "High-perceived value and excitement",
            },
            {
                "code": "UGC-Candid",
                "framework": "UGC / Candid Creator-Style",
                "job": "Authentic, relatable social proof",
            },
            {
                "code": "UI-Abstract",
                "framework": "Abstract UI Dashboard / Glassmorphism",
                "job": "Sleek software visualization",
            },
            {
                "code": "Workspace-B2B",
                "framework": "Professional Workspace / Desk Setup",
                "job": "B2B productivity context",
            },
            {
                "code": "Device-Mockup",
                "framework": "Floating Device / App Mockup",
                "job": "Digital product tangibility",
            },
            {
                "code": "Editorial-Lookbook",
                "framework": "Editorial Lookbook / High-Fashion Pose",
                "job": "Aspirational lifestyle styling",
            },
            {
                "code": "Outfit-Grid",
                "framework": "Get the Look / Flat-lay Outfit Grid",
                "job": "Shoppable outfit curation",
            },
            {
                "code": "Fabric-Macro",
                "framework": "Macro Fabric / Stitching Detail",
                "job": "Premium quality and texture proof",
            },
        ],
        "compare": [
            {
                "code": "Comparison-Table",
                "framework": "Comparison Table / Feature Matrix",
                "job": "Feature-by-feature superiority checklist",
            },
            {
                "code": "CC",
                "framework": "Contrast and Choice (CC)",
                "job": "Superior-choice reframe",
            },
            {
                "code": "Data-Vis",
                "framework": "Data Visualization / Bar Chart",
                "job": "Visual benefit comparison",
            },
            {
                "code": "SBSC",
                "framework": "Side-by-Side Comparison (SBSC)",
                "job": "Scannable alternative comparison",
            },
            {
                "code": "Infographic",
                "framework": "Infographic Breakdown",
                "job": "Ingredient superiority",
            },
            {
                "code": "PAS",
                "framework": "Problem-Agitate-Solve (PAS)",
                "job": "Problem-solution demonstration",
            },
            {
                "code": "BAB",
                "framework": "Before-After-Bridge (BAB)",
                "job": "Switching and upgrade motivation",
            },
            {
                "code": "RTB",
                "framework": "Social Proof + RTB (Reason To Believe)",
                "job": "Proof-led confidence",
            },
            {
                "code": "Spec-Sheet",
                "framework": "Spec-Sheet Showdown",
                "job": "Detailed value justification",
            },
            {
                "code": "Us-vs-Them",
                "framework": "Us vs Them / Visual Checklist",
                "job": "Absolute feature superiority",
            },
            {
                "code": "Hard-vs-Easy",
                "framework": "The Hard Way vs The Easy Way",
                "job": "Frictionless alternative framing",
            },
            {
                "code": "Myth-vs-Fact",
                "framework": "Myth vs Fact / Busting Industry Lies",
                "job": "Trust-building paradigm shift",
            },
            {
                "code": "Anatomy-Of",
                "framework": "Anatomy of a Superior Product",
                "job": "Detailed teardown of value",
            },
        ],
    }

    purchase_option_terms = ("pack", "bundle", "subscription", "subscribe", "case", "box of", "set of")
    has_verified_offer = any(
        p.get("offerDetails")
        or p.get("offerPrice")
        or any(
            term in str(option).casefold()
            for option in (p.get("variantDetails") or [])
            for term in purchase_option_terms
        )
        for p in products or []
    )
    has_verified_guarantee = any(p.get("guarantee") for p in products or [])

    if has_verified_offer:
        conversion_second = {
            "code": "OBU",
            "framework": "Offer-Benefit-Urgency (OBU)",
            "job": "Offer or replenishment conversion",
        }
        conversion_fifth = {
            "code": "Bundle-Value",
            "framework": "Bundle / Value Offer",
            "job": "Bundle value justification",
        }
        conversion_sixth = {
            "code": "PAS-Offer",
            "framework": "Problem-Agitation-Solution (PAS) with Offer",
            "job": "Problem resolution with purchase incentive",
        }
    else:
        conversion_second = {
            "code": "FBA",
            "framework": "Feature-Benefit-Action (FBA)",
            "job": "Benefit-led direct response",
        }
        conversion_fifth = {
            "code": "Command-Benefit-Push",
            "framework": "Command-Benefit-Push",
            "job": "Decisive benefit close",
        }
        conversion_sixth = {
            "code": "PAS-Direct",
            "framework": "Problem-Agitation-Solution (PAS)",
            "job": "Pain-to-purchase resolution",
        }

    conversion_third = {
        "code": "Risk-Reversal",
        "framework": "Risk Reversal + Guarantee",
        "job": "Purchase-risk removal",
    } if has_verified_guarantee else {
        "code": "Objection-Rebuttal",
        "framework": "Objection-Rebuttal",
        "job": "Final purchase objection removal",
    }

    campaign_portfolios["purchases"] = [
        {
            "code": "AIDA",
            "framework": "Attention-Interest-Desire-Action (AIDA)",
            "job": "Friction-free product upgrade",
        },
        conversion_second,
        conversion_third,
        {
            "code": "SLAP",
            "framework": "SLAP (Stop-Look-Act-Purchase)",
            "job": "Fast high-intent action",
        },
        conversion_fifth,
        conversion_sixth,
        {
            "code": "Hook-Retain-Reward",
            "framework": "Hook-Retain-Reward",
            "job": "Reward-led purchase momentum",
        },
        {
            "code": "BAB-Direct",
            "framework": "Before-After-Bridge (Direct)",
            "job": "Instant transformation close",
        },
        {
            "code": "The-3-Step",
            "framework": "The 3-Step System / Easy Onboarding",
            "job": "Removing friction to start",
        },
        {
            "code": "FOMO-Scarcity",
            "framework": "FOMO / Scarcity Drop",
            "job": "Urgency-driven impulse purchase",
        },
        {
            "code": "Anatomy-Of-Offer",
            "framework": "Visual Offer Teardown",
            "job": "Maximizing perceived value of bundle",
        },
    ]

    _festival_base = [
        {
            "code": "Festive-Greeting",
            "framework": "Brand Celebration / Festive Greeting",
            "job": "Subtle product integration within a warm holiday message",
        },
        {
            "code": "Cultural-Integration",
            "framework": "Cultural Context / Tradition",
            "job": "Positioning the product seamlessly into cultural holiday traditions",
        },
        {
            "code": "Festive-Bundle",
            "framework": "Festive Gifting / Bundle Showcase",
            "job": "Showcasing the product as the perfect holiday gift or bundle",
        },
        {
            "code": "Festive-Glamour",
            "framework": "Holiday Glamour / Premium Aesthetic",
            "job": "Premium, highly vibrant and aesthetic holiday mood",
        },
        {
            "code": "Festive-Offer",
            "framework": "Holiday Special / Festive Offer",
            "job": "High-energy visual highlighting a special holiday sale or bundle",
        },
    ]
    # Conditionally add commerce-compatible festive frameworks
    if has_verified_offer:
        _festival_base.append({
            "code": "OBU",
            "framework": "Offer-Benefit-Urgency (OBU) — Festive Edition",
            "job": "Festive urgency: drive immediate purchase with verified offer + holiday energy",
        })
    if any("limited" in str(p.get("description", "")).lower() or "edition" in str(p.get("name", "")).lower() for p in products or []):
        _festival_base.append({
            "code": "FOMO-Scarcity",
            "framework": "FOMO / Festive Scarcity Drop",
            "job": "Limited-edition festive urgency — sell out energy and exclusivity",
        })
    campaign_portfolios["festival"] = _festival_base

    goal_context = ""
    if goal.lower() == "purchases":
        goal_context = (
            "CRITICAL \u2014 BOTTOM OF FUNNEL: You MUST include strong urgency and a compelling reason to buy NOW. "
            "Use a risk reversal, discount, bundle, deadline, or price only when it is explicitly present in VERIFIED "
            "PRODUCT INTELLIGENCE or ADDITIONAL CONTEXT. Otherwise create urgency through the verified product benefit "
            "and a direct action CTA. Never invent an offer, guarantee, scarcity claim, or deadline. "
            "Treat the batch as a conversion portfolio: separate an upgrade/product-hero job, an offer or "
            "replenishment job when a verified offer exists, and an objection/risk-removal job when a verified "
            "guarantee or proof point exists. Give each job a different composition class."
        )
    elif goal.lower() == "festival":
        goal_context = (
            "CRITICAL — FESTIVAL CAMPAIGN: This batch is for a major cultural or holiday festival. "
            "The aesthetic MUST be highly celebratory, vibrant, and culturally relevant to the festival mentioned in the idea. "
            "Use warm, community-driven messaging, festive motifs (like lights, gifts, traditional patterns if applicable), "
            "and ensure the product is integrated elegantly into the celebration rather than forced. "
            "CRITICAL INSTRUCTION: Ensure the ad copy and on-image text explicitly and clearly wishes the audience for the specific festival."
        )

    import random
    if goal.lower() in ("auto", "random", ""):
        # Create a balanced mix (e.g., if count=6, pick 2 from discover, 2 from compare, 2 from purchases)
        available_pools = [
            list(campaign_portfolios["discover"]),
            list(campaign_portfolios["compare"]),
            list(campaign_portfolios["purchases"])
        ]
        for pool in available_pools:
            random.shuffle(pool)
            
        random.shuffle(available_pools)
        
        portfolio = []
        for i in range(count):
            pool = available_pools[i % 3]
            if pool:
                portfolio.append(pool.pop(0))
            else:
                for fallback_pool in available_pools:
                    if fallback_pool:
                        portfolio.append(fallback_pool.pop(0))
                        break
    else:
        portfolio = campaign_portfolios.get(goal.lower(), campaign_portfolios["discover"])
        if count < 1 or count > len(portfolio):
            raise ValueError(f"AI Ads supports between 1 and {len(portfolio)} creatives per batch")
    
    # Pass the ENTIRE portfolio as a menu for the LLM to choose from
    if angle.lower() != "auto":
        portfolio = [
            {
                "code": angle.upper(),
                "framework": f"{angle.upper()} (user-requested framework)",
                "job": "Custom user-requested job"
            }
        ]

    valid_frameworks = {item['code'].casefold(): item['job'] for item in portfolio}

    assignments_text = "\n".join(
        (
            f"- Code: {item['code']} | Framework: {item['framework']} | Job: {item['job']}"
        )
        for item in portfolio
    )
    if goal.lower() == "festival":
        angle_instruction = (
            f"SELECT exactly {count} distinct frameworks from the FESTIVAL MENU OF AVAILABLE FRAMEWORKS below. "
            f"CRITICAL: You MUST ONLY use frameworks from this exact list. Do NOT invent new frameworks, borrow from "
            f"non-festival pools (e.g. Contrast-and-Choice, PAS, AIDA, Spec-Sheet), or go off-menu under any circumstances. "
            f"Each framework is purpose-built for festive campaigns. Choose the ones that best match the festival/occasion "
            f"mentioned in ADDITIONAL CONTEXT and the brand's product. Execute exactly one concept per selected framework."
        )
        framework_check = (
            "FESTIVAL LOCK: Every concept MUST use a framework code EXACTLY from the FESTIVAL MENU above. "
            "No borrowing from other pools. No invented frameworks. If a code is not in the menu list, reject it and pick another."
        )
    else:
        angle_instruction = (
            f"SELECT exactly {count} distinct frameworks from the MENU OF AVAILABLE FRAMEWORKS below that are BEST SUITED "
            f"for the brand's industry ({category}) and visual vibe. Do not pick randomly; choose frameworks that logically fit. "
            f"For example, do not choose 'Dynamic Kinetic Energy' for a calming night serum. Execute exactly one concept per selected framework."
        )
        framework_check = "Every concept must use a valid framework code from the menu and its exact matching creative job."

    if post_format.lower() in ("image", "carousel"):
        persona = "You are an elite Organic Social Media Art Director at a world-class digital agency."
        job_desc = f"Your job: conceptualize {count} DISTINCT, highly-engaging organic social media {'carousel ' if post_format == 'carousel' else ''}posts for {brand_name}."
        text_budget_rule = "8. TEXT BUDGET: For organic posts, you may use bold typography, but you are NOT restricted to the 20% ad text rule. Use negative space elegantly."
        cta_rule = "9. CTA FULL SPEC: For organic posts, a literal button is optional. If you include a CTA on-image, describe its placement (e.g., small pill badge, subtle text prompt like 'Swipe >'). Specify exact text, shape, and brand colors."
    else:
        persona = "You are an elite performance-ad Art & Creative Director at a world-class digital agency."
        job_desc = f"Your job: conceptualize {count} DISTINCT, high-converting social media ad creatives for {brand_name}."
        text_budget_rule = "8. TEXT BUDGET: Explicitly keep all on-image text under 20% of the frame and preserve generous negative space, unless the specific layout calls for oversized typography."
        cta_rule = "9. CTA FULL SPEC: You MUST write the EXACT text of the CTA inside the paragraph (e.g., The single call to action is a large, pill-shaped Citron Yellow button with bold text that reads \"Compare Now\"). ALWAYS specify ALL of:\n   - Exact CTA text (must be bold and a bit big)\n   - Shape: pill (fully rounded) / sharp-corner rectangle / rounded rectangle — be explicit\n   - Fill color: named brand color + hex\n   - Text color: named brand color + hex\n   It must fit the campaign goal, be unique within the batch, and cannot imply an unavailable offer."

    # ── The Art Director system prompt ────────────────────────────────────────
    system_prompt = f"""{persona}
{job_desc}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
BRAND DNA:
{brand_dna}

Category: {category}
Visual Style: {visual_vibe}
Primary Target: {target_audience if isinstance(target_audience, str) else ', '.join(target_audience) if isinstance(target_audience, list) else str(target_audience)}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

VERIFIED PRODUCT INTELLIGENCE:
{product_details}

CAMPAIGN GOAL: {goal.upper()}
MARKETING ANGLE: {angle_instruction}
OUTPUT ASPECT RATIO: {aspect_ratio}
OUTPUT LANGUAGE: {language or 'English'}
ADDITIONAL CONTEXT: {idea if idea else 'None'}
{goal_context}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
MENU OF AVAILABLE FRAMEWORKS (Select exactly {count}):

{assignments_text}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
SOURCE-OF-TRUTH PRIORITY:

1. The attached product image is authoritative for packaging, label, shape, material, and visible orientation.
2. VERIFIED PRODUCT APPEARANCE helps describe only what the reference supports.
3. VERIFIED PRODUCT INTELLIGENCE is authoritative for claims, numbers, offer, price, guarantee, and variants.
4. BRAND DESIGN GUIDE is authoritative for ad typography, brand palette, CTA styling, spacing, and motifs.
5. Generic profile labels are fallback context only.

Never resolve a conflict by inventing or blending facts. Never turn packaging-description text into ad copy.
If no packaging images are provided, do not assume or invent fake packaging.

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
PRODUCT-GROUNDED AUDIENCE INFERENCE \u2014 DO THIS SILENTLY BEFORE WRITING:

For each concept, infer one sharply defined, product-specific audience angle using ONLY the verified
brand and product information above. Infer the situation they are in, the job they need done, their
core motivation, their most likely objection, and their awareness level. Do not create named personas,
invent demographic facts, or claim research that was not provided. When multiple creatives are requested,
use a materially different audience motivation or buying situation for each one. Pair the framework with
that psychology; never bolt a random framework onto a generic audience.

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
CREATIVE BRIEF WRITING RULES \u2014 FOLLOW EXACTLY:

Write ONE dense paragraph of 150-240 words per concept. Match the observed MakeLocalAds style: decisive,
visual, specific, premium, and immediately executable by an image model. Do not explain your reasoning.

Open naturally by naming the assigned full framework and the precise audience situation. You may begin with
"Using...", "Grounded in...", "Applying...", or "Based on..." so the batch does not sound templated.

Each brief MUST contain ALL of the following, woven naturally into ONE flowing paragraph:

0. UI BACKGROUND COLOR RULE: Given the brand's Primary Color and Secondary Color, select the most appropriate UI background color for the composition. Never use the primary or secondary color directly as the background. Generate a very light, desaturated tint that complements both brand colors. Prioritize readability and visual balance — the background must stay subtle and let the brand colors stand out.

1. ASSIGNMENT FIDELITY: Execute exactly {count} concepts using the {count} frameworks you selected from the menu. Name the framework and precise product-grounded audience situation. Ensure the 'angle' exactly matches the Code and 'creative_job' exactly matches the Job from the menu.

2. POSITIONING + EMOTIONAL STAKE: Open with what emotional argument this ad makes — one sentence stating WHY
the visuals exist (e.g. 'emphasizes clean, plant-powered ingredients over synthetic alternatives'). Then state
the single positioning idea. Use only benefits, ingredients, specifications, prices, offers, or claims from
PRODUCT INTELLIGENCE. Never fabricate statistics, testimonials, guarantees, discounts, certifications, or
competitor facts.

3. VISUAL COMPOSITION + BACKGROUND SURFACE: You must INVENT a highly creative, premium, and dynamic visual composition that perfectly matches the assigned framework. DO NOT default to a boring 'product on a desk'.
   - Examples of dynamic compositions: Asymmetrical multi-panel collages (e.g. large lifestyle hero on the left, two stacked macro detail shots on the right), aggressive split-screens (e.g., oily face vs matte face, or messy spreadsheet vs clean UI), dramatic cross-outs of competitor products or old methods, infographic posters with hand-drawn arrows, oversized data-visualization bar charts, high-energy kinetic splashes, immersive lush flat-lays, or floating device mockups. FORCE aggressive comparison visuals and complex collage structures when appropriate.
   - Describe the exact scene in full executable detail. ALWAYS specify:
   - Background: named color + hex code + one texture adjective. SUGGESTION: Often use solid colors or subtle gradients derived directly from the PRODUCT's colors (rather than just brand colors or natural environments) for a high-impact, modern look.
   - Layout structural element: wave separator, split partition, chart axes, sunburst rays, grid, etc.
   - Product placement: which variant, exactly which third of frame, what the product is RESTING ON or SURROUNDED BY (pedestal, ingredient bed, props, surface slab — NOT a generic 'clean white surface')
   - Supporting props in foreground/background that make it feel like a premium photoshoot
   - Lighting direction and quality

4. VISUAL HERO: Explicitly say "The visual hero is..." and define the single dominant element or contrast.
Ground product form, orientation, visible label details, packaging colors, and material in the verified reference.
CRITICAL: If the product intelligence mentions an offer for a "3-pack", "5-pack", or bundle, you MUST explicitly instruct the visual layout to display EXACTLY 3 or 5 instances of the product. Do not request multiple hero products unless a verified multi-pack assignment requires them.

5. COLOR PALETTE: Name all colors using BOTH the brand name AND hex (e.g. 'Hunter Green (#034638)' not just
'#034638'). Derive product colors from VERIFIED PRODUCT APPEARANCE. Reserve one named+hex accent color for the
CTA only.

6. HEADLINE SPEC: You MUST write the EXACT text of the headline inside the paragraph (e.g., The on-image headline is "Your text here." in the bold, vintage WindsorEF typeface).
   - CRITICAL COPYWRITING RULE: DO NOT use generic, fluffy D2C hooks. Your hooks MUST be visceral, aggressive, and highly-specific. Use physical or emotional action verbs that attack the core pain point.
   - HEADLINE FORMATTING: The headline font MUST be described as BIG and bold. You MUST include a full stop (period) at the end of every headline.
   ALWAYS specify:
   - Font name (exact brand font)
   - Font weight (ultra-heavy / bold / medium — never leave blank)
   - Tracking / letter-spacing feel (tightly tracked / loose / standard)
   - Color: named brand color + hex
   - Typographic Layout & Placement: DO NOT just say "text at the top". You MUST describe exactly how the text is physically arranged. Use highly dynamic, premium layouts (e.g., "curved in a bold arch tightly wrapping over the product", "stacked asymmetrically on the left with oversized letters bleeding off the edge", "floating dynamically among the ingredients"). Be extremely visual and specific.
   Include at most two short proof callouts, only when verified. The headline must be unique within the batch.

7. TYPOGRAPHY ASSIGNMENTS: Explicitly assign a font per text role:
   - Headline: [font name] [weight]
   - Body/support text: [font name] [weight]
   - CTA text: [font name] [weight]
   Do not leave any text role without a font assignment.

{text_budget_rule}

{cta_rule}

10. BRAND ALIGNMENT: End with "To keep this ad on-brand," followed by concrete typography rules (font weight,
tracking feel), named palette rules (use exact named+hex tokens), brand motif usage, and spacing rules taken
from the BRAND DESIGN GUIDE. This sentence should make the creative feel unmistakably like the brand.

11. LANGUAGE: The entire output, including the instructions (the direction), audience angle, headline, proof copy, CTA text, and caption MUST be written strictly in {language or 'English'}. Do not mix languages unless ADDITIONAL CONTEXT explicitly asks for it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT:
Return ONLY a raw JSON array \u2014 no markdown, no code fences.
Each object has exactly:
- "assignment_id": the assigned integer from 1 to {count}
- "angle": framework short name (e.g., "PAS", "Spec-Sheet Showdown")
- "creative_job": copy the assigned creative job exactly
- "composition_class": copy the assigned composition class exactly
- "audience_angle": one concise sentence describing the inferred audience situation and motivation
- "headline": the exact on-image headline without quotation marks
- "cta": the exact CTA text without quotation marks
- "instructions": the full Art Director brief paragraph
- "caption": 1 punchy social caption with 1-2 emojis (for the post, not the image)

FINAL SILENT CHECK: {framework_check} Across the batch, do not repeat the creative job, composition class,
audience motivation, headline, CTA, camera treatment, or background environment. Verify every claim, number,
offer, and guarantee against the supplied product intelligence before outputting.
"""

    # The stored guide is rich, while the expensive image model only receives
    # the Director's distilled brief. Passing the complete guide to this single
    # low-cost text call preserves typography, palette, components, hierarchy,
    # photography, and guardrails instead of truncating after the color section.
    compact_design_guide = (brand_design_guide or "").strip()[:9000]
    if compact_design_guide:
        system_prompt += f"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND DESIGN GUIDE (use exact fonts, colors, and CTA styles from this):
{compact_design_guide}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: When writing the brief, use the EXACT font names, named colors with hex codes,
and CTA button styles specified above. Do NOT use generic terms like 'grape purple' or
'Outfit Bold' — use the real brand design tokens above.
"""

    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is required for Director-quality ad briefs")

    try:
        def _call_director(messages: List[Dict[str, str]], temperature: float) -> str:
            output_token_cap = min(5000, max(900, 400 + (count * 520)))
            client = genai.Client(api_key=api_key)
            system_instruction = ""
            user_content = ""
            for m in messages:
                if m.get("role") == "system":
                    system_instruction += m.get("content", "") + "\n"
                else:
                    user_content += m.get("content", "") + "\n"

            config = types.GenerateContentConfig(
                system_instruction=system_instruction.strip() if system_instruction else None,
                temperature=temperature,
                max_output_tokens=output_token_cap,
                response_mime_type="application/json"
            )
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_content.strip(),
                config=config
            )
            return response.text.strip()


        def _parse_and_validate(content: str) -> List[Dict]:
            if content.startswith("```"):
                content = content.split("```", 2)[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.rsplit("```", 1)[0]
            parsed = json.loads(content.strip())
            if not isinstance(parsed, list) or len(parsed) < count:
                returned = len(parsed) if isinstance(parsed, list) else 0
                raise ValueError(f"Director returned {returned} of {count} concepts")

            validated = []
            seen_headlines = set()
            seen_ctas = set()
            for index, concept in enumerate(parsed[:count]):
                if not isinstance(concept, dict):
                    raise ValueError(f"Concept {index + 1} is not an object")

                try:
                    assignment_id = int(concept.get("assignment_id"))
                except (TypeError, ValueError):
                    raise ValueError(f"Concept {index + 1} has no valid assignment_id")
                if assignment_id != index + 1:
                    raise ValueError(f"Concept {index + 1} does not match assignment {index + 1}")

                framework_code = str(concept.get("angle") or "").strip()
                if framework_code.casefold() not in valid_frameworks:
                    raise ValueError(
                        f"Concept {index + 1} used framework code '{framework_code}' which is not in the menu."
                    )
                
                creative_job = str(concept.get("creative_job") or "").strip()
                expected_job = valid_frameworks[framework_code.casefold()]
                if creative_job.casefold() != expected_job.casefold():
                    print(f"[AdsAgent] Warning: Concept {index + 1} used job '{creative_job}' instead of '{expected_job}'. Auto-correcting.")
                    creative_job = expected_job
                composition_class = str(concept.get("composition_class") or "").strip()
                if not composition_class:
                    raise ValueError(f"Concept {index + 1} is missing its invented composition class")

                instructions = str(concept.get("instructions") or "").strip()
                if not instructions:
                    raise ValueError(f"Concept {index + 1} is missing its instructions")

                headline = str(concept.get("headline") or "").strip().strip('"\u201c\u201d')
                cta = str(concept.get("cta") or "").strip().strip('"\u201c\u201d')
                normalized_headline = " ".join(headline.casefold().split())
                normalized_cta = " ".join(cta.casefold().split())
                if not normalized_headline:
                    raise ValueError(f"Concept {index + 1} is missing its headline text in the JSON")
                if not normalized_cta:
                    raise ValueError(f"Concept {index + 1} is missing its CTA text in the JSON")
                if headline.casefold() in seen_headlines:
                    raise ValueError(f"Concept {index + 1} repeats a headline")
                if cta.casefold() in seen_ctas:
                    raise ValueError(f"Concept {index + 1} repeats a CTA")
                seen_headlines.add(headline.casefold())
                seen_ctas.add(cta.casefold())

                audience_angle = str(concept.get("audience_angle") or "").strip()
                if not audience_angle:
                    raise ValueError(f"Concept {index + 1} is missing its inferred audience angle")
                validated.append({
                    "assignment_id": assignment_id,
                    "angle": framework_code,
                    "creative_job": creative_job,
                    "composition_class": composition_class,
                    "audience_angle": audience_angle,
                    "headline": headline,
                    "cta": cta,
                    "instructions": instructions,
                    "caption": str(concept.get("caption") or "Discover the difference.").strip(),
                })

            jobs = {item["creative_job"].casefold() for item in validated}
            compositions = {item["composition_class"].casefold() for item in validated}
            if len(jobs) != len(validated) or len(compositions) != len(validated):
                raise ValueError("Director repeated a creative job or composition class")
            return validated

        messages = [{"role": "system", "content": system_prompt}]
        content = _call_director(messages, temperature=0.55)
        try:
            return _parse_and_validate(content)
        except Exception as validation_error:
            repair_messages = messages + [
                {"role": "assistant", "content": content},
                {
                    "role": "user",
                    "content": (
                        f"Your output failed validation: {validation_error}. Return the complete corrected raw JSON "
                        f"array with exactly {count} concepts and every required field. Do not include markdown."
                    ),
                },
            ]
            repaired = _call_director(repair_messages, temperature=0.25)
            return _parse_and_validate(repaired)
    except Exception as e:
        print(f"[AdsAgent] Director LLM error: {e}")
        return []


def generate_ad_creatives(
    brand_doc: Dict,
    products: List[Dict],
    count: int = 1,
    campaign_goal: str = "discover",
    campaign_angle: str = "auto",
    idea: str = "",
    aspect_ratio: str = "1:1",
    ref_images: List[str] = None,
    user_plan: str = "",
    language: str = "English",
    brand_design_guide: str = "",
    post_format: str = "ad"
) -> List[Dict]:
    print(f"\n[AdsAgent] \U0001f3ac Starting Ad Generation: {count} concepts | Goal: {campaign_goal} | Angle: {campaign_angle}")

    # ── Step 1: Generate Art Director Concepts ────────────────────────────────────────────────────────────────────────────────────────────────
    concepts = _generate_director_concepts(
        brand_doc=brand_doc,
        products=products,
        count=count,
        goal=campaign_goal,
        angle=campaign_angle,
        idea=idea,
        aspect_ratio=aspect_ratio,
        language=language,
        brand_design_guide=brand_design_guide,
        post_format=post_format,
    )
    if not concepts:
        raise ValueError("Director LLM returned no concepts.")

    # ── Step 2: Build Block 2 (Product Appearance) ──────────────────────────────────────────────────────────────────────────────────────────
    # Priority: adVisualDescription (GPT-4o Vision forensic analysis, ~220 words)
    #           → short description fallback (products not yet analyzed, or if GPT-4o refused)
    if products and len(products) > 0:
        prod = products[0]
        name = prod.get("name", "a premium item")
        desc = prod.get("description", "")
        benefit = prod.get("keyBenefit", "")
        short_fallback = f"The product is {name}. {desc} {benefit}".strip() + " It should look high-quality, authentic, and properly lit."

        ad_visual_desc = (prod.get("adVisualDescription") or "").strip()
        if ad_visual_desc and not _is_refusal(ad_visual_desc):
            prod_appearance = ad_visual_desc
            print(f"  [AdsAgent] \u2705 Using rich adVisualDescription ({len(ad_visual_desc.split())} words)")
        elif ad_visual_desc and _is_refusal(ad_visual_desc):
            prod_appearance = short_fallback
            print(f"  [AdsAgent] \u26a0\ufe0f  adVisualDescription contains a refusal \u2014 using short fallback")
        else:
            prod_appearance = short_fallback
            print(f"  [AdsAgent] \u26a0\ufe0f  No adVisualDescription found \u2014 using short fallback")
    else:
        prod_appearance = f"The product: {idea if idea else 'A premium item'}. It should look high-quality, authentic, and properly lit."

    # \u2500\u2500 Step 3: Build Block 3 (Design Requirements) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    # Verbatim format matching makelocalads — no dynamic hex injection in this block
    design_reqs = """\
- Follow the instructions by the director.
- Make the ad design, layout, typography on-branded, but should look premium, editorial-like.
- Establish a clear visual hierarchy: one dominant focal point the eye lands on
  first, then the supporting message, then the CTA.
- Keep strong figure/ground contrast. If text sits over imagery, place a scrim or
  overlay behind it so it stays fully legible.
- Place the focal subject on a rule-of-thirds line; leave generous whitespace and
  avoid clutter.
- Use a limited palette anchored to the brand colors (~60-30-10), reserving one
  accent color for the call to action.
- Keep 20% space all around the creative for the ad to look cleaner
- Group and align elements cleanly (Gestalt); use at most two type styles."""

    # \u2500\u2500 Step 4: Brand logo attachment \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    brand_logo = brand_doc.get("logo", "").strip()
    has_logo = bool(brand_logo)

    # \u2500\u2500 Step 5: Image size + quality mapping \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    aspect_to_fal = {
        "1:1": "square_hd",
        "4:5": "portrait_4_3",
        "9:16": "portrait_16_9",
        "16:9": "landscape_16_9",
        "2:3": "portrait_4_3",
    }
    gpt_size = aspect_to_fal.get(aspect_ratio, "square_hd")
    img_quality = "medium" if "pro" in user_plan.lower() else "low"
    print(f"  Quality: {img_quality} | Size: {gpt_size}")

    # \u2500\u2500 Step 6: Render ALL concepts in PARALLEL \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    logo_line = (
        "\nThe final attached image is the official brand logo. "
        "Add it once, subtly, in clean negative space; keep it exact, legible, and uncropped."
    ) if has_logo else ""

    # Build one canonical attachment set for the whole batch. Older clients may
    # still include the logo inside ref_images, so remove it there and append the
    # authoritative brand logo exactly once, in the final position. Every
    # creative receives the same ordered values.
    product_refs = []
    seen_refs = set()
    
    if products and len(products) > 0:
        prod_img = (products[0].get("imageBase64") or (products[0].get("imageUrls") and products[0].get("imageUrls")[0]) or "").strip()
        if prod_img and prod_img not in seen_refs:
            if not (has_logo and prod_img == brand_logo):
                seen_refs.add(prod_img)
                product_refs.append(prod_img)

    for img in ref_images or []:
        if not isinstance(img, str):
            continue
        normalized = img.strip()
        if not normalized or normalized in seen_refs:
            continue
        if has_logo and normalized == brand_logo:
            continue
        seen_refs.add(normalized)
        product_refs.append(normalized)

    # Cost-conscious contract: one selected product reference plus one logo.
    # The same ordered pair is reused for every creative in the batch.
    attachment_values = product_refs[:1]
    if has_logo:
        attachment_values.append(brand_logo)
    attachments = tuple(attachment_values)
    print(
        f"  [AdsAgent] References: {len(product_refs[:1])} product image(s)"
        f" + {1 if has_logo else 0} brand logo"
    )

    def _render_concept(args):
        idx, concept = args
        instructions = concept.get("instructions", "")
        caption = concept.get("caption", "Discover our latest collection.")

        headline_text = concept.get("headline", "")
        cta_text = concept.get("cta", "")
        fallback_text = ""
        if headline_text and headline_text.lower() not in instructions.lower():
            fallback_text += f'\nThe on-image headline is "{headline_text}".'
        if cta_text and cta_text.lower() not in instructions.lower():
            fallback_text += f'\nThe single call to action is a button that reads "{cta_text}".'

        full_prompt = (
            f"Instructions by the director: {instructions}{fallback_text}\n\n"
            f"Product appearance: {prod_appearance}\n\n"
            f"Use the product appearance text only as a private visual reference for accurately drawing the product. "
            f"Do not print, quote, paraphrase, label, or turn any of that description into ad copy. "
            f"Treat orientation-specific details carefully: show front-only details only when the product front is visible; "
            f"if the brief shows the back, side, top, or an angled view where those details would not be visible, "
            f"omit them instead of moving them onto the wrong face.\n\n"
            f"The attached product photos show the real product \u2014 reproduce it faithfully."
            f"{logo_line}\n\n"
            f"Design requirements (apply to this ad):\n{design_reqs}\n"
        )

        print(f"\n[AdsAgent] \U0001f58c\ufe0f Assembled Prompt {idx+1}/{count}:\n{full_prompt}\n")

        try:
            fal_result = generate_fal_image_gpt2(
                prompt=full_prompt,
                image_size=gpt_size,
                image=list(attachments) if attachments else None,
                quality=img_quality
            )
            image_url = fal_result.get("image") if isinstance(fal_result, dict) else fal_result
            return idx, {
                "type": "image",
                "image": image_url,
                "caption": caption,
                "angle": concept.get("angle", "Custom"),
                "assignmentId": concept.get("assignment_id", idx + 1),
                "creativeJob": concept.get("creative_job", ""),
                "compositionClass": concept.get("composition_class", ""),
                "audienceAngle": concept.get("audience_angle", ""),
                "headline": concept.get("headline", ""),
                "cta": concept.get("cta", ""),
                "brief": instructions,
                "prompt": full_prompt,
            }
        except Exception as e:
            print(f"[AdsAgent] Render Error on Concept {idx+1}: {e}")
            return idx, {
                "type": "image",
                "error": str(e),
                "caption": caption,
            }

    active_concepts = concepts[:count]
    print(f"  [AdsAgent] \U0001f680 Rendering {len(active_concepts)} concepts in PARALLEL...")

    results_map = {}
    with ThreadPoolExecutor(max_workers=len(active_concepts)) as executor:
        futures = {executor.submit(_render_concept, (idx, c)): idx for idx, c in enumerate(active_concepts)}
        for future in as_completed(futures):
            idx, post = future.result()
            results_map[idx] = post

    # Return in original order
    return [results_map[i] for i in range(len(active_concepts))]
