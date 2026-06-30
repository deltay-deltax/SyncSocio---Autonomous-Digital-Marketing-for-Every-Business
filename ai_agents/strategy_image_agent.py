"""
Strategy Image Agent
Handles AI image/carousel/video generation for the ContentStrategy page.

Supports:
- Image layout   → GPT-Image-2 via FAL (N parallel images)
- Carousel layout → Ideogram v2 Turbo via FAL (per-slide progressive narrative)
- Video layout   → Minimax Video-01 via FAL (cinematic 9:16 brief)

Ref-image routing:
- len(refs) == count   → 1-to-1 pairing
- len(refs) < count    → randomize/cycle through pool
- len(refs) == 0       → prompt-only generation
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

from fal_visual_engine import (
    generate_fal_image_gpt2,
    generate_fal_carousel_ideogram,
    generate_fal_video_wan,
    generate_fal_video_seedance,
)

# ──────────────────────────────────────────────
# Caption bank (AI-feel, brand-positive)
# ──────────────────────────────────────────────
_CAPTIONS = [
    "When the algorithm finally gets you ✨",
    "POV: your brand glow-up era 🚀",
    "Soft launch but make it ✨ aesthetic ✨",
    "This is your sign to start that thing 💌",
    "Built different. Designed louder. 🎯",
    "We don't post for likes, we post for legacy 👑",
    "Your next obsession just dropped 🔥",
    "The brand that gets it — finally 💫",
    "Quiet luxury. Loud results. ✦",
    "Not just a product. An experience. 🌿",
]


# ──────────────────────────────────────────────
# Aspect ratio → FAL image_size mapping
# ──────────────────────────────────────────────
ASPECT_TO_FAL_SIZE: Dict[str, str] = {
    "1:1":  "square_hd",
    "4:5":  "portrait_4_3",   # closest FAL match
    "9:16": "portrait_16_9",  # 9:16 vertical
    "16:9": "landscape_16_9", # 16:9 horizontal
    "2:3":  "portrait_4_3",   # closest FAL match
}


# ──────────────────────────────────────────────
# E-comm: Shot-type rotation (8 unique shots)
# ──────────────────────────────────────────────
ECOMM_SHOT_TYPES: List[Dict[str, str]] = [
    {
        "id": "flat_lay",
        "label": "Hero Flat-Lay",
        "directive": "Overhead 90° flat-lay. Pure white background. Product dead-center. No shadows. Clean isolated look.",
    },
    {
        "id": "lifestyle_hold",
        "label": "Lifestyle Hand-Hold",
        "directive": "Model's hand holding the product. Glowing healthy skin in background. Soft warm sidelight at 45°. Real lifestyle feel.",
    },
    {
        "id": "macro_detail",
        "label": "Macro Close-Up",
        "directive": "Extreme close-up on product label, texture, and packaging detail. Shallow depth-of-field bokeh. Premium studio macro lighting.",
    },
    {
        "id": "styled_editorial",
        "label": "Styled Editorial",
        "directive": "Styled scene with on-brand props and brand-color backdrop. Asymmetric editorial composition. Magazine-quality aesthetics.",
    },
    {
        "id": "ritual_in_use",
        "label": "In-Use Ritual",
        "directive": "Product mid-application or mid-use. Bathroom countertop or vanity surface. Mist / steam / glow effect. Routine/ritual mood.",
    },
    {
        "id": "gifting_unbox",
        "label": "Gifting & Unboxing",
        "directive": "Product arranged in premium gifting context. Tissue paper, ribbon, gift box. Soft pastel or brand-color background. Gift-ready mood.",
    },
    {
        "id": "shadow_play",
        "label": "Dramatic Shadow Play",
        "directive": "Single product on clean surface. Dramatic directional sidelight. Long bold cast shadow. Minimal negative space. High contrast.",
    },
    {
        "id": "outdoor_lifestyle",
        "label": "Outdoor Lifestyle",
        "directive": "Product in outdoor natural light. Lush foliage, garden, or natural texture surface. Candid, fresh, real-world setting.",
    },
]

# For counts > 8: cycle back with a warm/cool tone variant suffix
ECOMM_SHOT_VARIANTS = [" Warm golden tones variant.", " Cool blue-toned variant."]


# ──────────────────────────────────────────────
# E-comm: Platform-specific visual rules
# ──────────────────────────────────────────────
PLATFORM_RULES: Dict[str, str] = {
    "Amazon":   "White or very light grey background required. Product fully isolated. No lifestyle elements. Clean edges. Meets Amazon main image policy.",
    "Flipkart": "Bold graphic treatment. High saturation colors. Price callout area reserved at bottom. Energetic Indian D2C feel.",
    "Myntra":   "Fashion editorial aesthetic. Lifestyle model usage acceptable. Trendy composition. Aspirational youth-targeted feel.",
    "Nykaa":    "Warm golden beauty lifestyle. Skincare ritual mood. Real-skin texture acceptable. Avoid plain white BG. Soft luxury D2C aesthetic.",
    "Shopify":  "Brand-first premium editorial. Strong visual storytelling. Clean negative space. Direct-to-consumer prestige tone.",
    "Meesho":   "Budget-friendly energetic feel. Colorful, vibrant, value messaging friendly. Relatable everyday Indian consumer aesthetic.",
}


# ──────────────────────────────────────────────
# Image: Ad composition template directives
# ──────────────────────────────────────────────
# Maps template id (1-10) to a precise layout/composition instruction injected into the prompt.
AD_TEMPLATE_DIRECTIVES: Dict[int, Dict[str, str]] = {
    1: {
        "label":     "Product Hero + Bottom Text Bar",
        "directive": (
            "LAYOUT: Product Hero + Bottom Text Bar. "
            "Product takes up 70% of the frame, hero position centered or slightly above center. "
            "A solid brand-colored horizontal bar spans the full bottom 25% of the frame containing "
            "the headline and sub-copy. High contrast between bar color and product background."
        ),
    },
    2: {
        "label":     "Bold Headline Top + Product Center",
        "directive": (
            "LAYOUT: Bold Headline Top, Product Center. "
            "Large, bold headline text anchored at the top third. "
            "Product displayed prominently in the center of the frame, full visibility. "
            "Clean background that contrasts with the product. Minimal clutter."
        ),
    },
    3: {
        "label":     "Split Layout — Product Left, Text Right",
        "directive": (
            "LAYOUT: 50/50 Vertical Split. "
            "Left half: product on a colored or gradient background. "
            "Right half: clean contrasting panel with headline, benefit bullets, and a CTA button. "
            "Crisp dividing edge between panels. Balanced visual weight."
        ),
    },
    4: {
        "label":     "Full Bleed Product + Text Overlay",
        "directive": (
            "LAYOUT: Full-Bleed Lifestyle. "
            "Product or lifestyle scene fills the entire frame edge-to-edge. "
            "Semi-transparent overlay gradient (dark at top and/or bottom) to allow legible text. "
            "Headline text overlaid on the gradient zone. Cinematic, immersive feel."
        ),
    },
    5: {
        "label":     "Minimal White + Centered Product + Text Below",
        "directive": (
            "LAYOUT: Minimal White Canvas. "
            "Pure white or very light grey background. "
            "Product precisely centered in upper 60% of frame. "
            "Clean, spaced-out headline and subtext below the product. "
            "Lots of negative space. Premium minimalist aesthetic."
        ),
    },
    6: {
        "label":     "Dark Background + Product + Vibrant CTA",
        "directive": (
            "LAYOUT: Dark Mode Drama. "
            "Deep dark background (near-black, dark navy, or brand dark). "
            "Product rendered with dramatic rim-lighting or neon-edge glow. "
            "Vibrant accent-colored CTA button or call-to-action badge in a corner. "
            "High contrast and punchy visual energy."
        ),
    },
    7: {
        "label":     "Before / After Split",
        "directive": (
            "LAYOUT: Before / After Comparison. "
            "Frame split exactly in half vertically. "
            "Left = 'BEFORE' state: muted tones, dull skin or problem state, greyscale acceptable. "
            "Right = 'AFTER' state: vibrant, glowing, improved result with product visible. "
            "'BEFORE' and 'AFTER' labels clearly shown in each panel. "
            "Dramatic contrast between halves."
        ),
    },
    8: {
        "label":     "Social Proof — Stars + Quote + Product",
        "directive": (
            "LAYOUT: Social Proof Showcase. "
            "Product visible on one side (left or right). "
            "5-star rating graphic prominently displayed. "
            "Short customer quote or testimonial text in a speech-bubble or card. "
            "Reviewer name/handle below the quote. "
            "Warm, trustworthy color palette."
        ),
    },
    9: {
        "label":     "Feature List + Product",
        "directive": (
            "LAYOUT: Benefits Grid. "
            "Product on left or top. "
            "3–4 bullet-point feature callouts on the right or below, each with a small icon or checkmark. "
            "Clean, structured layout. Sans-serif typography. "
            "Brand color accents on icons and bullets."
        ),
    },
    10: {
        "label":     "Urgency / Offer",
        "directive": (
            "LAYOUT: Urgency Offer Banner. "
            "Large, bold discount badge or percentage callout (e.g. '40% OFF') dominating the top. "
            "Product centered below the badge. "
            "Deadline or scarcity text at the bottom (e.g. 'Ends Tonight · Limited Stock'). "
            "High-energy warm palette (reds, oranges, yellows). Eye-catching, impulsive-purchase mood."
        ),
    },
}


# ──────────────────────────────────────────────
# Ref-image resolver
# ──────────────────────────────────────────────
def _to_jpeg_b64(raw_b64: str) -> Optional[str]:
    """
    Converts any image format (AVIF, WebP, PNG, JPEG, etc.) to JPEG base64.
    Uses Pillow for universal decoding.
    Returns None if conversion fails.
    """
    try:
        from PIL import Image
        import io as _io

        raw_bytes = base64.b64decode(raw_b64)
        img = Image.open(_io.BytesIO(raw_bytes))

        # Ensure RGB (AVIF/PNG can be RGBA or P-mode)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        buffer = _io.BytesIO()
        img.save(buffer, format="JPEG", quality=90, optimize=True)
        converted_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        orig_kb  = len(raw_b64) * 3 // 4 // 1024
        conv_kb  = len(converted_b64) * 3 // 4 // 1024
        print(f"[StrategyAgent] 🔄 Converted image → JPEG ({orig_kb} KB → {conv_kb} KB, mode was {img.mode})")
        return converted_b64
    except Exception as e:
        print(f"[StrategyAgent] ⚠️  Image conversion failed: {e}")
        return None


def _resolve_ref_image(url_or_b64: str) -> Optional[str]:
    """
    Accepts:
    - A base64 data-URL (any MIME type) → converts to JPEG
    - An http(s) URL                     → fetches, converts to JPEG
    - A raw base64 string (no prefix)   → converts to JPEG
    Returns clean JPEG base64, or None on failure.
    """
    if not url_or_b64:
        return None

    raw_b64 = None

    # ── Case 1: data-URL (data:image/avif;base64,xxx) ──
    if url_or_b64.startswith("data:"):
        try:
            raw_b64 = url_or_b64.split("base64,")[1]
            mime = url_or_b64.split(";")[0].split(":")[1]
            print(f"[StrategyAgent] 📎 Ref image MIME: {mime}")
        except (IndexError, ValueError):
            return None

    # ── Case 2: HTTP/Unsplash URL ──
    elif url_or_b64.startswith("http"):
        try:
            resp = http_requests.get(url_or_b64, timeout=15)
            resp.raise_for_status()
            raw_b64 = base64.b64encode(resp.content).decode("utf-8")
            print(f"[StrategyAgent] 🌐 Fetched URL ref ({len(resp.content) // 1024} KB)")
        except Exception as e:
            print(f"[StrategyAgent] ⚠️  Could not fetch ref image ({url_or_b64[:60]}): {e}")
            return None

    # ── Case 3: Raw base64 string ──
    else:
        raw_b64 = url_or_b64

    # Always normalise to JPEG for maximum FAL compatibility
    return _to_jpeg_b64(raw_b64)



def assign_products(products: List[Dict[str, Any]], count: int) -> List[Optional[Dict[str, Any]]]:
    """
    Smart routing for products:
    - len == count  → 1-to-1
    - len > count   → random sample
    - len > 0       → cycle through pool
    - len == 0      → all None
    """
    if not products:
        return [None] * count

    if len(products) == count:
        # 1-to-1
        return products.copy()
    elif len(products) > count:
        # random sample
        return random.sample(products, count)
    else:
        # cycle
        pool = products.copy()
        out = []
        for i in range(count):
            if not pool:
                pool = products.copy()
                random.shuffle(pool)
            out.append(pool.pop(random.randint(0, len(pool) - 1)))
        return out

def select_ref_images(ref_images: List[str], count: int) -> List[Optional[str]]:
    """
    Smart routing for ref images (fallback if no products used)
    """
    if not ref_images:
        return [None] * count

    resolved = [_resolve_ref_image(r) for r in ref_images]
    resolved = [r for r in resolved if r]  # drop failed fetches

    if not resolved:
        return [None] * count

    if len(resolved) >= count:
        shuffled = random.sample(resolved, count)
        return shuffled
    else:
        pool = resolved.copy()
        out = []
        for i in range(count):
            if not pool:
                pool = resolved.copy()
                random.shuffle(pool)
            out.append(pool.pop(random.randint(0, len(pool) - 1)))
        return out


# ──────────────────────────────────────────────
# Prompt builders
# ──────────────────────────────────────────────
def _brand_block(bd: Dict[str, Any]) -> str:
    """Shared brand DNA block used in all prompt types."""
    brand_name     = bd.get("brandName", "Brand")
    category       = bd.get("businessCategory", "General")
    brand_tone     = bd.get("brandTone", "Modern & Engaging")
    visual_vibe    = bd.get("visualVibe", "Clean Minimal")
    primary_color  = bd.get("primaryColor", "#2563EB")
    secondary_color = bd.get("secondaryColor", "#60A5FA")
    target_audience = ", ".join(bd.get("targetAudiences", [])) or "General audience"
    product_name   = (bd.get("productBrief") or {}).get("name", "") or brand_name
    usp            = bd.get("usp", "")
    headline       = bd.get("mainGoal", "")
    website        = bd.get("website", "")
    logo           = bd.get("logo", "")

    logo_ref = ""
    if logo:
        logo_ref = f"Brand Logo Reference: {logo if logo.startswith('http') else '[Logo image is uploaded and available for branding]'}\n"

    return (
        f"{brand_name} — {category} brand.\n"
        f"Brand tone: {brand_tone}.\n"
        f"Visual style: {visual_vibe}.\n"
        f"Primary color: {primary_color}. Secondary: {secondary_color}.\n"
        f"Target audience: {target_audience}.\n"
        f"Key message: {headline}.\n"
        f"Product: {product_name}. USP: {usp}.\n"
        + logo_ref
        + (f"Website URL: {website}\n" if website else "")
    )


def build_image_prompt(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    aspect: str,
    product: Optional[Dict[str, Any]] = None,
    ad_template: Optional[int] = None,
    campaign_mode: Optional[str] = None,
    language: str = "english",
    custom_directive: Optional[str] = None,
) -> str:
    """Single static image prompt for gpt-image-2."""
    block = _brand_block(brand_doc)
    
    product_block = ""
    if product:
        product_block = f"""
