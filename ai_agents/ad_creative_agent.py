import os
import json
import requests
from typing import List, Dict, Any
from fal_visual_engine import generate_fal_image_gpt2
from common import get_brand_dna


def _generate_director_concepts(
    brand_doc: Dict,
    products: List[Dict],
    count: int,
    goal: str,
    angle: str,
    idea: str
) -> List[Dict]:
    brand_dna = get_brand_dna(brand_doc)
    brand_name = brand_doc.get("brandName", "the brand")
    visual_vibe = brand_doc.get("visualVibe", "Clean and modern")
    category = brand_doc.get("businessCategory", "consumer product")
    target_audience = brand_doc.get("targetAudience", brand_doc.get("targetAudiences", "health-conscious consumers"))

    # Build a richer product block for the Art Director LLM
    product_details = ""
    if products:
        for p in products:
            product_details += (
                f"- Name: {p.get('name')}\n"
                f"  Description: {p.get('description', '')}\n"
                f"  Key Benefit: {p.get('keyBenefit', '')}\n"
                f"  Price: {p.get('price', '')}  Offer Price: {p.get('offerPrice', '')}\n\n"
            )
    else:
        product_details = f"- Custom Product/Focus: {idea if idea else 'A premium product from the brand'}\n\n"

    # Frameworks per goal — reverse-engineered from makelocalads HAR analysis
    frameworks_map = {
        "discover": [
            "AIDA (Attention-Interest-Desire-Action)",
            "PAS (Problem-Agitate-Solve)",
            "BAB (Before-After-Bridge)",
            "Feature-Benefit (FAB)",
            "Storytelling / Narrative",
            "Educational / Ingredient Spotlight",
            "QUEST (Qualify-Understand-Educate-Stimulate-Transition)",
            "Star-Story-Solution",
            "What-Why-How",
        ],
        "compare": [
            "Us vs. Them",
            "Spec-Sheet Showdown",
            "Objection-Rebuttal",
            "Contrast Framework",
            "Feature-Advantage-Benefit (FAB)",
            "Social Proof + RTB (Reason To Believe)",
            "Side-by-Side Comparison",
            "Feature-Story",
            "StoryBrand (Character-Problem-Guide)",
        ],
        "purchases": [
            "FOMO + Urgency",
            "Feature-Benefit-Action (FBA)",
            "Problem-Agitation-Solution (PAS) with Offer",
            "SLAP (Stop-Look-Act-Purchase)",
            "Command-Benefit-Push",
            "Risk Reversal + Guarantee",
            "Bundle / Value Offer",
            "Hook-Retain-Reward",
        ],
    }

    goal_context = ""
    if goal.lower() == "purchases":
        goal_context = (
            "CRITICAL \u2014 BOTTOM OF FUNNEL: You MUST include strong urgency and a compelling reason to buy NOW. "
            "Use risk reversals (e.g., '30-day guarantee', 'free returns') or bundle/value angles "
            "(e.g., 'Buy 2, Get 1 Free'). DO NOT fabricate fake discounts unless the ADDITIONAL CONTEXT "
            "explicitly mentions one. Stick to guarantees, bundles, or direct benefit CTAs."
        )

    available = frameworks_map.get(goal.lower(), frameworks_map["discover"])
    if angle.lower() == "auto":
        angle_instruction = (
            f"AUTO \u2014 You MUST assign a COMPLETELY UNIQUE and DISTINCT framework for each of the {count} "
            f"concepts. Choose from this list: {', '.join(available)}. "
            f"NEVER repeat a framework within this batch."
        )
    else:
        angle_instruction = angle.upper()

    # ── The Art Director system prompt ────────────────────────────────────────
    system_prompt = f"""You are an elite Art & Creative Director at a world-class digital ad agency specializing in premium Indian D2C brands.
Your job: conceptualize {count} DISTINCT, high-converting social media ad creatives for {brand_name}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND DNA:
{brand_dna}

Category: {category}
Visual Style: {visual_vibe}
Primary Target: {target_audience if isinstance(target_audience, str) else ', '.join(target_audience) if isinstance(target_audience, list) else str(target_audience)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRODUCTS TO FEATURE:
{product_details}

CAMPAIGN GOAL: {goal.upper()}
MARKETING ANGLE: {angle_instruction}
ADDITIONAL CONTEXT: {idea if idea else 'None'}
{goal_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATIVE BRIEF WRITING RULES — FOLLOW EXACTLY:

Write ONE paragraph (~180-250 words) per concept. Style: strict Art Director briefing an AI image generator.

Each brief MUST contain ALL of the following, woven naturally into ONE flowing paragraph:

1. FRAMEWORK + ARCHETYPE: Name the framework and the specific psychological archetype or pain point being targeted. Be specific — name the exact frustration, desire, or identity (e.g., "mothers dealing with fussy eaters", "fitness enthusiasts frustrated by bloating").

2. VISUAL COMPOSITION: Describe the exact scene layout in cinematic detail (e.g., "stark split-screen", "minimalist flat-lay on marble", "macro close-up of texture", "lifestyle hero shot"). Specify what occupies each area of the frame.

3. VISUAL HERO: Explicitly name THE visual hero — the single most dominant element the eye locks on (e.g., "The visual hero is the product's transparent capsule shell", "The visual hero is the before/after contrast").

4. COLOR PALETTE — CRITICAL RULE:
   - Extract the dominant scene colors FROM THE PRODUCT PACKAGING itself.
   - Name them descriptively: "warm Sand Beige", "deep burgundy-maroon", "clinical Mist Gray", "soft Wellness Cream".
   - DO NOT use random hex codes. DO NOT use the brand's generic settings colors for backgrounds.
   - The brand's accent color is reserved ONLY for the CTA button or one accent element (~10% of the visual).

5. HEADLINE: State the EXACT short on-image headline in quotes (e.g., 'Tired of feeling constantly tired?'). It must be 4-8 words max. Bold, premium typeface (e.g., Circular Std, Tenor Sans, Outfit Bold).

6. TEXT BUDGET: State exactly what % of the frame text occupies — e.g., "occupying under 10% of the overall layout". Keep it minimal.

7. CTA: Describe the exact CTA text, button shape, and border-radius style. Use brand accent color only here (e.g., "a sharp, zero-radius button", "pill-shaped badge", "6px rounded rectangle bordered button").

8. BRAND ALIGNMENT: Close with one or two "To keep the ad on-brand..." sentences specifying typography, spacing, and layout rules that match the brand's visual DNA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT:
Return ONLY a raw JSON array — no markdown, no code fences.
Each object has exactly:
- "angle": framework short name (e.g., "PAS", "Spec-Sheet Showdown")
- "instructions": the full Art Director brief paragraph
- "caption": 1 punchy social caption with 1-2 emojis (for the post, not the image)

FINAL CHECK: Every concept MUST use a DIFFERENT framework. Verify before outputting.
"""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[AdsAgent] OPENAI_API_KEY missing — returning fallback dummy")
        return [{"angle": angle, "instructions": "A beautiful product shot on a clean background.", "caption": "Buy now! 🚀"}] * count

    try:
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [{"role": "system", "content": system_prompt}],
                "temperature": 0.75,
                "max_tokens": 4000,  # Increased from 1500 — brief truncation was cutting output
            },
            timeout=60
        )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"].strip()
        # Strip markdown fences if model wraps in them
        if content.startswith("```"):
            content = content.split("```", 2)[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.rsplit("```", 1)[0]
        return json.loads(content.strip())
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
    user_plan: str = ""
) -> List[Dict]:
    print(f"\n[AdsAgent] 🎬 Starting Ad Generation: {count} concepts | Goal: {campaign_goal} | Angle: {campaign_angle}")

    # ── Step 1: Generate Art Director Concepts ────────────────────────────────
    concepts = _generate_director_concepts(brand_doc, products, count, campaign_goal, campaign_angle, idea)
    if not concepts:
        raise ValueError("Director LLM returned no concepts.")

    # ── Step 2: Build Block 2 (Product Appearance) ───────────────────────────
    # Priority: adVisualDescription (GPT-4o Vision forensic analysis, ~220 words)
    #           → short description fallback (for products not yet analyzed)
    if products and len(products) > 0:
        prod = products[0]
        ad_visual_desc = (prod.get("adVisualDescription") or "").strip()
        if ad_visual_desc:
            prod_appearance = ad_visual_desc
            print(f"  [AdsAgent] ✅ Using rich adVisualDescription ({len(ad_visual_desc.split())} words)")
        else:
            name = prod.get("name", "a premium item")
            desc = prod.get("description", "")
            benefit = prod.get("keyBenefit", "")
            prod_appearance = f"The product is {name}. {desc} {benefit}".strip() + " It should look high-quality, authentic, and properly lit."
            print(f"  [AdsAgent] ⚠️  No adVisualDescription found — using short fallback")
    else:
        prod_appearance = f"The product: {idea if idea else 'A premium item'}. It should look high-quality, authentic, and properly lit."

    # ── Step 3: Build Block 3 (Design Requirements) ──────────────────────────
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

    # ── Step 4: Brand logo attachment ────────────────────────────────────────
    brand_logo = brand_doc.get("logo", "").strip()
    has_logo = bool(brand_logo)

    # ── Step 5: Image size + quality mapping ─────────────────────────────────
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

    # ── Step 6: Render each concept ───────────────────────────────────────────
    generated_posts = []

    for idx, concept in enumerate(concepts[:count]):
        instructions = concept.get("instructions", "")
        caption = concept.get("caption", "Discover our latest collection.")

        # Assemble the full 3-block prompt — exactly matching makelocalads structure
        logo_line = (
            "\nThe final attached image is the official brand logo. "
            "Add it once, subtly, in clean negative space; keep it exact, legible, and uncropped."
        ) if has_logo else ""

        full_prompt = (
            f"Instructions by the director: {instructions}\n\n"
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

        print(f"\n[AdsAgent] 🖌️ Assembled Prompt {idx+1}/{count}:\n{full_prompt}\n")

        # Build attachments: up to 2 product ref images + brand logo (last)
        attachments = []
        if ref_images:
            # Add up to 2 product reference images for better 3D packaging context
            for img in ref_images[:2]:
                if img:
                    attachments.append(img)
        if has_logo:
            attachments.append(brand_logo)

        try:
            fal_result = generate_fal_image_gpt2(
                prompt=full_prompt,
                image_size=gpt_size,
                image=attachments if attachments else None,
                quality=img_quality
            )
            image_url = fal_result.get("image") if isinstance(fal_result, dict) else fal_result
            generated_posts.append({
                "type": "image",
                "image": image_url,
                "caption": caption,
                "angle": concept.get("angle", "Custom"),
            })
        except Exception as e:
            print(f"[AdsAgent] Render Error on Concept {idx+1}: {e}")
            generated_posts.append({
                "type": "image",
                "error": str(e),
                "caption": caption,
            })

    return generated_posts
