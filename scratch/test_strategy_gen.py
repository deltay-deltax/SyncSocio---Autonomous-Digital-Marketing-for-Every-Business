import asyncio
import sys
import os

# Add the directory to Python path so we can import from it
sys.path.append(r'd:\Major_Project\ai_agents')

from agents import generate_strategy

brand_info = {
    "brandName": "Aura Cosmetics",
    "businessCategory": "Beauty & Cosmetics",
    "brandTone": "Luxurious, elegant, aspirational",
    "targetAudiences": ["Women 18-35", "Skincare enthusiasts", "Professionals"],
    "usp": "100% Vegan and cruelty-free with active botanical ingredients",
    "painPoint": "Dull skin and early signs of aging",
    "mainGoal": "Brand awareness and product sales",
    "primaryColor": "#FFB6C1",
    "secondaryColor": "#FFF0F5",
    "visualVibe": "Cinematic, soft focus, glowing",
    "brandKeywords": "Glow, Natural, Radiant, Premium"
}

product_brief = {
    "name": "Luminous Glow Serum",
    "description": "Our flagship vitamin C serum that brightens skin tone and reduces fine lines in just 7 days. Formulated with rare Japanese orchids and 15% pure Vitamin C. This is a very long description that goes on and on to test if the prompt truncation is fixed. We want to ensure that all this rich context is passed directly to the illustrator so it knows exactly what to generate.",
    "category": "Beauty & Cosmetics"
}

suggested_mix = {"reels": 4, "static": 1, "carousel": 2}
custom_instruction = "Make a promotional poster for our weekend flash sale offering 30% off the serum."

result = generate_strategy(brand_info, product_brief, suggested_mix, custom_instruction)

print("==== GENERATED STRATEGY ====")
if "error" in result and result["error"]:
    print("ERROR:", result["error"])
else:
    calendar = result.get("content_calendar", [])
    for i, post in enumerate(calendar):
        print(f"\n--- DAY {i+1} ---")
        print(f"Topic: {post.get('topic')}")
        print(f"Format: {post.get('format')}")
        print(f"Is Custom: {post.get('is_custom', False)}")
        print(f"Hook: {post.get('content_hook')}")
        
        print("\nVisual Prompt:")
        print(post.get('visual_prompt'))
        
        if post.get('slides_metadata'):
            print(f"\nSlides ({len(post['slides_metadata'])}):")
            for j, slide in enumerate(post['slides_metadata']):
                print(f"  Slide {j+1}: {slide.get('headline')} | {slide.get('subtext')}")