Featured Product: {product.get('name', '')}
Price: {product.get('offerPrice', '') or product.get('price', '')}
Key Benefit: {product.get('keyBenefit', '')}
Description: {product.get('description', '')}

Make this specific product the **hero** of the ad.
Anchor the visual to this exact product.
"""

    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""
    logo_inst = " Incorporate the brand logo cleanly on the creative. Do not assume or add any fake logos or text."

    # If it is whatsapp or email campaign, we follow the exact requested structure in request 4
    if campaign_mode == "whatsapp":
        return f"""{block}
{product_block}
{idea_str}Create a high-converting product whatsapp ad creative. Make it feel native to whtsapp msg .{logo_inst} Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}."""

    if campaign_mode == "email":
        return f"""{block}
{product_block}
{idea_str}Create a high-converting product email campaign creative. Make it feel native to an email newsletter.{logo_inst} Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}."""

    # ── Inject ad composition template directive (or rotate if None) ───
    template_block = ""
    if custom_directive:
        template_block = f"\nCOMPOSITION VARIATION: {custom_directive}\n"
        print(f"[ImageAgent] 🤖 Mixed Directive: {custom_directive}")
    elif ad_template and ad_template in AD_TEMPLATE_DIRECTIVES:
        t = AD_TEMPLATE_DIRECTIVES[ad_template]
        template_block = f"\n{t['directive']}\n"
        print(f"[ImageAgent] 🔲 Template #{ad_template}: {t['label']}")
    else:
        # Guarantee layout variety when no template is picked by injecting random dynamic framing directives
        camera_angles = [
            "Use a dramatic low-angle shot.", "Use an overhead flat-lay composition.", 
            "Use an extreme close-up macro shot.", "Use an asymmetrical framing.", 
            "Use a straight-on eye-level composition.", "Use dynamic tilted framing."
        ]
        angle = random.choice(camera_angles)
        template_block = f"\nCOMPOSITION VARIATION: {angle}\n"
        print(f"[ImageAgent] 🤖 No template selected — free composition. Shuffler: {angle}")

    platform_instruction = "Make it feel native to Instagram feed."

    print(f"\n[ImageAgent] 🎨 Building prompt | template={ad_template} | product={'YES' if product else 'NO'} | idea={bool(idea)} | campaign={campaign_mode}")

    return f"""{block}
{product_block}
{idea_str}{template_block}
Create a high-converting product ad creative.
{platform_instruction}
{logo_inst}
Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}."""

# ──────────────────────────────────────────────
# Copy generation for WhatsApp & Email
# ──────────────────────────────────────────────
def get_campaign_copy_prompts(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], layout: str, idea: Optional[str], language: str = "english") -> tuple:
    brand_name = brand_doc.get("brandName", "SyncSocio Brand")
    block = _brand_block(brand_doc)
    
    product_block = ""
    if product:
        product_block = f"""
