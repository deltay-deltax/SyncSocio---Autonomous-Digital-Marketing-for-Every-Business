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
from strategy_image_agent import AD_TEMPLATE_DIRECTIVES, _brand_block
from dotenv import load_dotenv

load_dotenv()

# ── Re-use FAL visual engines from parent ────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fal_visual_engine import (
    generate_fal_image_gpt2,
    generate_fal_carousel_ideogram,
)
from veo_engine import generate_veo_video
from saas_agents.saas_profiles import get_saas_profile


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
AD_TEMPLATE_DIRECTIVES: Dict[int, Dict[str, str]] = {
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

    # ── Generic formats for when a user selects a track but no sub-format ──
    100: {"label": "Custom Text-led", "track": "text_led"},
    
    # ── Text-led formats (101–104) — name tells the model what to create ────────
    101: {"label": "Outcome-led",   "track": "text_led"},
    102: {"label": "Stat-led",       "track": "text_led"},
    103: {"label": "Social Proof",   "track": "text_led"},
    104: {"label": "Before / After", "track": "text_led"},

    # ── UI/Image-led formats (105–106) — ref screenshot anchors the output ───
    105: {"label": "Feature Callout", "track": "image_led"},
    106: {"label": "Dashboard Hero",  "track": "image_led"},
    
    110: {"label": "Custom Image-led", "track": "image_led"},
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
    if ".svg" in url_or_b64.lower():
        print(f"[SaasAgent] ⚠️ Skipping SVG reference image (not supported by FAL): {url_or_b64[:60]}")
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


# IDs for image-led formats that require a reference screenshot
_IMAGE_LED_TEMPLATE_IDS = {105, 106, 110}
# IDs for text-led formats — no dashboard/UI imagery expected
_TEXT_LED_TEMPLATE_IDS  = {100, 101, 102, 103, 104}


def is_image_led_template(ad_template: Optional[int]) -> bool:
    """Returns True when the chosen template is in the UI/image-led track (105-106)."""
    return ad_template in _IMAGE_LED_TEMPLATE_IDS


def is_text_led_template(ad_template: Optional[int]) -> bool:
    """Returns True when the chosen template is in the text-led track (101-104)."""
    return ad_template in _TEXT_LED_TEMPLATE_IDS


def build_saas_image_prompt(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    aspect: str,
    product: Optional[Dict[str, Any]] = None,
    ad_template: Optional[int] = None,
    custom_directive: Optional[str] = None,
    language: str = "english",
    campaign_mode: Optional[str] = None,
    include_logo: bool = True,
) -> str:
    category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "Services"))
    block = _brand_block(brand_doc)
    
    product_block = ""
    if product:
        product_block = f"""
Service Business: {category}
Featured Service: {product.get('name', '')}
Pricing: {product.get('offerPrice', '') or product.get('price', '')}
Key Benefit: {product.get('keyBenefit', '')}
Description: {product.get('description', '')}

Make this specific service the **hero** of the ad.
Anchor the visual to this exact service.
"""

    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""
    
    if include_logo and brand_doc.get("logo"):
        logo_inst = " Incorporate the brand logo reference cleanly on the creative. Do not assume or add any fake logos or text."
    elif not include_logo:
        logo_inst = " Absolutely DO NOT include any logos, brand marks, or placeholder logos in this creative."
    else:
        logo_inst = " Do not assume or add any fake logos or text."

    if campaign_mode == "whatsapp":
        return f"""{block}
{product_block}
{idea_str}Create a high-converting service business whatsapp ad creative. Make it feel native to whatsapp msg.{logo_inst} Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}."""

    if campaign_mode == "email":
        return f"""{block}
{product_block}
{idea_str}Create a high-converting service business email campaign creative. Make it feel native to an email newsletter.{logo_inst} Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}."""

    template_block = ""
    if custom_directive:
        template_block = f"\nCOMPOSITION VARIATION: {custom_directive}\n"
    elif ad_template and ad_template in AD_TEMPLATE_DIRECTIVES:
        t = AD_TEMPLATE_DIRECTIVES[ad_template]
        label = t["label"]
        track = t.get("track", "")
        # New SaaS formats (100-110): just name the format, let the model interpret it
        if ad_template >= 100:
            if track == "image_led":
                template_block = (
                    f"\nAd Format: {label}."
                    f" A reference screenshot/UI image is provided — use it as the visual anchor."
                    f" Replicate its colors, layout, and UI style faithfully in the creative.\n"
                )
            else:
                template_block = (
                    f"\nAd Format: {label}.\n"
                    f"CRITICAL INSTRUCTION: This is a typographic, text-led design, but you CAN use minimal vector icons, charts, infographics, or geometric shapes to enhance the layout. "
                    f"Use a clean solid or smooth gradient background. "
                    f"Focus entirely on beautiful, large, high-impact typography and clean graphic elements. "
                    f"ABSOLUTELY NO people, NO workspaces, NO UI screenshots, NO product shots, and NO complex illustrations.\n"
                )
        else:
            # Legacy D2C-style SaaS templates (1-8): use full directive
            template_block = f"\n{t['directive']}\n"
    else:
        # If no template is provided, let the AI decide entirely based on its training
        pass

    platform_instruction = "Make it feel native to Instagram feed."

    is_text_led = ad_template and ad_template >= 100 and AD_TEMPLATE_DIRECTIVES.get(ad_template, {}).get("track") == "text_led"
    quality_str = "Clean, minimalist, premium typographic design." if is_text_led else "Premium, photorealistic, commercial quality."

    return f"""{block}
{product_block}
{idea_str}{template_block}
Create a high-converting service business ad creative.
{platform_instruction}
{logo_inst}
Aspect ratio: {aspect}. {quality_str}
Any text overlays, labels, or copy displayed in the image must be in {language}."""


