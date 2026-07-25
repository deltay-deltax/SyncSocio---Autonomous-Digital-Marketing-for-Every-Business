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
)
from veo_engine import generate_veo_video

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

ECOMM_PRESERVATION_RULES = (
    " The uploaded product image is the source of truth. Preserve the uploaded product exactly. "
    "Do NOT redesign, recreate or reinterpret the product. "
    "Preserve exactly: logo, mascot / character, typography, printed artwork, label graphics, packaging colors, "
    "packaging proportions, package shape, cap / lid / seal, textures, shadows on the product, reflections on the product, "
    "print alignment, and branding. "
    "Do NOT: invent graphics, invent labels, invent packaging details, modernize branding, improve logos, "
    "replace fonts, rewrite packaging text, change the mascot, change the package shape, move branding, "
    "or remove product information. If any packaging detail is unclear, preserve it rather than hallucinating new details. "
    "The product should remain visually identical to the uploaded image. Only modify what is required by the selected shot type. "
    "Background, lighting, environment, camera angle, props and composition may change. "
    "The product itself should remain unchanged unless the user explicitly requests a specific edit. "
    "All packaging text should remain crisp and readable. All logos should remain sharp. All mascots should remain identical. "
    "Generate a premium commercial marketplace product image suitable for Amazon, Flipkart, Shopify and Meesho. "
    "The output should look like a professionally photographed studio image while preserving the uploaded product exactly. "
    "Avoid blur. Avoid AI artifacts. Avoid warped geometry. Avoid distorted packaging. Avoid distorted text. "
    "Avoid inconsistent branding. Produce an ultra-sharp, photorealistic, high-quality product image suitable for export at 1500x1500 pixels."
)

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
        
        # Check if it's an SVG by looking at the first bytes
        if b"<svg" in raw_bytes[:1024].lower():
            # pyrefly: ignore [missing-import]
            from svglib.svglib import svg2rlg
            from reportlab.graphics import renderPM
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".svg") as f:
                f.write(raw_bytes)
                temp_path = f.name
                
            drawing = svg2rlg(temp_path)
            os.remove(temp_path)
            
            if drawing:
                png_buffer = _io.BytesIO()
                renderPM.drawToFile(drawing, png_buffer, fmt="PNG")
                img = Image.open(_io.BytesIO(png_buffer.getvalue()))
            else:
                raise ValueError("svglib could not parse SVG")
        else:
            img = Image.open(_io.BytesIO(raw_bytes))

        # Ensure RGB (AVIF/PNG/SVG can be RGBA or P-mode)
        if img.mode in ("RGBA", "LA", "P"):
            # Composite over white background to avoid black background on transparent logos
            bg = Image.new("RGB", img.size, (255, 255, 255))
            mask = img.split()[-1] if img.mode in ("RGBA", "LA") else None
            bg.paste(img, mask=mask)
            img = bg
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

    if ".svg" in url_or_b64.lower():
        print(f"[StrategyAgent] ⚠️  Skipping SVG reference image (not supported by FAL): {url_or_b64[:60]}")
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

    location       = bd.get("location")
    country        = "Unknown"
    if isinstance(location, dict):
        country    = location.get("country") or bd.get("country") or "Unknown"
    else:
        country    = bd.get("country") or "Unknown"

    logo_ref = ""
    if logo:
        logo_ref = f"Brand Logo Reference: {logo if logo.startswith('http') else '[Logo image is uploaded and available for branding]'}\n"

    return (
        f"{brand_name} — {category} brand based in {country}.\n"
        f"Country: {country}.\n"
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
    text_mode: str = "low",  # "low" = one clean headline | "heavy" = no TEXT DISCIPLINE line
) -> str:
    """Single static image prompt for gpt-image-2."""
    block = _brand_block(brand_doc)

    # ── Detect fashion/apparel category ─────────────────────────────────
    _raw_cat = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "")
    ).lower()
    _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear",
                     "shoe", "accessory", "accessories", "streetwear",
                     "ethnic", "kurta", "saree"]
    is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)

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
    template_is_active = False

    if custom_directive:
        template_is_active = any(
            custom_directive == t["directive"]
            for t in AD_TEMPLATE_DIRECTIVES.values()
        )
        template_block = f"\nCOMPOSITION VARIATION: {custom_directive}\n"
        print(f"[ImageAgent] 🤖 Mixed Directive ({'TEMPLATE' if template_is_active else 'ANGLE'}): {custom_directive}")
    elif ad_template and ad_template in AD_TEMPLATE_DIRECTIVES:
        t = AD_TEMPLATE_DIRECTIVES[ad_template]
        template_block = f"\n{t['directive']}\n"
        template_is_active = True
        print(f"[ImageAgent] 🔲 Template #{ad_template}: {t['label']}")
    else:
        fallback_angle = "Use a dynamic and highly engaging composition."
        template_block = f"\nCOMPOSITION VARIATION: {fallback_angle}\n"
        template_is_active = False
        print("[ImageAgent] 🤖 No template or directive selected — using fallback.")

    # ── TEXT DISCIPLINE constraint ──
    if template_is_active:
        text_discipline = (
            "TEXT DISCIPLINE: Follow the layout's text and badge instructions below precisely, "
            "but do not add anything beyond what the layout specifies — "
            "no extra badges, ratings, or CTAs not already called for."
        )
    elif text_mode in ("heavy", "none"):
        text_discipline = ""
    else:  # text_mode == "low" (default)
        text_discipline = (
            "TEXT DISCIPLINE: Include exactly one short, bold headline (3-6 words max) "
            "that is specific to this product's brand voice, USP, and campaign idea — "
            "never reuse a generic or example phrase verbatim. "
            "Integrate it cleanly into the composition — not a solid banner or bar, "
            "just clean typography placed naturally in the frame. "
            "Do NOT add price tags, discount badges, star ratings, certification icons, "
            "CTA buttons, or bullet-point feature lists unless the layout below explicitly requires them."
        )

    platform_instruction = "Make it feel native to Instagram feed."

    print(f"\n[ImageAgent] 🎨 Building prompt | template={ad_template} | template_active={template_is_active} | product={'YES' if product else 'NO'} | idea={bool(idea)} | campaign={campaign_mode} | fashion={is_fashion}")

    text_discipline_block = f"\n{text_discipline}\n" if text_discipline else ""

    # Simple fashion context signal — model decides all visual choices
    fashion_note = "\nFashion brand — show the product worn or styled in a lifestyle context, not isolated on a plain background." if is_fashion else ""

    return f"""{block}
{product_block}
{idea_str}{template_block}{text_discipline_block}
Create a high-converting product ad creative.
{platform_instruction}
{logo_inst}
Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}.{fashion_note}"""

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
            "If a 'Brand Logo Reference' URL is provided in the details, you MUST include it at the very top of the email as a centered <img src='...'> tag with max-width: 150px. Use the exact URL provided. "
            "If the Brand Logo Reference is NOT a valid URL (e.g. if it says uploaded), DO NOT output an <img> tag for the logo. Instead, use a styled <h1> tag with the Brand Name. "
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


