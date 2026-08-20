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
from ad_creative_agent import generate_ad_creatives

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


# ──────────────────────────────────────────────────────────────────────────────
# E-COMM LISTING: Reverse-engineered 9-slot framework (Physical Product + Fashion)
# Matches the architecture used by makelocalads.com (analysed Aug 2026)
# ──────────────────────────────────────────────────────────────────────────────

# 9 slot template for physical products (supplements, skincare, electronics, food, FMCG)
PHYSICAL_PRODUCT_SLOTS: List[str] = [
    # slot 0 — Main Hero
    "Show the exact [PRODUCT_NAME] on a pure white background. Use clean commercial lighting, "
    "sharp focus, and a thumbnail-friendly three-quarter angle. The product must fill most of the "
    "square frame, fully visible, with no loose props, text, badges, or graphics.",
    # slot 1 — Benefit callouts
    "Create a benefit-led product image with the product hero on a clean light background. Add "
    "concise callouts for the top 3–4 key benefits or USPs. Keep language supportive, not "
    "medicinal. Make the product label prominent.",
    # slot 2 — Ingredients / Materials
    "Highlight the key active ingredients or materials visually: product in center with neat "
    "ingredient callouts or tasteful botanical/icon illustrations. Do not imply medical treatment "
    "or guaranteed results.",
    # slot 3 — Safety / Free-From / Certifications
    "Feature dietary fit, free-from details, or certification icons in a clean icon grid beside "
    "the product. Prioritize the most shopper-critical claims. Make it easy to scan for shoppers "
    "with specific dietary restrictions or safety requirements.",
    # slot 4 — Value / Bundle / Quantity
    "Show the value or bundle story: multiple units or pack contents arranged neatly. Emphasize "
    "daily-use routine or replenishment without making unverified savings or duration claims that "
    "are not provided in the product information.",
    # slot 5 — Lifestyle / Routine Context
    "Create a routine-context or lifestyle image showing the product in its natural use "
    "environment. The scene should feel calm, aspirational, and adult wellness-oriented — "
    "suggesting an easy daily habit while avoiding dosage instructions or medical claims.",
    # slot 6 — Texture / Macro Detail
    "Show a close-up macro image focusing on texture, material quality, or product detail. "
    "Communicate the product's physical form, format, and sensory qualities in a visually "
    "appetizing but supplement-appropriate and commercially neutral way.",
    # slot 7 — Label / Dimension / Technical
    "Create a label-detail or dimensions image clearly showing the product's front and/or side "
    "label, key certification icons, branding, and size or quantity markings. This helps shoppers "
    "verify exactly what they are buying.",
    # slot 8 — Usage / Care / Safety Reminders
    "Create a step-by-step how-to-use or safety reminder image. Show usage infographic steps or "
    "safety icons in a calm, practical, non-alarming tone. Keep the product prominent throughout.",
]

# 9 slot template for fashion / apparel
FASHION_APPAREL_SLOTS: List[str] = [
    # slot 0 — Main Hero
    "Show the [PRODUCT_NAME] alone on a pure white background, front-facing on a clean ghost "
    "mannequin or neatly folded flat. No props, no text, no badges. Sharp focus. Product fills "
    "most of the square frame with clean edges.",
    # slot 1 — Model Worn (Front)
    "Create a polished model image showing the garment worn front-facing in a simple neutral "
    "studio setting. Focus on the silhouette, fit, fabric drape, and the main design elements. "
    "Lighting should be clean and even to render the fabric accurately.",
    # slot 2 — Design Detail Close-Up
    "Feature a close-up detail image of the garment's most distinctive design element — "
    "embroidery, print, embellishment, or fabric texture. This should communicate the craft, "
    "quality, and visual contrast that justify the purchase.",
    # slot 3 — Lifestyle Styled Scene
    "Show a lifestyle daily-wear or occasion scene with the garment styled for a casual outing, "
    "festive moment, or workday. Pair simply with neutral accessories. The scene should feel "
    "authentic, aspirational, and relatable to the target audience.",
    # slot 4 — Feature Callout Labels
    "Create a feature callout image using clean product photography with small labels pointing to "
    "key visible attributes: fabric type, fit, neckline, sleeve length, garment length, and any "
    "special craft or finishing detail. Use tasteful typography with arrows on the actual garment areas.",
    # slot 5 — Back View
    "Show the back view of the garment on a model or ghost mannequin. Highlight the back "
    "neckline, back design or detailing, hem finish, and overall back silhouette to give shoppers "
    "a complete 360-degree picture.",
    # slot 6 — Finishing Details Close-Up
    "Create a close-up image of the finishing details — cuffs, hem borders, side slits, "
    "stitching, buttons, placket, or trim — to reassure shoppers about construction quality "
    "beyond the front-facing hero shot.",
    # slot 7 — Size & Fit Support
    "Design a size and fit support image showing the garment on a model in a neutral forward-facing "
    "pose with a simple size range note or fit description overlay. Help online shoppers choose "
    "their size confidently without a physical try-on.",
    # slot 8 — Care & Origin Info
    "Create a care and origin information image with the garment neatly folded on a clean surface. "
    "Include concise care instructions, fabric composition, net quantity, and country of origin. "
    "Keep the tone premium and practical as a final trust-and-maintenance support image.",
]

# Static guardrails appended to EVERY E-Comm prompt (identical across all 9 slots)
ECOMM_CONSISTENCY_RULE = (
    "CONSISTENCY RULE: Keep the product's shape, materials, colors, proportions, label details, packaging details, "
    "and overall visual identity consistent with this description. If no packaging images are provided, do not assume or invent fake packaging."
)