Featured Product: {product.get('name', '')}
Price: {product.get('offerPrice', '') or product.get('price', '')}
Key Benefit: {product.get('keyBenefit', '')}
Description: {product.get('description', '')}
"""
        
    idea_info = f"\nUser's campaign idea: {idea}" if idea and idea.strip() else ""

    if layout == "whatsapp":
        sys_msg = (
            f"You are an expert D2C copywriter. Write a WhatsApp broadcast message in {language}. It must be short, punchy, conversational, and use emojis. "
            "Output ONLY a valid JSON object with a single key 'body' containing the exact message string. "
            "Strict Rule: Write the message as PLAIN TEXT only. Do NOT output any HTML tags, code, or CSS. "
            "If a Website URL is provided in the prompt details, you MUST include it directly in the message/body as the CTA link (do NOT use placeholder links like [Link] or [website URL])."
        )
        user_msg = f"{block}\n{product_block}{idea_info}\n\nDraft the WhatsApp message now."
    else:
        sys_msg = (
            f"You are an expert D2C email marketer. Write an email campaign in {language}. Output ONLY a valid JSON object with two keys: 'subject' (the email subject line) and 'body' (the email body). "
            "Make the copy highly engaging, brand-aligned, and structured with clear spacing. "
            "Strict Rule: Write the email 'body' as a premium, highly aesthetic, modern HTML email template using inline CSS. "
            "Structure the template with clean typography, styled headings (<h1>, <h2>), styled paragraphs (<p>), list elements (<ul>, <li>), and a Call-to-Action (CTA) button. "
            "Ensure the colors align with the brand's primary and secondary colors provided in the details. "
            "The CTA link must be styled as a beautiful, prominent, centered button with border-radius, padding, background-color, and white text. "
            "Do NOT include surrounding <html>, <head>, or <body> tags — only return the inner <div> structure. "
            "If a Website URL is provided in the details, you MUST wrap it inside the CTA button href. "
            f"Strict Footer Rule: The footer of the email MUST NOT assume or invent any shipping details, discounts (like 'free shipping on orders above ₹499'), or other unverified policies. It must consist strictly and only of: "
            f"1. A clean values/USP line featuring 2-3 genuine short brand USPs or generic D2C values (e.g., '🌱 Natural Actives • 🩺 Dermatologically Tested • 🐰 Cruelty-Free' for skincare/beauty, or appropriate genuine ones for other categories). "
            f"2. A direct text disclaimer: 'You\'re receiving this because you signed up for {brand_name} updates.'"
        )
        user_msg = f"{block}\n{product_block}{idea_info}\n\nDraft the Email campaign now."
        
    return sys_msg, user_msg

def generate_instagram_caption_and_hashtags(
    brand_doc: Dict[str, Any],
    product: Optional[Dict[str, Any]],
    layout: str,
    idea: Optional[str],
    language: str = "english",
    template_label: Optional[str] = None,
    index: int = 0,
) -> str:
    """Uses Gemini Flash to generate an engaging Instagram caption with relevant hashtags."""
    try:
        llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.8)
        brand_name = brand_doc.get("brandName", "Brand")
        brand_block = _brand_block(brand_doc)
        
        product_info = ""
        if product:
            product_info = f"Featured Product: {product.get('name', '')}\nKey Benefit: {product.get('keyBenefit', '')}\nDescription: {product.get('description', '')}\n"
            
        idea_info = f"Campaign Topic/Idea: {idea}\n" if idea and idea.strip() else ""
        context_info = f"Visual Style/Layout: {template_label}\n" if template_label else ""
        
        sys_msg = (
            "You are a brilliant, trendy Instagram social media manager and D2C copywriter. "
            f"Write a highly engaging Instagram caption in {language} for a post. "
            "The caption must: \n"
            "1. Start with an attention-grabbing hook (use emojis naturally).\n"
            "2. Focus on the brand value, product benefits, or the campaign idea.\n"
            "3. Include a clear Call to Action (CTA) like 'Click the link in bio to shop' or 'Tell us in the comments'.\n"
            "4. End with 5-10 highly relevant, trending Instagram hashtags (including the brand name as a hashtag).\n"
            "Keep the tone consistent with the brand tone. Output ONLY the caption with hashtags. Do not include markdown formatting or quotes."
        )
        
        user_msg = (
            f"Brand Details:\n{brand_block}\n"
            f"{product_info}"
            f"{idea_info}"
            f"{context_info}"
            f"Post Index: {index + 1}\n\n"
            "Generate the caption now."
        )
        
        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        content = response.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        return content.strip()
    except Exception as e:
        print(f"[CaptionAgent] ❌ Failed to generate caption via Gemini: {e}")
        default_captions = [
            "Your next obsession is here ✨ #glowup #d2c",
            "POV: your daily routine gets an upgrade 🚀 #aesthetic #selfcare",
            "This is your sign to treat yourself 💌 #wellness #treatyourself",
        ]
        return default_captions[index % len(default_captions)]

def generate_campaign_copy(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], layout: str, idea: Optional[str], language: str = "english") -> Dict[str, str]:
    """Uses Gemini Flash to write tailored email or whatsapp copy."""
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)
    
    sys_msg, user_msg = get_campaign_copy_prompts(brand_doc, product, layout, idea, language)
    
    print("\n" + "=" * 80)
    print(f"✍️ [RUNTIME TEXT COPY PROMPT] Passed to Gemini ({layout}):")
    print("-" * 60)
    print(f"System: {sys_msg}\nUser: {user_msg}")
    print("-" * 60)
    print("=" * 80 + "\n")

    try:
        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        content = response.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        text = content.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        return json.loads(text.strip())
    except Exception as e:
        print(f"[CopyAgent] ❌ LLM failed: {e}")
        brand_name = brand_doc.get("brandName", "SyncSocio Brand")
        return {
            "subject": f"New from {brand_name}",
            "body": f"Hey there,\n\nCheck out our latest release!\n\n{idea if idea else ''}\n\nBest,\nTeam {brand_name}"
        }



def build_ecomm_image_prompt(
    brand_doc: Dict[str, Any],
    product: Optional[Dict[str, Any]],
    platform: str,
    shot_index: int,
    total_count: int,
    ref_image: Optional[str] = None,
    language: str = "english",
    idea: Optional[str] = None,
) -> tuple:
    """
    Dedicated E-comm listing prompt builder.
    Returns (prompt_str, caption_str) for this specific image.

    Strategy: Shot-type rotation guarantees compositional variety across N images.
    Each image gets a unique SHOT directive from ECOMM_SHOT_TYPES (8 unique shots).
    For counts > 8, shots cycle with warm/cool tone variant suffixes.
    """
    # ── 1. Brand DNA block ──────────────────────────────────────────
    brand_name      = brand_doc.get("brandName", "Brand")
    category        = brand_doc.get("businessCategory", "General")
    brand_tone      = brand_doc.get("brandTone", "Modern & Engaging")
    visual_vibe     = brand_doc.get("visualVibe", "Clean Minimal")
    primary_color   = brand_doc.get("primaryColor", "#2563EB")
    secondary_color = brand_doc.get("secondaryColor", "#60A5FA")
    target_audience = ", ".join(brand_doc.get("targetAudiences", [])) or "General audience"
    usp             = brand_doc.get("usp", "")
    main_goal       = brand_doc.get("mainGoal", "")

    brand_line = (
        f"BRAND: {brand_name} — {category}. "
        f"Tone: {brand_tone}. "
        f"Colors: {primary_color} / {secondary_color}. "
        f"Visual style: {visual_vibe}. "
        f"Target: {target_audience}."
        + (f" Brand goal: {main_goal}." if main_goal else "")
        + (f" USP: {usp}." if usp else "")
    )

    # ── 2. Product DNA block ────────────────────────────────────────
    if product:
        p_name    = product.get("name", "") or brand_name
        p_desc    = product.get("description", "")
        p_benefit = product.get("keyBenefit", "")
        product_line = (
            f"PRODUCT: {p_name}"
            + (f' | "{p_desc}"' if p_desc else "")
            + (f" | Benefit: {p_benefit}" if p_benefit else "")
            + ". Keep product packaging exactly as in reference. Do not alter label, shape, or colors."
        )
        caption_product = p_name
    else:
        product_line = f"PRODUCT: {brand_name} flagship product. Brand packaging as hero."
        caption_product = brand_name

    # ── 3. Platform rule ────────────────────────────────────────────
    if platform == "Amazon" and shot_index == 0:
        # Amazon Main Image: Strict isolation rules, white background, no text
        platform_line = (
            "PLATFORM (Amazon Main Image): White or very light grey background required. "
            "Product fully isolated. No lifestyle elements. Clean edges. Meets Amazon main image policy."
        )
        text_instruction = "No text overlays, no logos added, no watermarks (Amazon main image compliance)."
    else:
        # Amazon Secondary Images & All Other Platforms: Info-graphics, overlays, styled backgrounds allowed
        if platform == "Amazon":
            platform_line = (
                "PLATFORM (Amazon Secondary Image): Infographic, lifestyle, or styled composition allowed. "
                "Visually rich backgrounds and context allowed for secondary listings."
            )
        else:
            platform_rule = PLATFORM_RULES.get(platform, "Clean, premium, commercial product photography.")
            platform_line = f"PLATFORM ({platform}): {platform_rule}"
        
        text_instruction = (
            "Include professional, clean typographic text overlays highlighting key product benefits "
            "or features as appropriate. "
            "No generic watermarks or external logos."
        )

    # ── 4. Shot-type directive (rotation) ──────────────────────────
    n_base = len(ECOMM_SHOT_TYPES)  # 8
    shot   = ECOMM_SHOT_TYPES[shot_index % n_base]
    
    directive = shot["directive"]
    if shot["id"] == "flat_lay" and (platform != "Amazon" or shot_index > 0):
        directive = (
            f"Overhead 90° flat-lay. Clean modern surface styled with subtle matching props. "
            f"Background is a soft pastel surface/gradient matching the brand's aesthetic (primary: {primary_color}, secondary: {secondary_color}). "
            f"Product dead-center with soft natural shadows."
        )

    variant_suffix = ""
    if shot_index >= n_base:
        variant_suffix = ECOMM_SHOT_VARIANTS[(shot_index // n_base - 1) % len(ECOMM_SHOT_VARIANTS)]

    shot_line  = f"SHOT {shot_index + 1}/{total_count} — {shot['label']}: {directive}{variant_suffix}"
    caption    = f"{caption_product} · {shot['label']} ({platform}) ✨"

    # ── 5. Ref-image instruction ────────────────────────────────────
    ref_line = ""
    if ref_image:
        ref_line = "\nREF IMAGE PROVIDED: Use the attached product image as strict visual reference. Preserve packaging exactly."

    # ── 6. Final closing instruction ────────────────────────────────
    closing = (
        "Premium marketplace product listing image. "
        "Photorealistic, commercial photography quality. "
        f"{text_instruction} "
        f"Any text overlays or words shown in the image must be in {language}."
    )

    idea_line = f"\nCAMPAIGN IDEA / OPTIONAL INSTRUCTIONS: {idea}" if idea and idea.strip() else ""
    prompt = f"{brand_line}\n{product_line}\n{platform_line}\n{shot_line}{ref_line}{idea_line}\n{closing}"

    print("\n" + "=" * 80)
    print(f"[EcommAgent] 🛒 Shot {shot_index + 1}/{total_count} — {shot['label']} | Platform: {platform}")
    print(prompt)
    print("=" * 80 + "\n")

    return prompt, caption


def build_carousel_slide_prompts(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    slide_count: int,
    product: Optional[Dict[str, Any]] = None,
    language: str = "english"
) -> List[str]:
    """Uses Gemini Flash to draft content for N slides."""
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)

    block = _brand_block(brand_doc)
    prod_info = ""
    if product:
        prod_info = f"\nAnchor this carousel around the product: {product.get('name')}. Benefit: {product.get('keyBenefit')}."

    idea_info = f"\nCampaign Idea/Topic: {idea}" if idea else ""

    prompt = f"""{block}{prod_info}{idea_info}