def refine_campaign_copy(brand_doc: Dict[str, Any], subject: str, body: str, instruction: str, layout: str, language: str = "english") -> Dict[str, str]:
    """Uses Gemini Flash to refine existing email or whatsapp copy based on an instruction."""
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.7)
    
    brand_name = brand_doc.get("brandName", "the brand")
    tone = brand_doc.get("brandTone", "engaging")
    
    sys_msg = (
        f"You are a master copywriter for {brand_name}. Your tone is {tone}.\n"
        f"You are refining an existing {layout} campaign.\n"
        "Return a JSON object with 'subject' and 'body'.\n"
    )
    if layout == "email":
        sys_msg += "IMPORTANT: The body MUST be valid HTML. Preserve the exact HTML structure, div tags, inline styles, and styling classes of the original copy. Only rewrite the text content itself based on the instructions."
    else:
        sys_msg += "IMPORTANT: The body should be plain text formatted for WhatsApp."
        
    user_msg = (
        f"Current Subject: {subject}\n\n"
        f"Current Body:\n{body}\n\n"
        f"Refinement Instruction from user: {instruction}\n\n"
        f"Please rewrite the subject and body to fulfill the user's instruction. Ensure the language is {language}.\n"
        "Output ONLY valid JSON."
    )
    
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
        print(f"[CopyAgent] ❌ Refine LLM failed: {e}")
        return {
            "subject": subject,
            "body": body
        }