ECOMM_SAFETY_GUARDRAIL = (
    "COMMERCIAL GUARDRAIL: Keep generated image prompts policy-safe and commercially neutral. Avoid explicit sexual "
    "content, nudity, graphic violence, self-harm, hate, harassment, illegal activity, deception, "
    "regulated goods misuse, unsafe instructions, or professional medical/legal/financial advice. "
    "Treat minors and vulnerable groups with extra care. For sensitive products, avoid dosage, "
    "treatment claims, guaranteed results, or depictions of risky use; prefer neutral "
    "product-focused lifestyle scenes. Premium e-commerce product photography. Do not include random watermarks, chaotic layouts, or unreadable distorted text."
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
    headline       = ""
    website        = bd.get("website", "")
    logo           = bd.get("logo", "")
    fonts          = ", ".join(bd.get("fonts", [])) if isinstance(bd.get("fonts"), list) else bd.get("fonts", "")

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
        f"Brand Typography/Fonts: {fonts if fonts else 'Standard modern fonts'}.\n"
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
        appearance = (product.get("adVisualDescription") or product.get("visual_description") or "").strip()
        appearance_text = f"\nVERIFIED PRODUCT APPEARANCE: {appearance}" if appearance and "fail" not in appearance.lower() else ""
        product_block = f"""
Featured Product: {product.get('name', '')}
Price: {product.get('offerPrice', '') or product.get('price', '')}
Key Benefit: {product.get('keyBenefit', '')}
Description: {product.get('description', '')}{appearance_text}

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
Create a high-converting,scroll stopping, product ad creative.
{platform_instruction}
{logo_inst}
Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
Any text overlays, labels, or copy displayed in the image must be in {language}.{fashion_note}"""

# ──────────────────────────────────────────────
# Copy generation for WhatsApp & Email
# ──────────────────────────────────────────────
def get_campaign_copy_prompts(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], layout: str, idea: Optional[str], language: str = "english", whatsapp_template: Optional[str] = None) -> tuple:
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

    # Marketing templates that need a separate {{1}} headline + {{2}} body
    MARKETING_TEMPLATES = {
        "syncsocio_festival", "syncsocio_promo_image", "syncsocio_promo_video",
        "syncsocio_promo_generic", "syncsocio_promo_lead", "syncsocio_interactive_poll",
        "syncsocio_promo_shop", "syncsocio_promo_claim", "syncsocio_promo_visit",
        "syncsocio_promo_book", "syncsocio_promo_order", "syncsocio_promo_learn",
        "syncsocio_promo_get", "syncsocio_promo_text",
    }
    is_marketing_template = whatsapp_template in MARKETING_TEMPLATES

    if layout == "whatsapp":
        if is_marketing_template:
            # Marketing templates: Gemini must produce a bold headline (≤60 chars) + engaging body copy
            sys_msg = (
                f"You are an expert D2C copywriter. Write a WhatsApp marketing campaign message in {language}. "
                "Output ONLY a valid JSON object with two keys: "
                "'subject' (a short, bold, attention-grabbing headline — MAX 60 characters, NO emojis, NO asterisks) and "
                "'body' (the detailed campaign message — MAX 500 characters, conversational, emoji-rich, engaging). "
                "Strict Rule: Write PLAIN TEXT only. No HTML, no CSS, no asterisks in subject. "
                "If a Website URL is provided, include it naturally in the body as the CTA link."
            )
        else:
            # Legacy single-variable templates
            sys_msg = (
                f"You are an expert D2C copywriter. Write a WhatsApp broadcast message in {language}. It must be short, punchy, conversational, and use emojis. "
                "Output ONLY a valid JSON object with a single key 'body' containing the exact message string. "
                "Strict Rule: Write the message as PLAIN TEXT only. Do NOT output any HTML tags, code, or CSS. "
                "If a Website URL is provided in the prompt details, you MUST include it directly in the message/body as the CTA link (do NOT use placeholder links like [Link] or [website URL])."
            )
        
        template_rule = ""
        if whatsapp_template:
            if "shipped" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a Utility 'Order Shipped' template. Focus ONLY on providing order status, tracking info, and a professional tone. Keep it highly concise."
            elif "confirmed" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a Utility 'Order Confirmed' template. Focus ONLY on confirming the order and thanking the customer. Keep it highly concise."
            elif "payment" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a Utility 'Payment Reminder' template. Politely remind the customer about a pending payment and provide a link to pay."
            elif "appointment" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a Utility 'Appointment Reminder' template. Remind the user about an upcoming appointment, mentioning time and date placeholders."
            elif "interactive_poll" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is an 'Interactive Poll' template (Swish style). The 'body' should include: a short conversational opening, a question with 3 poll options using '◯ ' as radio button bullets with emojis, a witty one-liner below it, and 'T&C apply, reply STOP to unsubscribe' footer. The 'subject' should be a punchy sale announcement (e.g. 'Payday Sale is Here!')."
            elif "festival" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a Marketing 'Festival Promo' template. Use high-energy, festive, celebratory language. The 'subject' should be a festive headline (e.g. 'Diwali Special — Light Up Your Savings!'). The 'body' should celebrate the occasion and push the offer."
            elif "promo_shop" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Shop Now' button. The 'subject' must be a bold shopping headline (e.g. 'Flash Sale Alert!'). The 'body' must build excitement around products and direct them to shop the catalog."
            elif "promo_claim" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Claim Offer' button. The 'subject' must be a discount/gift headline (e.g. 'Get 30% Off Today!'). The 'body' must invite them to claim their exclusive discount or coupon code."
            elif "promo_visit" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Visit Website' button. The 'subject' must invite curiosity (e.g. 'Our New Website is Live!'). The 'body' must encourage the user to explore, browse the new arrivals, or visit the store online."
            elif "promo_book" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Book Now' button. The 'subject' must be booking-related (e.g. 'Secure Your Spot!'). The 'body' must announce slot/consultation availability and urge them to book their appointment immediately."
            elif "promo_order" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has an 'Order Now' button. The 'subject' must be craving/order-related (e.g. 'Dinner is Served!'). The 'body' must make the menu sound mouth-watering and urge them to place an order now."
            elif "promo_learn" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Learn More' button. The 'subject' must be educational or curiosity-driven (e.g. 'Free Masterclass Access!'). The 'body' must highlight the knowledge/benefits they will gain and prompt them to learn more."
            elif "promo_get" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This template has a 'Get It Free' button. The 'subject' must focus on free value (e.g. 'Your Free Guide Inside!'). The 'body' must describe the free ebook, guide, or gift and direct them to get it free."
            elif "promo_text" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a text-only template with a 'View Details' button. The 'subject' should be a quick announcement headline (e.g. 'Quick Store Update!'). The 'body' must deliver clean informational text or announcement details."
            elif "promo" in whatsapp_template:
                template_rule = "\nTEMPLATE CONSTRAINT: This is a general 'Promo' template. The 'subject' should be a bold offer headline (e.g. 'Mega Sale — Up to 60% OFF!'). The 'body' should be persuasive copy highlighting the product's value with a strong CTA."

        user_msg = f"{block}\n{product_block}{idea_info}{template_rule}\n\nDraft the WhatsApp message now."
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
    trigger_keyword: Optional[str] = "",
) -> str:
    print(f"[CaptionAgent] ✍️ Generating caption for {layout} with idea: '{idea}' (Keyword: '{trigger_keyword}')")
    try:
        import os
        api_key = os.getenv("GOOGLE_API_KEY")
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.8, google_api_key=api_key)
        brand_name = brand_doc.get("brandName", "Brand")
        brand_block = _brand_block(brand_doc)
        
        product_info = ""
        if product:
            product_info = f"Featured Product: {product.get('name', '')}\nKey Benefit: {product.get('keyBenefit', '')}\nDescription: {product.get('description', '')}\n"
            
        idea_info = f"Campaign Topic/Idea: {idea}\n" if idea and idea.strip() else ""
        context_info = f"Visual Style/Layout: {template_label}\n" if template_label else ""
        
        dm_instruction = ""
        if trigger_keyword:
            dm_instruction = (
                f"\n\n═══════════ DM AUTOMATION CTA (MANDATORY) ═══════════\n"
                f"The FIRST LINE of the caption MUST be a clear, natural call-to-action asking "
                f"the reader to comment the exact keyword '{trigger_keyword}' to receive the link/details "
                f"in their DMs. Do not bury this lower in the caption — it must be the opening line.\n"
                f"Style it naturally in the brand's tone, not robotically.\n"
                f"Example: \"Comment '{trigger_keyword}' and I'll send you the link 👇\" or "
                f"\"Want this? Comment '{trigger_keyword}' below and check your DMs.\"\n"
                f"After this opening line, continue with the rest of the caption as normal (hook, body, hashtags).\n"
            )

        sys_msg = (
            "You are a brilliant, trendy Instagram social media manager and D2C copywriter. "
            f"Write a highly engaging Instagram caption in {language} for a post. "
            "The caption must: \n"
            "1. Start with an attention-grabbing hook (use emojis naturally), UNLESS a DM Automation CTA is required (in which case the CTA goes first).\n"
            "2. Focus on the brand value, product benefits, or the campaign idea.\n"
            "3. Include a clear Call to Action (CTA) like 'Click the link in bio to shop' or 'Tell us in the comments'.\n"
            "4. End with 5-10 highly relevant, trending Instagram hashtags (including the brand name as a hashtag).\n"
            "Keep the tone consistent with the brand tone. Output ONLY the caption with hashtags. Do not include markdown formatting or quotes."
            f"{dm_instruction}"
        )
        
        user_msg = (
            f"Brand Details:\n{brand_block}\n"
            f"{product_info}"
            f"{idea_info}"
            f"{context_info}"
            f"Post Index: {index + 1}\n\n"
            "Generate the caption now."
        )
        
        print(f"[CaptionAgent] 📡 Calling Gemini 2.5 Flash API...")
        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        print(f"[CaptionAgent] ✅ Gemini responded successfully.")
        content = response.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)
        return content.strip()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[CaptionAgent] ❌ Failed to generate caption via Gemini: {e}")
        default_captions = [
            "Your next obsession is here ✨ #glowup #d2c",
            "POV: your daily routine gets an upgrade 🚀 #aesthetic #selfcare",
            "This is your sign to treat yourself 💌 #wellness #treatyourself",
        ]
        return default_captions[index % len(default_captions)]