def build_saas_carousel_slide_prompts(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    slide_count: int,
    product: Optional[Dict[str, Any]] = None,
    language: str = "english"
) -> List[str]:
    llm = ChatGoogleGenerativeAI(model="gemini-flash-lite-latest", temperature=0.7)
    category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "Services"))
    block = _brand_block(brand_doc)
    prod_info = ""
    if product:
        prod_info = f"Featured Service: {product.get('name','')}\\nBenefit: {product.get('keyBenefit','')}\\n"
    
    idea_info = f"\\nCampaign Idea/Topic: {idea}" if idea else ""
    
    prompt = f"""{block}
{prod_info}{idea_info}

Write the text for an engaging Instagram Carousel with EXACTLY {slide_count} slides for this service business.
Output the text in {language}.

CAROUSEL STRUCTURE:
- Slide 1: HOOK — A strong hook that grabs attention (question, bold statement, or related to the service).
- Middle slides: VALUE — Break down the benefits, features, or steps of the service.
- Last slide: CTA — Clear call to action (e.g. Book a Consultation, Learn More).

Example: ["Slide 1 text", "Slide 2 text"]
Output ONLY a raw valid JSON array of strings, with no markdown formatting or backticks.
"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        text = content.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"[SaaSCarousel] LLM failed: {e}")
        return [f"Slide {i+1}" for i in range(slide_count)]


def build_saas_video_prompt(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    aspect: str,
    product: Optional[Dict[str, Any]] = None,
    language: str = "english",
) -> str:
    category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "Services"))
    block = _brand_block(brand_doc)
    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""
    
    product_block = ""
    if product:
        product_block = f"""
