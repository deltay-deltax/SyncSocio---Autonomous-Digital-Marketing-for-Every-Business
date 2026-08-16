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
    brandId: Optional[str] = None
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
    campaignGoal: Optional[str] = "discover"
    campaignAngle: Optional[str] = "auto"
    language: Optional[str] = "english"
    whatsappTemplate: Optional[str] = None
    generateImage: Optional[bool] = True
    videoKind: Optional[str] = "ai-ugc"
    avatarDescription: Optional[str] = ""
    videoScript: Optional[str] = ""
    videoResolution: Optional[str] = "1080p"  # "720p" (80 credits) | "1080p" (100 credits)
    videoDuration: Optional[int] = None
    textMode: Optional[str] = "low"  # "low" = one clean headline, "heavy" = no TEXT DISCIPLINE constraint
    avatarUrl: Optional[str] = ""    # URL to the global avatar image for e-comm consistency
    commentKeyword: Optional[str] = ""

class EditMediaRequest(BaseModel):
    image: str
    instruction: str
    type: str
    aspectRatio: Optional[str] = "1:1"

class RefineCopyRequest(BaseModel):
    userId: str
    subject: str
    body: str
    instruction: str
    layout: str
    language: Optional[str] = "english"

class ProductEditRequest(BaseModel):
    ref_image: str
    prod_image: Optional[str] = ""
    prod_info: Optional[str] = ""
    brand_dna: Optional[str] = ""
    logo_image: Optional[str] = ""
    instruction: str
    aspectRatio: Optional[str] = "1:1"

class AutopilotRequest(BaseModel):
    userId: str
    language: Optional[str] = "english"
    weeks: Optional[int] = 1
    selectedProductIds: Optional[List[str]] = []
    upcomingFestivals: Optional[List[Dict[str, Any]]] = []
