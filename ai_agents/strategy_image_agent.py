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
import requests as http_requests
from typing import List, Optional, Dict, Any

from fal_visual_engine import (
    generate_fal_image_gpt2,
    generate_fal_carousel_ideogram,
    generate_fal_video_minimax,
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

    return (
        f"{brand_name} — {category} brand.\n"
        f"Brand tone: {brand_tone}.\n"
        f"Visual style: {visual_vibe}.\n"
        f"Primary color: {primary_color}. Secondary: {secondary_color}.\n"
        f"Target audience: {target_audience}.\n"
        f"Key message: {headline}.\n"
        f"Product: {product_name}. USP: {usp}."
    )


def build_image_prompt(brand_doc: Dict[str, Any], idea: Optional[str], aspect: str, product: Optional[Dict[str, Any]] = None) -> str:
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
Show the product packaging clearly. Anchor the visual to this exact product.
"""

    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""

    return f"""{block}
{product_block}
{idea_str}
Create a high-converting product ad creative.
Make it feel native to Instagram feed.
Aspect ratio: {aspect}. Premium, photorealistic, commercial quality.
"""


def build_carousel_slide_prompts(
    brand_doc: Dict[str, Any],
    idea: Optional[str],
    slide_count: int,
    product: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """
    Generates slide prompts using the new carousel prompt structure:
    - Pass brand DNA total
    - Description text
    - Product related details
    - Write: Create a highly engaging ad creative carousel for slide {slide_number} {purpose}
    """
    # 1. Brand DNA total
    brand_name = brand_doc.get("brandName", "")
    main_goal = brand_doc.get("mainGoal", "")
    business_category = brand_doc.get("businessCategory", "")
    brand_tone = brand_doc.get("brandTone", "")
    visual_vibe = brand_doc.get("visualVibe", "")
    usp = brand_doc.get("usp", "")
    pain_point = brand_doc.get("painPoint", "")
    target_audiences = ", ".join(brand_doc.get("targetAudiences", [])) if isinstance(brand_doc.get("targetAudiences"), list) else str(brand_doc.get("targetAudiences", ""))
    primary_color = brand_doc.get("primaryColor", "")
    secondary_color = brand_doc.get("secondaryColor", "")
    website = brand_doc.get("website", "")

    brand_dna_total = f"""Brand DNA:
- Brand Name: {brand_name}
- Goal/Mission: {main_goal}
- Business Category: {business_category}
- Brand Tone: {brand_tone}
- Visual Vibe: {visual_vibe}
- USP: {usp}
- Pain Point Addressed: {pain_point}
- Target Audiences: {target_audiences}
- Primary Color: {primary_color}
- Secondary Color: {secondary_color}
- Website: {website}"""

    # 2. Description text
    desc_text = f"Campaign description/theme: {idea}" if idea and idea.strip() else "Theme: General brand promotion"

    # 3. Product related all
    product_related_all = ""
    if product:
        p_name = product.get("name", "")
        p_desc = product.get("description", "")
        p_benefit = product.get("keyBenefit", "")
        p_price = product.get("offerPrice", "") or product.get("price", "")
        product_related_all = f"""Product Details:
- Product Name: {p_name}
- Product Description: {p_desc}
- Key Benefit: {p_benefit}
- Price: {p_price}"""
    else:
        product_related_all = "Product Details: No specific product featured. Focus on general brand identity."

    prompts = []
    for i in range(slide_count):
        # Determine purpose dynamically: 0 -> Hook, last -> CTA, others -> Insight
        if i == 0:
            purpose = "Hook"
        elif i == slide_count - 1:
            purpose = "CTA"
        else:
            purpose = f"Insight {i}"

        slide_prompt = f"""{brand_dna_total}

Description Text:
{desc_text}

{product_related_all}

Create a highly engaging ad creative carousel for slide {i + 1} {purpose}"""
        prompts.append(slide_prompt)

    return prompts


def build_video_prompt(brand_doc: Dict[str, Any], idea: Optional[str], product: Optional[Dict[str, Any]] = None) -> str:
    """Cinematic video brief for Minimax Video-01 (9:16, 6s)."""
    block = _brand_block(brand_doc)
    brand_tone  = brand_doc.get("brandTone", "Premium & Engaging")
    visual_vibe = brand_doc.get("visualVibe", "Clean Minimal")

    product_block = ""
    if product:
        product_block = f"""
Featured Product: {product.get('name', '')}
Price: {product.get('offerPrice', '') or product.get('price', '')}
Key Benefit: {product.get('keyBenefit', '')}
Description: {product.get('description', '')}

Make this specific product the **hero** of the video.
"""

    idea_str = f"Campaign idea: {idea}\n" if idea and idea.strip() else ""

    return f"""{block}
{product_block}
{idea_str}
Create a 6-second Instagram Reel advertisement.
Scene: Cinematic product/brand hero moment — slow motion or smooth reveal.
Lighting: Soft premium studio or natural lifestyle setting matching brand vibe ({visual_vibe}).
Motion: Subtle camera push-in, product reveal, or lifestyle b-roll.
No text overlays — let the visual speak.
Feeling: {brand_tone}. Aspirational. Stops the scroll.
Aspect ratio: 9:16 vertical. Commercial advertising quality.
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
) -> List[Dict[str, Any]]:
    """
    Orchestrates generation for all layout types.

    Returns:
        list of {image?: str (base64), url?: str, caption: str, type: str}
    """
    print(f"\n[StrategyAgent] 🚀 Generating {count} {layout}(s) | aspect={aspect_ratio} | refs={len(ref_images)} | products={len(products or [])}")

    results = []
    caption_pool = _CAPTIONS.copy()
    random.shuffle(caption_pool)

    def pick_caption(i: int) -> str:
        return caption_pool[i % len(caption_pool)]

    # Pre-assign products / refs
    assigned_products = assign_products(products, count) if products else [None] * count
    assigned_refs = select_ref_images(ref_images, count) if not products else [None] * count

    # ── IMAGE ──────────────────────────────────
    if layout == "image":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "portrait_2_3")

        for i in range(count):
            prod = assigned_products[i]
            ref = prod.get("imageBase64") if prod else assigned_refs[i]
            if ref and not ref.startswith("http") and not ref.startswith("data:"):
                ref = "data:image/jpeg;base64," + ref

            prompt = build_image_prompt(brand_doc, idea, aspect_ratio, product=prod)
            
            print(f"\n[StrategyAgent] 🖼  Image {i+1}/{count} | ref_image={'YES ✓' if ref else 'NONE (prompt only)'}")
            if prod: print(f"                   Product: {prod.get('name')}")
            try:
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=ref,
                    image_size=fal_size,
                )
                results.append({
                    "image":   result["image"],
                    "caption": pick_caption(i),
                    "type":    "image",
                })
            except Exception as e:
                print(f"[StrategyAgent] ❌ Image {i+1} failed: {e}")
                results.append({
                    "image":   None,
                    "caption": pick_caption(i),
                    "type":    "image",
                    "error":   str(e),
                })

    # ── CAROUSEL ───────────────────────────────
    elif layout == "carousel":
        for i in range(count):
            prod = assigned_products[i]
            ref = prod.get("imageBase64") if prod else assigned_refs[i]
            if ref and not ref.startswith("http") and not ref.startswith("data:"):
                ref = "data:image/jpeg;base64," + ref
                
            slide_prompts = build_carousel_slide_prompts(brand_doc, idea, slide_count, product=prod)

            # Print slide prompts to terminal clearly
            for idx, sp in enumerate(slide_prompts):
                print("\n" + "="*80)
                print(f"[CAROUSEL GENERATOR] Strategy Slide {idx+1} Prompt:")
                print(sp)
                print("="*80 + "\n")

            print(f"\n[StrategyAgent] 🎠 Carousel {i+1}/{count} | ref_image={'YES ✓' if ref else 'NONE'}")
            if prod: print(f"                   Product: {prod.get('name')}")
            try:
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_doc.get('brandName', 'Brand')} — {idea}" if idea and idea.strip() else brand_doc.get('brandName', 'Brand'),
                    image=ref,
                    count=slide_count,
                    slide_prompts=slide_prompts,
                )
                results.append({
                    "slides":  slides,          # list of {image: base64}
                    "caption": pick_caption(i),
                    "type":    "carousel",
                })
            except Exception as e:
                print(f"[StrategyAgent] ❌ Carousel {i+1} failed: {e}")
                results.append({
                    "slides":  [],
                    "caption": pick_caption(i),
                    "type":    "carousel",
                    "error":   str(e),
                })

    # ── VIDEO ──────────────────────────────────
    elif layout == "video":
        for i in range(count):
            prod = assigned_products[i]
            video_prompt = build_video_prompt(brand_doc, idea, product=prod)
            print(f"\n[StrategyAgent] 🎬 Video {i+1}/{count}...")
            if prod: print(f"                   Product: {prod.get('name')}")
            try:
                result = generate_fal_video_minimax(video_prompt, duration="6s")
                results.append({
                    "url":       result.get("url"),
                    "thumbnail": result.get("thumbnail"),
                    "caption":   pick_caption(i),
                    "type":      "video",
                })
            except Exception as e:
                print(f"[StrategyAgent] ❌ Video {i+1} failed: {e}")
                results.append({
                    "url":     None,
                    "caption": pick_caption(i),
                    "type":    "video",
                    "error":   str(e),
                })

    else:
        raise ValueError(f"Unknown layout type: {layout}")

    print(f"[StrategyAgent] ✅ Done — {len(results)} items generated")
    return results
