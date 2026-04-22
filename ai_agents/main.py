import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import re
from dotenv import load_dotenv

load_dotenv()

from bson import ObjectId
from agents import generate_strategy, analyze_brand_mix
from ads_agent import get_ads_recommendations
from visual_engine import generate_carousel_images, mock_video_gen, generate_google_image
from models import BrandInfo, StrategyResponse
from post_validator import validate_post, optimize_post, publisher_node
from vector_utils import find_similar_posts
from mix_agent import predict_brand_mix
from plan_agent import generate_weekly_plan
from caption_agent import generate_captions_and_hashtags
import shutil
from langchain_google_genai import ChatGoogleGenerativeAI
from auditors.meta_auditor import MetaAuditor
from auditors.models import AuditorInput, AuditorResponse

app = FastAPI(title="Velocity AI Strategy Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mongo Connection
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("test") # Explicitly use 'test' database
calendar_collection = db["content_calendars"]
brand_collection = db["brandprofiles"]

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now()}

@app.post("/analyze-mix")
async def api_analyze_mix(userId: str):
    try:
        print(f"DEBUG: Analyzing mix for user {userId}")
        # Fetch brand profile (searching by either profile ID or user ID for robustness)
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId) if ObjectId.is_valid(userId) else userId},
                {"user": ObjectId(userId) if ObjectId.is_valid(userId) else userId}
            ]
        })
        
        if not brand_doc:
            print(f"DEBUG: Brand profile NOT FOUND for user {userId}")
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        print(f"DEBUG: Brand profile found for {brand_doc.get('brandName')}")

        brand_info = {
            "brandName": brand_doc.get("brandName", "Unknown"),
            "businessCategory": brand_doc.get("businessCategory", "General"),
            "brandTone": brand_doc.get("brandTone", "Professional"),
            "targetAudiences": brand_doc.get("targetAudiences", []),
            "usp": brand_doc.get("usp", "Not specified"),
            "painPoint": brand_doc.get("painPoint", "Not specified"),
            "mainGoal": brand_doc.get("mainGoal", "Growth")
        }
        
        print("DEBUG: Calling analyze_brand_mix agent...")
        result = analyze_brand_mix(brand_info)
        print(f"DEBUG: Agent Response: {result}")
        return result
    except Exception as e:
        print(f"ERROR in /analyze-mix: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-strategy")
async def api_generate_strategy(brand_info: BrandInfo):
    try:
        print(f"DEBUG: Generating strategy for ID: {brand_info.userId}")
        # 1. Fetch the full brand data from MongoDB (searching by either profile ID or user ID)
        brand_doc = await brand_collection.find_one({
            "$or": [
                {"_id": ObjectId(brand_info.userId) if ObjectId.is_valid(brand_info.userId) else brand_info.userId},
                {"user": ObjectId(brand_info.userId) if ObjectId.is_valid(brand_info.userId) else brand_info.userId},
                {"brandName": brand_info.brandName}
            ]
        })
        if not brand_doc:
            # Last ditch: search by user ID as string or object
            brand_doc = await brand_collection.find_one({
               "user": brand_info.userId
            })
            
        if not brand_doc:
            raise HTTPException(status_code=404, detail=f"Brand profile not found for ID: {brand_info.userId}")
            
        print(f"Generating strategy for: {brand_doc.get('brandName')}")
        
        # Construct the context for the agent
        full_brand_profile = {
            "brandName": brand_doc.get("brandName"),
            "businessCategory": brand_doc.get("businessCategory"),
            "brandTone": brand_doc.get("brandTone"),
            "targetAudiences": brand_doc.get("targetAudiences", []),
            "usp": brand_doc.get("usp"),
            "painPoint": brand_doc.get("painPoint"),
            "mainGoal": brand_doc.get("mainGoal"),
            "primaryColor": brand_doc.get("primaryColor", "#2563EB"),
            "secondaryColor": brand_doc.get("secondaryColor", "#60A5FA")
        }
        
        product_brief = brand_info.productBrief
        suggested_mix = brand_info.suggestedMix
        
        # 2. Run the LangGraph Agent
        result = generate_strategy(full_brand_profile, product_brief, suggested_mix=suggested_mix)
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        
        calendar = result.get("content_calendar", [])
        
        # 3. Save to MongoDB
        calendar_entry = {
            "userId": brand_info.userId,
            "posts": calendar,
            "createdAt": datetime.now(),
            "status": "active"
        }
        
        await calendar_collection.insert_one(calendar_entry)
        
        return {
            "userId": brand_info.userId,
            "calendar": calendar
        }
    except Exception as e:
        print(f"Error in strategy generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-mix")
