from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class RejectedItem(BaseModel):
    id: str
    prompt: Optional[str] = ""

class BrandInfo(BaseModel):
    userId: str
    brandName: Optional[str] = ""
    businessCategory: Optional[str] = ""
    mainGoal: Optional[str] = ""
    targetAudiences: List[str] = []
    brandTone: Optional[str] = ""
    visualVibe: Optional[str] = ""
    contentMix: Dict[str, int] = {"education": 50, "promotion": 50}
    socialPlatforms: List[str] = []
    primaryColor: Optional[str] = "#2563EB"
    secondaryColor: Optional[str] = "#60A5FA"
    productBrief: Optional[Dict[str, Any]] = {"name": "", "description": "", "category": ""}
    suggestedMix: Optional[Dict[str, Any]] = None
    customInstruction: Optional[str] = ""
    durationWeeks: Optional[int] = 1
    rejectedItems: Optional[List[RejectedItem]] = []
    usp: Optional[str] = ""
    painPoint: Optional[str] = ""
    selectedPlan: Optional[str] = ""

class CalendarItem(BaseModel):
    day: str
    topic: str
    format: str
    content: str
    visual_prompt: Optional[str] = ""
    detailed_visual_description: Optional[str] = ""
    carousel_slides: Optional[int] = 3
    content_hook: Optional[str] = ""
    slides_metadata: Optional[List[Dict[str, Any]]] = []
    product_image_index: Optional[int] = 0

class StrategyResponse(BaseModel):
    userId: str
    calendar: List[CalendarItem]
    status: str = "success"

class StrategyImageRequest(BaseModel):
    userId: str
    layout: str                          # "image" | "carousel" | "video" | "ecomm"
    count: int = 4                       # number of posts / carousels / videos
    slideCount: int = 5                  # slides per carousel (carousel only)
    aspectRatio: str = "1:1"            # "1:1" | "4:5" | "9:16" | "16:9" | "2:3"
    idea: Optional[str] = ""            # user's campaign description
    refImages: Optional[List[str]] = [] # base64 data-URLs or http URLs
    products: Optional[List[Dict[str, Any]]] = []  # product objects
    # E-comm specific fields
    platform: Optional[str] = ""       # "Amazon" | "Flipkart" | "Myntra" | "Nykaa" | "Shopify" | "Meesho"
    ecommCaptions: Optional[List[str]] = []  # per-image captions from frontend (shot type labels)
    # Image ad template: None = auto, 1-10 = specific template, -1 = all 8 variants
    adTemplate: Optional[int] = None
    language: Optional[str] = "english"
    generateImage: Optional[bool] = True
