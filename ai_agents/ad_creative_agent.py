import os
import json
import random
import requests
from typing import List, Dict, Any
from fal_visual_engine import generate_fal_image_gpt2
from common import get_brand_dna

def _generate_director_concepts(brand_doc: Dict, products: List[Dict], count: int, goal: str, angle: str, idea: str) -> List[Dict]:
    brand_dna = get_brand_dna(brand_doc)
    
    product_details = ""
    for p in products:
        product_details += f"- Name: {p.get('name')}\n  Description: {p.get('description', '')}\n  Key Benefit: {p.get('keyBenefit', '')}\n\n"
        
    system_prompt = f"""You are an elite Creative Director at a top-tier digital ad agency.
Your job is to conceptualize {count} distinct, high-converting social media ad creatives.

BRAND DNA:
{brand_dna}

PRODUCTS TO FEATURE:
{product_details}

CAMPAIGN GOAL: {goal.upper()}
MARKETING ANGLE: {angle.upper()} (If 'AUTO', select the best angle like PAS, BAB, Storytelling, Us vs. Them, Social Proof, FOMO, or Educational yourself)
ADDITIONAL CONTEXT: {idea if idea else 'None'}

For each concept, write a highly detailed "Director's Instruction" paragraph (approx 150-200 words).
The instruction MUST describe:
- The marketing framework used (e.g., PAS, BAB)
- The target audience and their psychology
- The exact visual scene, layout, and lighting
- The hero visual (product)
- The short on-image headline
- The call to action button (color, shape, text)
- Brand consistency rules (colors, typography, spacing)

Output the result as a raw JSON array of objects. Each object must have:
- "angle": The framework used (e.g., "PAS", "BAB").
- "instructions": The full director's instruction paragraph.
- "caption": A short, punchy social media caption for the post itself (with 1-2 emojis).
Do not include markdown blocks like ```json. Return ONLY the raw JSON array.
"""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[AdsAgent] OPENAI_API_KEY missing, using fallback dummy concepts")
        return [{"angle": angle, "instructions": "A beautiful product shot on a clean background.", "caption": "Buy now! 🚀"}] * count

    try:
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": system_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1500
            }
        )
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"].strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        return json.loads(content.strip())
    except Exception as e:
        print(f"[AdsAgent] GPT-4o Generation Error: {e}")
        return []

def generate_ad_creatives(
    brand_doc: Dict,
    products: List[Dict],
    count: int = 1,
    campaign_goal: str = "discover",
    campaign_angle: str = "auto",
    idea: str = "",
    aspect_ratio: str = "1:1",
    ref_images: List[str] = None
) -> List[Dict]:
    print(f"\n[AdsAgent] 🎬 Starting Ad Generation: {count} concepts | Goal: {campaign_goal} | Angle: {campaign_angle}")
    
    # 1. Generate Concepts via Director LLM (GPT-4o)
    concepts = _generate_director_concepts(brand_doc, products, count, campaign_goal, campaign_angle, idea)
    
    if not concepts:
        raise ValueError("Failed to generate concepts from the Director LLM.")
        
    # 2. Build Static Blocks
    # Extract Product Appearance
    prod = products[0] if products else {}
    prod_appearance = f"The product is {prod.get('name', 'a premium item')}. {prod.get('description', '')}. It should look high-quality, authentic, and properly lit."
    
    # Extract Design Requirements from Brand
    visual_vibe = brand_doc.get("visualVibe", "Clean and modern")
    primary_color = brand_doc.get("primaryColor", "#2563EB")
    design_reqs = f"""- Follow the instructions by the director.
- Make the ad design, layout, typography on-branded ({visual_vibe}), but should look premium, editorial-like.
- Establish a clear visual hierarchy: one dominant focal point the eye lands on first, then the supporting message, then the CTA.
- Keep strong figure/ground contrast. If text sits over imagery, place a scrim or overlay behind it so it stays fully legible.
- Place the focal subject on a rule-of-thirds line; leave generous whitespace and avoid clutter.
- Use a limited palette anchored to the brand colors (including {primary_color}), reserving one accent color for the call to action.
- Keep 20% space all around the creative for the ad to look cleaner.
- Group and align elements cleanly (Gestalt); use at most two type styles.
"""

    generated_posts = []
    
    # 3. Assemble and Render
    for idx, concept in enumerate(concepts[:count]):
        instructions = concept.get("instructions", "")
        caption = concept.get("caption", "Discover our latest collection.")
        
        full_prompt = f"""Instructions by the director: {instructions}

Product appearance: {prod_appearance}

Use the product appearance text only as a private visual reference for accurately drawing the product. Do not print, quote, paraphrase, label, or turn any of that description into ad copy.

Design requirements (apply to this ad):
{design_reqs}
"""
        print(f"\n[AdsAgent] 🖌️ Assembled Prompt {idx+1}/{count}:\n{full_prompt}\n")
        
        # Pick a reference image if available
        ref_image = None
        if ref_images and len(ref_images) > 0:
            ref_image = ref_images[idx % len(ref_images)]
            
        # Map aspect_ratio to fal image_size
        aspect_to_fal = {
            "1:1": "square_hd",
            "4:5": "portrait_4_3",
            "9:16": "portrait_16_9",
            "16:9": "landscape_16_9",
            "2:3": "portrait_4_3"
        }
        gpt_size = aspect_to_fal.get(aspect_ratio, "square_hd")

        try:
            image_url = generate_fal_image_gpt2(
                prompt=full_prompt,
                image_size=gpt_size,
                image=ref_image
            )
            generated_posts.append({
                "type": "image",
                "image": image_url,
                "caption": caption,
                "angle": concept.get("angle", "Custom")
            })
        except Exception as e:
            print(f"[AdsAgent] Render Error on Concept {idx+1}: {e}")
            generated_posts.append({
                "type": "image",
                "error": str(e),
                "caption": caption
            })

    return generated_posts