def generate_campaign_copy(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], layout: str, idea: Optional[str], language: str = "english", whatsapp_template: Optional[str] = None) -> Dict[str, str]:
    """Uses Gemini Flash to write tailored email or whatsapp copy."""
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
    
    sys_msg, user_msg = get_campaign_copy_prompts(brand_doc, product, layout, idea, language, whatsapp_template)
    
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
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
    
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


def _is_fashion_brand(brand_doc: Dict[str, Any]) -> bool:
    """Returns True if brand's category is fashion / apparel."""
    raw = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "")
    ).lower()
    keys = ["fashion", "apparel", "clothing", "garment", "footwear",
            "shoe", "accessory", "accessories", "streetwear",
            "ethnic", "kurta", "saree", "jewellery", "jewelry"]
    return any(k in raw for k in keys)


def plan_ecomm_slots(product: Optional[Dict[str, Any]], count: int, is_fashion: bool) -> List[str]:
    """
    Uses Gemini to intelligently select the `count` most relevant slots from the full pool of 9
    based on the specific product's features. Slot 1 is always forced.
    """
    pool = FASHION_APPAREL_SLOTS if is_fashion else PHYSICAL_PRODUCT_SLOTS
    
    # If they want all slots or more, just return the whole pool
    if count >= len(pool):
        return pool[:count]
        
    # Slot 1 (Main Hero) is ALWAYS required
    selected = [pool[0]]
    remaining_count = count - 1
    
    if remaining_count <= 0:
        return selected

    available_pool = pool[1:]
    
    prod_name = product.get("name", "Flagship product") if product else "Flagship product"
    prod_desc = (product.get("description", "") if product else "")[:300]
    prod_benefit = (product.get("keyBenefit", "") if product else "")[:200]
    _specs = product.get("specifications", []) if product else []
    prod_specs = "\n".join([f"{s.get('key', '')}: {s.get('value', '')}" for s in _specs if isinstance(s, dict)])
    
    system_prompt = (
        "You are an E-Commerce Strategy Planner. Your job is to curate the perfect image gallery layout for a product.\n"
        f"You must select exactly {remaining_count} additional slots from the provided menu to accompany the Main Hero image.\n"
        "Return ONLY a JSON array of the exact strings from the menu. Do not invent new slots or modify the strings.\n"
        "Example output: [\"Model (Front)...\", \"Size & Fit...\"]"
    )
    
    user_prompt = f"Product: {prod_name}\nDescription: {prod_desc}\nBenefit: {prod_benefit}\nSpecs: {prod_specs}\n\n"
    user_prompt += "AVAILABLE SLOTS TO CHOOSE FROM (Pick exactly " + str(remaining_count) + " based on what is most relevant for this specific product):\n\n"
    user_prompt += "\n\n".join(available_pool)
    
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage
        import os, json
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2, google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw = response.content.strip()
        
        start_idx = raw.find('[')
        end_idx = raw.rfind(']')
        if start_idx != -1 and end_idx != -1:
            raw = raw[start_idx:end_idx+1]
        
        chosen_slots = json.loads(raw)
        
        # Verify the LLM returned exactly strings that exist in our pool
        valid_chosen = [s for s in available_pool if any(s.startswith(c[:20]) for c in chosen_slots)]
        
        # If it failed to return enough valid ones, fallback to sequential
        if len(valid_chosen) < remaining_count:
            valid_chosen = valid_chosen + [s for s in available_pool if s not in valid_chosen]
            
        selected.extend(valid_chosen[:remaining_count])
        
    except Exception as e:
        print(f"[EcommPlanner] ⚠️ Planning failed ({e}). Falling back to sequential slots.")
        selected.extend(available_pool[:remaining_count])
        
    return selected


