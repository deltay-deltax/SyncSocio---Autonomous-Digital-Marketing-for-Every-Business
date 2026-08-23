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
    Calls GPT-4o Vision with up to 2 product images and returns a forensic
    visual description of the product packaging.

    Args:
        image_urls: List of product image URLs (Cloudinary or any public URL).
                    Uses the first 2 for max accuracy.
        product_name: Optional product name for context in the prompt.

    Returns:
        The compact visual description string, or None on failure.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[VisualDescAgent] OPENAI_API_KEY missing, skipping.")
        return None

    # Only pass real HTTP(S) URLs — base64 data URIs from the scraper can be
    # several MB each, which blows OpenAI's payload limit and causes 400 errors.
    # Also filter out known placeholder domains and verify reachability.
    http_urls = []
    for u in image_urls:
        if not u or not u.startswith("http"):
            continue
        if "example.com" in u or "placeholder" in u:
            print(f"[VisualDescAgent] Skipping placeholder URL: {u}")
            continue
        # Verify the URL is actually reachable so OpenAI doesn't 400
        try:
            head_res = requests.head(u, timeout=5, allow_redirects=True)
            if head_res.status_code == 200:
                http_urls.append(u)
            else:
                print(f"[VisualDescAgent] Skipping unreachable URL (status {head_res.status_code}): {u}")
        except Exception as e:
            print(f"[VisualDescAgent] Skipping unreachable URL (error): {u}")

    if not http_urls:
        print(f"[VisualDescAgent] No valid http image URLs for '{product_name}', skipping.")
        return None

    # Build the message content — up to 2 images for 3D packaging context
    content = []

    context_text = f"Analyze the product packaging shown in the image(s) and write a forensic visual description."
    if product_name:
        context_text += f" The product is called '{product_name}'."

    content.append({"type": "text", "text": context_text})

    for url in http_urls[:1]:  # Max 1 image
        content.append({
            "type": "image_url",
            "image_url": {"url": url, "detail": "high"}
        })

    # Refusal phrases from GPT-4o safety filter — trigger a retry with fallback model
    _REFUSAL_PHRASES = [
        "i'm sorry, i can't", "i'm sorry, i cannot", "i can't assist",
        "i cannot assist", "i can't help", "i cannot help",
        "i'm unable to", "i am unable to", "i apologize",
        "unable to provide", "can't provide", "cannot provide",
        "sorry, but i", "i don't feel comfortable", "i'm not able to",
    ]

    def _call_vision(model: str) -> str:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content}
                ],
                "max_tokens": 420,
                "temperature": 0.2,
            },
            timeout=45
        )
        if not resp.ok:
            # Log the actual OpenAI error body so we can diagnose
            try:
                err_body = resp.json()
                print(f"[VisualDescAgent] OpenAI {resp.status_code} error: {err_body}")
            except Exception:
                print(f"[VisualDescAgent] OpenAI {resp.status_code} raw: {resp.text[:300]}")
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()

    def _is_refusal(text: str) -> bool:
        lower = text.lower()
        return any(p in lower for p in _REFUSAL_PHRASES)

    try:
        print(f"[VisualDescAgent] Generating visual description for: {product_name or 'product'} (model: gpt-4o)")
        description = _call_vision("gpt-4o")

        # If GPT-4o refused, retry with gpt-4o-mini which has looser vision safety
        if _is_refusal(description):
            print(f"[VisualDescAgent] ⚠️  gpt-4o refused — retrying with gpt-4o-mini...")
            description = _call_vision("gpt-4o-mini")

        if _is_refusal(description):
            print(f"[VisualDescAgent] ❌ Both models refused. Returning None.")
            return None

        print(f"[VisualDescAgent] ✅ Description generated ({len(description.split())} words)")
        return description

    except Exception as e:
        print(f"[VisualDescAgent] ❌ Error generating description: {e}")
        return None
