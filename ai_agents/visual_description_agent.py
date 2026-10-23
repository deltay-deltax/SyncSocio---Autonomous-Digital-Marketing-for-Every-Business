"""
visual_description_agent.py
─────────────────────────────────────────────────────────────────────────────
AI Ads Creative — Visual Description Generator (Block 2)
─────────────────────────────────────────────────────────────────────────────
Generates a compact forensic visual description of a product's packaging
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
from google import genai
from google.genai import types



SYSTEM_PROMPT = """You are a senior packaging designer and product photography director working on a commercial advertising campaign. Your ONLY task is to write a detailed visual specification of the product PACKAGING shown in the photo — this will be used by a graphic designer and AI image generator to accurately recreate the product packaging in an ad.

This is a purely commercial design task about physical packaging. Describe ONLY what you observe visually: shapes, colors, materials, text, labels, and graphic design elements.

Write 140-180 words of compact, precise prose covering:

1. FORM FACTOR: Exact container shape, size (relative), material, and surface finish (e.g., "a cylindrical matte white opaque plastic jar with a flat screw-on cap").
2. COLOR STORY: The exact color palette — use descriptive names AND approximate values (e.g., "a gradient from clean white at the top to golden-amber at the base"). Include all accent and secondary colors.
3. LABEL & TYPOGRAPHY: Every font style, weight, case, color, and text hierarchy visible on the label. Name the exact words/phrases printed where readable.
4. GRAPHIC ELEMENTS: All icons, badges, seals, illustrations, and their precise placement (e.g., "a circular gold emblem at the bottom right corner").
5. BRAND IDENTITY: Brand name position, logo treatment, tagline placement if present.
6. CONTENTS (if visible): If the product substance is visible (powder, liquid, capsules), describe color and texture (e.g., "a fine pearl-white powder").

Rules:
- Describe ONLY what is physically visible in the packaging design.
- Be factually precise — do not invent or assume anything not shown.
- Third-person, present tense. No intro sentence. No headers. No bullet points.
- Output ONLY the description text.
"""


def generate_visual_description(image_urls: List[str], product_name: str = "") -> Optional[str]:
    """
    Calls Gemini 2.5 Flash Vision with product image and returns a forensic
    visual description of the product packaging.

    Args:
        image_urls: List of product image URLs (Cloudinary or any public URL).
        product_name: Optional product name for context in the prompt.

    Returns:
        The compact visual description string, or None on failure.
    """
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[VisualDescAgent] GOOGLE_API_KEY missing, skipping.")
        return None

    # Only pass real HTTP(S) URLs
    http_urls = []
    for u in image_urls:
        if not u or not u.startswith("http"):
            continue
        if "example.com" in u or "placeholder" in u:
            print(f"[VisualDescAgent] Skipping placeholder URL: {u}")
            continue
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        try:
            head_res = requests.head(u, headers=headers, timeout=5, allow_redirects=True)
            if head_res.status_code == 200:
                http_urls.append(u)
            else:
                # Some CDN servers reject HEAD requests; try a lightweight GET if HEAD fails
                get_probe = requests.get(u, headers=headers, stream=True, timeout=5)
                if get_probe.status_code == 200:
                    http_urls.append(u)
                else:
                    print(f"[VisualDescAgent] Skipping unreachable URL (status {head_res.status_code}): {u}")
        except Exception:
            print(f"[VisualDescAgent] Skipping unreachable URL (error): {u}")

    if not http_urls:
        print(f"[VisualDescAgent] No valid http image URLs for '{product_name}', skipping.")
        return None

    try:
        print(f"[VisualDescAgent] Generating visual description for: {product_name or 'product'} (model: gemini-2.5-flash)")
        target_url = http_urls[0]
        req_headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        img_res = requests.get(target_url, headers=req_headers, timeout=15)
        img_res.raise_for_status()
        img_bytes = img_res.content
        mime_type = img_res.headers.get("Content-Type", "image/jpeg")
        if not mime_type or "image" not in mime_type:
            mime_type = "image/jpeg"

        client = genai.Client(api_key=api_key)
        image_part = types.Part.from_bytes(data=img_bytes, mime_type=mime_type)

        context_text = f"Analyze the product packaging shown in the image and write a forensic visual description."
        if product_name:
            context_text += f" The product is called '{product_name}'."

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            max_output_tokens=2048,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[image_part, context_text],
            config=config
        )

        description = response.text.strip()
        print(f"[VisualDescAgent] ✅ Description generated ({len(description.split())} words) using gemini-2.5-flash")
        return description

    except Exception as e:
        print(f"[VisualDescAgent] ❌ Error generating description: {e}")
        return None
