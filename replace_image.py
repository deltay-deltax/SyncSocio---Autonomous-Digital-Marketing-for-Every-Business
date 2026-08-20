with open('d:/Major_Project/ai_agents/strategy_image_agent.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

new_image_block = '''    elif layout == "image":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

        print(f"\\n[StrategyAgent] 🎨 Generating Director Briefs for {count} organic images...")
        try:
            director_concepts = generate_ad_creatives(
                brand_doc=brand_doc,
                products=products,
                count=count,
                campaign_goal="discover",
                campaign_angle="auto",
                idea=idea or "",
                aspect_ratio=aspect_ratio,
                ref_images=assigned_refs,
                language=language,
                post_format="image"
            )
        except Exception as e:
            print(f"[StrategyAgent] ❌ Art Director failed: {e}")
            director_concepts = []

        tasks = []
        for i in range(count):
            prod = assigned_products[i]
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and i < len(assigned_refs) and assigned_refs[i]:
                task_refs.append(assigned_refs[i])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
            
            concept = director_concepts[i] if i < len(director_concepts) else {}
            instructions = concept.get("instructions", "A premium product image.")
            headline = concept.get("headline", "")
            cta = concept.get("cta", "")
            
            prompt = instructions
            if headline:
                prompt += f"\\n\\nHEADLINE TEXT: {headline}"
            if cta:
                prompt += f"\\n\\nCTA: {cta}"
                
            template_label = concept.get("angle", "Organic Post")
            tasks.append((prompt, task_refs, i, prod, template_label, concept.get("caption", "")))

        def run_image_task(task):
            prompt, refs, index, prod, template_label, auto_caption = task
            print(f"\\n[StrategyAgent] 🖼  Image {index+1}/{count} | ref_image={'YES ✓ (' + str(len(refs)) + ')' if refs else 'NONE'} | framework={template_label}")
            
            caption = auto_caption or generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout="image",
                idea=idea,
                language=language,
                template_label=template_label,
                index=index,
                trigger_keyword=comment_keyword,
            )
            
            try:
                img_count = len(refs) if refs else 0
                img_types = []
                for idx, img in enumerate(refs or []):
                    if isinstance(img, str) and img.startswith('http'):
                        img_types.append(f"[{idx}] URL: {img[:80]}")
                    elif isinstance(img, str):
                        img_types.append(f"[{idx}] base64 ({len(img)//1024}KB)")
                result = generate_fal_image_gpt2(
                    prompt=prompt,
                    image=refs,
                    image_size=fal_size,
                    quality=img_quality,
                )
                return {
                    "image":    result["image"],
                    "caption":  caption,
                    "type":     "image",
                    "template": template_label,
                    "index":    index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Image {index+1} failed: {e}")
                return {
                    "image":    None,
                    "caption":  caption,
                    "type":     "image",
                    "error":    str(e),
                    "index":    index
                }

        print(f"[StrategyAgent] 🚀 Running static image generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_image_task, tasks))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)
'''

lines = lines[:1244] + [new_image_block + '\n'] + lines[1386:]

if not any('generate_ad_creatives' in l for l in lines):
    for i, l in enumerate(lines):
        if 'import json' in l:
            lines.insert(i+1, 'from ad_creative_agent import generate_ad_creatives\n')
            break

with open('d:/Major_Project/ai_agents/strategy_image_agent.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
