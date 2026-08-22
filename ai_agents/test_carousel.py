import os
import sys
import json
import base64
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure we're running from ai_agents dir
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

from strategy_image_agent import generate_strategy_images

def test():
    image_path = r"d:\Major_Project\frontend\public\assets\Creatives_icon\studio-image.jpg"
    base64_img = ""
    try:
        with open(image_path, "rb") as f:
            base64_img = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print("Could not load image:", e)

    brand_doc = {
        "brandName": "The Whole Truth",
        "businessCategory": "Health & Nutrition",
        "primaryColor": "#FF577F",
        "secondaryColor": "#FFC0CB",
        "brandDesignGuide": "Clean, honest, playful but premium. Highlight 100% natural ingredients. No hidden sugars. Font: clean sans-serif like Helvetica or Inter. Colors: pink, white, soft green.",
        "selectedPlan": "pro"
    }

    products = [{
        "name": "Whey Protein - Strawberry Milkshake",
        "keyBenefit": "24g protein per scoop, made with real freeze-dried strawberries. 100% clean.",
        "description": "Our Winter Special Edition! No 'strawberry' flavor. No artificial sweeteners. No gums or thickeners. Just super-clean whey that tastes like a strawberry milkshake.",
        "specifications": "Whey Isolate + Concentrate. 5.6g BCAA. For adults. Net Wt 1kg.",
        "imageBase64": base64_img,
        "adVisualDescription": "A light pink pouch packaging for 'The Whole Truth Whey Protein' featuring a pattern of stylized red strawberries. Front typography highlights 'has real strawberries'. Next to the pouch is a small scoop filled with pink strawberry whey powder."
    }]

    print("Running Director LLM with GPT-4o...")
    idea_forced = "Announce our new Winter Special Strawberry Milkshake Whey Protein. Emphasize that it's made with REAL freeze-dried strawberries, no fake flavors. FORCED STRATEGY: You MUST choose CAROUSEL TYPE 'Product Deep Dive' and VISUAL STYLE 'Playful'."
    
    brand_design_guide = brand_doc.get("brandDesignGuide", "")
    
    product_info = json.dumps({
        "name": products[0].get("name"),
        "description": products[0].get("description"),
        "keyBenefit": products[0].get("keyBenefit"),
        "specifications": products[0].get("specifications"),
        "appearance": products[0].get("adVisualDescription") or products[0].get("visual_description") or ""
    }, indent=2)

    idea_info = f"\n\nADDITIONAL USER DIRECTION:\n{idea_forced}"
    slide_count = 5
    language = "english"

    prompt = f"""You are the Creative Director for a premium physical-product brand.

Create a professionally art-directed {slide_count}-slide social media carousel using the inputs below.
The final carousel slides must be written in {language}.

INPUTS

BRAND DESIGN GUIDE:
{brand_design_guide}

PRODUCT INFORMATION:
{product_info}
{idea_info}

CREATIVE DECISION — CAROUSEL TYPE & VISUAL STYLE

The user does NOT need to choose a carousel type or visual style.
You must independently select the most appropriate CAROUSEL TYPE and VISUAL STYLE based on the PRODUCT INFORMATION and BRAND DESIGN GUIDE.
Do not ask the user to choose.

CAROUSEL TYPE defines WHAT the carousel communicates.
You must select exactly ONE from:
- Educational
- Problem → Solution
- Benefits
- Comparison
- Transformation
- Product Deep Dive
- FAQ
- Myth → Fact
- Social Proof
- Offer

VISUAL STYLE defines HOW the carousel looks.
You must select exactly ONE from:
- Minimal Premium
- Editorial
- Cinematic
- Collage
- Neo-Brutalist
- Clinical
- Lifestyle
- Luxury
- Playful
- Bold / High-Contrast

Choose the combination that best fits the product category, product information, brand identity, target audience and communication opportunity.
Do not randomly select styles.
Do not default to the same type or style for every product.
The selected CAROUSEL TYPE and VISUAL STYLE must be explicitly returned inside carousel_strategy so downstream systems know the creative direction that was chosen.
If multiple options could work, choose the one that produces the clearest and strongest {slide_count}-slide story while remaining faithful to the brand.

CORE LOGIC
CAROUSEL TYPE defines WHAT the carousel communicates, why the audience should swipe, and the intended narrative.
VISUAL STYLE defines HOW the carousel looks, including aesthetic mood, photography language, composition and overall design character.
BRAND DESIGN GUIDE defines the brand's visual identity. Extract and consistently apply its colors, typography, tone, spacing, graphic language, imagery style and other relevant rules.
PRODUCT INFORMATION is the only source of truth for product facts and claims.
If information is missing, do not invent it.

DIRECTOR RESPONSIBILITY
Think like a creative director, not a template generator.
First determine:
- Appropriate audience
- Core message
- Emotional response
- Visual direction
- Narrative flow
- CTA
- Best visual treatment for each slide

Then create exactly {slide_count} slides with a strong narrative progression appropriate to the selected carousel type.
A progression such as:
HOOK → CONTEXT → PRODUCT → VALUE → USAGE/DETAIL → CTA
is only a guideline.
Do not force this structure when another narrative is more appropriate for the selected carousel type.
Every slide must contribute a new piece of information or visual progression.

VISUAL TREATMENT
For every slide, independently select the treatment that best communicates its purpose.
Possible treatments include:
Product photography, Lifestyle photography, Product close-up, Typography-led, Educational graphic, Infographic, Diagram, Illustration, Collage, Abstract graphic, Comparison graphic, Product + graphic hybrid, Photography + typography hybrid.
Do NOT use the same treatment repeatedly unless repetition is intentionally justified by the narrative.
Do NOT assume every slide needs a product image.
Do NOT assume every slide needs photography.
Use typography, graphics, diagrams, illustrations or abstract compositions when they communicate the idea more effectively.
The product should appear only when it strengthens the slide.

VISUAL VARIETY
The carousel must feel like one campaign, not {slide_count} copies of the same layout.
Create intentional variation through:
- Product scale
- Product cropping
- Camera perspective
- Composition
- Typography placement
- Visual density
- Treatment type
- Background structure
- Graphic elements
- Image-to-text ratio
Avoid repetitive centered product shots, identical layouts and unnecessary decorative elements.
Across {slide_count} slides, avoid making the product the dominant visual on every slide unless the selected carousel type genuinely requires it.

PRODUCT ACCURACY
Whenever the product appears, preserve the supplied product exactly.
Do not redesign, recolor, reshape, simplify or replace:
- Packaging
- Logo
- Label
- Typography on packaging
- Product proportions
- Cap/pump/bottle structure
- Brand colors
- Visible product details
The supplied product reference has priority over assumptions.
Never add packaging details that are not visible or provided.
Never modify the product merely to fit the selected visual style.

CLAIM & COPY RULES
Use only information available in PRODUCT INFORMATION and BRAND DESIGN GUIDE.
Do not invent:
- Ingredients, Benefits, Statistics, Clinical results, Certifications, Reviews, Prices, Discounts, Features, Performance claims, Before/after results, Medical claims, Testimonials
Do not exaggerate a factual product statement into a stronger unsupported claim.
If the product information does not support a claim, do not use the claim.
Keep headlines short, punchy and readable.
Supporting copy should provide context without overcrowding the slide.
Do not add filler copy merely to make a slide look complete.

IMAGE DECISION
For every slide, decide whether a generated photographic/product image is actually necessary.
If an image is required, include detailed image-generation direction inside the slide paragraph covering subject, environment, composition, perspective, lighting, props and visual mood.
If no generated photographic image is needed, explicitly write:
"NO PHOTOGRAPHIC IMAGE REQUIRED."
The slide should then be designed as typography, graphic, infographic, diagram, illustration or another appropriate non-photographic treatment.
Do not generate an image simply because the product is physical.

TEXT RENDERING
All important slide copy must be explicitly identified so a downstream image-generation/design system knows exactly what text belongs on the slide.
Keep text minimal enough to remain readable in a social-media carousel.
Do not place important copy in visually crowded areas.
Use the brand typography hierarchy from the BRAND DESIGN GUIDE.
If the guide does not specify a font, choose a suitable typography direction consistent with the selected visual style without inventing a fictional brand font.
Do not add unnecessary text solely for visual decoration.

DESIGN CONSISTENCY
Across all slides maintain:
- Brand color system
- Typography language
- Graphic language
- Spacing principles
- Overall mood
- Photography/lighting language
- Premium brand character
However, do not force identical layouts.
Every slide should have one clear communication objective and strong visual hierarchy.
The selected visual style should influence the entire carousel while still allowing individual slides to use different visual treatments.

CTA
The final slide must contain an appropriate CTA based on the selected CAROUSEL TYPE, product and available information.
Do not automatically use "Shop Now".
Possible CTA directions include: Explore, Learn More, Discover, Save This, Try It, Build Your Routine, Follow for More, Visit Profile.
Choose the CTA based on the actual objective.
Do not invent a purchase destination, URL, price or promotional offer.

SLIDE DIRECTION
For each slide, write ONE concise but sufficiently detailed paragraph.
Start every paragraph exactly with:
"Visual Treatment: [selected treatment]."
The paragraph must contain:
- Slide purpose
- Exact headline
- Supporting copy when needed
- CTA when applicable
- What the viewer should see
- Product presence and placement when needed
- Composition and background
- Photography direction when applicable
- Colors and typography
- Text hierarchy and placement
- Image-generation direction when required
Do not use bullet points inside the paragraph.
Each paragraph must remain a single cohesive paragraph.

QUALITY CONTROL
Before returning the JSON, verify:
1. Exactly {slide_count} slides are present.
2. Exactly ONE approved carousel type was selected.
3. Exactly ONE approved visual style was selected.
4. The selected type genuinely fits the product and brand.
5. The selected style genuinely fits the brand and product category.
6. Each slide has one clear idea.
7. The narrative progresses logically.
8. Visual treatments are intentionally selected.
9. Visual treatments are not unnecessarily repetitive.
10. Not every slide unnecessarily contains photography or the product.
11. Product packaging remains accurate.
12. No unsupported claims were introduced.
13. Copy is concise and readable.
14. Slides feel visually related but compositionally varied.
15. The final slide has an appropriate CTA.
16. Every creative_direction is exactly one paragraph.
17. No information outside the supplied inputs has been invented.
18. The response is valid JSON.

OUTPUT
Return ONLY valid JSON using this exact structure:
{{
  "carousel_strategy": {{
    "carousel_type": "",
    "visual_style": "",
    "core_message": "",
    "audience": "",
    "emotional_direction": "",
    "visual_vibe": "",
    "narrative_flow": "",
    "cta": ""
  }},
  "slides": [
    {{
      "slide_number": 1,
      "creative_direction": ""
    }}
  ]
}}

FINAL OUTPUT RULES
Return ONLY valid JSON.
No Markdown.
No bullet points.
No explanations.
No additional fields.
Each "creative_direction" must be ONE cohesive paragraph beginning with "Visual Treatment: ...".
If a slide does not require a generated photographic image, include "NO PHOTOGRAPHIC IMAGE REQUIRED." within that paragraph.
"""
    import requests
    api_key = os.getenv("OPENAI_API_KEY")
    payload = {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "response_format": {"type": "json_object"}
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=60)
    
    if resp.status_code == 200:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        director_json = json.loads(content)
        print("\n--- LLM DIRECTOR RAW OUTPUT (GPT-4o) ---")
        print(json.dumps(director_json, indent=2))
    else:
        print("OpenAI Error:", resp.status_code, resp.text)

if __name__ == "__main__":
    test()
