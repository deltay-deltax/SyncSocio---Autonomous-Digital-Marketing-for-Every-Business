import re

with open('d:/Major_Project/ai_agents/autopilot_agent.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update imports
if 'generate_ad_creatives' not in code:
    code = code.replace(
        'from strategy_image_agent import build_image_prompt, _resolve_ref_image',
        'from strategy_image_agent import build_image_prompt, _resolve_ref_image, generate_instagram_caption_and_hashtags\nfrom ad_creative_agent import generate_ad_creatives'
    )

# 2. Fix the Planner prompt
prompt_old = '''    3. PRODUCT COVERAGE: Every product in the catalog MUST appear in at least one post.
    4. PRODUCT MAPPING: For each post, choose contextually the most appropriate product. Assign its exact integer index (1, 2, 3...) in the "product_index" field.
    5. FESTIVAL MATCHING: If there are upcoming festivals, at least one post in that week should celebrate that festival. Include the festival name in the "festival_name" field for that post.
    6. LANGUAGE: All output "caption" fields must be fully written in: {language}.
    
    ═══════════ JSON OUTPUT SPEC (For each post) ═══════════
    Return a list of JSON objects, each with:
    - week: (integer) The week index (1 to {weeks})
    - day: (string) The day of the week (e.g., "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    - product_index: (integer) MUST be a number from 1 to {max_product_index}.
    - topic: (string) A catchy one-line viral topic/title for this post
    - image_prompt: (string) A highly detailed 2-3 line ad creative prompt/concept. Describe a high-converting, visually stunning product ad. Be specific about the visual layout, lighting, aesthetics, and any text overlays. Let your creative imagination run wild to make a perfect Instagram ad.
    - caption: (string) A complete copywriting social media caption (with hook, body, CTA, and 3-5 hashtags) written entirely in {language}.
    - festival_name: (string or null) The name of the festival if this post is a festival post, otherwise null.'''

prompt_new = '''    3. PRODUCT COVERAGE: Every product in the catalog MUST appear in at least one post.
    4. PRODUCT MAPPING: For each post, choose contextually the most appropriate product. Assign its exact integer index (1, 2, 3...) in the "product_index" field.
    5. FESTIVAL MATCHING: If there are upcoming festivals, at least one post in that week should celebrate that festival. Include the festival name in the "festival_name" field for that post.
    
    ═══════════ JSON OUTPUT SPEC (For each post) ═══════════
    Return a list of JSON objects, each with:
    - week: (integer) The week index (1 to {weeks})
    - day: (string) The day of the week (e.g., "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    - product_index: (integer) MUST be a number from 1 to {max_product_index}.
    - topic: (string) A catchy one-line viral topic/title for this post
    - festival_name: (string or null) The name of the festival if this post is a festival post, otherwise null.'''

code = code.replace(prompt_old, prompt_new)


# 3. Update generate_single_autopilot_image signature & implementation
old_func_def = '''def generate_single_autopilot_image(post: Dict[str, Any], brand_info: Dict[str, Any], products_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:'''
new_func_def = '''def generate_single_autopilot_image(post: Dict[str, Any], brand_info: Dict[str, Any], products_map: Dict[str, Dict[str, Any]], language: str = "english") -> Dict[str, Any]:'''
code = code.replace(old_func_def, new_func_def)

old_image_generation = '''        # Construct the exact same prompt format used in ContentStrategy
        agent_idea = post.get("image_prompt", "") or post.get("topic", "")

        # ── Detect fashion/apparel category ──
        _raw_cat = (
            brand_info.get("otherCategory")
            if brand_info.get("businessCategory") == "Other" and brand_info.get("otherCategory")
            else brand_info.get("businessCategory", "")
        ).lower()
        _FASHION_KEYS = ["fashion", "apparel", "clothing", "garment", "footwear",
                         "shoe", "accessory", "accessories", "streetwear",
                         "ethnic", "kurta", "saree", "jewellery", "jewelry"]
        is_fashion = any(k in _raw_cat for k in _FASHION_KEYS)

        # For fashion brands, pass a simple lifestyle signal — model decides visual treatment
        custom_directive = "Fashion lifestyle context — show the product worn or styled, not isolated." if is_fashion else None

        if is_fashion:
            print(f"[Autopilot Visuals] 👗 Fashion brand detected — applying lifestyle context.")

        rich_prompt = build_image_prompt(
            brand_doc=brand_info,
            idea=agent_idea,
            aspect="1:1",
            product=prod,
            ad_template=None,
            campaign_mode=None,
            language="english",
            custom_directive=custom_directive,
            text_mode="none",
        )
        # Collect reference images (product + logo) and resolve them to JPEG base64
        task_refs = []
        if image_ref:
            res_img = _resolve_ref_image(image_ref)
            if res_img: task_refs.append(res_img)
            
        logo = brand_info.get("logo")
        if logo:
            res_logo = _resolve_ref_image(logo)
            if res_logo and res_logo not in task_refs:
                task_refs.append(res_logo)
            
        print(f"  prompt     : {rich_prompt[:120].strip()}...")
            
        result = generate_fal_image_gpt2(prompt=rich_prompt, image=task_refs, image_size="square_hd", quality=img_quality)
        post["image"] = result.get("image", "")
        post["status"] = "success"'''

new_image_generation = '''        agent_idea = post.get("topic", "")
        
        # 1. Use the Art Director to create the rich prompt
        try:
            director_concepts = generate_ad_creatives(
                brand_doc=brand_info,
                products=[prod] if prod else [],
                count=1,
                campaign_goal="discover",
                campaign_angle="auto",
                idea=agent_idea,
                aspect_ratio="1:1",
                ref_images=[image_ref] if image_ref else None,
                language=language,
                post_format="image"
            )
            concept = director_concepts[0] if director_concepts else {}
        except Exception as dir_err:
            print(f"[Autopilot Visuals] ❌ Art Director failed: {dir_err}")
            concept = {}
            
        instructions = concept.get("instructions", f"A premium product image focusing on: {agent_idea}")
        headline = concept.get("headline", "")
        cta = concept.get("cta", "")
        
        rich_prompt = instructions
        if headline: rich_prompt += f"\\n\\nHEADLINE TEXT: {headline}"
        if cta: rich_prompt += f"\\n\\nCTA: {cta}"
        
        # 2. Collect reference images (product + logo) and resolve them to JPEG base64
        task_refs = []
        if image_ref:
            res_img = _resolve_ref_image(image_ref)
            if res_img: task_refs.append(res_img)
            
        logo = brand_info.get("logo")
        if logo:
            res_logo = _resolve_ref_image(logo)
            if res_logo and res_logo not in task_refs:
                task_refs.append(res_logo)
            
        print(f"  prompt     : {rich_prompt[:120].strip()}...")
            
        # 3. Generate Image using FAL
        result = generate_fal_image_gpt2(prompt=rich_prompt, image=task_refs, image_size="square_hd", quality=img_quality)
        post["image"] = result.get("image", "")
        
        # 4. Generate Premium Caption using strategy_image_agent logic
        try:
            caption = generate_instagram_caption_and_hashtags(
                brand_doc=brand_info,
                product=prod,
                layout="image",
                idea=agent_idea,
                language=language,
                template_label=concept.get("angle", "Organic Post"),
                index=0,
                trigger_keyword=""
            )
            post["caption"] = caption
        except Exception as cap_err:
            print(f"[Autopilot Visuals] Caption generation failed: {cap_err}")
            post["caption"] = concept.get("caption", "") or f"Check out this post: {agent_idea} #branding"
            
        post["status"] = "success"'''

code = code.replace(old_image_generation, new_image_generation)

# 4. Update the ThreadPool map
old_thread = '''        futures = {
            executor.submit(generate_single_autopilot_image, post, brand_info, products_map): post
            for post in planned_posts
        }'''
new_thread = '''        futures = {
            executor.submit(generate_single_autopilot_image, post, brand_info, products_map, language): post
            for post in planned_posts
        }'''
code = code.replace(old_thread, new_thread)

with open('d:/Major_Project/ai_agents/autopilot_agent.py', 'w', encoding='utf-8') as f:
    f.write(code)
