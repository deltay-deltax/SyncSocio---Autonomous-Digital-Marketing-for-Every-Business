"""
visual_description_agent.py
─────────────────────────────────────────────────────────────────────────────
AI Ads Creative — Visual Description Generator (Block 2)
─────────────────────────────────────────────────────────────────────────────
Generates a forensic 200-300 word visual description of a product's packaging
by passing the product image(s) to GPT-4o Vision.

This description is stored on the Product document as `adVisualDescription`
and is ONLY used by ad_creative_agent.py as Block 2 (Product appearance).
It has absolutely no effect on any other generation mode (carousel, ecomm,
image, video, festival, etc.).
─────────────────────────────────────────────────────────────────────────────
"""

import os
import requests
import base64
from typing import List, Optional


SYSTEM_PROMPT = """You are a world-class art director and forensic packaging analyst. Your task is to write a richly detailed, cinematically precise visual description of the exact product packaging shown in the image(s). This description will be used by an AI image generator to recreate the product with photographic accuracy.

Write 220-280 words covering ALL of the following, woven into flowing, descriptive prose:

1. FORM FACTOR: The container's exact shape, dimensions (relative), material, and surface finish (e.g., "a wide, cylindrical matte white opaque plastic jar with a matching flat-topped, screw-on cap featuring rounded upper edges").
2. COLOR STORY: Describe the dominant color palette atmospherically — use descriptive names AND approximate hex values (e.g., "a smooth vertical gradient transitioning from clean white at the top to a rich golden-yellow and warm amber-orange at the bottom"). Describe any secondary or accent colors.
3. LABEL & TYPOGRAPHY: Describe every typographic element — font style (serif/sans-serif/script), weight (bold/light), case (CAPS/lowercase/mixed), color, and exact text content. Be specific about hierarchy (e.g., "the main product name in large, lowercase white serif font, with a smaller black sans-serif descriptor below").
4. GRAPHIC ELEMENTS: All icons, badges, seals, illustrations, callouts, and their precise placement on the label (e.g., "a circular gold emblem displaying a geometric sphere grid, positioned to the right of the main label, below a small 'Clinically Approved' cross badge").
5. BRAND IDENTITY: The brand name treatment — its position, styling, any logo mark, surrounding text arrangement.
6. PRODUCT IN USE (if visible): If the product's contents are visible (e.g., powder, liquid, capsules), describe their color and texture atmospherically (e.g., "when dissolved in water, it becomes a translucent, vibrant golden-orange liquid").

Rules:
- Write as a photography director briefing an image generator — precise, atmospheric, and visually evocative.
- Be factually accurate to what is VISIBLE in the image — do not invent details.
- Write in third-person, present tense.
- Output ONLY the description text, no intro sentence, no headers, no bullet points.
"""


def generate_visual_description(image_urls: List[str], product_name: str = "") -> Optional[str]:
    """
    Calls GPT-4o Vision with up to 2 product images and returns a forensic
    visual description of the product packaging.

    Args:
        image_urls: List of product image URLs (Cloudinary or any public URL).
                    Uses the first 2 for max accuracy.
        product_name: Optional product name for context in the prompt.

    Returns:
        The visual description string (200-260 words), or None on failure.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[VisualDescAgent] OPENAI_API_KEY missing, skipping.")
        return None

    if not image_urls:
        print("[VisualDescAgent] No images provided, skipping.")
        return None

    # Build the message content — up to 2 images for 3D packaging context
    content = []

    context_text = f"Analyze the product packaging shown in the image(s) and write a forensic visual description."
    if product_name:
        context_text += f" The product is called '{product_name}'."

    content.append({"type": "text", "text": context_text})

    for url in image_urls[:2]:  # Max 2 images, same as makelocalads
        if not url:
            continue
        # If it's a base64 data URL, pass as-is; otherwise use url type
        if url.startswith("data:image"):
            content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })
        elif url.startswith("http"):
            content.append({
                "type": "image_url",
                "image_url": {"url": url, "detail": "high"}
            })
        else:
            # Assume raw base64 — wrap it
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{url}",
                    "detail": "high"
                }
            })

    try:
        print(f"[VisualDescAgent] Generating visual description for: {product_name or 'product'}")
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content}
                ],
                "max_tokens": 800,
                "temperature": 0.2  # Low temp for factual, consistent descriptions
            },
            timeout=45
        )
        resp.raise_for_status()
        description = resp.json()["choices"][0]["message"]["content"].strip()
        print(f"[VisualDescAgent] ✅ Description generated ({len(description.split())} words)")
        return description

    except Exception as e:
        print(f"[VisualDescAgent] ❌ Error generating description: {e}")
        return None