def generate_ecomm_idea_briefs(
    brand_doc: Dict[str, Any],
    product: Optional[Dict[str, Any]],
    platform: str,
    count: int,
    is_fashion: bool,
    idea: Optional[str] = None,
    language: str = "english",
    has_avatar: bool = False,
) -> tuple[List[str], List[str]]:
    """
    Director LLM: takes the appropriate slot template list (first `count` slots) and
    calls Gemini Flash ONCE to produce product-specific, constraint-bound idea briefs
    for every slot in a single JSON array response.

    Returns: Tuple of (idea_briefs_list, slot_templates_list)
    """
    # Generate dynamic slots using LLM Planner instead of strict slicing
    print(f"[EcommPlanner] 🧠 Planning {count} optimal e-commerce slots for {product.get('name', 'product') if product else 'product'}...")
    slot_templates = plan_ecomm_slots(product, count, is_fashion)

    # Apply Amazon vs non-Amazon rule for slot 0 (Main Hero)
    slot_templates = list(slot_templates)
    if platform != "Amazon":
        slot_templates[0] = slot_templates[0].replace(
            "on a pure white background",
            f"on a clean, premium studio background appropriate for {platform}"
        )

    # Build product intelligence block
    prod_name    = (product.get("name", "") if product else "") or brand_doc.get("brandName", "the product")
    prod_desc    = (product.get("description", "") if product else "")[:300]
    prod_benefit = (product.get("keyBenefit", "") if product else "")[:200]
    prod_vision  = (product.get("adVisualDescription", "") if product else "")[:600]
    prod_vision_sec = (product.get("adVisualDescriptionSecondary", "") if product else "")[:600]
    if prod_vision_sec:
        prod_vision += f"\n\nBACK/SECONDARY VIEW DESCRIPTION:\n{prod_vision_sec}"
    prod_price   = (product.get("price", "") if product else "")
    _specs = product.get("specifications", []) if product else []
    prod_specs = "\n".join([f"{s.get('key', '')}: {s.get('value', '')}" for s in _specs if isinstance(s, dict)])

    
    # Build brand DNA block
    brand_name      = brand_doc.get("brandName", "Brand")
    category        = (
        brand_doc.get("otherCategory")
        if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory")
        else brand_doc.get("businessCategory", "General")
    )
    primary_color   = brand_doc.get("primaryColor", "#000000")
    secondary_color = brand_doc.get("secondaryColor", "#FFFFFF")
    visual_vibe     = brand_doc.get("visualVibe", "Clean Minimal")
    brand_font      = brand_doc.get("typography", "Clean Sans-Serif")
    brand_design_guide = brand_doc.get("brandDesignGuide", "")

    platform_context = PLATFORM_RULES.get(platform, "Clean, premium, commercial product photography.")

    numbered_slots = ""
    for i, tmpl in enumerate(slot_templates):
        slot_label = tmpl.split(".")[0][:80] if "." in tmpl else tmpl[:80]
        numbered_slots += f"\n\nSLOT {i+1}/{count}:\n{tmpl}"

    idea_block = f"\n\nADDITIONAL DIRECTION FROM USER: {idea}" if idea and idea.strip() else ""

    system_prompt = (
        "You are an expert E-Commerce Art Director generating product listing image briefs.\n"
        "Your briefs should be commercially neutral, constraint-bound, and visually specific — "
        "exactly like the ones used by top marketplace sellers on Amazon India.\n"
        "IMPORTANT: You must ensure that EXACTLY ONE generated slot (e.g., the Ingredients or Detail slot) explicitly instructs the generative engine to 'use the back/label product image reference'. For all other slots, instruct it to use the 'front product image reference'.\n"
        f"Return ONLY a valid JSON array of exactly {count} strings. No markdown, no explanation."

    )

    user_prompt = f"""Generate exactly {count} product-specific image briefs for this e-commerce listing.

BRAND DNA & DESIGN LANGUAGE:
- Brand Name: {brand_name}
- Category: {category}
- Visual Vibe: {visual_vibe}
- Primary Color: {primary_color}
- Secondary Color: {secondary_color}
- Typography: {brand_font}

COMPREHENSIVE BRAND DESIGN GUIDE:
{brand_design_guide}

PRODUCT INTELLIGENCE:
- Product Name: {prod_name}
- Description: {prod_desc}
- Key Benefit: {prod_benefit}
- Packaging / Visual: {prod_vision}
- Price: {prod_price}
- Specifications: {prod_specs}


PLATFORM: {platform}
- Platform aesthetic: {platform_context}

FRAMEWORK: {"FASHION_APPAREL" if is_fashion else "PHYSICAL_PRODUCT"}
{idea_block}

SLOT TEMPLATES TO ADAPT:
{numbered_slots}

RULES FOR EACH BRIEF (Write 4-6 dense, highly specific sentences per slot):
1. COMPOSITION & HERO: Start with an action verb (Show / Create / Feature / Highlight). Substitute the ACTUAL product name, colors, materials, and ingredients from Product Intelligence above.
2. BACKGROUND & LIGHTING: Explicitly define the background. For Amazon, Slot 1 MUST be pure white (#FFFFFF). However, for ALL subsequent slots (Slot 2-9), NEVER use a plain white background. Instead, you MUST STRICTLY FOLLOW THE UI BACKGROUND COLOR RULE: Generate a very light, desaturated tint that complements both the primary and secondary brand colors. Never use the primary or secondary color directly as the background. Prioritize readability and visual balance (e.g., "very light, desaturated warm grey-pink backdrop", "soft washed-out mint gradient").
3. HEADLINES, TYPOGRAPHY & OVERLAYS (Crucial): For any slot with text, explicitly define a strong HEADLINE (e.g., "KEY INGREDIENTS", "DIETARY FIT", "3-PACK CONTENTS"). Mention the font style (e.g., "{brand_font}"), the exact text color using hex codes (e.g., "text in {primary_color}"), and text placement. If applicable, add a subtle CTA or badge (e.g., "a pill-shaped badge reading 'Vegan Friendly'").
4. INGREDIENT PROPS & VISUALS: Do not just say "add icons". When describing ingredients or flavors, explicitly command the visual engine to draw realistic supporting props (e.g., "subtle green botanical leaves", "ashwagandha root sticks", "sliced oranges", "water droplets"). Integrate these props beautifully around the product to elevate the premium feel.
5. MAXIMIZE ECOMM INFO: This is a premium e-commerce listing, so pack the images with highly informative text. Instruct the visual engine to list a substantial amount of key ingredients (e.g., 4-6 primary ingredients) rather than just one or two, along with step-by-step usage instructions and key specifications. Cram the image with detailed text callouts, rich lists, and infographics so the shopper gets a comprehensive view without it becoming an unreadable wall of text.
6. AMAZON MAIN IMAGE: Slot 1 (Main Hero) on Amazon MUST explicitly state "on a pure white background (#FFFFFF)" and "no text, no badges, no props".
7. NO INVENTIONS: Only reference benefits, ingredients, or certifications verified in Product Intelligence. Never invent claims, competitor facts, certifications, savings amounts, or guaranteed results.
8. MODELS: For fashion slots showing models: do NOT describe specific model skin tone or ethnicity.
9. LANGUAGE: Write ALL output descriptions strictly in {language}.
{f"10. AVATAR / VIRTUAL MODEL: The user has provided a specific virtual model/avatar. For any slot where a human model is naturally required or appropriate, you MUST explicitly design the scene around using this model." if has_avatar else ""}

Return ONLY a JSON array of {count} strings: ["brief1", "brief2", ...]"""

    try:
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3,
                                      google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw = response.content
        if isinstance(raw, list):
            raw = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw)
        raw = raw.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        briefs = json.loads(raw.strip())
        if isinstance(briefs, list) and len(briefs) == count:
            print(f"[EcommDirector] ✅ Generated {count} idea briefs for {prod_name} on {platform}")
            return briefs, slot_templates
    except Exception as e:
        print(f"[EcommDirector] ⚠️ LLM brief generation failed: {e}. Falling back to templates.")

    # Fallback: return raw templates with product name substituted
    return [t.replace("[PRODUCT_NAME]", prod_name) for t in slot_templates], slot_templates


