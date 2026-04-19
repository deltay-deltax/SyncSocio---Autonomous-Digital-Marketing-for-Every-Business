import os
from typing import Dict, Any

BASE_PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")

def load_prompt_template(industry: str, category: str, subcategory: str) -> str:
    """
    Loads a prompt template from the filesystem.
    industry: 'ecommerce' or 'fashion'
    category: 'images', 'reels', or 'carousels'
    subcategory: the filename without .txt
    """
    filepath = os.path.join(BASE_PROMPTS_DIR, industry, category, f"{subcategory}.txt")
    if not os.path.exists(filepath):
        return ""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()

def get_formatted_prompt(format_type: str, topic: str, brand_info: Dict[str, Any]) -> str:
    """
    Selects and formats the appropriate prompt based on the content type and brand info.
    """
    # Determine industry
    category_raw = brand_info.get("businessCategory", "other").lower()
    
    if any(k in category_raw for k in ["fashion", "clothing", "apparel"]):
        industry = "fashion"
    elif any(k in category_raw for k in ["jewel", "jewelry"]):
        industry = "jewellery"
    elif any(k in category_raw for k in ["food", "drink", "beverage", "snack", "chocolate", "biscuit", "cpg"]):
        industry = "food_cpg"
    elif any(k in category_raw for k in ["cosmetic", "makeup", "beauty", "skincare"]):
        industry = "cosmetics"
    elif any(k in category_raw for k in ["ecommerce", "shop", "store", "product"]):
        industry = "ecommerce"
    else:
        # For startups or unique ideas, use the Universal Generator
        industry = "universal"
    
    category = ""
    subcategory = ""
    f_type = format_type.lower()
    t_lower = topic.lower()

    if industry == "universal":
        if "reel" in f_type:
            category = "reels"
        elif "carousel" in f_type:
            category = "carousels"
        else:
            category = "images"
        subcategory = "framework" # These are the meta-prompt frameworks
    
    elif industry == "fashion":
        # ... (rest of fashion logic)
        if "reel" in f_type:
            category = "reels"
            if "runway" in t_lower or "walk" in t_lower:
                subcategory = "runway_walk"
            elif "asmr" in t_lower or "texture" in t_lower or "sensory" in t_lower:
                subcategory = "sensory_texture"
            else:
                subcategory = "new_drop"
        elif "carousel" in f_type:
            category = "carousels"
            subcategory = "collection_5_slide"
        else: # Static Post / Image
            category = "images"
            if "editorial" in t_lower or "vogue" in t_lower:
                subcategory = "editorial"
            elif "texture" in t_lower or "fabric" in t_lower:
                subcategory = "fabric_texture"
            else:
                subcategory = "street_style"
                
    elif industry == "jewellery":
        if "reel" in f_type:
            category = "reels"
            if "performance" in t_lower or "light" in t_lower or "sparkle" in t_lower:
                subcategory = "light_performance"
            elif "unboxing" in t_lower or "opening" in t_lower:
                subcategory = "unboxing"
            else:
                subcategory = "wear_story"
        elif "carousel" in f_type:
            category = "carousels"
            # Fallback to ecommerce carousels
            industry = "ecommerce"
            if "feature" in t_lower or "detail" in t_lower:
                subcategory = "product_feature_4_slide"
            else:
                subcategory = "premium_5_slide"
        else: # Static Post / Image
            category = "images"
            if "flat" in t_lower or "overhead" in t_lower:
                subcategory = "flat_lay"
            elif "skin" in t_lower or "neck" in t_lower or "lifestyle" in t_lower:
                subcategory = "lifestyle"
            else:
                subcategory = "ultra_premium"

    elif industry == "food_cpg":
        if "reel" in f_type:
            category = "reels"
            industry = "ecommerce" # Fallback to ecommerce reels
            if "reveal" in t_lower or "new" in t_lower:
                subcategory = "product_reveal"
            else:
                subcategory = "lifestyle"
        elif "carousel" in f_type:
            category = "carousels"
            industry = "ecommerce" # Fallback to ecommerce carousels
            if "feature" in t_lower or "detail" in t_lower:
                subcategory = "product_feature_4_slide"
            else:
                subcategory = "premium_5_slide"
        else: # Static Post / Image
            category = "images"
            # Specialized food/CPG hero shot
            subcategory = "hero_shot"

    elif industry == "cosmetics":
        if "reel" in f_type:
            category = "reels"
            subcategory = "pour_application"
        elif "carousel" in f_type:
            category = "carousels"
            industry = "ecommerce" # Fallback to ecommerce carousels
            if "feature" in t_lower or "detail" in t_lower:
                subcategory = "product_feature_4_slide"
            else:
                subcategory = "premium_5_slide"
        else: # Static Post / Image
            category = "images"
            if "texture" in t_lower or "swatch" in t_lower:
                subcategory = "texture_hero"
            elif "glamour" in t_lower or "scene" in t_lower:
                subcategory = "glamour_scene"
            else:
                subcategory = "hero_floating"

    else: # Ecommerce (Default)
        if "reel" in f_type:
            category = "reels"
            if "reveal" in t_lower or "new" in t_lower:
                subcategory = "product_reveal"
            elif "drama" in t_lower or "cinematic" in t_lower:
                subcategory = "cinematic_drama"
            else:
                subcategory = "lifestyle"
        elif "carousel" in f_type:
            category = "carousels"
            if "feature" in t_lower or "detail" in t_lower:
                subcategory = "product_feature_4_slide"
            elif "transformation" in t_lower or "before" in t_lower:
                subcategory = "transformation_3_slide"
            else:
                subcategory = "premium_5_slide"
        else: # Static Post / Image
            category = "images"
            if "premium" in t_lower or "luxury" in t_lower:
                subcategory = "ultra_premium"
            elif "flat" in t_lower or "overhead" in t_lower:
                subcategory = "flat_lay"
            else:
                subcategory = "lifestyle"

    template = load_prompt_template(industry, category, subcategory)
    if not template:
        # Fallback to ecommerce if fashion template not found or vice versa
        other_industry = "ecommerce" if industry == "fashion" else "fashion"
        template = load_prompt_template(other_industry, category, subcategory)
    
    if not template:
        return ""

    replacements = {
        "[BRAND_NAME]": brand_info.get("brandName", "the brand"),
        "[BRAND_COLOR_PRIMARY]": brand_info.get("primaryColor", "#000000"),
        "[BRAND_COLOR_SECONDARY]": brand_info.get("secondaryColor", "#ffffff"),
        "[PRODUCT_NAME]": topic,
        "[PRODUCT_CATEGORY]": brand_info.get("businessCategory", "product"),
        "[BRAND_TONE]": brand_info.get("brandTone", "premium"),
        "[TARGET_AUDIENCE]": ", ".join(brand_info.get("targetAudiences", ["general audience"])),
        "[TAGLINE]": brand_info.get("tagline", "Shop now")
    }

    formatted_prompt = template
    for placeholder, value in replacements.items():
        formatted_prompt = formatted_prompt.replace(placeholder, str(value))
    
    # Inject style modifiers based on industry
    if industry in ["cosmetics", "jewellery", "food_cpg"]:
        style_suffix = ", 3D render, sleek, premium studio lighting, hyper-realistic 8k, glassmorphism, depth of field"
    else:
        style_suffix = ", realistic, natural, high-fidelity film photography, candid, authentic, organic shadows, non-studio environment, shun all 3D styles, no rendered effects, shot on 35mm lens"
    
    formatted_prompt += style_suffix

    # Ensure we stay within NVIDIA's 800 character limit
    if len(formatted_prompt) > 800:
        formatted_prompt = formatted_prompt[:797] + "..."

    return formatted_prompt