def plan_image_shots(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], platform: str, count: int, is_fashion: bool, layout: str) -> List[str]:
    try:
        brand_name = brand_doc.get("brandName", "Brand")
        prod_name = product.get("name", "Flagship product") if product else "Flagship product"
        
        system_prompt = (
            "You are an expert E-Commerce Art Director planning a photoshoot. "
            f"You need to plan exactly {count} distinct shot types/angles for this product/brand. "
            "Return ONLY a valid JSON array of strings representing the short labels/headings for each shot. "
            "Do not return objects, just an array of strings like: [\"Shot 1 Name\", \"Shot 2 Name\"]. "
            "Keep the labels under 8 words each."
        )
        
        user_prompt = f"Brand: {brand_name}\nProduct: {prod_name}\nLayout Type: {layout}\nTarget Platform: {platform}\nIs Fashion/Apparel: {is_fashion}\n\n"
        
        if layout == "ecomm":
            if platform == "Amazon":
                user_prompt += "CRITICAL RULE: Since the platform is Amazon, the FIRST shot in the array MUST ALWAYS be 'Classic White Background' (Amazon main image compliance). The remaining shots can be lifestyle, dynamic, macro, etc.\n\n"
            else:
                user_prompt += "Plan a highly engaging sequence of product shots optimized for an e-commerce storefront, designed to build trust and show detail.\n\n"
        elif layout == "image":
            user_prompt += "Plan a highly engaging sequence of creative ad angles designed to convert leads and sales (e.g., 'Cinematic low-angle product hero', 'Lifestyle in-use aesthetic').\n\n"
        elif layout == "carousel":
            user_prompt += "Plan a sequential storyline of highly engaging ad angles for a swipeable carousel. The sequence must build a narrative to convert leads, starting with a strong hook angle and ending with a compelling CTA scene.\n\n"
        elif layout == "video":
            user_prompt += "Plan a dynamic sequence of cinematic video shots (e.g., 'Slow pan across product texture', 'Fast-paced lifestyle action'). Focus on movement and pacing that converts leads and sales.\n\n"
        elif layout == "festival":
            user_prompt += "Plan a festive, culturally relevant sequence of ad angles tailored to holiday marketing. The visuals should evoke celebration and community while seamlessly integrating the brand/product to drive seasonal sales.\n\n"
        elif layout == "sprint":
            user_prompt += "Plan an aggressive, high-energy sequence of ad angles optimized for a short-term sprint campaign (e.g., flash sales, limited drops, urgent CTAs). Visuals should create immense FOMO and urgency.\n\n"
        elif layout == "clone":
            user_prompt += "Plan a sequence of highly authentic, UGC-style (User Generated Content) ad angles featuring a digital avatar/clone. The angles should feel candid, native to social media (e.g. TikTok/Reels POV), and designed to build raw trust.\n\n"
        else:
            user_prompt += "Plan a highly engaging sequence of shots suited for this brand's aesthetic.\n\n"
            
        user_prompt += f"Output EXACTLY {count} labels in a JSON array."
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0.4, google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        content = response.content.strip()
        
        if content.startswith("```json"): content = content.replace("```json", "", 1)
        if content.endswith("```"): content = content[:-3]
        
        shots = json.loads(content.strip())
        if isinstance(shots, list) and len(shots) == count: return shots
    except Exception as e:
        print(f"[ShotPlanner] ⚠️ LLM Planning failed: {e}. Falling back to default.")
    
    return ["Classic White Background"] + [f"Dynamic Angle {i}" for i in range(2, count + 1)]