def assemble_ecomm_final_prompt(idea_brief: str, product_vision_desc: str) -> str:
    """
    Assembles the final prompt exactly like makelocalads.com:
    [idea brief] + [product visual description] + [static consistency rule] + [static safety guardrail]
    """
    parts = [idea_brief.strip()]
    if product_vision_desc and product_vision_desc.strip():
        parts.append("PRODUCT REFERENCE DETAILS: " + product_vision_desc.strip())
    parts.append(ECOMM_CONSISTENCY_RULE)
    parts.append(ECOMM_SAFETY_GUARDRAIL)
    return "\n\n".join(parts)


def plan_image_shots(brand_doc: Dict[str, Any], product: Optional[Dict[str, Any]], platform: str, count: int, 
is_fashion: bool, layout: str, idea: str = "", language: str = "english") -> List[str]:
    try:
        brand_name = brand_doc.get("brandName", "Brand")
        prod_name = product.get("name", "Flagship product") if product else "Flagship product"
        
        if layout == "ecomm":
            persona = "You are an expert E-Commerce Art Director planning a photoshoot. "
            desc_rule = "Each string should contain a short angle name followed by a 2-3 line vivid description of a highly varied e-commerce image. Include lifestyle shots with models holding/using the product, extreme macro texture shots, and stunning contextual backgrounds with creative props. Do not just describe the product; describe the entire scene. "
        elif layout == "photoshoot":
            persona = "You are an expert Product Photographer planning a high-end commercial photoshoot. "
            desc_rule = "Each string should contain a short angle name followed by a highly detailed 1-2 line description of the scene, including specific lighting, background, and visual props. "
        else:
            persona = "You are an expert Social Media Creative Director. You need to draft highly creative, trending ad concepts that are working and converting right now. "
            desc_rule = "Each string should contain a short angle name followed by a 1-2 line description of the angle and layout (do NOT specify lighting, background, or visual props). "
            
        system_prompt = (
            f"{persona}"
            f"You need to plan exactly {count} distinct shot types/angles for this product/brand. "
            f"Return ONLY a valid JSON array of strings. {desc_rule}"
            "Do not return JSON objects, just an array of strings like: [\"Angle 1: Description of the angle...\", \"Angle 2: Description of the angle...\"]"
        )
        
        user_prompt = f"Brand: {brand_name}\nProduct: {prod_name}\nLayout Type: {layout}\nTarget Platform: {platform}\nIs Fashion/Apparel: {is_fashion}\n\n"
        if idea:
            user_prompt += f"Campaign Concept / User Instruction: {idea}\n\n"
        
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
            
        user_prompt += f"IMPORTANT LANGUAGE RULE: Write ALL directions and angle descriptions strictly in {language}.\n\n"
            
        if layout != "ecomm":
            user_prompt += f"CRITICAL RULE ON BACKGROUNDS: Since you are planning {count} shots, you MUST strictly follow the UI BACKGROUND COLOR RULE for any shots that require a simple or solid background. Generate a very light, desaturated tint that complements both the primary and secondary brand colors. Never use the primary or secondary color directly as the background. Prioritize readability and visual balance.\n\n"
            
        user_prompt += f"Output EXACTLY {count} labels in a JSON array."
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.4, google_api_key=os.getenv("GOOGLE_API_KEY"))
        response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)])
        raw_content = response.content
        if isinstance(raw_content, list):
            content = raw_content[0].get("text", "")
        else:
            content = str(raw_content)
        content = content.strip()
        
        if content.startswith("```json"): content = content.replace("```json", "", 1)
        if content.endswith("```"): content = content[:-3]
        
        shots = json.loads(content.strip())
        if isinstance(shots, list) and len(shots) == count: return shots
    except Exception as e:
        print(f"[ShotPlanner] ⚠️ LLM Planning failed: {e}. Falling back to default.")
    
    return ["Classic White Background"] + [f"Dynamic Angle {i}" for i in range(2, count + 1)]



