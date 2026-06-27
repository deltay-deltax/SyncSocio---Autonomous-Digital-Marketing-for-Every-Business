"""
saas_profiles.py
────────────────
SAAS_CONTENT_PROFILES — canonical content strategy profiles for non-D2C brands.
Includes a resolver that maps business category strings (from onboarding) to a profile key.

Supported trigger categories:
    "SaaS & Digital"        → "saas"
    "Services"              → "agency"
    "Coaching & Consulting" → "consulting"
    "Financial Services"    → "consulting"   (secondary mapping)
    "Architecture"          → "agency"       (secondary mapping)
    "Digital Products"      → "tech"         (secondary mapping)
    "IT & Technical Tools"  → "tech"         (secondary mapping)
    "Newsletters"           → "agency"       (secondary mapping)
    "Online Marketplaces"   → "tech"         (secondary mapping)
"""

from typing import Optional

# ─── Core profile dictionary ─────────────────────────────────────────────────

SAAS_CONTENT_PROFILES = {
    "tech": {
        "content_pillars": [
            "Product demo",
            "Feature highlight",
            "Customer ROI",
            "Integration showcase",
            "Team/culture",
        ],
        "ad_frameworks": [
            "Problem → Solution",
            "Before/After workflow",
            "Feature showcase",
            "Social proof/case study",
        ],
        "visual_style": (
            "Clean dashboard UI, screenshot-led, minimal, blue/purple tones. "
            "Use real UI mockups, device frames (MacBook/iPhone), and workspace photography. "
            "Avoid product packaging, lifestyle stock photos, and busy backgrounds."
        ),
        "copy_tone": (
            "Confident, direct, ROI-focused. No fluff. Lead with outcome. "
            "Use numbers and metrics wherever possible. Speak to efficiency and growth."
        ),
        "cta_style": "Start Free Trial | Book a Demo | See How It Works",
        "avoid": (
            "lifestyle photos, product packaging, festival discount themes, "
            "urgency/sale language, generic stock images"
        ),
    },
    "saas": {
        "content_pillars": [
            "Feature drop",
            "Workflow automation",
            "Time saved",
            "Integration",
            "Customer win",
        ],
        "ad_frameworks": [
            "Stat-led",
            "Comparison (with vs without)",
            "Testimonial",
            "Feature list",
        ],
        "visual_style": (
            "UI screenshots, dark mode aesthetic, bold typography, metric callouts. "
            "Use product dashboards, analytics graphs, and before/after workflow visuals. "
            "Bold sans-serif fonts with high contrast. Accent colors on key metrics."
        ),
        "copy_tone": (
            "Sharp, punchy, metric-driven. Speak to the busy professional. "
            "Lead every post with a stat or tangible outcome. "
            "Zero tolerance for vague claims — show proof."
        ),
        "cta_style": "Try Free | Get Started | See Demo",
        "avoid": (
            "stock lifestyle photos, anything generic, festival discounts, "
            "product packaging shots, D2C sale language"
        ),
    },
    "law": {
        "content_pillars": [
            "Legal tip",
            "Case study",
            "Risk awareness",
            "Process explainer",
            "Trust builder",
        ],
        "ad_frameworks": [
            "Problem awareness",
            "Myth vs Fact",
            "Process explainer",
            "Testimonial",
        ],
        "visual_style": (
            "Professional, navy/dark grey, serif typography, premium minimal. "
            "Clean corporate aesthetic with structured layouts. "
            "Use abstract legal/justice iconography, clean document imagery."
        ),
        "copy_tone": (
            "Authoritative, clear, trustworthy. Avoid jargon. Speak to pain. "
            "Reassure with expertise. Never use urgency or sale language."
        ),
        "cta_style": "Book a Consultation | Get Legal Help | Speak to an Expert",
        "avoid": (
            "casual tone, bright colors, urgency/sale language, "
            "festival themes, discount badges, product packaging"
        ),
    },
    "agency": {
        "content_pillars": [
            "Portfolio result",
            "Process reveal",
            "Client win",
            "Thought leadership",
            "Team culture",
        ],
        "ad_frameworks": [
            "Result-led",
            "Before/After",
            "Social proof",
            "Authority positioning",
        ],
        "visual_style": (
            "Bold editorial, strong typography, dark/monochrome, portfolio shots. "
            "High-contrast black/white or brand-color dominant layouts. "
            "Agency-grade typography, clean grid systems, and data-backed visuals."
        ),
        "copy_tone": (
            "Confident, creative, proof-driven. Show don't tell. "
            "Every post should position the brand as the leading authority. "
            "Lead with results, not promises."
        ),
        "cta_style": "See Our Work | Let's Talk | Get a Proposal",
        "avoid": (
            "product photography, D2C sale language, festival posts, "
            "discount badges, stock lifestyle imagery"
        ),
    },
    "consulting": {
        "content_pillars": [
            "Insight/tip",
            "Framework reveal",
            "Client result",
            "Industry news take",
            "Process",
        ],
        "ad_frameworks": [
            "Thought leadership",
            "Problem identification",
            "Framework share",
            "Case study",
        ],
        "visual_style": (
            "Clean, premium, data-driven charts/graphs, navy + white palette. "
            "Use minimalist infographic layouts, structured slide-style visuals, "
            "and professional workspace photography. Serif + sans-serif typography pair."
        ),
        "copy_tone": (
            "Expert, analytical, insight-driven. Position as the smartest in the room. "
            "Use data, frameworks, and case study language. "
            "Never use urgency or discount copy."
        ),
        "cta_style": "Book a Strategy Call | Download Guide | Get Insights",
        "avoid": (
            "product shots, D2C tone, festival discounts, "
            "lifestyle stock photos, sale badges, urgency language"
        ),
    },
}

