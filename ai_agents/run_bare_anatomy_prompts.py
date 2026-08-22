import os
import json
from dotenv import load_dotenv

# Load env for Gemini API key
load_dotenv()

from strategy_image_agent import generate_ecomm_idea_briefs, assemble_ecomm_final_prompt

def run_bare_anatomy_test():
    brand_doc = {
        "brandName": "Bare Anatomy Expert",
        "businessCategory": "Hair Care",
        "primaryColor": "#997A99",
        "secondaryColor": "#FFFFFF",
        "typography": "Clean, Modern Sans-Serif",
        "visualVibe": "Scientific, Clinical, Premium, Trustworthy",
        "brandDesignGuide": "Typography should be highly legible and modern. Backgrounds should feel clinical but premium, utilizing soft, muted lavenders/purples and clean whites. Layouts should be structured and emphasize scientific claims like 'QT Charge Technology'."
    }
    
    product = {
        "name": "Ultra Smoothing Hair Serum",
        "description": "Formulated with QT Charge Technology, Omega 3, 6, & 9, and Phytosqualan. For All Hair Types. 100 ml. Dermatologically Tested.",
        "keyBenefit": "Improves hair smoothness by 37% based on instrumental study.",
        "price": "₹699",
        "adVisualDescription": "A matte, dusty lavender/purple cylindrical bottle with a pristine white pump dispenser and a clear plastic overcap. The typography on the bottle is a mix of white and deep purple reading 'BARE ANATOMY EXPERT ULTRA SMOOTHING Hair Serum' alongside a minimalist atom-like science icon."
    }
    
    print("Generating 8 idea briefs using Gemini Flash...")
    # Generate the briefs (8 slides for an Ecomm Listing)
    briefs, _ = generate_ecomm_idea_briefs(
        brand_doc=brand_doc,
        product=product,
        count=8,
        platform="Amazon",
        is_fashion=False,
        idea="Highlight the 37% smoothness improvement, QT Charge technology, and the key ingredients (Omega 3, 6, 9 & Phytosqualan)."
    )
    
    print("\n--- GENERATED BRIEFS ---")
    for i, brief in enumerate(briefs, 1):
        print(f"Brief {i}: {brief}\n")
        
    print("\n\n--- ASSEMBLING FINAL PROMPTS ---")
    results = []
    for i, brief in enumerate(briefs, 1):
        final_prompt = assemble_ecomm_final_prompt(
            idea_brief=brief,
            product_vision_desc=product["adVisualDescription"]
        )
        print(f"================== FINAL PROMPT {i} ==================")
        print(final_prompt)
        print("========================================================\n")
        
        results.append(f"### Slide {i}\n**Brief:** {brief}\n\n**Director Prompt:**\n> {final_prompt}\n")

    # Save to markdown file
    with open("../bare_anatomy_prompts.md", "w", encoding="utf-8") as f:
        f.write("# Director LLM Output for Bare Anatomy Hair Serum\n\n")
        f.write("\n".join(results))

if __name__ == "__main__":
    run_bare_anatomy_test()