def build_carousel_slide_prompts(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    slide_count: int,
    product: Optional[Dict[str, Any]] = None,
    language: str = "english"
) -> List[Dict[str, str]]:
    """Uses Gemini Flash to draft content for N slides."""
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)

    block = _brand_block(brand_doc)
    prod_info = ""
    if product:
        appearance = (product.get("adVisualDescription") or product.get("visual_description") or "").strip()
        appearance_text = f" VERIFIED PRODUCT APPEARANCE: {appearance}" if appearance and "fail" not in appearance.lower() else ""
        prod_info = f"\nAnchor this carousel around the product: {product.get('name')}. Benefit: {product.get('keyBenefit')}.{appearance_text}"

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
You are an expert Social Media Art Director and Copywriter.
Write the content and visual storyline for an Instagram Carousel with EXACTLY {slide_count} slides.
Output the text in {language}.
Make it punchy and engaging. Slide 1 must be a strong visual hook. The last slide must be the Call to Action.
For each slide, you must provide:
1. "text": The punchy text overlay.
2. "visual_prompt": A highly detailed, premium description of the image for that slide. Describe the camera angle, the scene, lighting, and how the product is shown. Do NOT mention text overlays in the visual_prompt. CRITICAL UI BACKGROUND COLOR RULE: If the scene requires a studio or solid background, you MUST generate a very light, desaturated tint that complements both the primary and secondary brand colors. Never use the primary or secondary color directly as the background. Prioritize readability and visual balance.

Output ONLY a valid JSON array of objects. Do not use Markdown formatting.
Example output:
[
  {{"text": "Slide 1 text here", "visual_prompt": "A cinematic macro shot of..."}},
  {{"text": "Slide 2 text here", "visual_prompt": "A lifestyle shot showing..."}}
]
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
        return [{"text": f"Slide {i+1}", "visual_prompt": "A premium product image."} for i in range(slide_count)]


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
    video_duration: Optional[int] = None,
    text_mode: str = "low",  # "low" = one headline | "heavy" = no TEXT DISCIPLINE
    avatar_url: Optional[str] = "",
    comment_keyword: Optional[str] = "",
    whatsapp_template: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
