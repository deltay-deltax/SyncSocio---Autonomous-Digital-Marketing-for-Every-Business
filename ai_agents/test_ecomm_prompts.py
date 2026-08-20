import os
import json
from dotenv import load_dotenv

# Load env for Gemini API key
load_dotenv()

from strategy_image_agent import generate_ecomm_idea_briefs, assemble_ecomm_final_prompt

def run_goli_test():
    brand_doc = {
        "brandName": "Goli Nutrition",
        "businessCategory": "Health & Supplements",
        "primaryColor": "#0199D6",
        "secondaryColor": "#E63946",
        "typography": "Inter, bold sans-serif",
        "visualVibe": "Clean, Modern, Trustworthy Wellness",
        "brandDesignGuide": "Typography should be highly legible, clean sans-serif. Backgrounds should feel clinical but warm, often using the primary brand blue or pure white. Icons should be minimalist."
    }
    
    product = {
        "name": "Ashwagandha Gummies",
        "description": "Mixed Berry Dietary Supplement. Relax, Restore, Unwind. 60 Gummies per bottle. Gluten-Free, Non-GMO, Plant-Based, Vegan, Clinically Proven KSM-66.",
        "keyBenefit": "Promotes stress relief, relaxation, and improved sleep quality.",
        "price": "$19.00",
        "adVisualDescription": "A translucent deep blue plastic bottle with a white ribbed cap. The label is split white and light blue with 'goli NUTRITION' prominent. It reads 'ASHWAGANDHA GUMMIES' and 'Relax Restore Unwind'. Five vertical icons indicate dietary features. Two dark red, shiny dome-shaped gummies sit outside the bottle on a smooth surface."
    }
    
    print("Generating 6 idea briefs using Gemini Flash...")
    # Generate the briefs
    briefs = generate_ecomm_idea_briefs(
        brand_doc=brand_doc,
        product=product,
        count=6,
        platform="Amazon",
        is_fashion=False,
        idea="Highlight the stress-relief benefits and the clinical KSM-66 ingredient."
    )
    
    print("\n--- GENERATED BRIEFS ---")
    for i, brief in enumerate(briefs, 1):
        print(f"Brief {i}: {brief}\n")
        
    print("\n\n--- ASSEMBLING FINAL PROMPTS ---")
    for i, brief in enumerate(briefs, 1):
        final_prompt = assemble_ecomm_final_prompt(
            idea_brief=brief,
            product=product,
            shot_index=i-1
        )
        print(f"================== FINAL PROMPT {i} ==================")
        print(final_prompt)
        print("========================================================\n")

if __name__ == "__main__":
    run_goli_test()
