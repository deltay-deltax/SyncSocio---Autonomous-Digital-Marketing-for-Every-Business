import os
import json
import re
import concurrent.futures
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from fal_visual_engine import generate_fal_image_gpt2
from strategy_image_agent import build_image_prompt, _resolve_ref_image

def run_autopilot_planner(
    brand_info: Dict[str, Any],
    products: List[Dict[str, Any]],
    upcoming_festivals: List[Dict[str, Any]],
    language: str,
    weeks: int
) -> List[Dict[str, Any]]:
    """
    Executes the LLM planner agent to generate the campaign strategy,
    planning 7 posts per week and assigning context, topics, captions, and product mappings.
    """
    post_count = weeks * 7
    
    # 1. Format brand profile
    brand_name = brand_info.get("brandName", "Our Brand")
    brand_tone = brand_info.get("brandTone", "Premium/Modern")
    visual_vibe = brand_info.get("visualVibe", "Professional")
    usp = brand_info.get("usp", "")
    pain_point = brand_info.get("painPoint", "")
    keywords = brand_info.get("brandKeywords", "")
    primary_color = brand_info.get("primaryColor", "#000000")
    secondary_color = brand_info.get("secondaryColor", "#ffffff")
    category = brand_info.get("businessCategory", "E-Commerce")
    
    # 2. Format products list
    products_dossier = []
    for idx, p in enumerate(products):
        p_id = str(p.get("_id", ""))
        p_name = p.get("name", "Product")
        p_desc = p.get("description", "")
        p_benefit = p.get("keyBenefit", "")
        p_price = p.get("price", "")
        products_dossier.append(
            f"Product {idx+1}:\n"
            f"  ID: {p_id}\n"
            f"  Name: {p_name}\n"
            f"  Description: {p_desc}\n"
            f"  Key Benefit: {p_benefit}\n"
            f"  Price: {p_price}\n"
        )
    products_section = "\n".join(products_dossier)
    
    # 3. Format upcoming festivals
    festivals_dossier = []
    for idx, f in enumerate(upcoming_festivals):
        f_name = f.get("name", "Festival")
        f_emoji = f.get("emoji", "")
        f_date = f.get("date", "")
        f_type = f.get("type", "")
        festivals_dossier.append(f"- {f_name} {f_emoji} (Date: {f_date}, Type: {f_type})")
    festivals_section = "\n".join(festivals_dossier) if festivals_dossier else "No upcoming festivals."
    
    # Build the exact set of valid product IDs to include in the prompt
    valid_product_ids = [str(p.get("_id", "")) for p in products]
    valid_ids_json = json.dumps(valid_product_ids)
    
    prompt = f"""
    You are the Chief Autopilot Planner Agent for SyncSocio AI.
    Your objective is to generate a comprehensive {post_count}-day content plan ({weeks} week(s), 7 posts per week, Monday through Sunday).
    
    Read the Brand Dossier, selected Products catalog, and list of upcoming Festivals. Map these strategically into a day-by-day campaign calendar.
    
    ═══════════ BRAND DOSSIER ═══════════
    BRAND NAME: {brand_name}
    CATEGORY/INDUSTRY: {category}
    TONE: {brand_tone}
    VISUAL STYLE/VIBE: {visual_vibe}
    USP: {usp}
    PAIN POINT RESOLUTION: {pain_point}
    KEYWORDS: {keywords}
    BRAND COLORS: Primary: {primary_color}, Secondary: {secondary_color}
    
    ═══════════ PRODUCTS CATALOG ═══════════
    {products_section}
    
    ═══════════ VALID PRODUCT IDs (MUST use ONLY these) ═══════════
    {valid_ids_json}
    
    ═══════════ UPCOMING FESTIVALS IN TIMELINE ═══════════
    {festivals_section}
    
    ═══════════ MANDATORY PLANNING CONSTRAINTS ═══════════
    1. TIMELINE LENGTH: You MUST generate EXACTLY {post_count} posts — no more, no fewer. Count carefully before outputting.
    2. PRODUCT IDs: In the "product_id" field, you MUST use ONLY IDs from the VALID PRODUCT IDs list above. NEVER invent or modify a product ID. Any post with an invalid product ID will be discarded.
    3. PRODUCT COVERAGE: Every product in the catalog MUST appear in at least one post.
    4. PRODUCT MAPPING: For each post, choose contextually the most appropriate product. Assign its exact MongoDB ID in the "product_id" field.
    5. FESTIVAL MATCHING: If there are upcoming festivals, at least one post in that week should celebrate that festival. Include the festival name in the "festival_name" field for that post.
    6. LANGUAGE: All output "caption" fields must be fully written in: {language}.
    
    ═══════════ JSON OUTPUT SPEC (For each post) ═══════════
    Return a list of JSON objects, each with:
    - week: (integer) The week index (1 to {weeks})
    - day: (string) The day of the week (e.g., "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
    - product_id: (string) MUST be one of: {valid_ids_json}
    - topic: (string) A catchy one-line viral topic/title for this post
    - image_prompt: (string) A simple 2-3 line ad creative prompt/concept. DO NOT include color descriptions, lighting instructions, complex visual details, layout specifications, or mention days/dates. Just describe a simple, high-impact creative concept featuring the product.
    - caption: (string) A complete copywriting social media caption (with hook, body, CTA, and 3-5 hashtags) written entirely in {language}.
    - festival_name: (string or null) The name of the festival if this post is a festival post, otherwise null.

    Output format: Return ONLY a valid JSON list of EXACTLY {post_count} objects. No extra text, headers, or markdown blocks.
    """
    
    llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", google_api_key=os.getenv("GOOGLE_API_KEY"))
    response = llm.invoke([
        SystemMessage(content=f"You are a structured planning agent. Output exactly a JSON list of {post_count} campaign posts. Output no other text than the JSON list."),
        HumanMessage(content=prompt)
    ])
    
    content = response.content
    if isinstance(content, list):
        content = "".join([part.get('text', '') if isinstance(part, dict) else str(part) for part in content])
        
    json_match = re.search(r'\[.*\]', content, re.DOTALL)
    if json_match:
        calendar = json.loads(json_match.group())
    else:
        calendar = json.loads(content)
        
    # VALIDATION LOGIC
    # 1. Filter out posts with invalid product IDs
    valid_calendar = [post for post in calendar if post.get("product_id") in valid_product_ids]
    
    # 2. Ensure total count is correct by truncating or padding (if necessary)
    if len(valid_calendar) > post_count:
        valid_calendar = valid_calendar[:post_count]
    
    return valid_calendar

