"""
saas_image_agent.py
────────────────────
SaaS/Services/Consulting-adapted version of strategy_image_agent.py

Key overrides vs. the D2C version:
- build_image_prompt()         → SaaS visual style (dark UI, dashboard, metric callouts)
- build_carousel_slide_prompts() → SaaS ad frameworks (Stat-led, Thought leadership)
- generate_instagram_caption_and_hashtags() → B2B copy tone, ROI-focused
- build_video_prompt()         → Professional B-roll (workspace, UI, whiteboard)
- No build_ecomm_image_prompt() (removed — not applicable)
- No Urgency/Offer ad template (in "avoid" list for all SaaS profiles)

The orchestrator `generate_strategy_images()` at the bottom mirrors the
original but injects the saas_directive into every prompt call.
"""

import os
import base64
import random
import math
from concurrent.futures import ThreadPoolExecutor
import requests as http_requests
from typing import List, Optional, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
from dotenv import load_dotenv

load_dotenv()

# ── Re-use FAL visual engines from parent ────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fal_visual_engine import (
    generate_fal_image_gpt2,
    generate_fal_carousel_ideogram,
    generate_fal_video_wan,
    generate_fal_video_seedance,
)
from saas_agents.saas_profiles import get_saas_profile, build_saas_directive


# ─── Caption bank (B2B / SaaS feel) ─────────────────────────────────────────
_SAAS_CAPTIONS = [
    "The metrics don't lie. 📊",
    "Built for teams that move fast. ⚡",
    "Your competitors are already using this. 🔍",
    "Stop guessing. Start knowing. 📈",
    "The ROI speaks for itself. 💰",
    "Automate the boring. Focus on growth. 🚀",
    "Less meetings. More results. ✅",
    "What 10x looks like in practice. 🎯",
    "Work smarter, not harder — for real this time. 🧠",
    "This is what efficiency looks like. ⚙️",
]

# ── Aspect ratio → FAL image_size mapping (same as parent) ──────────────────
ASPECT_TO_FAL_SIZE: Dict[str, str] = {
    "1:1":  "square_hd",
    "4:5":  "portrait_4_3",
    "9:16": "portrait_16_9",
    "16:9": "landscape_16_9",
    "2:3":  "portrait_4_3",
}

