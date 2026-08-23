with open('d:/Major_Project/ai_agents/strategy_image_agent.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

new_carousel_block = '''    elif layout == "carousel":
        fal_size = ASPECT_TO_FAL_SIZE.get(aspect_ratio, "square_hd")

        print(f"\\n[StrategyAgent] 🎨 Generating Director Brief for {count} carousels...")
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
                post_format="carousel"
            )
        except Exception as e:
            print(f"[StrategyAgent] ❌ Art Director failed: {e}")
            director_concepts = []

        def run_carousel_task(index):
            prod = assigned_products[index]
            task_refs = []
            if prod:
                if prod.get("imageBase64"):
                    task_refs.append(prod.get("imageBase64"))
            elif assigned_refs and index < len(assigned_refs) and assigned_refs[index]:
                task_refs.append(assigned_refs[index])
            if brand_doc.get("logo"):
                res_logo = _resolve_ref_image(brand_doc.get("logo"))
                if res_logo and res_logo not in task_refs:
                    task_refs.append(res_logo)
                
            concept = director_concepts[index] if index < len(director_concepts) else {}
            instructions = concept.get("instructions", "A cohesive, premium carousel slide.")
            headline = concept.get("headline", "")
            
            base_image_prompt = instructions
            if headline:
                base_image_prompt += f"\\n\\nTHEME HEADLINE: {headline}"

            print(f"[StrategyAgent] ✍️ Drafting {slide_count} slides in {language} for carousel {index+1}...")
            slide_texts = build_carousel_slide_prompts(brand_doc, idea, slide_count, product=prod, language=language)
            
            enriched_slide_prompts = [f"{base_image_prompt}\\n\\nSLIDE TEXT TO INCLUDE: {text}" for text in slide_texts]

            print(f"\\n[StrategyAgent] 🎠 Carousel {index+1}/{count} | ref_image={'YES ✓' if task_refs else 'NONE'}")
            
            template_label = concept.get("angle", "Carousel Post")
            caption = concept.get("caption", "") or generate_instagram_caption_and_hashtags(
                brand_doc=brand_doc,
                product=prod,
                layout="carousel",
                idea=idea,
                language=language,
                template_label=template_label,
                index=index,
                trigger_keyword=comment_keyword,
            )

            try:
                img_count = len(task_refs) if task_refs else 0
                img_types = []
                for idx, img in enumerate(task_refs or []):
                    if isinstance(img, str) and img.startswith('http'):
                        img_types.append(f"[{idx}] URL: {img[:80]}")
                    elif isinstance(img, str):
                        img_types.append(f"[{idx}] base64 ({len(img)//1024}KB)")
                print(f"\\n[CarouselAgent DEBUG] 🎠 Carousel {index+1}: Passing {img_count} image(s) to FAL:")
                for t in img_types: print(f"  {t}")
                slides = generate_fal_carousel_ideogram(
                    base_prompt=f"{brand_doc.get('brandName', 'Brand')} — {idea}" if idea and idea.strip() else brand_doc.get('brandName', 'Brand'),
                    image=task_refs,
                    count=slide_count,
                    slide_prompts=enriched_slide_prompts,
                    image_size=fal_size,
                    quality=img_quality,
                )
                return {
                    "slides":  slides,
                    "caption": caption,
                    "type":    "carousel",
                    "index":   index
                }
            except Exception as e:
                print(f"[StrategyAgent] ❌ Carousel {index+1} failed: {e}")
                return {
                    "slides":  [],
                    "caption": caption,
                    "type":    "carousel",
                    "error":   str(e),
                    "index":   index
                }

        print(f"[StrategyAgent] 🚀 Running carousel generations in parallel...")
        with ThreadPoolExecutor(max_workers=count) as executor:
            thread_results = list(executor.map(run_carousel_task, range(count)))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)
'''

lines = lines[:1471] + [new_carousel_block + '\n'] + lines[1556:]

with open('d:/Major_Project/ai_agents/strategy_image_agent.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
