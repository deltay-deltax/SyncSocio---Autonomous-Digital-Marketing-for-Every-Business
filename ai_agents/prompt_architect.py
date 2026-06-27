"""
prompt_architect.py
Standalone Prompt Architect for SyncSocio AI.

Provides:
  - build_ideogram_slide_prompt()  → used by main.py carousel slide loop
  - build_flux_negative_prompt()   → used by fal_visual_engine.py Flux Dev call
  - build_flux_prompt()            → full structured Flux positive + negative prompt
"""

from typing import Optional


# ─── COLOUR VOCABULARY MAP ────────────────────────────────────────────────────
# Converts common hex codes to descriptive color language for image models.
_HEX_VOCAB = {
    "#ffffff": "pure white",
    "#000000": "deep matte black",
    "#ff6b35": "vibrant tangerine orange",
    "#f7931e": "warm golden amber",
    "#2563eb": "electric cobalt blue",
    "#1e293b": "obsidian slate",
    "#f8f9fa": "soft off-white",
    "#e5e7eb": "light cool gray",
    "#10b981": "vivid emerald green",
    "#8b5cf6": "rich violet purple",
    "#f43f5e": "deep rose pink",
    "#0ea5e9": "sky blue",
    "#fbbf24": "golden yellow",
    "#6366f1": "indigo violet",
    "#14b8a6": "teal green",
}


def _hex_to_words(hex_code: str) -> str:
    """Convert a hex color code to a descriptive English phrase."""
    if not hex_code:
        return "neutral"
    lower = hex_code.lower().strip()
    if lower in _HEX_VOCAB:
        return _HEX_VOCAB[lower]
    # Basic heuristic fallback
    try:
        r = int(lower[1:3], 16)
        g = int(lower[3:5], 16)
        b = int(lower[5:7], 16)
        if r > 200 and g > 200 and b > 200:
            return "soft light pastel"
        if r < 60 and g < 60 and b < 60:
            return "deep dark"
        if r > g and r > b:
            return "warm red-toned"
        if g > r and g > b:
            return "cool green-toned"
        if b > r and b > g:
            return "cool blue-toned"
    except Exception:
        pass
    return f"brand color ({hex_code})"


# ─── SLIDE PURPOSE MAP ────────────────────────────────────────────────────────
_SLIDE_PURPOSE_MAP = {
    0: "HOOK",
    1: "PROBLEM",
    2: "SOLUTION",
    3: "FEATURE",
    4: "PROOF",
    5: "CTA",
}


# ─── FONT STYLE BY BRAND TONE ─────────────────────────────────────────────────
def _resolve_fonts(brand_tone: str) -> tuple[str, str]:
    """Returns (headline_font_desc, subtext_font_desc) based on brand tone."""
    tone_lower = (brand_tone or "").lower()
    if any(t in tone_lower for t in ["luxury", "premium", "elegant", "sophisticated"]):
        return (
            "bold modern serif typeface (similar to Canela or Freight Display), high tracking",
            "clean light-weight sans-serif (similar to Neue Haas Grotesk or Inter Light)",
        )
    elif any(t in tone_lower for t in ["playful", "fun", "casual", "youthful"]):
        return (
            "bold rounded sans-serif (similar to Nunito ExtraBold or Poppins Black)",
            "friendly medium-weight sans-serif",
        )
    elif any(t in tone_lower for t in ["scientific", "clinical", "minimal", "clean"]):
        return (
            "ultra-clean geometric sans-serif (similar to Helvetica Neue Bold or DM Sans Bold)",
            "light-weight geometric sans-serif, small caps",
        )
    else:
        return (
            "bold modern sans-serif (similar to Outfit ExtraBold)",
            "clean readable sans-serif",
        )


# ─── IDEOGRAM SLIDE PROMPT ────────────────────────────────────────────────────

def build_ideogram_slide_prompt(
    slide_index: int,
    headline: str,
    subtext: str,
    visual_scene: str,
    brand_name: str,
    primary_color: str,
    secondary_color: str,
    brand_tone: str,
    previous_slide_palette: Optional[str] = None,
) -> str:
    """
    Builds a production-ready Ideogram v2 prompt for a single carousel slide.

    Args:
        slide_index:           0-based index (0 = Hook, 1 = Problem, 2 = Solution …)
        headline:              Exact headline copy that must appear on the slide.
        subtext:               Exact subtext / body copy for the slide.
        visual_scene:          Visual description of the scene / product element.
        brand_name:            Brand name for context.
        primary_color:         Brand primary hex code.
        secondary_color:       Brand secondary hex code.
        brand_tone:            Brand tone string (e.g. "Scientific, Clean, Minimalist").
        previous_slide_palette: Optional description of previous slide palette for continuity.

    Returns:
        Complete Ideogram prompt string.
    """
    slide_purpose = _SLIDE_PURPOSE_MAP.get(slide_index, "CONTENT")
    primary_words = _hex_to_words(primary_color)
    secondary_words = _hex_to_words(secondary_color)
    headline_font, subtext_font = _resolve_fonts(brand_tone)

    # Background instruction — match previous slide for visual continuity
    if previous_slide_palette:
        bg_instruction = (
            f"Background palette must exactly match the previous slide: {previous_slide_palette}. "
            "Maintain 100% visual consistency in background gradient, mood, and lighting direction."
        )
    else:
        bg_instruction = (
            f"Background: rich gradient from {primary_words} at top-left to {secondary_words} at bottom-right. "
            "Subtle fine-grain texture overlay for depth. Not flat. Premium feel."
        )

    prompt = (
        f"Instagram carousel slide {slide_index + 1}, {slide_purpose} slide for {brand_name}. "
        f"Graphic design layout, 3:4 aspect ratio. "
        f"STRICT THREE-ZONE COMPOSITION — "
        f"TOP 20%: The headline text exactly reading '{headline}', rendered in {headline_font}, "
        f"in {primary_words} or white for maximum contrast, horizontally centered. "
        f"CENTER 60%: {visual_scene}. The product or visual element is the hero, perfectly centered and razor-sharp. "
        f"BOTTOM 20%: The subtext exactly reading '{subtext}', rendered in {subtext_font}, "
        f"slightly smaller than the headline, horizontally centered, high contrast against background. "
        f"{bg_instruction} "
        f"MANDATORY TYPOGRAPHY RULE: Every single character of the headline '{headline}' and subtext '{subtext}' "
        f"MUST be perfectly legible with correct spelling, crisp anti-aliased edges, zero distortion, zero blurring. "
        f"Typography is a PRIMARY design element — the text must be instantly readable at a glance. "
        f"Premium Indian D2C brand aesthetic. Commercial advertising quality. Not a stock graphic."
    )
    return prompt.strip()