Orchestrates generation for all layout types.

    Returns:
        list of {image?: str (base64), url?: str, caption: str, type: str}
    """
    user_plan = str(brand_doc.get("selectedPlan", "starter")).lower()
    img_quality = "medium" if "pro" in user_plan else "low"
    
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

    # ── E-COMM ─────────────────────────────────────────────────────────────────
    # New architecture (Aug 2026): reverse-engineered 9-slot framework matching
    # makelocalads.com — idea brief + product vision desc + static guardrails
    # ──────────────────────────────────────────────────────────────────────────
    if layout == "ecomm":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
        plat = platform or "Shopify"
        is_fashion = _is_fashion_brand(brand_doc)

        # The single product used for this listing
        listing_product = products[0] if products else None
        if assigned_products:
            listing_product = assigned_products[0]

        prod_vision = (
            (listing_product.get("adVisualDescription") or listing_product.get("visual_description") or "")
            if listing_product else ""
        ).strip()
        prod_vision_sec = (listing_product.get("adVisualDescriptionSecondary") or "") if listing_product else ""
        if prod_vision_sec:
            prod_vision += f"\n\nBACK/SECONDARY VIEW DESCRIPTION:\n{prod_vision_sec.strip()}"

        # ── Step 1: Director LLM generates all `count` idea briefs in ONE call ──
        print(f"[EcommAgent] 🎯 Generating {count} idea briefs via Director ({plat}, fashion={is_fashion})...")
        idea_briefs, chosen_slot_templates = generate_ecomm_idea_briefs(
            brand_doc=brand_doc,
            product=listing_product,
            platform=plat,
            count=count,
            is_fashion=is_fashion,
            idea=idea,
            language=language,
            has_avatar=bool(avatar_url),
        )

        # ── Step 2: Build task list (prompt assembly + reference images) ──
        tasks = []
        for i, brief in enumerate(idea_briefs):
            final_prompt = assemble_ecomm_final_prompt(brief, prod_vision)

            # Reference images: avatar first (if any), then product image
            task_refs = []
            if avatar_url:
                res_avatar = _resolve_ref_image(avatar_url)
                if res_avatar:
                    task_refs.append(res_avatar)
            if listing_product:
                if listing_product.get("imageBase64"):
                    task_refs.append(listing_product["imageBase64"])
                if listing_product.get("imageUrls"):
                    for u in listing_product["imageUrls"][:2]:
                        resolved = _resolve_ref_image(u)
                        if resolved and resolved not in task_refs:
                            task_refs.append(resolved)
            elif assigned_refs and assigned_refs[0]:
                task_refs.append(assigned_refs[0])

            # Extract the actual short label from the chosen slot template
            raw_template = chosen_slot_templates[i] if i < len(chosen_slot_templates) else f"Slot {i+1}"
            label = raw_template.split(".")[0][:80] if "." in raw_template else raw_template[:80]
            label = label.split(":")[0].strip() if ":" in label else label.strip()

            prod_name = (listing_product.get("name", "") if listing_product else "") or brand_doc.get("brandName", "")
            caption = f"{prod_name} · {label} ({plat}) ✨"
            tasks.append((final_prompt, caption, task_refs, i))

        # ── Step 3: Parallel FAL execution ──
        def run_ecomm_task(task):
            prompt, caption, task_ref, index = task
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=task_ref,
                    image_size=fal_size,
                    quality=img_quality,
                )
                print(f"[EcommAgent] ✅ Slot {index+1}/{count} done")
                return {
                    "image":   result["image"],
                    "caption": caption,
                    "type":    "image",
                    "index":   index
                }
            except Exception as e:
                print(f"[EcommAgent] ❌ Slot {index+1} failed: {e}")
                return {
                    "image":   None,
                    "caption": caption,
                    "type":    "image",
                    "error":   str(e),
                    "index":   index
                }

        print(f"[EcommAgent] 🚀 Firing {count} FAL calls in parallel ({plat})...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_ecomm_task, tasks))

        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)

    # ── IMAGE ──────────────────────────────────
    elif layout in ("image", "festival"):
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

        print(f"\n[StrategyAgent] 🎨 Generating {count} organic {layout}s via Ad Creative Agent...")
        try:
            director_concepts = generate_ad_creatives(
                brand_doc=brand_doc,
                products=products,
                count=count,
                campaign_goal="festival" if layout == "festival" else "auto",
                campaign_angle="auto",
                idea=idea or "",
                aspect_ratio=aspect_ratio,
                ref_images=assigned_refs,
                language=language,
                post_format="image",
                user_plan=user_plan
            )
        except Exception as e:
            print(f"[StrategyAgent] ❌ Art Director failed: {e}")
            director_concepts = []

        for i, concept in enumerate(director_concepts):
            prod = assigned_products[i] if i < len(assigned_products) else None
            # Always generate a rich Instagram caption with proper hashtags.
            # For festival, merge the Director's short caption into the idea for extra context.
            caption_idea = idea
            if layout == "festival" and concept.get("caption"):
                caption_idea = f"{idea or ''} | {concept.get('caption', '')}".strip(" |")
            caption = generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout=layout,
                idea=caption_idea,
                language=language,
                template_label=concept.get("angle", "Organic Post"),
                index=i,
                trigger_keyword=comment_keyword,
            )
            
            results.append({
                "image":    concept.get("image"),
                "caption":  caption,
                "type":     "image",
                "template": concept.get("angle", "Organic Post")
            })

    elif layout == "photoshoot":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")
        tasks = []
        
        _raw_cat = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")).lower()
        _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear", "shoe", "accessory", "accessories", "streetwear", "ethnic", "kurta", "saree", "jewellery", "jewelry"]
        is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)
        
        planned_shots = plan_image_shots(
            brand_doc=brand_doc,
            product=products[0] if products else None,
            platform=platform or "Instagram",
            count=count,
            is_fashion=is_fashion,
            layout="photoshoot",
            idea=idea
        )

        for i in range(count):
            prod = assigned_products[i]
            
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
                elif prod.get("imageUrls") and prod["imageUrls"]:
                    task_refs.append(prod["imageUrls"][0])
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
            
            shot_label = planned_shots[i] if i < len(planned_shots) else "Cinematic photoshoot setting"
            c_dir = f"STRICTLY NO TEXT. THE IMAGE MUST BE PURE PHOTOGRAPHY WITH NO LETTERS, LOGOS, OR CHARACTERS. {shot_label}"
            
            prompt = build_image_prompt(
                brand_doc, idea, aspect_ratio, 
                product=prod, ad_template=None, 
                language=language, custom_directive=c_dir,
                text_mode="none"
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
        prod = assigned_products[0] if assigned_products else None

        # Use the selected product image or the reference image passed from the 3 boxes.
        ref = ref_images[0] if (ref_images and ref_images[0]) else None
        hero_image = ref if ref else ((prod.get("imageBase64") or (prod.get("imageUrls") and prod["imageUrls"][0])) if prod else None)

        if hero_image and not hero_image.startswith("http") and not hero_image.startswith("data:"):
            hero_image = "data:image/jpeg;base64," + hero_image

        print(f"\n[StrategyAgent] 📱 Campaign '{layout}' | Using campaign image: {'YES ✓' if hero_image else 'NONE'}")

        # Generate `count` distinct message variations
        num_variations = max(1, count)
        print(f"[StrategyAgent] ✍️ Generating {num_variations} {layout} variation(s) in {language}...")

        # Variation tone modifiers so each call produces a meaningfully different copy
        VARIATION_TONES = [
            "",                          # 1st: neutral/default
            "Make it more urgent and time-sensitive (e.g. 'Limited time!', 'Ends soon!').",
            "Make it fun, playful and emoji-heavy.",
            "Make it premium and sophisticated, minimal emoji.",
        ]

        for i in range(num_variations):
            tone_hint = VARIATION_TONES[i % len(VARIATION_TONES)]
            variation_idea = f"{idea or ''} {tone_hint}".strip() if tone_hint else idea
            copy_res = generate_campaign_copy(
                brand_doc, prod, layout, variation_idea,
                language=language, whatsapp_template=whatsapp_template
            )

            results.append({
                "image":    hero_image,
                "caption":  copy_res.get("body", "Failed to generate copy."),
                "subject":  copy_res.get("subject", ""),
                "type":     layout,
                "template": whatsapp_template or ("Hero + Copy" if hero_image else "Text Only"),
                "variationIndex": i + 1,
            })

    # ── CAROUSEL ───────────────────────────────
    elif layout == "carousel":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

        print(f"\n[StrategyAgent] 🎨 Generating Director Brief for {count} carousels natively...")

        def run_carousel_task(index):
            prod = assigned_products[index]
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
                elif prod.get("imageUrls") and prod["imageUrls"]:
                    task_refs.append(prod["imageUrls"][0])
            elif assigned_refs and index < len(assigned_refs) and assigned_refs[index]:
                task_refs.append(assigned_refs[index])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
                
            print(f"[StrategyAgent] ✍️ Drafting {slide_count} slides in {language} for carousel {index+1}...")
            # build_carousel_slide_prompts now returns [{"text": "...", "visual_prompt": "..."}, ...]
            slide_data = build_carousel_slide_prompts(brand_doc, idea, slide_count, product=prod, language=language)
            
            enriched_slide_prompts = []
            for i, slide in enumerate(slide_data):
                slide_text = slide.get("text", "")
                vis_prompt = slide.get("visual_prompt", "A cohesive, premium carousel slide.")
                enriched_slide_prompts.append(f"{vis_prompt}\n\nSLIDE TEXT TO INCLUDE: {slide_text}")

            print(f"\n[StrategyAgent] 🎠 Carousel {index+1}/{count} | ref_image={'YES ✓' if task_refs else 'NONE'}")
            
            template_label = "Carousel Storyline"
            caption = generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout="carousel",
                idea=idea,
                language=language,
                template_label=template_label,
                index=index,
                trigger_keyword=comment_keyword,
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
                    "slides":  slides,
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

    elif layout == "video":
        if video_kind == "ai-ugc":
            # Generate script and avatar description if they are empty
            if not avatar_description or not video_script:
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
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
                ref = (prod.get("imageBase64") or (prod.get("imageUrls") and prod["imageUrls"][0])) if prod else (assigned_refs[index] if index < len(assigned_refs) and assigned_refs[index] else None)
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
                            trigger_keyword=comment_keyword,
                        )
                    
                    # Stage 2: Take the generated hero image and animate it with Veo 3.1 Fast
                    print(f"[StrategyAgent] UGC Stage 2: Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=prompt, image=generated_img, aspect_ratio=aspect_ratio, duration=video_duration or 8, resolution=video_resolution or "1080p")
                else:
                    # Standard img2video uses Google Veo 3.1 Fast
                    caption = pick_caption(index)
                    print(f"[StrategyAgent] Animating starting image with Google Veo 3.1 Fast ({video_resolution or '1080p'})...")
                    result = generate_veo_video(prompt=prompt, image=ref, aspect_ratio=aspect_ratio, duration=video_duration or 8, resolution=video_resolution or "1080p")

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