Featured Service: {product.get('name', '')}
Pricing: {product.get('offerPrice', '') or product.get('price', '')}
"""
    return f"""{block}
{product_block}
{idea_str}
Create a high-quality, professional B-roll style video for Instagram Reels for this service business.
The video should feature clean shots relevant to the service category ({category}).
Lighting is natural, bright, and professional. 
Subtle motion only — slow pan, gentle zoom. 
Subtitles/captions must be styled in a very small, minimal, neat, clean font size at the bottom of the video.
Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen.
Any text or visual overlays must be in {language}. 
Aspect ratio: {aspect}. Commercial advertising quality."""


def build_saas_ugc_video_prompt(
    brand_doc: Dict[str, Any],
    avatar_description: str,
    script: str,
    aspect: str,
    language: str = "english",
) -> str:
    """SaaS UGC video — professional talking-head, no consumer products."""
    block = _brand_block(brand_doc)
    return (
        f"{block}\n\n"
        "Create a high-quality talking-head UGC style video for Instagram Reels. "
        f"Presenter: {avatar_description}. The presenter must speak in English with a professional, clear Indian accent. "
        "The presenter must look directly at the camera in a professional setting "
        "(clean home office, standing desk, or minimal branded backdrop). "
        "Natural, confident delivery — expert tone, not salesy. "
        f"Script topic: \"{script}\" "
        "No product in hand. No discount language. "
        "Subtitles/captions must be styled in a very small, minimal, neat, clean font size at the bottom of the video. "
        "Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen. "
        f"Any subtitles or overlays must be in {language}. "
        f"Aspect ratio: {aspect}. Professional B2B quality."
    )


def generate_saas_instagram_caption(
    brand_doc: Dict[str, Any],
    layout: str,
    idea: Optional[str],
    language: str = "english",
    index: int = 0,
) -> str:
    """Generates a B2B Instagram caption with SaaS copy tone."""
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-lite-latest",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.8,
        )
        brand_name = brand_doc.get("brandName", "Brand")
        block = _brand_block(brand_doc)
        profile = get_saas_profile((brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")))
        cta = profile["cta_style"] if profile else "Book a Call | Learn More"
        idea_info = f"Campaign Topic/Idea: {idea}\n" if idea and idea.strip() else ""
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
            f""
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
    products: Optional[List[Dict[str, Any]]] = None,
    ad_template: Optional[int] = None,
    language: str = "english",
    video_kind: Optional[str] = "img2video",
    avatar_description: Optional[str] = "",
    video_script: Optional[str] = "",
    video_resolution: Optional[str] = "1080p",
    video_duration: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    SaaS-aware orchestrator for image/carousel/video/festival generation.
    E-Comm layout is explicitly blocked and will raise a ValueError.

    Args match generate_strategy_images() signature from strategy_image_agent.py
    so the caller in main.py can swap them transparently.
    """
    user_plan = str(brand_doc.get("selectedPlan", "starter")).lower()
    img_quality = "low" if "starter" in user_plan else "medium"

    # If Nepal target, force language to English or Nepali
    loc = brand_doc.get("location")
    country = "Unknown"
    if isinstance(loc, dict):
        country = loc.get("country") or brand_doc.get("country") or "Unknown"
    else:
        country = brand_doc.get("country") or "Unknown"

    if country.lower() == "nepal" and language:
        if language.lower() not in ["english", "nepali"]:
            language = "english"

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

    # Separate product/screenshot refs from the logo URL so that image-led
    # templates always get the actual UI/product image, not the brand logo.
    logo_url = brand_doc.get("logo", "")
    product_ref_images = [r for r in ref_images if r != logo_url] if logo_url else ref_images
    # Fall back to full pool if there are no product-only refs
    if not product_ref_images:
        product_ref_images = ref_images

    assigned_refs = _select_ref_images(product_ref_images, count)

    fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

    # ── IMAGE ──────────────────────────────────────────────────────────────
    if layout == "image":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_4_3")

        # Build mixed SaaS compositions when no template is chosen
        mixed_directives: List[str] = []

        def _template_for(i: int) -> Optional[int]:
            if ad_template == -1:
                return (i % len(AD_TEMPLATE_DIRECTIVES)) + 1
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

            prod = products[i] if (products and i < len(products)) else (products[0] if products else None)
            prompt = build_saas_image_prompt(
                brand_doc, idea, aspect_ratio,
                product=prod,
                ad_template=t_id,
                custom_directive=c_dir,
                language=language,
            )
            tasks.append((prompt, ref, i, t_id, c_dir, prod))

        def run_image_task(task):
            prompt, ref, index, t_id, c_dir, prod = task
            template_label = None
            if t_id and t_id in AD_TEMPLATE_DIRECTIVES:
                template_label = AD_TEMPLATE_DIRECTIVES[t_id]["label"]
            elif c_dir:
                template_label = c_dir[:60]

            # Resolve logo once for the batch
            logo_url = brand_doc.get("logo")
            resolved_logo = None
            if logo_url:
                raw_logo = _resolve_ref_image(logo_url)
                if raw_logo:
                    resolved_logo = "data:image/jpeg;base64," + raw_logo if not raw_logo.startswith("http") and not raw_logo.startswith("data:") else raw_logo

            # Determine creative track for this template
            _track = "auto"
            include_logo_in_prompt = True
            
            if is_text_led_template(t_id):
                _track = "text_led"
                # Text-led formats are purely typographic, but they can still feature the brand logo
                effective_ref = [resolved_logo] if resolved_logo else []
                if not effective_ref:
                    effective_ref = None
                include_logo_in_prompt = True
                print(f"\n[SaaSAgent] 🔤 Image {index+1}/{count} | track=TEXT-LED | template={template_label}")
            elif is_image_led_template(t_id):
                _track = "image_led"
                # Resolve the product/dashboard ref to base64 FIRST.
                # GPT-Image-2 edit mode only accepts binary/base64 — NOT HTTP URLs.
                # _resolve_ref_image() handles HTTP URLs by downloading them.
                resolved_ref = _resolve_ref_image(ref) if ref else None
                if resolved_ref and not resolved_ref.startswith("data:"):
                    resolved_ref = "data:image/jpeg;base64," + resolved_ref
                # Pass BOTH the dashboard screenshot AND the brand logo to FAL
                effective_ref = [resolved_ref] if resolved_ref else []
                if resolved_logo:
                    effective_ref.append(resolved_logo)
                if not effective_ref:
                    effective_ref = None
                print(f"\n[SaaSAgent] 🖥  Image {index+1}/{count} | track=IMAGE-LED | ref_resolved={'YES' if resolved_ref else 'NO'} | refs={len(effective_ref) if effective_ref else 0} | template={template_label}")
            else:
                # Auto track — also resolve any HTTP URL refs to base64
                resolved_ref = _resolve_ref_image(ref) if ref else None
                if resolved_ref and not resolved_ref.startswith("data:"):
                    resolved_ref = "data:image/jpeg;base64," + resolved_ref
                effective_ref = [resolved_ref] if resolved_ref else []
                if resolved_logo:
                    effective_ref.append(resolved_logo)
                if not effective_ref:
                    effective_ref = None
                print(f"\n[SaaSAgent] 🖼  Image {index+1}/{count} | track=auto | ref_resolved={'YES' if resolved_ref else 'NO'} | refs={len(effective_ref) if effective_ref else 0} | template={template_label or 'free'}")

            # Rebuild prompt with the correct include_logo flag
            prompt = build_saas_image_prompt(
                brand_doc, idea, aspect_ratio,
                product=prod,
                ad_template=t_id,
                custom_directive=c_dir,
                language=language,
                include_logo=include_logo_in_prompt
            )

            print(f"[SaaSAgent] 📝 Image Prompt:\n{prompt}\n")
            caption = generate_saas_instagram_caption(
                brand_doc=brand_doc,
                layout="image",
                idea=idea,
                language=language,
                index=index,
            )
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=effective_ref,
                    image_size=fal_size,
                    quality=img_quality,
                )
                return {"image": result["image"], "caption": caption, "type": "image",
                        "template": template_label, "track": _track, "index": index}
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

            prod = products[index] if (products and index < len(products)) else (products[0] if products else None)
            print(f"[SaaSAgent] ✍️ Drafting {slide_count} slides for carousel {index+1}...")
            slide_texts = build_saas_carousel_slide_prompts(
                brand_doc, idea, slide_count,
                product=prod,
                language=language,
            )
            
            base_image_prompt = build_saas_image_prompt(
                brand_doc, idea, aspect_ratio,
                product=prod,
                ad_template=None,
                custom_directive="Design a cohesive, premium carousel slide. Embed the SLIDE TEXT directly in the image layout.",
                language=language,
            )
            enriched_slide_prompts = [f"{base_image_prompt}\n\nSLIDE TEXT TO INCLUDE: {text}" for text in slide_texts]

            print(f"\n[SaaSAgent] 🎠 Carousel {index+1}/{count} | ref={'YES' if ref else 'NO'}")
            print(f"[SaaSAgent] 📝 Carousel Slide Prompts:\n{json.dumps(slide_texts, indent=2)}\n")
            caption = generate_saas_instagram_caption(
                brand_doc=brand_doc,
                layout="carousel",
                idea=idea,
                language=language,
                index=index,
            )

            try:
                brand_name = brand_doc.get("brandName", "Brand")
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_name} — {idea}" if idea and idea.strip() else brand_name,
                    image=ref,
                    count=slide_count,
                    slide_prompts=enriched_slide_prompts,
                    image_size=fal_size,
                    quality=img_quality,
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
                        model="gemini-flash-lite-latest",
                        google_api_key=os.getenv("GOOGLE_API_KEY"),
                        temperature=0.7,
                    )
                    brand_name = brand_doc.get("brandName", "Brand")
                    usp = brand_doc.get("usp", "")
                    profile = get_saas_profile((brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")))
                    cta = profile["cta_style"] if profile else "Book a Call"

                    sys_msg = (
                        "You are a B2B content strategist. Generate a professional talking-head "
                        "UGC script and avatar description for a SaaS/Consulting company."
                    )
                    user_msg = (
                        f"Brand: {brand_name}\nUSP: {usp}\nCTA: {cta}\n\n"
                        "Output JSON with:\n"
                        "1. 'avatarDescription': A professional creator of Indian descent (e.g., 'A confident 30-something "
                        "Indian professional in a clean home office with a bookshelf'). Under 200 chars.\n"
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
                        avatar_description = data.get("avatarDescription", "A professional Indian presenter in a clean office.")
                    if not video_script:
                        video_script = data.get("videoScript", f"Here's how {brand_name} helps you achieve more with less.")
                except Exception as e:
                    print(f"[SaaSAgent] UGC fallback: {e}")
                    avatar_description = avatar_description or "A confident Indian professional in a clean home office."
                    video_script = video_script or f"Discover how {brand_doc.get('brandName', 'we')} can transform your workflow."

            video_prompt = build_saas_ugc_video_prompt(
                brand_doc, avatar_description, video_script, aspect_ratio, language
            )
        else:
            prod = products[0] if products else None
            video_prompt = build_saas_video_prompt(
                brand_doc, idea, aspect_ratio,
                product=prod,
                language=language
            )

        print(f"\n[SaaSAgent] 🎥 Video ({video_kind}) | Prompt length: {len(video_prompt)}")

        def run_video_task(index):
            ref = assigned_refs[index] if index < len(assigned_refs) else None
            print(f"\n[SaaSAgent] 🎬 Video {index+1}/{count}...")
            print(f"[SaaSAgent] 📝 Video Prompt:\n{video_prompt}\n")
            try:
                if ref and not ref.startswith("http") and not ref.startswith("data:"):
                    ref = "data:image/jpeg;base64," + ref

                if video_kind == "ai-ugc":
                    # Stage 1: Brand DNA + avatar + directive + the script is passed to GPT Image
                    brand_info = _brand_block(brand_doc)
                    stage1_prompt = f"""{brand_info}

Avatar Description: {avatar_description}
Video Script: {video_script}

Create a high-quality, photorealistic portrait image of this UGC creator/presenter in a professional office environment, which will be used to generate a UGC video. The scene is bright and clean. No text overlays, letters, or characters on the image. Aspect ratio: {aspect_ratio}."""
                    
                    print(f"[SaaSAgent] UGC Stage 1: Generating starting image with GPT-Image-2...")
                    print(f"[SaaSAgent] 📝 UGC Stage 1 Prompt:\n{stage1_prompt}\n")
                    gpt_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_16_9")
                    gpt_res = generate_fal_image_gpt2(prompt=stage1_prompt, image=None, image_size=gpt_size, quality=img_quality)
                    generated_img = gpt_res.get("image")
                    if not generated_img:
                        raise Exception("UGC Stage 1 image generation failed")
                    
                    # Generate custom B2B Instagram caption + hashtags using Gemini during Stage 1
                    caption = generate_saas_instagram_caption(
                        brand_doc=brand_doc,
                        layout="video",
                        idea=f"UGC Video post with script: {video_script}",
                        language=language,
                        index=index,
                    )
                    
                    # Stage 2: Take the generated hero image and animate it with Veo 3.1 Fast
                    print(f"[SaaSAgent] UGC Stage 2: Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=video_prompt, image=generated_img, aspect_ratio=aspect_ratio, duration=video_duration or 8, resolution=video_resolution or "1080p")
                else:
                    # Standard img2video uses Google Veo 3.1 Fast
                    caption = pick_caption(index)
                    print(f"[SaaSAgent] Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=video_prompt, image=ref, aspect_ratio=aspect_ratio, duration=video_duration or 8, resolution=video_resolution or "1080p")

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
            language=language,
        )

    else:
        raise ValueError(f"Unknown layout type: {layout}")

    print(f"[SaaSAgent] ✅ Done — {len(results)} item(s) generated")
    return results