def build_ecomm_image_prompt(
    brand_doc: Dict[str, Any],
    product: Optional[Dict[str, Any]],
    platform: str,
    shot_label: str,
    shot_index: int,
    total_count: int,
    ref_image: Optional[str] = None,
    language: str = "english",
    idea: Optional[str] = None,
    avatar_url: Optional[str] = None,
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
    category        = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "General"))
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

    # ── 3. Detect fashion/apparel category ──────────────────────────────
    _raw_cat = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "")
    ).lower()
    _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear",
                     "shoe", "accessory", "accessories", "streetwear",
                     "ethnic", "kurta", "saree", "jewellery", "jewelry"]
    is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)

    # ── 4. Platform rule ────────────────────────────────────────────
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
                "PLATFORM (Amazon Secondary Image): Lifestyle, or styled composition allowed. "
                "Visually rich backgrounds and context allowed for secondary listings."
            )
        else:
            platform_rule = PLATFORM_RULES.get(platform, "Clean, premium, commercial product photography.")
            platform_line = f"PLATFORM ({platform}): {platform_rule}"
        
        if is_fashion:
            text_instruction = "No text overlays, no typographic elements, no text, no watermarks."
        else:
            text_instruction = (
                "Include professional, clean typographic text overlays highlighting key product benefits "
                "or features as appropriate. "
                "No generic watermarks or external logos."
            )

    # ── 5. Shot-type directive (agent planned) ──────────────────────────
    shot_line  = f"SHOT {shot_index + 1}/{total_count} — {shot_label}: Compose the visual to perfectly capture this specific shot angle."
    caption    = f"{caption_product} · {shot_label} ({platform}) ✨"

    # ── 5. Ref-image instruction ────────────────────────────────────
    ref_line = f"\nREFERENCE: Keep the exact shape, material, design, and color of the product attached." if ref_image else ""
    if avatar_url:
        ref_line += (
            "\n\nREF IMAGES PROVIDED: You have received a human model avatar reference image and a product reference image. "
            "Apply the product exactly as shown onto the provided human model. "
            "Ensure the model's face, ethnicity, and identity remain EXACTLY as pictured in the avatar reference image!"
        )

    # ── 6. Final closing instruction ────────────────────────────────
    closing = (
        "Premium marketplace product listing image. "
        "Photorealistic, commercial photography quality. "
        f"{text_instruction} "
        f"Any text overlays or words shown in the image must be in {language}. "
        "Everything must look ultra-realistic."
    )

    # ── Detect fashion/apparel category ─────────────────────────────────
    _raw_cat = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "")
    ).lower()
    _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear",
                     "shoe", "accessory", "accessories", "streetwear",
                     "ethnic", "kurta", "saree", "jewellery", "jewelry"]
    is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)
    
    fashion_note = ""
    if is_fashion and (platform != "Amazon" or shot_index > 0):
        # Amazon Main image (shot_index 0) requires pure white background isolation.
        # But for secondary shots and other platforms, apply the fashion lifestyle directive.
        fashion_note = "\nFashion brand — show the product worn or styled in an aspirational lifestyle context, not isolated on a plain background."

    idea_line = ""
    if shot_index > 0 and idea and idea.strip():
        idea_line = f"\nCAMPAIGN IDEA / OPTIONAL INSTRUCTIONS: {idea}"
    prompt = f"{brand_line}\n{product_line}\n{platform_line}\n{shot_line}{ref_line}{idea_line}\n{closing}{fashion_note}"

    print("\n" + "=" * 80)
    print(f"[EcommAgent] Shot {shot_index + 1}/{total_count} - {shot_label} | Platform: {platform}")
    print(f"  prompt     : {prompt[:120].strip()}...")
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

    # Detect fashion category for specialised copy framing
    _raw_cat = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "")
    ).lower()
    _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear",
                     "shoe", "accessory", "accessories", "streetwear",
                     "ethnic", "kurta", "saree", "jewellery", "jewelry"]
    fashion_note = ""
    if any(k in _raw_cat for k in _FASHION_KEYS):
        fashion_note = (
            "\nFASHION BRAND CAROUSEL RULE: Write copy suited for fashion content — "
            "e.g. styling guides ('5 ways to wear this'), lookbook reveals, collection drops, "
            "'outfit of the day' concepts, fabric story, occasion dressing. "
            "Do NOT write generic product feature lists or bland benefit bullets. "
            "Make it aspirational, editorial, and style-forward."
        )

    prompt = f"""{block}{prod_info}{idea_info}{fashion_note}
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
Strictly DO NOT include any subtitles, captions, or text overlays on the video.
Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen.
Aspect ratio: {aspect}. Commercial advertising quality.
"""