# ── SaaS Ad composition templates (no D2C urgency/product templates) ─────────
SAAS_AD_TEMPLATE_DIRECTIVES: Dict[int, Dict[str, str]] = {
    1: {
        "label":     "Dashboard Hero + Metric Bar",
        "directive": (
            "LAYOUT: Dashboard Hero + Metric Bar. "
            "A clean UI dashboard or analytics screen fills 70% of the frame. "
            "A solid dark-coloured horizontal bar at the bottom shows a key metric callout "
            "(e.g. '3× faster delivery', '40% cost saved'). "
            "High contrast. Minimal clutter. Professional dark-mode aesthetic."
        ),
    },
    2: {
        "label":     "Bold Stat Headline + Visual",
        "directive": (
            "LAYOUT: Bold Stat Headline, Visual Below. "
            "Large bold statistic or outcome anchored at the top third "
            "(e.g. '10,000 hours saved monthly'). "
            "Below it: a clean UI screenshot or workspace photography. "
            "Sans-serif font. Minimal background. No product packaging."
        ),
    },
    3: {
        "label":     "Split: Before/After Workflow",
        "directive": (
            "LAYOUT: 50/50 Vertical Split — Before vs After. "
            "Left half: 'BEFORE' — chaotic spreadsheets, manual process, stressed professional. "
            "Right half: 'AFTER' — clean dashboard, automated flow, calm productive person. "
            "'BEFORE' and 'AFTER' labels clearly shown. "
            "Professional, not lifestyle. Real workspace environments."
        ),
    },
    4: {
        "label":     "Full-Bleed UI Screenshot + Overlay",
        "directive": (
            "LAYOUT: Full-Bleed UI Screenshot. "
            "A product dashboard or feature screen fills the entire frame edge-to-edge. "
            "Semi-transparent dark overlay gradient at top and/or bottom for text legibility. "
            "Headline text overlaid on the gradient zone. Cinematic, immersive feel. "
            "No product packaging. No lifestyle photography."
        ),
    },
    5: {
        "label":     "Minimal Clean Canvas + Feature",
        "directive": (
            "LAYOUT: Minimal White/Dark Canvas. "
            "Pure white or near-black background. "
            "Single feature or UI element precisely centered in upper 60%. "
            "Clean, spaced headline and benefit subtext below. "
            "Lots of negative space. Premium B2B SaaS aesthetic."
        ),
    },
    6: {
        "label":     "Dark Mode Drama + CTA",
        "directive": (
            "LAYOUT: Dark Mode Drama. "
            "Deep dark background (near-black or dark navy). "
            "UI element or feature visual rendered with accent color glow. "
            "Vibrant CTA button or badge in a corner with the brand's accent color. "
            "High contrast, punchy, modern SaaS product aesthetic."
        ),
    },
    7: {
        "label":     "Social Proof — Quote + Metric",
        "directive": (
            "LAYOUT: Social Proof Showcase. "
            "Customer logo or avatar on one side. "
            "Bold testimonial quote in a speech-bubble or card format. "
            "Key metric from their result shown prominently (e.g. '5× revenue in 3 months'). "
            "Reviewer name, company, and role below the quote. "
            "Clean, trustworthy, professional palette."
        ),
    },
    8: {
        "label":     "Feature List + UI Visual",
        "directive": (
            "LAYOUT: Benefits Grid. "
            "UI visual on left or top. "
            "3–4 bullet-point feature/benefit callouts on right or below, "
            "each with a small icon or checkmark. "
            "Clean structured layout. Sans-serif typography. "
            "Brand color accents on icons and bullets. No product shots."
        ),
    },
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _resolve_ref_image(url_or_b64: str) -> Optional[str]:
    """
    Accepts a data-URL, http URL, or raw base64 string.
    Converts to JPEG base64. Returns None on failure.
    (Mirrored from strategy_image_agent.py)
    """
    if not url_or_b64:
        return None
    try:
        from PIL import Image as PILImage
        import io as _io

        if url_or_b64.startswith("data:"):
            raw_b64 = url_or_b64.split("base64,")[1]
        elif url_or_b64.startswith("http"):
            resp = http_requests.get(url_or_b64, timeout=15)
            resp.raise_for_status()
            raw_b64 = base64.b64encode(resp.content).decode("utf-8")
        else:
            raw_b64 = url_or_b64

        raw_bytes = base64.b64decode(raw_b64)
        img = PILImage.open(_io.BytesIO(raw_bytes))
        if img.mode not in ("RGB",):
            img = img.convert("RGB")
        buf = _io.BytesIO()
        img.save(buf, format="JPEG", quality=90, optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"[SaaSImageAgent] ⚠️ Ref image conversion failed: {e}")
        return None


def _select_ref_images(ref_images: List[str], count: int) -> List[Optional[str]]:
    if not ref_images:
        return [None] * count
    resolved = [_resolve_ref_image(r) for r in ref_images]
    resolved = [r for r in resolved if r]
    if not resolved:
        return [None] * count
    if len(resolved) >= count:
        return random.sample(resolved, count)
    pool = resolved.copy()
    out = []
    for _ in range(count):
        if not pool:
            pool = resolved.copy()
            random.shuffle(pool)
        out.append(pool.pop(random.randint(0, len(pool) - 1)))
    return out


def _brand_block(bd: Dict[str, Any]) -> str:
    """Shared brand DNA block for SaaS brands."""
    brand_name      = bd.get("brandName", "Brand")
    category        = bd.get("businessCategory", "SaaS & Digital")
    brand_tone      = bd.get("brandTone", "Professional & Direct")
    visual_vibe     = bd.get("visualVibe", "Clean Minimal")
    primary_color   = bd.get("primaryColor", "#2563EB")
    secondary_color = bd.get("secondaryColor", "#60A5FA")
    target_audience = ", ".join(bd.get("targetAudiences", [])) or "Business professionals"
    usp             = bd.get("usp", "")
    main_goal       = bd.get("mainGoal", "Get leads / enquiries")
    website         = bd.get("website", "")
    logo            = bd.get("logo", "")

    logo_ref = ""
    if logo:
        logo_ref = f"Brand Logo Reference: {logo if logo.startswith('http') else '[Logo image is uploaded and available for branding]'}\n"

    return (
        f"{brand_name} — {category} company.\n"
        f"Brand tone: {brand_tone}.\n"
        f"Visual style: {visual_vibe}.\n"
        f"Primary color: {primary_color}. Secondary: {secondary_color}.\n"
        f"Target audience: {target_audience}.\n"
        f"Core goal: {main_goal}.\n"
        f"USP: {usp}.\n"
        + logo_ref
        + (f"Website: {website}\n" if website else "")
    )


# ─── Prompt builders ─────────────────────────────────────────────────────────

def build_saas_image_prompt(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    aspect: str,
    saas_directive: str,
    ad_template: Optional[int] = None,
    custom_directive: Optional[str] = None,
    language: str = "english",
    campaign_mode: Optional[str] = None,
) -> str:
    """
    SaaS-adapted static image prompt for gpt-image-2.
    Replaces D2C product photography with UI/workspace/data-driven visuals.
    """
    block = _brand_block(brand_doc)
    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""
    logo_inst = " Incorporate the brand logo reference cleanly on the creative." if brand_doc.get("logo") else ""

    if campaign_mode == "whatsapp":
        return (
            f"{block}\n{idea_str}{saas_directive}\n\n"
            f"Create a professional B2B WhatsApp campaign visual.{logo_inst} "
            "Clean, minimal, trust-building. Use workspace or UI imagery. "
            f"Aspect ratio: {aspect}. "
            f"Any text must be in {language}."
        )

    if campaign_mode == "email":
        return (
            f"{block}\n{idea_str}{saas_directive}\n\n"
            f"Create a professional B2B email campaign header image.{logo_inst} "
            "Clean corporate aesthetic, data-driven visual, no product packaging. "
            f"Aspect ratio: {aspect}. "
            f"Any text must be in {language}."
        )

    # ── Pick composition template ──
    template_block = ""
    if custom_directive:
        template_block = f"\nCOMPOSITION VARIATION: {custom_directive}\n"
    elif ad_template and ad_template in SAAS_AD_TEMPLATE_DIRECTIVES:
        t = SAAS_AD_TEMPLATE_DIRECTIVES[ad_template]
        template_block = f"\n{t['directive']}\n"
        print(f"[SaaSImageAgent] 🔲 Template #{ad_template}: {t['label']}")
    else:
        # Random SaaS-appropriate composition
        saas_compositions = [
            "Use a dramatic overhead flat-lay of a laptop/dashboard in a clean workspace.",
            "Use an extreme close-up of a UI metric card or KPI widget.",
            "Use an asymmetrical split layout — UI left, bold copy right.",
            "Use a straight-on eye-level shot of a clean, lit desk workspace.",
            "Use a bold typographic-first layout with a supporting UI visual below.",
            "Use a dynamic data visualization (chart/graph) as the hero element.",
        ]
        angle = random.choice(saas_compositions)
        template_block = f"\nCOMPOSITION VARIATION: {angle}\n"
        print(f"[SaaSImageAgent] 🤖 Free composition: {angle}")

    return (
        f"{block}\n{idea_str}{saas_directive}\n{template_block}\n"
        f"Create a high-converting B2B/SaaS ad creative for Instagram feed.{logo_inst} "
        "Use UI screenshots, dashboards, charts, or clean workspace photography as hero visual. "
        "NO product packaging. NO lifestyle stock photos. NO discount/sale elements. "
        f"Aspect ratio: {aspect}. Premium, professional, commercial quality. "
        f"Any text overlays must be in {language}."
    )


def build_saas_carousel_slide_prompts(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    slide_count: int,
    saas_directive: str,
    saas_intelligence: str = "",
    language: str = "english",
) -> List[str]:
    """
    Generates carousel slide texts using SaaS ad frameworks.
    Slide structure: Hook → Insight/Framework → Proof → CTA
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.7,
    )

    block = _brand_block(brand_doc)
    profile = get_saas_profile(brand_doc.get("businessCategory", ""))
    pillars = ", ".join(profile["content_pillars"]) if profile else "thought leadership, insights, frameworks"
    frameworks = ", ".join(profile["ad_frameworks"]) if profile else "Problem → Solution, Stat-led"
    intelligence_block = f"\nBrand Intelligence: {saas_intelligence}" if saas_intelligence else ""

    idea_info = f"\nCampaign Idea/Topic: {idea}" if idea else ""

    prompt = f"""{block}{intelligence_block}
{saas_directive}

Content pillars: {pillars}
Ad frameworks: {frameworks}
{idea_info}

Write the text for a professional B2B/SaaS Instagram Carousel with EXACTLY {slide_count} slides.
Output the text in {language}.

CAROUSEL STRUCTURE (follow exactly):
- Slide 1: HOOK — A bold stat, provocative question, or surprising insight that stops the scroll
- Middle slides: VALUE — Frameworks, tips, case study data, or feature explanations. Each slide is a standalone insight.
- Last slide: CTA — Clear next step aligned to the brand's CTA style: {profile['cta_style'] if profile else 'Book a Call | Learn More'}

RULES:
- NO discount/sale language
- NO festival/seasonal urgency
- NO product names unless it's a software feature
- Each slide must be concise (under 15 words of copy text)
- Speak directly to business decision-makers

Output ONLY a valid JSON array of strings (one per slide). No markdown, no labels.
Example: ["Slide 1 text", "Slide 2 text"]
"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
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
        print(f"[SaaSCarouselAgent] ❌ LLM failed: {e}")
        return [f"Slide {i+1}" for i in range(slide_count)]


def build_saas_video_prompt(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    aspect: str,
    saas_directive: str,
    language: str = "english",
) -> str:
    """B-roll style SaaS video prompt — workspace, UI, no consumer products."""
    block = _brand_block(brand_doc)
    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""

    return (
        f"{block}\n{idea_str}{saas_directive}\n\n"
        "Create a high-quality, professional B-roll style video for Instagram Reels. "
        "The video should feature: clean workspace shots, UI screen recordings, "
        "or smooth camera pans across data dashboards and analytics visuals. "
        "Lighting is natural, bright, and professional. Colour grade is clean and minimal. "
        "No people speaking to camera. No product packaging. No consumer lifestyle shots. "
        "Subtle motion only — slow pan, gentle zoom, or cursor interaction on screen. "
        f"Any text or visual overlays must be in {language}. "
        f"Aspect ratio: {aspect}. Commercial B2B advertising quality."
    )


def build_saas_ugc_video_prompt(
    brand_doc: Dict[str, Any],
    avatar_description: str,
    script: str,
    aspect: str,
    saas_directive: str,
    language: str = "english",
) -> str:
    """SaaS UGC video — professional talking-head, no consumer products."""
    block = _brand_block(brand_doc)
    return (
        f"{block}\n{saas_directive}\n\n"
        "Create a high-quality talking-head UGC style video for Instagram Reels. "
        f"Presenter: {avatar_description} "
        "The presenter must look directly at the camera in a professional setting "
        "(clean home office, standing desk, or minimal branded backdrop). "
        "Natural, confident delivery — expert tone, not salesy. "
        f"Script topic: \"{script}\" "
        "No product in hand. No discount language. "
        f"Any subtitles or overlays must be in {language}. "
        f"Aspect ratio: {aspect}. Professional B2B quality."
    )


def generate_saas_instagram_caption(
    brand_doc: Dict[str, Any],
    layout: str,
    idea: Optional[str],
    saas_directive: str,
    saas_intelligence: str = "",
    language: str = "english",
    index: int = 0,
) -> str:
    """Generates a B2B Instagram caption with SaaS copy tone."""
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.8,
        )
        brand_name = brand_doc.get("brandName", "Brand")
        block = _brand_block(brand_doc)
        profile = get_saas_profile(brand_doc.get("businessCategory", ""))
        cta = profile["cta_style"] if profile else "Book a Call | Learn More"
        idea_info = f"Campaign Topic/Idea: {idea}\n" if idea and idea.strip() else ""
        intelligence_block = f"Brand Intelligence: {saas_intelligence}\n" if saas_intelligence else ""

        sys_msg = (
            f"You are a B2B copywriter and Instagram content expert. "
            f"Write a professional Instagram caption in {language} for a {layout} post "
            f"for a SaaS/Services/Consulting brand. "
            "The caption must:\n"
            "1. Open with a bold stat, insight, or provocative question (no emojis in the opening line).\n"
            "2. Deliver 2-3 lines of value — a framework, result, or key insight.\n"
            "3. Include a clear CTA: use one of these → " + cta + "\n"
            "4. End with 5-8 highly relevant B2B hashtags.\n"
            "DO NOT use: sale language, urgency/FOMO, discount copy, or consumer lifestyle references.\n"
            "Output ONLY the caption with hashtags. No markdown. No quotes."
        )

        user_msg = (
            f"Brand: {block}\n"
            f"{intelligence_block}"
            f"{idea_info}"
            f"Post type: {layout}\n"
            f"Post index: {index + 1}\n\n"
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
        print(f"[SaaSCaptionAgent] ❌ Failed: {e}")
        defaults = [
            "The numbers don't lie. Here's what happened when we changed the approach. 📊\n#saas #b2b #growthhacking",
            "Most teams waste 40% of their time on this. Here's how to fix it. 🧠\n#productivity #automation #startup",
            "What separates 10× teams from the rest? It starts with this. 🎯\n#leadership #b2bgrowth #strategy",
        ]
        return defaults[index % len(defaults)]


# ─── Main Orchestrator ────────────────────────────────────────────────────────

def generate_saas_strategy_images(
    brand_doc: Dict[str, Any],
    layout: str,
    count: int,
    slide_count: int,
    aspect_ratio: str,
    idea: Optional[str],
    ref_images: List[str],
    saas_directive: str,
    saas_intelligence: str = "",
    ad_template: Optional[int] = None,
    language: str = "english",
    video_kind: Optional[str] = "img2video",
    avatar_description: Optional[str] = "",
    video_script: Optional[str] = "",
) -> List[Dict[str, Any]]:
    """
    SaaS-aware orchestrator for image/carousel/video/festival generation.
    E-Comm layout is explicitly blocked and will raise a ValueError.

    Args match generate_strategy_images() signature from strategy_image_agent.py
    so the caller in main.py can swap them transparently.
    """
    if layout == "ecomm":
        raise ValueError(
            "E-Comm Listing generation is not available for SaaS/Services/Consulting brands. "
            "Please use Image, Carousel, or Video instead."
        )

    print(
        f"\n[SaaSAgent] 🚀 Generating {count} {layout}(s) | "
        f"aspect={aspect_ratio} | refs={len(ref_images)} | language={language}"
    )

    results = []
    caption_pool = _SAAS_CAPTIONS.copy()
    random.shuffle(caption_pool)

    def pick_caption(i: int) -> str:
        return caption_pool[i % len(caption_pool)]

    assigned_refs = _select_ref_images(ref_images, count)

    fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

    # ── IMAGE ──────────────────────────────────────────────────────────────
    if layout == "image":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_4_3")

        # Build mixed SaaS compositions when no template is chosen
        mixed_directives: List[str] = []
        if ad_template is None:
            saas_comp = [
                "Use an overhead flat-lay of a laptop/dashboard in a clean workspace.",
                "Use an extreme close-up of a UI metric card or KPI widget.",
                "Use an asymmetrical split layout — UI left, bold copy right.",
                "Use a straight-on eye-level shot of a clean, lit desk workspace.",
                "Use a bold typographic-first layout with a supporting UI visual below.",
                "Use a dynamic data visualization (chart/graph) as the hero element.",
            ]
            random.shuffle(saas_comp)
            mixed_directives = [saas_comp[i % len(saas_comp)] for i in range(count)]

        def _template_for(i: int) -> Optional[int]:
            if ad_template == -1:
                return (i % len(SAAS_AD_TEMPLATE_DIRECTIVES)) + 1
            return ad_template

        tasks = []
        for i in range(count):
            ref = assigned_refs[i]
            if ref and not ref.startswith("http") and not ref.startswith("data:"):
                ref = "data:image/jpeg;base64," + ref
            t_id = _template_for(i)
            c_dir = mixed_directives[i] if (ad_template is None and mixed_directives) else None
            if ad_template is None:
                t_id = None

            prompt = build_saas_image_prompt(
                brand_doc, idea, aspect_ratio,
                saas_directive=saas_directive,
                ad_template=t_id,
                custom_directive=c_dir,
                language=language,
            )
            tasks.append((prompt, ref, i, t_id, c_dir))

        def run_image_task(task):
            prompt, ref, index, t_id, c_dir = task
            template_label = None
            if t_id and t_id in SAAS_AD_TEMPLATE_DIRECTIVES:
                template_label = SAAS_AD_TEMPLATE_DIRECTIVES[t_id]["label"]
            elif c_dir:
                template_label = c_dir[:60]

            print(f"\n[SaaSAgent] 🖼  Image {index+1}/{count} | ref={'YES' if ref else 'NO'} | template={template_label or 'free'}")

            caption = generate_saas_instagram_caption(
                brand_doc=brand_doc,
                layout="image",
                idea=idea,
                saas_directive=saas_directive,
                saas_intelligence=saas_intelligence,
                language=language,
                index=index,
            )
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=ref,
                    image_size=fal_size,
                )
                return {"image": result["image"], "caption": caption, "type": "image",
                        "template": template_label, "index": index}
            except Exception as e:
                print(f"[SaaSAgent] ❌ Image {index+1} failed: {e}")
                return {"image": None, "caption": caption, "type": "image",
                        "error": str(e), "index": index}

        print(f"[SaaSAgent] 🚀 Running {count} SaaS image(s) in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_image_task, tasks))
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── WHATSAPP / EMAIL ───────────────────────────────────────────────────
    elif layout in ["whatsapp", "email"]:
        ref = ref_images[0] if ref_images else None
        hero_image = ref
        if hero_image and not hero_image.startswith("http") and not hero_image.startswith("data:"):
            hero_image = "data:image/jpeg;base64," + hero_image

        print(f"\n[SaaSAgent] 📱 Campaign '{layout}' | image={'YES' if hero_image else 'NO'}")

        # Generate copy via Gemini
        from saas_agents.saas_campaign_copy import generate_saas_campaign_copy
        copy_res = generate_saas_campaign_copy(
            brand_doc=brand_doc,
            layout=layout,
            idea=idea,
            saas_directive=saas_directive,
            saas_intelligence=saas_intelligence,
            language=language,
        )
        results.append({
            "image": hero_image,
            "caption": copy_res.get("body", "Failed to generate copy."),
            "subject": copy_res.get("subject", ""),
            "type": layout,
            "template": "B2B Campaign",
        })

    # ── CAROUSEL ───────────────────────────────────────────────────────────
    elif layout == "carousel":
        def run_carousel_task(index):
            ref = assigned_refs[index]
            if ref and not ref.startswith("http") and not ref.startswith("data:"):
                ref = "data:image/jpeg;base64," + ref

            print(f"[SaaSAgent] ✍️ Drafting {slide_count} slides for carousel {index+1}...")
            slide_texts = build_saas_carousel_slide_prompts(
                brand_doc, idea, slide_count,
                saas_directive=saas_directive,
                saas_intelligence=saas_intelligence,
                language=language,
            )
            print(f"\n[SaaSAgent] 🎠 Carousel {index+1}/{count} | ref={'YES' if ref else 'NO'}")

            caption = generate_saas_instagram_caption(
                brand_doc=brand_doc,
                layout="carousel",
                idea=idea,
                saas_directive=saas_directive,
                saas_intelligence=saas_intelligence,
                language=language,
                index=index,
            )

            try:
                brand_name = brand_doc.get("brandName", "Brand")
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_name} — {idea}" if idea and idea.strip() else brand_name,
                    image=ref,
                    count=slide_count,
                    slide_prompts=slide_texts,
                )
                return {"slides": slides, "caption": caption, "type": "carousel", "index": index}
            except Exception as e:
                print(f"[SaaSAgent] ❌ Carousel {index+1} failed: {e}")
                return {"slides": [], "caption": caption, "type": "carousel",
                        "error": str(e), "index": index}

        print(f"[SaaSAgent] 🚀 Running {count} SaaS carousel(s) in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_carousel_task, range(count)))
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── VIDEO ──────────────────────────────────────────────────────────────
    elif layout == "video":
        if video_kind == "ai-ugc":
            if not avatar_description or not video_script:
                try:
                    llm = ChatGoogleGenerativeAI(
                        model="gemini-flash-latest",
                        google_api_key=os.getenv("GOOGLE_API_KEY"),
                        temperature=0.7,
                    )
                    brand_name = brand_doc.get("brandName", "Brand")
                    usp = brand_doc.get("usp", "")
                    profile = get_saas_profile(brand_doc.get("businessCategory", ""))
                    cta = profile["cta_style"] if profile else "Book a Call"

                    sys_msg = (
                        "You are a B2B content strategist. Generate a professional talking-head "
                        "UGC script and avatar description for a SaaS/Consulting company."
                    )
                    user_msg = (
                        f"Brand: {brand_name}\nUSP: {usp}\nCTA: {cta}\n\n"
                        "Output JSON with:\n"
                        "1. 'avatarDescription': A professional creator (e.g., 'A confident 30-something "
                        "professional in a clean home office with a bookshelf'). Under 200 chars.\n"
                        "2. 'videoScript': A 15-30 second script leading with an insight or stat, "
                        "ending with the CTA. No discount language. Under 500 chars.\n"
                        "Output ONLY valid JSON."
                    )
                    response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
                    content = response.content
                    if isinstance(content, list):
                        content = "".join(
                            p.get("text", "") if isinstance(p, dict) else str(p) for p in content
                        )
                    text = content.strip().lstrip("```json").lstrip("```").rstrip("```")
                    data = json.loads(text.strip())
                    if not avatar_description:
                        avatar_description = data.get("avatarDescription", "A professional presenter in a clean office.")
                    if not video_script:
                        video_script = data.get("videoScript", f"Here's how {brand_name} helps you achieve more with less.")
                except Exception as e:
                    print(f"[SaaSAgent] UGC fallback: {e}")
                    avatar_description = avatar_description or "A confident professional in a clean home office."
                    video_script = video_script or f"Discover how {brand_doc.get('brandName', 'we')} can transform your workflow."

            video_prompt = build_saas_ugc_video_prompt(
                brand_doc, avatar_description, video_script, aspect_ratio, saas_directive, language
            )
        else:
            video_prompt = build_saas_video_prompt(
                brand_doc, idea, aspect_ratio, saas_directive, language
            )

        print(f"\n[SaaSAgent] 🎥 Video ({video_kind}) | Prompt length: {len(video_prompt)}")

        def run_video_task(index):
            ref = assigned_refs[index] if index < len(assigned_refs) else None
            print(f"\n[SaaSAgent] 🎬 Video {index+1}/{count}...")
            try:
                if ref and not ref.startswith("http") and not ref.startswith("data:"):
                    ref = "data:image/jpeg;base64," + ref

                if video_kind == "ai-ugc":
                    # Stage 1: Brand DNA + avatar + directive + the script is passed to GPT Image
                    brand_info = _brand_block(brand_doc)
                    stage1_prompt = f"""{brand_info}
{saas_directive}
Avatar Description: {avatar_description}
Video Script: {video_script}

Create a high-quality, photorealistic portrait image of this UGC creator/presenter in a professional office environment, which will be used to generate a UGC video. The scene is bright and clean. No text overlays, letters, or characters on the image. Aspect ratio: {aspect_ratio}."""
                    
                    print(f"[SaaSAgent] UGC Stage 1: Generating starting image with GPT-Image-2...")
                    gpt_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_16_9")
                    gpt_res = generate_fal_image_gpt2(prompt=stage1_prompt, image=ref, image_size=gpt_size)
                    generated_img = gpt_res.get("image")
                    if not generated_img:
                        raise Exception("UGC Stage 1 image generation failed")
                    
                    # Generate custom B2B Instagram caption + hashtags using Gemini during Stage 1
                    caption = generate_saas_instagram_caption(
                        brand_doc=brand_doc,
                        layout="video",
                        idea=f"UGC Video post with script: {video_script}",
                        saas_directive=saas_directive,
                        saas_intelligence=saas_intelligence,
                        language=language,
                        index=index,
                    )
                    
                    # Stage 2: Take the generated hero image and send it to Seedance Image-to-Video
                    print(f"[SaaSAgent] UGC Stage 2: Animating starting image with Seedance Fast Image-to-Video...")
                    result = generate_fal_video_seedance(prompt=video_prompt, image=generated_img, aspect_ratio=aspect_ratio)
                else:
                    # Standard img2video uses Wan Image-to-Video
                    caption = pick_caption(index)
                    result = generate_fal_video_wan(video_prompt, image=ref, aspect_ratio=aspect_ratio)

                return {"url": result.get("url"), "thumbnail": result.get("thumbnail"),
                        "caption": caption, "type": "video", "index": index}
            except Exception as e:
                print(f"[SaaSAgent] ❌ Video {index+1} failed: {e}")
                return {"url": None, "caption": pick_caption(index), "type": "video",
                        "error": str(e), "index": index}

        print(f"[SaaSAgent] 🚀 Running {count} SaaS video(s) in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_video_task, range(count)))
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── FESTIVAL (transformed to thought-leadership) ────────────────────────
    elif layout == "festival":
        # Delegate to saas_festival_agent
        from saas_agents.saas_festival_agent import generate_saas_festival_images
        results = generate_saas_festival_images(
            brand_doc=brand_doc,
            count=count,
            aspect_ratio=aspect_ratio,
            idea=idea,
            ref_images=ref_images,
            saas_directive=saas_directive,
            saas_intelligence=saas_intelligence,
            language=language,
        )

    else:
        raise ValueError(f"Unknown layout type: {layout}")

    print(f"[SaaSAgent] ✅ Done — {len(results)} item(s) generated")
    return results
