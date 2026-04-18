from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

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
    productBrief: Optional[Dict[str, str]] = {"name": "", "description": "", "category": ""}
    suggestedMix: Optional[Dict[str, Any]] = None

class CalendarItem(BaseModel):
    day: str
    topic: str
    format: str
    content: str

class StrategyResponse(BaseModel):
    userId: str
    calendar: List[CalendarItem]
    status: str = "success"
