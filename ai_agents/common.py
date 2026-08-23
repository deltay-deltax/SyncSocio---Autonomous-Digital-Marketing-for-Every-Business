import json
from typing import Dict, Any

def get_brand_dna(payload: Dict[str, Any]) -> str:
    """
    Constructs a rich 'Brand DNA' string from the full profile and metrics.
    Extracts named brand colors (name + hex), font assignments per role, and
    signature design motifs so the Director LLM can write MakeLocalAds-quality
    briefs that use exact named tokens (e.g. 'Hunter Green (#034638)') instead
    of bare hex codes.
    """
    brand = payload.get("brand_info", payload)  # Support both flat and nested
    posts = payload.get("historical_posts", [])

    location = brand.get("location")
    country = "Unknown"
    if isinstance(location, dict):
        country = location.get("country") or brand.get("country") or "Unknown"
    else:
        country = brand.get("country") or "Unknown"

    # 1. Core Identity
    dna = "BRAND IDENTITY:\n"
    dna += f"- Name: {brand.get('brandName', 'Unknown')}\n"
    dna += f"- Country: {country}\n"
    dna += (
        f"- Category: {(brand.get('otherCategory') if brand.get('businessCategory') == 'Other' and brand.get('otherCategory') else brand.get('businessCategory', 'General Business'))}\n"
    )
    dna += f"- Tone: {brand.get('brandTone', 'Professional')}\n"
    dna += f"- Visual Vibe: {brand.get('visualVibe', 'Clean and Modern')}\n"
    dna += f"- Primary Brand Color: {brand.get('primaryColor', '#2563EB')}\n"
    dna += f"- Secondary Brand Color: {brand.get('secondaryColor', '#60A5FA')}\n"
    dna += f"- USP: {brand.get('usp', 'Not specified')}\n"

    # Handle Target Audience (Plural/Singular/Array)
    target = brand.get('targetAudiences', brand.get('targetAudience', 'General Instagram Users'))
    if isinstance(target, list):
        target = ", ".join(target)
    dna += f"- Target Audience: {target}\n"
    dna += f"- Pain Point to Address: {brand.get('painPoint', 'Not specified')}\n"

    # ── 2. Named Brand Colors ────────────────────────────────────────────────
    # The Director needs "Hunter Green (#034638)" not just "#034638".
    # Pull these from the design guide palette when available.
    design_guide = brand.get("designGuide") or brand.get("design_guide") or {}
    if isinstance(design_guide, str):
        try:
            design_guide = json.loads(design_guide)
        except Exception:
            design_guide = {}

    named_colors: list[str] = []
    palette = design_guide.get("colorPalette") or design_guide.get("colors") or {}
    if isinstance(palette, dict):
        for color_name, color_value in palette.items():
            if isinstance(color_value, str) and color_value.startswith("#"):
                named_colors.append(f"{color_name} ({color_value})")
            elif isinstance(color_value, dict):
                hex_val = color_value.get("hex") or color_value.get("value") or ""
                label = color_value.get("name") or color_name
                if hex_val:
                    named_colors.append(f"{label} ({hex_val})")
    if named_colors:
        dna += "\nBRAND NAMED COLORS — use BOTH the name AND hex in every brief:\n"
        for entry in named_colors:
            dna += f"  - {entry}\n"

    # ── 3. Font Assignments Per Role ─────────────────────────────────────────
    # Director must assign a font + weight to every text role (headline / body / CTA).
    named_fonts: list[str] = []
    typography = design_guide.get("typography") or design_guide.get("fonts") or {}
    if isinstance(typography, dict):
        for role, spec in typography.items():
            if isinstance(spec, str):
                named_fonts.append(f"{role}: {spec}")
            elif isinstance(spec, dict):
                family = (
                    spec.get("family") or spec.get("fontFamily") or spec.get("name") or ""
                )
                weight = spec.get("weight") or spec.get("fontWeight") or ""
                if family:
                    named_fonts.append(f"{role}: {family}" + (f" {weight}" if weight else ""))
    if named_fonts:
        dna += "\nBRAND FONTS — assign per text role (headline / body / CTA) in every brief:\n"
        for font_line in named_fonts:
            dna += f"  - {font_line}\n"

    # ── 4. Signature Brand Motifs ─────────────────────────────────────────────
    # Structural motifs (e.g. wave separator) give the Director layout vocabulary.
    brand_motifs = design_guide.get("motifs") or design_guide.get("designMotifs") or []
    if isinstance(brand_motifs, list) and brand_motifs:
        dna += "\nBRAND SIGNATURE MOTIFS — reference these in layout direction when relevant:\n"
        for motif in brand_motifs[:6]:
            dna += f"  - {motif}\n"
    elif isinstance(brand_motifs, str) and brand_motifs.strip():
        dna += f"\nBRAND SIGNATURE MOTIFS: {brand_motifs}\n"

    # ── 5. CTA Style Spec ────────────────────────────────────────────────────
    cta_style = design_guide.get("ctaStyle") or design_guide.get("buttonStyle") or {}
    if isinstance(cta_style, dict) and cta_style:
        shape = cta_style.get("shape") or cta_style.get("borderRadius") or ""
        fill = cta_style.get("fill") or cta_style.get("backgroundColor") or ""
        text_color = cta_style.get("textColor") or cta_style.get("color") or ""
        cta_parts = []
        if shape:
            cta_parts.append(f"shape: {shape}")
        if fill:
            cta_parts.append(f"fill: {fill}")
        if text_color:
            cta_parts.append(f"text: {text_color}")
        if cta_parts:
            dna += f"\nBRAND CTA STYLE: {', '.join(cta_parts)}\n"

    # 6. Performance Metrics (Ground Reality)
    dna += "\nINSTAGRAM PERFORMANCE METRICS (PAST 30 DAYS):\n"
    if posts:
        total_reach = sum(float(p.get("reach", 0)) for p in posts)
        avg_reach = total_reach / len(posts)

        # Format breakdown
        formats: dict = {}
        for p in posts:
            fmt = p.get('type', 'Static')
            if fmt not in formats:
                formats[fmt] = []
            formats[fmt].append(float(p.get('reach', 0)))

        dna += f"- Total Posts Analyzed: {len(posts)}\n"
        dna += f"- Average Reach per Post: {avg_reach:.1f}\n"
        for fmt, reaches in formats.items():
            avg_fmt = sum(reaches) / len(reaches)
            dna += f"- {fmt} Performance: Average Reach {avg_fmt:.1f} ({len(reaches)} posts)\n"
    else:
        dna += "- No historical metrics available. Use industry standard discovery-first approach.\n"

    # 7. Audience Engagement (Hourly)
    hourly = payload.get("hourly_data", [])
    dna += "\nFOLLOWER ACTIVITY:\n"
    if hourly:
        top_hours = sorted(hourly, key=lambda x: x.get("value", 0), reverse=True)[:3]
        dna += f"- Peak Activity Hours: {', '.join([str(h.get('hour')) + ':00' for h in top_hours])}\n"
    else:
        dna += "- No hourly activity data. Use global peak times (6PM-9PM).\n"

    # 8. Recent History (Avoid Repetition)
    recent = payload.get("recent_topics", [])
    dna += "\nRECENT TOPICS PLANNED (AVOID REPEATING THESE):\n"
    if recent:
        dna += "\n".join([f"- {t}" for t in recent])
    else:
        dna += "- No recent history found.\n"

    return dna

def get_universal_system_prompt(agent_role: str) -> str:
    """
    Sets the persona without hardcoding the specific strategy rules.
    """
    return f"""
You are the {agent_role} for SyncSocio, a high-end Autonomous Growth Engine for Instagram.
Your decisions must be rooted strictly in the provided BRAND DNA and PERFORMANCE METRICS.

Rules:
1. Do not use generic advice.
2. Every recommendation must be data-backed.
3. If reach for a specific format is low, pivot away from it.
4. Output must be extremely professional and growth-oriented.
5. If the user provided specific Brand DNA, that is your ONLY reality.
"""