# ─── FLUX NEGATIVE PROMPT ────────────────────────────────────────────────────

FLUX_NEGATIVE_PROMPT = (
    "blurry, out of focus, low resolution, pixelated, grainy, noisy, "
    "overexposed, underexposed, washed out, oversaturated, "
    "stock photo, generic, clipart, illustration, cartoon, anime, "
    "text, watermark, logo, signature, label overlay, floating text, "
    "extra objects, clutter, messy background, crowded scene, "
    "deformed product, warped label, distorted bottle, melted shape, "
    "multiple products, duplicate items, "
    "harsh shadows, flat lighting, fluorescent lighting, neon glow, "
    "ugly, amateur, cheap looking, plastic feel, "
    "3D render artifact, CGI look, fake depth, lens flare"
)


def build_flux_negative_prompt() -> str:
    """Returns the production-grade negative prompt for Flux Dev."""
    return FLUX_NEGATIVE_PROMPT


# ─── FULL FLUX PROMPT (positive + negative) ───────────────────────────────────

def build_flux_prompt(
    brand_name: str,
    product_name: str,
    product_description: str,
    business_category: str,
    brand_tone: str,
    visual_vibe: str,
    primary_color: str,
    secondary_color: str,
    usp: str,
    post_topic: str,
    market: str = "India",
) -> dict:
    """
    Builds a production-ready Flux Dev prompt dict with positive and negative prompts.

    Returns:
        dict with keys "prompt" and "negative_prompt"
    """
    primary_words = _hex_to_words(primary_color)
    secondary_words = _hex_to_words(secondary_color)

    market_context = (
        "Indian D2C brand aesthetic. South Asian lifestyle context. "
        "Clean modern urban Indian setting. Instagram feed quality. "
        if market.lower() == "india"
        else f"{market} market lifestyle context. "
    )

    category_lower = (business_category or "").lower()
    is_cpg = any(k in category_lower for k in ["beauty", "cosmetic", "skincare", "hair", "food", "beverage", "personal care"])
    is_tech = any(k in category_lower for k in ["saas", "app", "tech", "software"])

    if is_cpg:
        camera_rig = "shot on Phase One XF IQ4 150MP, 90mm macro lens, f/2.8, ISO 50"
        lighting = "three-point commercial studio lighting: 45° key light left, soft fill right, rim light above-rear"
        surface = "matte dark slate surface, subtle texture"
        dof = "extreme shallow depth of field, razor-sharp product, soft-focus bokeh background"
    elif is_tech:
        camera_rig = "shot on Sony A7IV, 35mm f/1.4 prime, natural daylight"
        lighting = "bright soft natural window light from left, clean white space"
        surface = "light oak desk with subtle grain"
        dof = "medium depth of field, airy lifestyle context"
    else:
        camera_rig = "shot on Sony A7IV, 50mm lens, editorial style"
        lighting = "soft diffused studio lighting, even illumination"
        surface = "neutral textured background"
        dof = "medium depth of field"

    color_direction = (
        f"Dominant color palette: {primary_words} as the primary hero color, "
        f"accented by {secondary_words}. "
        f"Color grading reflects the {brand_tone} brand tone."
    )

    positive = (
        f"Commercial product photograph. {market_context}"
        f"Subject: {product_name} — {product_description}. "
        f"Post topic: {post_topic}. "
        f"Brand: {brand_name}. Tone: {brand_tone}. Vibe: {visual_vibe}. USP: {usp}. "
        f"{color_direction} "
        f"Camera: {camera_rig}. Lighting: {lighting}. Surface: {surface}. Depth: {dof}. "
        f"STRICTLY NO TEXT, NO WATERMARKS, NO OVERLAID COPY. Pure product photography only. "
        f"Hyper-realistic, 8K, ultra-detailed textures, commercial advertising quality. "
        f"NOT a stock photo. NOT generic. NOT AI-looking."
    )

    return {
        "prompt": positive.strip(),
        "negative_prompt": FLUX_NEGATIVE_PROMPT,
    }