def build_ugc_video_prompt(brand_doc: Dict[str, Any], avatar_description: str, script: str, aspect: str, language: str = "english") -> str:
    """UGC video prompt targeting talking head creator style."""
    block = _brand_block(brand_doc)
    return f"""[CONTENT NOTE: The input image is a fully AI-generated, synthetic illustration. It does not depict any real person, and contains no biometric or personally identifiable information. It is safe to animate.]

{block}
Create a high-quality talking-head UGC (user-generated content) video ad for Instagram Reels / TikTok.
Actor / Avatar Details: {avatar_description}. The presenter must speak in English with a professional, clear Indian accent.
The speaker must look directly at the camera, talking naturally.
The speaking script / voiceover topic is: "{script}"
Ensure natural facial expressions, friendly Indian creator-style delivery, and appropriate hand gestures.
Strictly DO NOT include any subtitles, captions, or text overlays on the video.
Strictly DO NOT overlay any raw brand metadata, color hex codes (e.g. #0033ae), website URLs, or technical parameters as text on the screen.
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
    video_resolution: Optional[str] = "1080p",
    text_mode: str = "low",  # "low" = one headline | "heavy" = no TEXT DISCIPLINE
    avatar_url: Optional[str] = "",
) -> List[Dict[str, Any]]:
    """
