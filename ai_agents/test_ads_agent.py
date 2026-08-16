import os
import json
from ad_creative_agent import _generate_director_concepts
from dotenv import load_dotenv

load_dotenv()

mock_brand = {
    "brandName": "SunShield Co.",
    "businessCategory": "Skincare",
    "targetAudiences": ["Beach goers", "Skincare enthusiasts", "People with sensitive skin"],
    "brandTone": "Trustworthy, scientific, fresh",
    "visualVibe": "Clean, bright, sunny, medical but approachable",
    "primaryColor": "#FFB347",
    "usp": "SPF 50+ without the white cast, reef-safe",
}

mock_products = [
    {
        "name": "Invisible Shield SPF 50",
        "description": "A lightweight, gel-based sunscreen that absorbs instantly without leaving a white cast. Reef safe and water resistant.",
        "keyBenefit": "No white cast, maximum protection"
    }
]

print("Generating concepts via Director...")
concepts = _generate_director_concepts(
    brand_doc=mock_brand, 
    products=mock_products, 
    count=2, 
    goal="convert", 
    angle="PAS", 
    idea="Focus on summer beach vacation"
)

prod_appearance = f"The product is {mock_products[0]['name']}. {mock_products[0]['description']}. It should look high-quality, authentic, and properly lit."
visual_vibe = mock_brand.get("visualVibe", "Clean and modern")
primary_color = mock_brand.get("primaryColor", "#2563EB")
design_reqs = f"""- Follow the instructions by the director.
- Make the ad design, layout, typography on-branded ({visual_vibe}), but should look premium, editorial-like.
- Establish a clear visual hierarchy: one dominant focal point the eye lands on first, then the supporting message, then the CTA.
- Keep strong figure/ground contrast. If text sits over imagery, place a scrim or overlay behind it so it stays fully legible.
- Place the focal subject on a rule-of-thirds line; leave generous whitespace and avoid clutter.
- Use a limited palette anchored to the brand colors (including {primary_color}), reserving one accent color for the call to action.
- Keep 20% space all around the creative for the ad to look cleaner.
- Group and align elements cleanly (Gestalt); use at most two type styles.
"""

for idx, concept in enumerate(concepts):
    full_prompt = f"""Instructions by the director: {concept.get('instructions')}

Product appearance: {prod_appearance}

Use the product appearance text only as a private visual reference for accurately drawing the product. Do not print, quote, paraphrase, label, or turn any of that description into ad copy.

Design requirements (apply to this ad):
{design_reqs}
"""
    print(f"\n================ ASSEMBLED PROMPT {idx + 1} ================")
    print(f"CAPTION: {concept.get('caption')}")
    print(f"ANGLE: {concept.get('angle')}")
    print("-" * 50)
    print(full_prompt)
    print("========================================================\n")