Write the text for an Instagram Carousel with EXACTLY {slide_count} slides.
Output the text in {language}.
Make it punchy and engaging. Slide 1 is the hook. The last slide is the Call to Action.
Output ONLY a valid JSON array of strings, where each string is the text for one slide. Do not use Markdown formatting.
Example output:
["Slide 1 text here", "Slide 2 text here"]
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
        print(f"[CarouselAgent] ❌ LLM failed: {e}")
        return [f"Slide {i+1}" for i in range(slide_count)]


def build_video_prompt(brand_doc: Dict[str, Any], idea: Optional[str], aspect: str, language: str = "english") -> str:
    """Minimax/Seedance video-01 prompt."""
    block = _brand_block(brand_doc)
    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""

    return f"""{block}
{idea_str}
Create a high-quality, aesthetic B-roll style video for Instagram Reels/TikTok.
The video should have subtle, smooth movement (e.g. slow pan, gentle zoom).
Lighting is cinematic and premium. No people speaking to camera.
Subtitles/captions must be styled in a very small, minimal, neat, clean font size at the bottom of the video.
Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen.
Any text or visual script in the video must be in {language}.
Aspect ratio: {aspect}. Commercial advertising quality.
"""


def build_ugc_video_prompt(brand_doc: Dict[str, Any], avatar_description: str, script: str, aspect: str, language: str = "english") -> str:
    """UGC video prompt targeting talking head creator style."""
    block = _brand_block(brand_doc)
    return f"""{block}
Create a high-quality talking-head UGC (user-generated content) video ad for Instagram Reels / TikTok.
Actor / Avatar Details: {avatar_description}. The presenter must speak in English with a professional, clear Indian accent.
The speaker must look directly at the camera, talking naturally.
The speaking script / voiceover topic is: "{script}"
Ensure natural facial expressions, friendly Indian creator-style delivery, and appropriate hand gestures.
Subtitles/captions must be styled in a very small, minimal, neat, clean font size at the bottom of the video.
Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen.
Any subtitles or text overlays must be in {language}.
Aspect ratio: {aspect}. Commercial advertising quality.
"""