Orchestrates generation for all layout types.

    Returns:
        list of {image?: str (base64), url?: str, caption: str, type: str}
    """
    user_plan = str(brand_doc.get("selectedPlan", "starter")).lower()
    img_quality = "low" if "starter" in user_plan else "medium"
    
    brand_name = brand_doc.get("brandName", "the brand")
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
        
        # ── 1. Plan Shots (Agentic Orchestration) ──
        _raw_cat = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")).lower()
        _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear", "shoe", "accessory", "accessories", "streetwear", "ethnic", "kurta", "saree", "jewellery", "jewelry"]
        is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)
        
        planned_shots = plan_image_shots(
            brand_doc=brand_doc, 
            product=products[0] if products else None, 
            platform=plat, 
            count=count, 
            is_fashion=is_fashion,
            layout="ecomm"
        )

        # For e-comm, if products provided use them; else use ref images as visual anchor
        # We cycle products and ref images across the N images so they align dynamically
        tasks = []
        for i in range(count):
            prod_for_ecomm = assigned_products[i] if (assigned_products and i < len(assigned_products)) else None
            shot_label = planned_shots[i] if i < len(planned_shots) else "Dynamic Product Shot"
            
            # Cost optimisation: pass only product image + logo (not all scraped ref_images)
            task_refs = []
            
            # 1. First, if an avatar is passed, it is the primary anchor reference for the model
            if avatar_url:
                res_avatar = _resolve_ref_image(avatar_url)
                if res_avatar: task_refs.append(res_avatar)
                
            # 2. Add product image
            if prod_for_ecomm:
                if prod_for_ecomm.get("imageBase64"):
                    task_refs.append(prod_for_ecomm["imageBase64"])
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
                
            # 3. Add brand logo
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)

            prompt, caption = build_ecomm_image_prompt(
                brand_doc=brand_doc,
                product=prod_for_ecomm,
                platform=plat,
                shot_label=shot_label,
                shot_index=i,
                total_count=count,
                ref_image=task_refs[0] if task_refs else None,
                language=language,
                idea=idea,
                avatar_url=avatar_url,
            )
            tasks.append((prompt, caption, task_refs, i))

        def run_ecomm_task(task):
            prompt, caption, task_ref, index = task
            try:
                img_count = len(task_ref) if task_ref else 0
                img_types = []
                for idx, img in enumerate(task_ref or []):
                    if isinstance(img, str) and img.startswith('http'):
                        img_types.append(f"[{idx}] URL: {img[:80]}")
                    elif isinstance(img, str):
                        img_types.append(f"[{idx}] base64 ({len(img)//1024}KB)")
                print(f"\n[EcommAgent DEBUG] 🖼 Task {index+1}: Passing {img_count} image(s) to FAL:")
                for t in img_types: print(f"  {t}")
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=task_ref,
                    image_size=fal_size,
                    quality=img_quality,
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

        # Mix of agent-planned camera angles + 10 templates if ad_template is None
        mixed_directives = []
        if ad_template is None:
            _raw_cat = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")).lower()
            _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear", "shoe", "accessory", "accessories", "streetwear", "ethnic", "kurta", "saree", "jewellery", "jewelry"]
            is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)
            
            template_directives = [t["directive"] for t in AD_TEMPLATE_DIRECTIVES.values()]
            
            num_angles = math.ceil(count * 5 / 8)
            num_templates = count - num_angles
            
            planned_angles = plan_image_shots(
                brand_doc=brand_doc,
                product=products[0] if products else None,
                platform=platform or "Instagram",
                count=num_angles if num_angles > 0 else 1,
                is_fashion=is_fashion,
                layout="image"
            )
            
            shuffled_templates = template_directives.copy()
            random.shuffle(shuffled_templates)
            templates_sampled = [shuffled_templates[i % len(template_directives)] for i in range(num_templates)]
            
            mixed_directives = planned_angles[:num_angles] + templates_sampled
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
            
            # Cost optimisation: pass only product image + logo (not all scraped ref_images)
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)

            t_id = _template_for(i)
            c_dir = None
            if ad_template is None:
                c_dir = mixed_directives[i]
                t_id = None

            prompt = build_image_prompt(
                brand_doc, idea, aspect_ratio,
                product=prod, ad_template=t_id,
                language=language, custom_directive=c_dir,
                text_mode=text_mode,
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
                img_count = len(refs) if refs else 0
                img_types = []
                for idx, img in enumerate(refs or []):
                    if isinstance(img, str) and img.startswith('http'):
                        img_types.append(f"[{idx}] URL: {img[:80]}")
                    elif isinstance(img, str):
                        img_types.append(f"[{idx}] base64 ({len(img)//1024}KB)")
                print(f"\n[ImageAgent DEBUG] 🖼 Task {index+1}: Passing {img_count} image(s) to FAL:")
                for t in img_types: print(f"  {t}")
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=refs,
                    image_size=fal_size,
                    quality=img_quality,
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

    # ── PHOTOSHOOT ─────────────────────────────────
    elif layout == "photoshoot":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
        tasks = []
        for i in range(count):
            prod = assigned_products[i]
            
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
            
            c_dir = "STRICTLY NO TEXT. THE IMAGE MUST BE PURE PHOTOGRAPHY WITH NO LETTERS, LOGOS, OR CHARACTERS. Place the product in a stunning, cinematic photoshoot setting."
            
            prompt = build_image_prompt(
                brand_doc, idea, aspect_ratio, 
                product=prod, ad_template=None, 
                language=language, custom_directive=c_dir
            )
            tasks.append((prompt, task_refs, i, prod))

        def run_photoshoot_task(task):
            prompt, refs, index, prod = task
            print(f"\n[StrategyAgent] 📸 Photoshoot {index+1}/{count} | ref_image={'YES ✓' if refs else 'NONE'}")
            
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=refs,
                    image_size=fal_size,
                    quality=img_quality,
                )
                return {
                    "image":    result["image"],
                    "caption":  "",
                    "type":     "photoshoot",
                    "template": "Photoshoot",
                    "index":    index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Photoshoot {index+1} failed: {e}")
                return {
                    "image":    None,
                    "caption":  "",
                    "type":     "photoshoot",
                    "error":    str(e),
                    "index":    index
                }

        print(f"[StrategyAgent] 🚀 Running photoshoot generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_photoshoot_task, tasks))
            
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
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
        def run_carousel_task(index):
            prod = assigned_products[index]
            
            # Cost optimisation: pass only product image + logo (not all scraped ref_images)
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and index < len(assigned_refs) and assigned_refs[index]:
                task_refs.append(assigned_refs[index])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
                
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
                img_count = len(task_refs) if task_refs else 0
                img_types = []
                for idx, img in enumerate(task_refs or []):
                    if isinstance(img, str) and img.startswith('http'):
                        img_types.append(f"[{idx}] URL: {img[:80]}")
                    elif isinstance(img, str):
                        img_types.append(f"[{idx}] base64 ({len(img)//1024}KB)")
                print(f"\n[CarouselAgent DEBUG] 🎠 Carousel {index+1}: Passing {img_count} image(s) to FAL:")
                for t in img_types: print(f"  {t}")
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_doc.get('brandName', 'Brand')} — {idea}" if idea and idea.strip() else brand_doc.get('brandName', 'Brand'),
                    image=task_refs,
                    count=slide_count,
                    slide_prompts=enriched_slide_prompts,
                    image_size=fal_size,
                    quality=img_quality,
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
                    
                    lang_req = language.upper() if language else "ENGLISH"
                    sys_msg = f"You are a D2C marketing assistant. Generate a talking-head UGC video script and avatar description for the given product. The script MUST be written in {lang_req}."
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
                    gpt_res = generate_fal_image_gpt2(prompt=stage1_prompt, image=ref, image_size=gpt_size, quality=img_quality)
                    generated_img = gpt_res.get("image")
                    if not generated_img:
                        raise Exception("UGC Stage 1 image generation failed")
                    
                    # Generate custom Instagram caption + hashtags using Gemini during Stage 1
                    if language and language.lower() == "hindi":
                        caption = ""
                    else:
                        caption = generate_instagram_caption_and_hashtags(
                            brand_doc=brand_doc,
                            product=prod,
                            layout="video",
                            idea=f"UGC Video post with script: {video_script}",
                            language=language,
                            template_label="UGC Creator Video",
                            index=index,
                        )
                    
                    # Stage 2: Take the generated hero image and animate it with Veo 3.1 Fast
                    print(f"[StrategyAgent] UGC Stage 2: Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=prompt, image=generated_img, aspect_ratio=aspect_ratio, duration=8, resolution=video_resolution or "1080p")
                else:
                    # Standard img2video uses Google Veo 3.1 Fast
                    caption = pick_caption(index)
                    print(f"[StrategyAgent] Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=prompt, image=ref, aspect_ratio=aspect_ratio, duration=8, resolution=video_resolution or "1080p")

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