async def api_predict_mix(payload: Dict[str, Any]):
    try:
        brand_data = payload.get('brand_info', payload)
        brand_name = brand_data.get('brandName', 'Unknown')
        print(f"DEBUG: Predicting mix for {brand_name}")
        result = predict_brand_mix(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-plan")
async def api_generate_plan(payload: Dict[str, Any]):
    try:
        brand_data = payload.get('brand_info', payload)
        brand_name = brand_data.get('brandName', 'Unknown')
        print(f"DEBUG: Generating 7-day plan for {brand_name}")
        result = generate_weekly_plan(payload)
        return {
            "plan": result.get("plan", []),
            "prompts": result.get("prompts", []),
            "count": len(result.get("plan", []))
        }
    except Exception as e:
        print(f"Error in plan generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-captions")
async def api_generate_captions(payload: Dict[str, Any]):
    try:
        brand_name = payload.get('brandName', 'Unknown')
        print(f"DEBUG: Generating captions for {brand_name}")
        result = generate_captions_and_hashtags(payload)
        return {
            "captions": result.get("captions", []),
            "prompts": result.get("prompts", []),
            "count": len(result.get("captions", []))
        }
    except Exception as e:
        print(f"Error in caption generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate-post")
async def api_validate_post(
    files: List[UploadFile] = File(...),
    userId: str = Form(...),
    contentType: str = Form(...),
    description: str = Form(...)
):
    try:
        # 1. Save uploaded files locally
        media_paths = []
        upload_dir = "uploaded_posts"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            media_path = f"{upload_dir}/{userId}_{timestamp}{ext}"
            with open(media_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)
            media_paths.append(media_path)

        # 2. Fetch brand profile (searching by both ID types)
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId)},
                {"user": ObjectId(userId)}
            ]
        })
        loc = brand_doc.get("location", {}) if brand_doc else {}
        location_str = f"{loc.get('city', '')}, {loc.get('country', '')}".strip(", ") or "Global"
        
        brand_profile = {
            "brandName": brand_doc.get("brandName", "") if brand_doc else "",
            "businessCategory": brand_doc.get("businessCategory", "") if brand_doc else "",
            "mainGoal": brand_doc.get("mainGoal", "") if brand_doc else "",
            "brandTone": brand_doc.get("brandTone", "Professional & Engaging") if brand_doc else "",
            "targetAudience": ", ".join(brand_doc.get("targetAudiences", [])) if brand_doc else "General",
            "usp": brand_doc.get("usp", "") if brand_doc else "",
            "primaryCTA": brand_doc.get("primaryCTA", "") if brand_doc else "",
            "businessLocation": location_str,
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
        }

        # 3. Retrieve 'Winner's Circle' posts from Vector Search
        winner_posts = await find_similar_posts(description, userId)

        # 4. Run Velocity Optimizer Flow
        result = optimize_post({
            "userId": userId,
            "mediaPaths": media_paths,
            "contentType": contentType,
            "description": description,
            "brandProfile": brand_profile,
            "winnerPosts": winner_posts
        })

        # 5. Save to MongoDB and return
        analysis_entry = {
            "userId": ObjectId(userId),
            "mediaUrl": media_paths[0] if media_paths else "",
            "mediaUrls": media_paths,
            "contentType": contentType,
            "description": description,
            "growthFactor": result.get("growth_factor", 0),
            "analysis": result.get("critique", {}),
            "bestPostingTime": result.get("best_posting_time", ""),
            "suggestions": result.get("suggestions", []),
            "status": "analyzed",
            "createdAt": datetime.now()
        }
        insert_result = await db["post_analyses"].insert_one(analysis_entry)

        return {
            "analysisId": str(insert_result.inserted_id),
            "growthFactor": result.get("growth_factor", 0),
            "critique": result.get("critique", {}),
            "bestPostingTime": result.get("best_posting_time", ""),
            "suggestions": result.get("suggestions", []),
            "mediaPaths": media_paths
        }
    except Exception as e:
        print(f"Validate Post Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule-post/{analysis_id}")