# ─── Category → Profile key mapping ─────────────────────────────────────────

# PRIMARY triggers
SAAS_TRIGGER_CATEGORIES = {
    "health & wellness",
    "mobile apps",
    "it & technical tools",
    "gaming & entertainment",
    "digital products",
    "saas & digital",
    "coaching & consulting",
    "architecture",
    "financial services",
    "real estate & property",
    "travel & hospitality",
    "education & training",
    "newsletters",
    "online marketplaces",
    "services",
}

CATEGORY_TO_PROFILE_KEY = {
    "health & wellness":      "consulting",
    "mobile apps":            "tech",
    "it & technical tools":    "tech",
    "gaming & entertainment": "tech",
    "digital products":      "tech",
    "saas & digital":        "saas",
    "coaching & consulting": "consulting",
    "architecture":          "agency",
    "financial services":    "consulting",
    "real estate & property": "agency",
    "travel & hospitality":  "agency",
    "education & training":  "consulting",
    "newsletters":           "agency",
    "online marketplaces":   "tech",
    "services":              "agency",
}


def get_saas_profile(business_category: str) -> Optional[dict]:
    """
    Returns a SAAS_CONTENT_PROFILES entry if the business_category is
    one of the SaaS/Services/Consulting trigger categories.

    Returns None for D2C categories (Beauty, Fashion, Food, etc.)
    so the existing D2C agent logic runs unchanged.
    """
    if not business_category:
        return None
    key = CATEGORY_TO_PROFILE_KEY.get(business_category.strip().lower())
    return SAAS_CONTENT_PROFILES.get(key) if key else None


def is_saas_brand(business_category: str) -> bool:
    """Quick boolean check — True if brand should use SaaS mode."""
    return business_category.strip().lower() in CATEGORY_TO_PROFILE_KEY


def build_saas_directive(profile: dict, brand_name: str = "") -> str:
    """
    Builds the injected directive string that gets prepended to every
    image/carousel/video/festival prompt for SaaS/Services/Consulting brands.
    """
    name_line = f"Brand: {brand_name}. " if brand_name else ""
    return f"""
[SaaS/Services Brand Content Directive — OVERRIDE ALL D2C DEFAULTS]
{name_line}
Visual Style: {profile['visual_style']}
Copy Tone: {profile['copy_tone']}
Content Pillars (choose from): {', '.join(profile['content_pillars'])}
Ad Framework to apply: {profile['ad_frameworks'][0]}
CTA Style: {profile['cta_style']}

STRICT RULES — MUST FOLLOW:
- NO physical product packaging photography
- NO discount, sale, or urgency language (e.g., "40% OFF", "Limited stock")
- NO festival discount posts — transform festivals into brand-milestone moments
- NO lifestyle stock photos of people shopping or using consumer products
- USE UI screenshots, dashboards, data visualizations, or workspace imagery as hero visuals
- Headlines MUST lead with outcomes, metrics, or frameworks (not features alone)
- AVOID: {profile['avoid']}
""".strip()