# ──────────────────────────────────────────────
# Main orchestrator
# ──────────────────────────────────────────────
def generate_strategy_images(
    brand_doc: Dict[str, Any],
    layout: str,
    count: int,
    slide_count: int,
    aspect_ratio: str,
    idea: Optional[str],
    ref_images: List[str],
    products: Optional[List[Dict[str, Any]]] = None,
    platform: Optional[str] = "",
    ad_template: Optional[int] = None,
    language: str = "english",
    generate_image: bool = True,
    video_kind: Optional[str] = "ai-ugc",
    avatar_description: Optional[str] = "",
    video_script: Optional[str] = "",
) -> List[Dict[str, Any]]:
    """
    Orchestrates generation for all layout types.

    Returns:
        list of {image?: str (base64), url?: str, caption: str, type: str}
    """
    print(f"\n[StrategyAgent] 🚀 Generating {count} {layout}(s) | aspect={aspect_ratio} | refs={len(ref_images)} | products={len(products or [])} | platform={platform or 'N/A'}")

    results = []
    caption_pool = _CAPTIONS.copy()
    random.shuffle(caption_pool)

    def pick_caption(i: int) -> str:
        return caption_pool[i % len(caption_pool)]

    # Pre-assign products / refs
    assigned_products = assign_products(products, count) if products else [None] * count
    assigned_refs = select_ref_images(ref_images, count) if not products else [None] * count

    # ── E-COMM ─────────────────────────────────
    if layout == "ecomm":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
        plat = platform or "Shopify"

        # For e-comm, if products provided use them; else use ref images as visual anchor
        # We cycle products and ref images across the N images so they align dynamically
        tasks = []
        for i in range(count):
            prod_for_ecomm = assigned_products[i] if (assigned_products and i < len(assigned_products)) else None
            
            task_refs = []
            if prod_for_ecomm and prod_for_ecomm.get("imageBase64"):
                task_refs.append(prod_for_ecomm["imageBase64"])
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
                
            for r in ref_images:
                res_r = _resolve_ref_image(r)
                if res_r and res_r not in task_refs:
                    task_refs.append(res_r)

            prompt, caption = build_ecomm_image_prompt(
                brand_doc=brand_doc,
                product=prod_for_ecomm,
                platform=plat,
                shot_index=i,
                total_count=count,
                ref_image=task_refs[0] if task_refs else None,
                language=language,
                idea=idea,
            )
            tasks.append((prompt, caption, task_refs, i))

        def run_ecomm_task(task):
            prompt, caption, task_ref, index = task
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=task_refs,
                    image_size=fal_size,
                )
                return {
                    "image":   result["image"],
                    "caption": caption,
                    "type":    "image",
                    "index":   index
                }
            except Exception as e:
                print(f"[EcommAgent] ❌ Shot {index+1} failed: {e}")
                return {
                    "image":   None,
                    "caption": caption,
                    "type":    "image",
                    "error":   str(e),
                    "index":   index
                }

        print(f"[StrategyAgent] 🚀 Running E-comm generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_ecomm_task, tasks))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── IMAGE ──────────────────────────────────
    elif layout == "image":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_2_3")

        # Mix of 6 camera angles + 10 templates if ad_template is None
        mixed_directives = []
        if ad_template is None:
            camera_angles = [
                "Use a dramatic low-angle shot.",
                "Use an overhead flat-lay composition.",
                "Use an extreme close-up macro shot.",
                "Use an asymmetrical framing.",
                "Use a straight-on eye-level composition.",
                "Use dynamic tilted framing."
            ]
            template_directives = [t["directive"] for t in AD_TEMPLATE_DIRECTIVES.values()]
            
            num_angles = math.ceil(count * 5 / 8)
            num_templates = count - num_angles
            
            shuffled_angles = camera_angles.copy()
            random.shuffle(shuffled_angles)
            angles_sampled = [shuffled_angles[i % len(camera_angles)] for i in range(num_angles)]
            
            shuffled_templates = template_directives.copy()
            random.shuffle(shuffled_templates)
            templates_sampled = [shuffled_templates[i % len(template_directives)] for i in range(num_templates)]
            
            mixed_directives = angles_sampled + templates_sampled
            random.shuffle(mixed_directives)

        # Determine template per image:
        #   ad_template == -1  → all 8 variants (templates 1–8, one per image)
        #   ad_template 1-10  → every image uses this specific template
        #   ad_template None  → no template, model decides composition
        def _template_for(i: int) -> Optional[int]:
            if ad_template == -1:           # all-8-variants mode
                return (i % 8) + 1         # cycles 1→8 → templates 1..8
            return ad_template              # None or specific template for all

        tasks = []
        for i in range(count):
            prod = assigned_products[i]
            
            task_refs = []
            if prod and prod.get("imageBase64"):
                task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
                
            for r in ref_images:
                res_r = _resolve_ref_image(r)
                if res_r and res_r not in task_refs:
                    task_refs.append(res_r)

            t_id = _template_for(i)
            c_dir = None
            if ad_template is None:
                c_dir = mixed_directives[i]
                t_id = None

            prompt = build_image_prompt(
                brand_doc, idea, aspect_ratio, 
                product=prod, ad_template=t_id, 
                language=language, custom_directive=c_dir
            )
            tasks.append((prompt, task_refs, i, prod, t_id, c_dir))

        def run_image_task(task):
            prompt, refs, index, prod, t_id, c_dir = task
            template_label = None
            if t_id and t_id in AD_TEMPLATE_DIRECTIVES:
                template_label = AD_TEMPLATE_DIRECTIVES[t_id]["label"]
            elif c_dir:
                # Find if c_dir matches any template directive
                for tid, tval in AD_TEMPLATE_DIRECTIVES.items():
                    if tval["directive"] == c_dir:
                        template_label = tval["label"]
                        break
                if not template_label:
                    template_label = c_dir.replace("Use a ", "").replace("Use an ", "").replace("Use ", "").strip(".")

            print(f"\n[StrategyAgent] 🖼  Image {index+1}/{count} | ref_image={'YES ✓ (' + str(len(refs)) + ')' if refs else 'NONE'} | template={template_label or 'None'}")
            
            # Generate custom Instagram caption + hashtags using Gemini
            caption = generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout="image",
                idea=idea,
                language=language,
                template_label=template_label,
                index=index,
            )
            
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=refs,
                    image_size=fal_size,
                )
                return {
                    "image":    result["image"],
                    "caption":  caption,
                    "type":     "image",
                    "template": template_label,
                    "index":    index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Image {index+1} failed: {e}")
                return {
                    "image":    None,
                    "caption":  caption,
                    "type":     "image",
                    "error":    str(e),
                    "index":    index
                }

        print(f"[StrategyAgent] 🚀 Running static image generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_image_task, tasks))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── WHATSAPP & EMAIL ──────────────────────────────
    elif layout in ["whatsapp", "email"]:
        # Only generating 1 campaign by default (ignore count)
        prod = assigned_products[0] if assigned_products else None
        
        # We completely removed AI image generation. 
        # We simply use the selected product image or the reference image passed from the 3 boxes.
        ref = ref_images[0] if (ref_images and ref_images[0]) else None
        hero_image = ref if ref else (prod.get("imageBase64") if prod else None)
        
        if hero_image and not hero_image.startswith("http") and not hero_image.startswith("data:"):
            hero_image = "data:image/jpeg;base64," + hero_image

        print(f"\n[StrategyAgent] 📱 Campaign '{layout}' | Using campaign image: {'YES ✓' if hero_image else 'NONE'}")

        # 2. Generate Copy via Gemini
        print(f"[StrategyAgent] ✍️ Generating copy for {layout} in {language}...")
        copy_res = generate_campaign_copy(brand_doc, prod, layout, idea, language=language)

        results.append({
            "image": hero_image,
            "caption": copy_res.get("body", "Failed to generate copy."),
            "subject": copy_res.get("subject", ""),
            "type": layout,
            "template": "Hero + Copy"
        })

    # ── CAROUSEL ───────────────────────────────
    elif layout == "carousel":
        def run_carousel_task(index):
            prod = assigned_products[index]
            
            task_refs = []
            if prod and prod.get("imageBase64"):
                task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and index < len(assigned_refs) and assigned_refs[index]:
                task_refs.append(assigned_refs[index])
                
            for r in ref_images:
                res_r = _resolve_ref_image(r)
                if res_r and res_r not in task_refs:
                    task_refs.append(res_r)
                
            # 1. Draft the text via LLM
            print(f"[StrategyAgent] ✍️ Drafting {slide_count} slides in {language} for carousel {index+1}...")
            slide_texts = build_carousel_slide_prompts(brand_doc, idea, slide_count, product=prod, language=language)
            
            base_image_prompt = build_image_prompt(
                brand_doc, idea, aspect_ratio, product=prod, ad_template=None, campaign_mode=None, language=language, custom_directive="Design a cohesive, premium carousel slide. Embed the SLIDE TEXT directly in the image layout."
            )
            enriched_slide_prompts = [f"{base_image_prompt}\n\nSLIDE TEXT TO INCLUDE: {text}" for text in slide_texts]

            print(f"\n[StrategyAgent] 🎠 Carousel {index+1}/{count} | ref_image={'YES ✓' if task_refs else 'NONE'}")
            if prod: print(f"                   Product: {prod.get('name')}")

            # Generate custom Instagram caption + hashtags using Gemini
            caption = generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout="carousel",
                idea=idea,
                language=language,
                template_label="Carousel Post",
                index=index,
            )

            try:
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_doc.get('brandName', 'Brand')} — {idea}" if idea and idea.strip() else brand_doc.get('brandName', 'Brand'),
                    image=task_refs,
                    count=slide_count,
                    slide_prompts=enriched_slide_prompts,
                )
                return {
                    "slides":  slides,          # list of {image: base64}
                    "caption": caption,
                    "type":    "carousel",
                    "index":   index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Carousel {index+1} failed: {e}")
                return {
                    "slides":  [],
                    "caption": caption,
                    "type":    "carousel",
                    "error":   str(e),
                    "index":   index
                }

        print(f"[StrategyAgent] 🚀 Running carousel generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_carousel_task, range(count)))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── VIDEO ──────────────────────────────────
    elif layout == "video":
        if video_kind == "ai-ugc":
            # Generate script and avatar description if they are empty
            if not avatar_description or not video_script:
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)
                    brand_name = brand_doc.get("brandName", "Brand")
                    prod_name = products[0].get("name", "") if products else brand_name
                    prod_desc = products[0].get("description", "") if products else ""
                    prod_benefit = products[0].get("keyBenefit", "") if products else ""
                    
                    sys_msg = "You are a D2C marketing assistant. Generate a talking-head UGC video script and avatar description for the given product."
                    user_msg = f"""Brand: {brand_name}
Product: {prod_name}
Description: {prod_desc}
Benefit: {prod_benefit}

Please output a JSON object with:
1. "avatarDescription": A description of a creator/avatar of Indian descent (e.g., "A friendly 20-something Indian female creator in a bright living room"). Keep it under 200 characters.
2. "videoScript": A highly engaging 15-30 second script for the creator to say, promoting the product. Keep it under 500 characters.

Output ONLY valid JSON. No markdown formatting.
"""
                    response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
                    content = response.content
                    if isinstance(content, list):
                        content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
                    text = content.strip()
                    if text.startswith("```json"): text = text[7:]
                    if text.startswith("```"): text = text[3:]
                    if text.endswith("```"): text = text[:-3]
                    data = json.loads(text.strip())
                    if not avatar_description:
                        avatar_description = data.get("avatarDescription", "A friendly Indian creator presenting the product.")
                    if not video_script:
                        video_script = data.get("videoScript", f"Check out this amazing {prod_name}! It is a game changer.")
                except Exception as e:
                    print(f"[StrategyAgent] UGC generation fallback error: {e}")
                    if not avatar_description:
                        avatar_description = "A friendly Indian creator presenting the product."
                    if not video_script:
                        video_script = "Check out this amazing product! It's a total game changer."

            prompt = build_ugc_video_prompt(brand_doc, avatar_description, video_script, aspect_ratio, language=language)
        else:
            prompt = build_video_prompt(brand_doc, idea, aspect_ratio, language=language)
        print(f"\n[StrategyAgent] 🎥 Video ({video_kind}) | Prompt length: {len(prompt)}")

        def run_video_task(index):
            prod = assigned_products[index]
            print(f"\n[StrategyAgent] 🎬 Video {index+1}/{count}...")
            if prod: print(f"                   Product: {prod.get('name')}")
            try:
                # Extract product image or reference image if available
                ref = prod.get("imageBase64") if prod else (assigned_refs[index] if index < len(assigned_refs) else None)
                if ref and not ref.startswith("http") and not ref.startswith("data:"):
                    ref = "data:image/jpeg;base64," + ref

                if video_kind == "ai-ugc":
                    # Stage 1: Brand DNA + avatar + prod info + the script is passed to GPT Image
                    brand_info = _brand_block(brand_doc)
                    prod_info = ""
                    if prod:
                        prod_info = f"Product: {prod.get('name')}\nBenefit: {prod.get('keyBenefit')}\nDescription: {prod.get('description')}\n"
                    
                    stage1_prompt = f"""{brand_info}
{prod_info}
Avatar Description: {avatar_description}
Video Script: {video_script}

Create a high-quality, photorealistic portrait image of this UGC creator/avatar holding or presenting the product, which will be used to generate a UGC video for the product. The scene is bright and professional. No text overlays, letters, or characters on the image. Aspect ratio: {aspect_ratio}."""
                    
                    print(f"[StrategyAgent] UGC Stage 1: Generating starting image with GPT-Image-2...")
                    gpt_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_16_9")
                    gpt_res = generate_fal_image_gpt2(prompt=stage1_prompt, image=ref, image_size=gpt_size)
                    generated_img = gpt_res.get("image")
                    if not generated_img:
                        raise Exception("UGC Stage 1 image generation failed")
                    
                    # Generate custom Instagram caption + hashtags using Gemini during Stage 1
                    caption = generate_instagram_caption_and_hashtags(
                        brand_doc=brand_doc,
                        product=prod,
                        layout="video",
                        idea=f"UGC Video post with script: {video_script}",
                        language=language,
                        template_label="UGC Creator Video",
                        index=index,
                    )
                    
                    # Stage 2: Take the generated hero image and send it to Seedance Image-to-Video
                    print(f"[StrategyAgent] UGC Stage 2: Animating starting image with Seedance Fast Image-to-Video...")
                    result = generate_fal_video_seedance(prompt=prompt, image=generated_img, aspect_ratio=aspect_ratio, duration="8")
                else:
                    # Standard img2video uses Seedance Fast Image-to-Video
                    caption = pick_caption(index)
                    print(f"[StrategyAgent] Animating starting image with Seedance Fast Image-to-Video...")
                    result = generate_fal_video_seedance(prompt=prompt, image=ref, aspect_ratio=aspect_ratio, duration="8")

                return {
                    "url":       result.get("url"),
                    "thumbnail": result.get("thumbnail"),
                    "caption":   caption,
                    "type":      "video",
                    "index":     index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Video {index+1} failed: {e}")
                return {
                    "url":     None,
                    "caption": pick_caption(index),
                    "type":    "video",
                    "error":   str(e),
                    "index":   index
                }

        print(f"[StrategyAgent] 🚀 Running video generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_video_task, range(count)))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    else:
        raise ValueError(f"Unknown layout type: {layout}")

    print(f"[StrategyAgent] ✅ Done — {len(results)} items generated")
    return results


# ──────────────────────────────────────────────
# Print assumed brand example prompts (Requirement 3)
# ──────────────────────────────────────────────
def print_assumed_brand_prompts():
    # Attempt to reconfigure console stream encoding on Windows to prevent charmap crashes
    import sys
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            try:
                stream.reconfigure(encoding='utf-8')
            except Exception:
                pass

    assumed_brand = {
        "brandName": "SyncSocio Sneakers",
        "businessCategory": "Footwear",
        "brandTone": "Energetic & Bold",
        "visualVibe": "Dynamic Studio Lighting & Vibrant Gradients",
        "primaryColor": "#FF3366",
        "secondaryColor": "#00E5FF",
        "targetAudiences": ["Fitness enthusiasts", "Urban runners", "Gen Z trendsetters"],
        "usp": "Lightest carbon-plate sole for ultimate energy return",
        "mainGoal": "Launch our new HyperStride carbon running shoe",
    }
    assumed_product = {
        "name": "HyperStride Carbon",
        "price": "$180",
        "keyBenefit": "Saves 4% energy per mile with aerospace carbon sole",
        "description": "Ultra-breathable mesh with responsive spring-loaded foam",
    }
    assumed_idea = "Limited edition colorway drop, 20% off for first 100 buyers."
    
    print("\n" + "=" * 80)
    print("[REQUIREMENT 3: ASSUMED BRAND EXAMPLE PROMPTS]")
    print("=" * 80)
    
    # 1. WhatsApp image gen prompt
    wa_img_prompt = build_image_prompt(
        brand_doc=assumed_brand,
        idea=assumed_idea,
        aspect="portrait_4_5",
        product=assumed_product,
        campaign_mode="whatsapp",
        language="english"
    )
    print("\n[WHATSAPP IMAGE GENERATION PROMPT] Passed to GPT-Image-2:")
    print("-" * 60)
    print(wa_img_prompt)
    print("-" * 60)
    
    # 2. WhatsApp text prompt
    wa_sys, wa_user = get_campaign_copy_prompts(
        brand_doc=assumed_brand,
        product=assumed_product,
        layout="whatsapp",
        idea=assumed_idea,
        language="english"
    )
    print("\n[WHATSAPP TEXT COPY PROMPT] Passed to Gemini:")
    print("-" * 60)
    print(f"System: {wa_sys}\nUser: {wa_user}")
    print("-" * 60)
    
    # 3. Email image gen prompt
    email_img_prompt = build_image_prompt(
        brand_doc=assumed_brand,
        idea=assumed_idea,
        aspect="portrait_4_5",
        product=assumed_product,
        campaign_mode="email",
        language="english"
    )
    print("\n[EMAIL IMAGE GENERATION PROMPT] Passed to GPT-Image-2:")
    print("-" * 60)
    print(email_img_prompt)
    print("-" * 60)
    
    # 4. Email text prompt
    email_sys, email_user = get_campaign_copy_prompts(
        brand_doc=assumed_brand,
        product=assumed_product,
        layout="email",
        idea=assumed_idea,
        language="english"
    )
    print("\n[EMAIL TEXT COPY PROMPT] Passed to Gemini:")
    print("-" * 60)
    print(f"System: {email_sys}\nUser: {email_user}")
    print("-" * 60)
    print("=" * 80 + "\n")
if __name__ == "__main__":
    try:
        print_assumed_brand_prompts()
    except Exception as e:
        print(f"Error printing assumed brand prompts: {e}")
