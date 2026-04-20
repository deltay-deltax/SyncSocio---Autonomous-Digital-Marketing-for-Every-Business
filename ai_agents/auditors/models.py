from pydantic import BaseModel
from typing import List, Optional, Dict

class PostMetric(BaseModel):
    post_id: str
    type: str # Reel, Static, Carousel
    reach: int
    likes: int
    comments: int
    saves: int
    engagement_rate: float
    timestamp: str

class AuditorInput(BaseModel):
    userId: str
    brandName: str
    businessCategory: str
    historical_posts: List[PostMetric]
    current_mix: Dict[str, float] # e.g. {"reels": 30.0, "static": 50.0, "carousel": 20.0}

class AuditorResponse(BaseModel):
    predicted_mix: Dict[str, float]
    recommendation: str
    efficiency_score: float # 0.0 to 1.0 (how well the current mix performs)
    top_performer_type: str
    g_score: float