def generate_single_autopilot_image(post: Dict[str, Any], brand_info: Dict[str, Any], products_map: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Connects to fal_visual_engine to generate the actual post image.
    """
    prod_id = post.get("product_id")
    prod = products_map.get(prod_id)
    if prod is None:
        print(f"[Autopilot Visuals] ⚠️  WARNING: product_id '{prod_id}' not found in products_map (known IDs: {list(products_map.keys())}). Skipping product image reference.")
    image_ref = prod.get("imageBase64") if prod else None
    
    print(f"[Autopilot Visuals] Generating image for week={post.get('week')} day={post.get('day')}...")
    
    try:
        # Construct the exact same prompt format used in ContentStrategy
        agent_idea = post.get("image_prompt", "") or post.get("topic", "")
        
        rich_prompt = build_image_prompt(
            brand_doc=brand_info,
            idea=agent_idea,
            aspect="1:1",
            product=prod,
            ad_template=None,
            campaign_mode=None,
            language="english",
            custom_directive=None
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
            
        print(f"\n--- PROMPT SENT TO FAL gpt-image-2 (Autopilot) ---\n{rich_prompt}\n--------------------------------------\n")
            
        result = generate_fal_image_gpt2(prompt=rich_prompt, image=task_refs, image_size="square_hd")
        post["image"] = result.get("image", "")
        post["status"] = "success"
    except Exception as e:
        print(f"[Autopilot Visuals] Error generating image: {e}")
        post["image"] = image_ref or ""
        post["status"] = "error"
        
    return post

def generate_autopilot_campaign(
    brand_info: Dict[str, Any],
    products: List[Dict[str, Any]],
    upcoming_festivals: List[Dict[str, Any]],
    language: str,
    weeks: int
) -> List[Dict[str, Any]]:
    """
    Main entry point:
    1. Invokes the planner agent to create the campaign schedule.
    2. Maps product metadata.
    3. Parallelizes the image generations using a thread pool.
    """
    # 1. Run LLM campaign planner
    print(f"[Autopilot] Starting planner agent for weeks={weeks} language={language}...")
    planned_posts = run_autopilot_planner(brand_info, products, upcoming_festivals, language, weeks)
    
    # 2. Build product lookup map by ID
    products_map = {str(p.get("_id", "")): p for p in products}
    
    # 3. Parallelize image generation calls via ThreadPoolExecutor
    print(f"[Autopilot] Planner yielded {len(planned_posts)} posts. Launching parallel visual generations...")
    final_posts = []
    
    # Max workers set to 6 to balance speed with API rate limits
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(generate_single_autopilot_image, post, brand_info, products_map): post
            for post in planned_posts
        }
        
        for future in concurrent.futures.as_completed(futures):
            try:
                result_post = future.result()
                final_posts.append(result_post)
            except Exception as fut_err:
                orig_post = futures[future]
                print(f"[Autopilot] Thread execution error for post: {fut_err}")
                orig_post["image"] = ""
                orig_post["status"] = "error"
                final_posts.append(orig_post)
                
    # Sort posts back by week and then by day to maintain calendar order
    day_weights = {"Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 7}
    final_posts.sort(key=lambda x: (x.get("week", 1), day_weights.get(x.get("day", "Monday"), 1)))
    
    print(f"[Autopilot] Completed campaign generation of {len(final_posts)} posts.")
    return final_posts
