import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from agents import generate_strategy
from models import BrandInfo, StrategyResponse
from post_validator import validate_post, optimize_post, publisher_node
from vector_utils import find_similar_posts
import shutil

load_dotenv()

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

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now()}

@app.post("/generate-strategy", response_model=StrategyResponse)
async def api_generate_strategy(brand_info: BrandInfo):
    try:
        # 1. Run the LangGraph Agent
        print(f"Generating strategy for user: {brand_info.userId}")
        
        # Destructure to separate productBrief from other brand_info fields
        data = brand_info.dict()
        product_brief = data.pop('productBrief', {"name": "", "description": "", "category": ""})
        
        result = generate_strategy(data, product_brief)
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        
        calendar = result.get("content_calendar", [])
        
        # 2. Save to MongoDB (Insert to keep history)
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
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate-post")
async def api_validate_post(
    file: Optional[UploadFile] = File(None),
    userId: str = Form(...),
    contentType: str = Form(...),
    description: str = Form(...)
):
    try:
        # 1. Save uploaded file locally
        media_path = ""
        if file and file.filename:
            upload_dir = "uploaded_posts"
            os.makedirs(upload_dir, exist_ok=True)
            ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            media_path = f"{upload_dir}/{userId}_{timestamp}{ext}"
            with open(media_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)

        # 2. Fetch brand profile from MongoDB (using ObjectId for correct matching)
        brand_doc = await db["brandprofiles"].find_one({"user": ObjectId(userId)})
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
            "mediaPath": media_path,
            "contentType": contentType,
            "description": description,
            "brandProfile": brand_profile,
            "winnerPosts": winner_posts
        })

        # 5. Save to MongoDB and return
        analysis_entry = {
            "userId": userId,
            "mediaUrl": media_path,
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
            "mediaPath": media_path
        }
    except Exception as e:
        print(f"Validate Post Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule-post/{analysis_id}")
async def api_schedule_post(analysis_id: str):
    """Triggers auto-publish for a previously analyzed post."""
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        doc = await db["post_analyses"].find_one({"_id": ObjectId(analysis_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Fetch brand profile for credentials
        brand_doc = await db["brandprofiles"].find_one({"user": ObjectId(doc["userId"])})
        brand_profile = {
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
        }

        # Build state for publisher
        post_state = {
            "user_id": doc["userId"],
            "media_path": doc["mediaUrl"],
            "content_type": doc["contentType"],
            "description": doc["description"],
            "brand_profile": brand_profile,
            "account_insights": {},
            "winner_posts": [],
            "critique": doc.get("analysis", {}),
            "growth_factor": doc.get("growthFactor", 0),
            "best_posting_time": doc.get("bestPostingTime", ""),
            "suggestions": doc.get("suggestions", []),
            "media_analysis": "",
            "iteration": 0,
            "error": ""
        }

        result = publisher_node(post_state)

        status = "failed" if result.get("error") else "published"
        await db["post_analyses"].update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": {"status": status}}
        )

        return {"status": status, "error": result.get("error", "")}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
