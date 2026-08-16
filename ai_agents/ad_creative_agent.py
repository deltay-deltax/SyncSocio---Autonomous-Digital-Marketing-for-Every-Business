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
    if products:
        for p in products:
            product_details += f"- Name: {p.get('name')}\n  Description: {p.get('description', '')}\n  Key Benefit: {p.get('keyBenefit', '')}\n\n"
    else:
        product_details = f"- Custom Product/Focus: {idea if idea else 'A premium product from the brand'}\n\n"
        
    # Map goals to specific high-converting frameworks (reverse-engineered from makelocalads & marketing best practices)
    frameworks_map = {
        "discover": "AIDA (Attention-Interest-Desire-Action), PAS (Problem-Agitate-Solution), BAB (Before-After-Bridge), Storytelling, Educational, QUEST (Qualify-Understand-Educate-Stimulate-Transition), Star-Story-Solution, 4Cs (Clear-Concise-Compelling-Credible), What-Why-How",
        "compare": "Us vs. Them, FAB (Features-Advantages-Benefits), Social Proof, Spec-Sheet Showdown, Contrast Framework, Objection-Rebuttal, StoryBrand (Character-Problem-Guide), PPPP (Picture-Promise-Prove-Push), RTB (Reason To Believe), Feature-Story",
        "purchases": "FOMO (Urgency), SLAP (Stop-Look-Act-Purchase), PASTOR (Problem-Amplify-Story-Transformation-Offer-Response), 4U's (Urgent-Unique-Ultra-specific-Useful), Command-Benefit-Push, Hook-Retain-Reward, Feature-Benefit-Action (FBA)"
    }
    
    goal_context = ""
    if goal.lower() == "purchases":
        goal_context = "CRITICAL: Because this is a Bottom of Funnel (Drive Purchases) goal, you MUST inject strong action-oriented urgency (e.g., 'Shop Now', 'Upgrade Today'). DO NOT hallucinate fake discounts or sales (like 20% off or BOGO) unless explicitly mentioned in the ADDITIONAL CONTEXT. Focus on risk reversals (e.g., guarantees) or immediate product benefits."

    if angle.lower() == "auto":
        available = frameworks_map.get(goal.lower(), "AIDA, PAS, BAB")
        angle_instruction = f"AUTO (You MUST assign a completely UNIQUE and DISTINCT framework for each of the {count} concepts from this list: {available}. NEVER repeat a framework unless the number of concepts requested is greater than the number of available frameworks.)"
    else:
        angle_instruction = angle.upper()

    system_prompt = f"""You are an elite Art & Creative Director at a top-tier digital ad agency.
Your job is to conceptualize {count} distinct, high-converting social media ad creatives.

BRAND DNA:
{brand_dna}

PRODUCTS TO FEATURE:
{product_details}

CAMPAIGN GOAL: {goal.upper()}
MARKETING ANGLE: {angle_instruction}
ADDITIONAL CONTEXT: {idea if idea else 'None'}
{goal_context}

For each concept, write a highly detailed "Director's Instruction" paragraph (approx 150-250 words).
You MUST write like a strict Art Director dictating exact visual requirements.
The instruction MUST describe:
1. The marketing framework used (e.g., AIDA, PAS) and the psychological archetype targeted.
2. The exact visual composition and layout (e.g., "bold split-screen graphic", "minimalist flat-lay", "macro product shot").
3. Specific color hex codes for the background and visual accents, ensuring they contrast perfectly with the product.
4. Specific, premium typography (e.g., 'Tenor Sans', 'Circular Std') and exact styling for the on-image headline.
5. The call to action button exact styling (color, shape, placement).
6. A strict rule on negative space and visual hierarchy.

Output the result as a raw JSON array of objects. Each object must have:
- "angle": The framework used (e.g., "PAS", "BAB").
- "instructions": The full, highly-detailed Art Director's instruction paragraph.
- "caption": A short, punchy social media caption for the post itself (with 1-2 emojis).
Do not include markdown blocks like ```json. Return ONLY the raw JSON array.

CRITICAL FINAL CHECK: If you are generating multiple concepts, verify that EVERY SINGLE concept uses a DIFFERENT framework from the allowed list. Do not output duplicates!
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
    ref_images: List[str] = None,
    user_plan: str = ""
) -> List[Dict]:
    print(f"\n[AdsAgent] 🎬 Starting Ad Generation: {count} concepts | Goal: {campaign_goal} | Angle: {campaign_angle}")
    
    # 1. Generate Concepts via Director LLM (GPT-4o)
    concepts = _generate_director_concepts(brand_doc, products, count, campaign_goal, campaign_angle, idea)
    
    if not concepts:
        raise ValueError("Failed to generate concepts from the Director LLM.")
        
    # 2. Build Static Blocks
    # Extract Product Appearance
    if products and len(products) > 0:
        prod = products[0]
        prod_appearance = f"The product is {prod.get('name', 'a premium item')}. {prod.get('visualDescription', prod.get('description', ''))} It should look high-quality, authentic, and properly lit."
    else:
        prod_appearance = f"The product is described as follows: {idea if idea else 'A premium item'}. It should look high-quality, authentic, and properly lit."
    
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
- CRITICAL: DO NOT write the names of the marketing frameworks (like "PAS", "BAB", "Problem", "Agitate", "Solution", etc.) on the image. These are internal psychological frameworks for the scene, NOT ad copy! Only write the exact short on-image headline provided by the director.
"""

    generated_posts = []
    
    # 3. Assemble and Render
    for idx, concept in enumerate(concepts[:count]):
        instructions = concept.get("instructions", "")
        caption = concept.get("caption", "Discover our latest collection.")
        
        full_prompt = f"""Instructions by the director: {instructions}

Product appearance: {prod_appearance}

Use the product appearance text only as a private visual reference for accurately drawing the product. Do not print, quote, paraphrase, label, or turn any of that description into ad copy. Treat orientation-specific details carefully: show front-only details only when the product front is visible; if the brief shows the back, side, top, or an angled view where those details would not be visible, omit them instead of moving them onto the wrong face.

The attached product photos show the real product — reproduce it faithfully.

The final attached image is the official brand logo. Add it once, subtly, in clean negative space; keep it exact, legible, and uncropped.

Design requirements (apply to this ad):
{design_reqs}
"""
        print(f"\n[AdsAgent] 🖌️ Assembled Prompt {idx+1}/{count}:\n{full_prompt}\n")
        
        # Get brand logo
        brand_logo = brand_doc.get("logo", "")
        
        # Build image attachments list (Product Image(s) + Logo)
        attachments = []
        if ref_images and len(ref_images) > 0:
            # We only generate ads for the FIRST selected product to avoid confusing the AI
            attachments.append(ref_images[0])
            
        if brand_logo:
            attachments.append(brand_logo)
            
        # Map aspect_ratio to fal image_size
        aspect_to_fal = {
            "1:1": "square_hd",
            "4:5": "portrait_4_3",
            "9:16": "portrait_16_9",
            "16:9": "landscape_16_9",
            "2:3": "portrait_4_3"
        }
        gpt_size = aspect_to_fal.get(aspect_ratio, "square_hd")

        img_quality = "medium" if "pro" in user_plan.lower() else "low"
        print(f"  Quality: {img_quality}")

        try:
            fal_result = generate_fal_image_gpt2(
                prompt=full_prompt,
                image_size=gpt_size,
                image=attachments if attachments else None,
                quality=img_quality
            )
            image_url = fal_result.get("image") if isinstance(fal_result, dict) else fal_result
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