async def api_schedule_post(analysis_id: str, request: Request):
    """Triggers auto-publish for a previously analyzed post."""
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        body = await request.json()
        platforms = body.get("platforms", {"instagram": True, "facebook": False})
        scheduled_at = body.get("scheduledAt") # New: respect manual adjustments
        
        doc = await db["post_analyses"].find_one({"_id": ObjectId(analysis_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Fetch brand profile for credentials
        brand_doc = await db["brandprofiles"].find_one({"user": ObjectId(doc["userId"])})
        brand_profile = {
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
            "instagramPageId": brand_doc.get("instagramPageId", "") if brand_doc else "",
            "instagramPageAccessToken": brand_doc.get("instagramPageAccessToken", "") if brand_doc else "",
        }

        # Build state for publisher
        post_state = {
            "user_id": doc["userId"],
            "media_paths": doc.get("mediaUrls", [doc.get("mediaUrl")]),
            "content_type": doc["contentType"],
            "description": doc["description"],
            "brand_profile": brand_profile,
            "account_insights": {},
            "winner_posts": [],
            "critique": doc.get("analysis", {}),
            "growth_factor": doc.get("growthFactor", 0),
            "best_posting_time": scheduled_at or doc.get("bestPostingTime", ""),
            "suggestions": doc.get("suggestions", []),
            "media_analysis": "",
            "iteration": 0,
            "error": "",
            "platforms": platforms
        }

        result = publisher_node(post_state)

        status = "failed" if result.get("error") else "published"
        update_fields = {
            "status": status,
            "isAgentAssisted": True
        }
        if result.get("ig_media_id"):
            update_fields["instagramMediaId"] = result["ig_media_id"]
        if result.get("permanent_url"):
            update_fields["permanentUrl"] = result["permanent_url"]
        
        # Save the actual scheduled time for History grouping
        # If it was published IMMEDIATELY (fallback), we use now. Otherwise use the target time.
        if status == "published" and result.get("permanent_url"):
            update_fields["scheduledAt"] = datetime.now(timezone.utc).isoformat()
        elif post_state.get("best_posting_time"):
            update_fields["scheduledAt"] = post_state["best_posting_time"]
        else:
            update_fields["scheduledAt"] = datetime.now(timezone.utc).isoformat()

        await db["post_analyses"].update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": update_fields}
        )

        return {"status": status, "error": result.get("error", "")}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/direct-publish")
async def api_direct_publish(
    files: List[UploadFile] = File(...),
    userId: str = Form(...),
    contentType: str = Form(...),
    description: str = Form(...),
    platforms: str = Form(...),
    scheduledAt: Optional[str] = Form(None)
):
    """Bypasses optimization and publishes content directly."""
    import json
    from bson import ObjectId
    try:
        # 1. Parse platforms JSON string
        try:
            platforms_dict = json.loads(platforms)
        except:
            platforms_dict = {"instagram": True, "facebook": False}

        # 2. Save uploaded files locally
        media_paths = []
        upload_dir = "uploaded_posts"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            media_path = f"{upload_dir}/{userId}_{timestamp}{ext}"
            with open(media_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)
            media_paths.append(media_path)

        # 3. Fetch brand profile for credentials
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId)},
                {"user": ObjectId(userId)}
            ]
        })
        brand_profile = {
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
            "instagramPageId": brand_doc.get("instagramPageId", "") if brand_doc else "",
            "instagramPageAccessToken": brand_doc.get("instagramPageAccessToken", "") if brand_doc else "",
        }

        # 4. Build state for publisher (Minimum state needed)
        post_state = {
            "user_id": userId,
            "media_paths": media_paths,
            "content_type": contentType,
            "description": description,
            "brand_profile": brand_profile,
            "account_insights": {},
            "winner_posts": [],
            "critique": {"improved_hook": description, "hashtags": []}, # No AI changes
            "growth_factor": 0,
            "best_posting_time": scheduledAt,
            "suggestions": [],
            "media_analysis": "Direct Publish",
            "iteration": 0,
            "error": "",
            "platforms": platforms_dict
        }

        # 5. Run Publisher directly
        result = publisher_node(post_state)

        status = "failed" if result.get("error") else "published"
        
        # 6. Save to history (post_analyses)
        analysis_entry = {
            "userId": ObjectId(userId),
            "mediaUrl": media_paths[0] if media_paths else "",
            "mediaUrls": media_paths,
            "contentType": contentType,
            "description": description,
            "growthFactor": 0,
            "analysis": post_state["critique"],
            "bestPostingTime": scheduledAt or datetime.now(timezone.utc).isoformat(),
            "scheduledAt": scheduledAt or datetime.now(timezone.utc).isoformat(),
            "suggestions": [],
            "status": status,
            "isAgentAssisted": False, # Flag as direct
            "createdAt": datetime.now(),
            "platforms": platforms_dict
        }
        
        if result.get("ig_media_id"):
            analysis_entry["instagramMediaId"] = result["ig_media_id"]
        if result.get("permanent_url"):
            analysis_entry["permanentUrl"] = result["permanent_url"]

        await db["post_analyses"].insert_one(analysis_entry)

        return {"status": status, "error": result.get("error", "")}
    except Exception as e:
        print(f"Direct Publish Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class VisualGenRequest(BaseModel):
    prompt: str
    format: str
    slides: Optional[int] = 2
    image: Optional[str] = None
    slide_prompts: Optional[List[str]] = None
    category: Optional[str] = "Lifestyle/Luxury"
    headline: Optional[str] = "Viral Content"
    userId: Optional[str] = None

async def refine_image_prompt(brand_dna: str, user_desc: str, headline: str, category: str, prev_slide_context: Optional[str] = None):
    """
    The 'Refiner Agent' System Instruction implementation.
    Transforms raw input into a professional, high-fidelity image prompt.
    """
    system_instruction = f"""
Role: You are an expert AI Prompt Architect for Nano Banana 2 (Gemini 3.1 Flash Image). Your task is to transform raw user input into a professional, high-fidelity image prompt.

Judging Criteria & Decision Tree:
Analyze the USER_INPUT and apply the following logic:

IF Category is "Lifestyle/Luxury" (Jewelry, Cosmetics, F&B):
Focus: Aesthetic elegance and texture.
Mandatory: Soft cinematic studio lighting, 85mm f/1.8 lens for shallow depth of field, premium materials (marble, velvet, silk), and warm or jewel-tone palettes.
Rule: Product must be the hero, centered with soft-focus bokeh.

IF Category is "Startups/Tech" (SaaS, Apps, AaaS):
Focus: Trust, clarity, and realism.
Mandatory: Natural daylight, clean white spaces (minimalism), real-world environments (wood desks, plants).
Strict Rule: Even if "iPhone" or "MacBook" is mentioned, generate it in a natural, bright environment—NEVER use dark "gaming" studios or glowing neon desk setups unless explicitly requested.

IF Category is "Advertising Poster/Sale":
Focus: Bold hierarchy and readability.
Mandatory: 4:5 aspect ratio, high-contrast colors, clear separation between the background and the text overlay area. Use "Graphic Design" keywords like 'bold Swiss-style layout' or 'modern sans-serif typography'.

IF Category is "Carousel Slide":
Focus: Perfect symmetry and safe zones for Instagram UI.
Layout Rule: Split the composition into three horizontal bands.
Top 20%: Reserved for the Headline.
Center 60%: Reserved for the primary Product/Subject.
Bottom 20%: Reserved for the CTA/Subtext.
Mandatory: Explicitly mention "Clean minimal layout, 4:5 aspect ratio."
Visual Rule: Ensure the background (e.g., gradient) is seamless so it connects visually if the user generates multiple slides. 

Memory Rule: If 'Previous Slide Context' is provided, maintain 100% visual consistency with it (lighting, background, material physics) while only changing the primary subject/action.

Global Rules (Apply to all):
- ZERO LABEL POLICY: Strictly DO NOT include keywords like "HEADLINE:", "SUBTEXT:", or "TEXT:" in your output. Only provide the raw copy.
- NO HEX CODES: You are provided with hex codes (e.g., #2563EB) only for your internal aesthetic understanding. STRICTLY DO NOT write or render these hex strings anywhere in the final image or prompt text. Instead, describe them as words (e.g., "Corporate Blue" or "Soft Light Blue").
- NO BRACKETS: Strictly DO NOT use square brackets [ or ] in the text.
- TEXT VISIBILITY: Ensure the text color provides maximum contrast against the background elements.
- CONTENT SPECIFIC RULES:
  * For "Static Image": ALWAYS set TEXT OVERLAY to "STRICTLY NO TEXT. THE IMAGE MUST BE PURE PHOTOGRAPHY WITH NO LETTERS, LOGOS, OR CHARACTERS."
  * For "Carousel Slide": The TEXT OVERLAY must ONLY contain the raw creative copy for that slide. Each slide MUST have a unique headline/subtext that progresses the narrative.

Output Format (Example):
"A bright modern tech-lab with soft blue lighting. A technician is focused on a intricate repair. The main headline 'FAST REPAIR' is visible in a bold white sans-serif font at the top. Directly underneath it, the smaller subtext 'Quality you can count on' is layered in a clean readable font. Shot on 35mm, ISO 100."

[ENSURE NO BRACKETS, NO LABELS, NO REPETITION, MUST INCLUDE UNIQUE SUBTEXT]

Input Data:
Brand DNA: {brand_dna}
Slide Strategic Context: {user_desc}
Category: {category}
Previous Slide Context: {prev_slide_context if prev_slide_context else "None (This is the first slide)"}

Output Guidelines:
Return ONLY the raw cinematic prompt. DO NOT include meta-labels. 
Example of what NOT to do: "Headline: Hello". 
Example of what TO DO: "A bright office. A person typing. The text 'UPGRADE NOW' in bold white."
"""
    try:
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        # Using gemini-2.0-flash as the "Refiner Agent" (Nano Banana 2)
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content(system_instruction)
        refined_prompt = response.text.strip()
        
        # Enforce max character limit
        if len(refined_prompt) > 1200:
            refined_prompt = refined_prompt[:1197] + "..."
            
        return refined_prompt
    except Exception as e:
        print(f"Refiner Agent Error: {str(e)}")
        return user_desc # Fallback to original description

@app.post("/generate-visuals")
async def api_generate_visuals(request: VisualGenRequest):
    try:
        # Step 0: Fetch Brand DNA if possible
        brand_dna = "A premium growth-focused brand."
        if request.userId:
            brand_doc = await db["brandprofiles"].find_one({
                "$or": [
                    {"_id": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId},
                    {"user": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId}
                ]
            })
            if brand_doc:
                brand_dna = f"""
                Brand: {brand_doc.get('brandName')}
                Goal: {brand_doc.get('mainGoal')}
                Category: {brand_doc.get('businessCategory')}
                Tone: {brand_doc.get('brandTone')}
                Vibe: {brand_doc.get('visualVibe')}
                USP: {brand_doc.get('usp')}
                Pain Point: {brand_doc.get('painPoint')}
                Target: {", ".join(brand_doc.get('targetAudiences', []))}
                Primary Color: {brand_doc.get('primaryColor')}
                Secondary Color: {brand_doc.get('secondaryColor')}
                """

        # Step 1: Refine the prompt
        # Determine category for refiner (Carousel Slide vs others)
        refiner_category = request.category
        if request.format == "Carousel":
            refiner_category = "Carousel Slide"
            
        refined_prompt = await refine_image_prompt(
            brand_dna=brand_dna,
            user_desc=request.prompt,
            headline=request.headline,
            category=refiner_category
        )
        
        print(f"\n--- REFINED IMAGE PROMPT ---\n{refined_prompt}\n--------------------------\n")
        
        type_str = ""
        result = None
        
        if request.format == "Static Image":
            result = generate_google_image(refined_prompt, image=request.image)
            type_str = "image"
            # Normalize result for the response handling below
            result = {"image": result["image"]}
        elif request.format == "Carousel":
            # HARD CAP: Strictly limit to 2 slides to save credits, even if the request asks for more.
            requested_count = request.slides if request.slides else 2
            count = min(requested_count, 2)
            # For carousels, refine each slide with memory of the previous one
            slides_results = []
            current_context = ""
            
            # Start with the base prompt as context if needed
            initial_desc = request.prompt
            
            prompts_to_refine = request.slide_prompts if request.slide_prompts else [f"Slide {i+1} for {request.prompt}" for i in range(count)]
            
            for i, sp in enumerate(prompts_to_refine):
                refined_slide = await refine_image_prompt(
                    brand_dna=brand_dna,
                    user_desc=sp,
                    headline=request.headline,
                    category="Carousel Slide",
                    prev_slide_context=current_context if i > 0 else None
                )
                print(f"DEBUG: Carousel Slide {i+1} Refined Prompt:\n{refined_slide}\n")
                slides_results.append(refined_slide)
                current_context = refined_slide # Memory: pass this slide's details to the next one
            
            # For the main result, we use the first slide's refined prompt
            refined_prompt = slides_results[0]
            result = generate_carousel_images(refined_prompt, image=request.image, count=count, slide_prompts=slides_results)
            type_str = "carousel"
        elif request.format == "Reel":
            result = mock_video_gen(refined_prompt)
            type_str = "video"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")

        # Step 2: Dynamic Visual Critic (G-Factor)
        # We audit the refined prompt's "G-Factor"
        critic_prompt = f"""
        Analyze this AI content prompt for its technical and strategic Viral Potential (G-Factor).
        FORMAT: {request.format}
        PROMPT: {refined_prompt}
        
        Score from 8.5 to 10.0 based on composition, lighting depth, and brand resonance.
        Return ONLY a number (e.g. 9.6).
        """
        
        print(f"\n--- FULL CRITIC PROMPT ---\n{critic_prompt}\n--------------------------\n")
        print("CRITIC DEBUG: Starting Gemini Critic audit (Direct SDK)...")
        
        try:
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
            model = genai.GenerativeModel('gemini-flash-latest')
            response = model.generate_content(critic_prompt)
            
            content = response.text.strip()
            print(f"CRITIC DEBUG: Gemini Response: {content}")
            
            # Extract number using regex (e.g. 9.4)
            match = re.search(r"(\d+\.\d+|\d+)", content)
            if match:
                g_score = float(match.group(1))
            else:
                print("CRITIC DEBUG: No score found in response, using fallback.")
                g_score = 9.2
        except Exception as critic_err:
            print(f"CRITIC DEBUG: Critical Gemini Failure: {str(critic_err)}")
            # Diagnostics: List available models to solve the 404 once and for all
            try:
                print("--- DIAGNOSTIC: Available Models ---")
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        print(f"MODEL: {m.name}")
            except:
                pass
            g_score = 9.2 
            
        return {
            "status": "success", 
            "type": type_str, 
            "data": result,
            "g_score": g_score,
            "verdict": "Neural-Approved" if g_score > 9 else "Optimized"
        }
            
    except Exception as e:
        print(f"Visual Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# --- PERFORMANCE AUDITOR ---
@app.post("/audit-performance", response_model=AuditorResponse)
async def api_audit_performance(input_data: AuditorInput):
    """
    The 'Velocity Pulse' Auditor endpoint.
    Analyzes historical Meta metrics and predicts the optimal Content Mix.
    """
    try:
        auditor = MetaAuditor()
        result = await auditor.audit_and_align(input_data)
        return result
    except Exception as e:
        print(f"Audit Route Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ads-recommendations")
async def ads_recommendations(request: Request):
    try:
        data = await request.json()
        brand_profile = data.get("brand_profile")
        posts = data.get("posts", [])
        
        if not brand_profile:
            return {"error": "Missing brand_profile"}
        
        print(f"DEBUG: Analyzing {len(posts)} posts for ad recommendations...")
        recommendations = get_ads_recommendations(brand_profile, posts)
        return {"recommendations": recommendations}
    except Exception as e:
        print(f"Ads Agent Route Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
