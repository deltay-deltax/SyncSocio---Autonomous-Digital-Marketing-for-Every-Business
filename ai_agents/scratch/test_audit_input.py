from pydantic import ValidationError
from auditors.models import AuditorInput

data = {
  "userId": "6a2a8ed941e8d3b006e0ce64",
  "brandName": "WeFix",
  "businessCategory": "SaaS & Digital",
  "historical_posts": [
    {
      "post_id": "123",
      "type": "Static",
      "reach": 100,
      "likes": 5,
      "comments": 2,
      "saves": 1,
      "engagement_rate": "NaN",
      "timestamp": "2026-06-19T00:00:00"
    }
  ],
  "current_mix": { "education": 80, "promotion": 20 }
}

try:
    obj = AuditorInput(**data)
    print("Success:", obj)
except ValidationError as e:
    print("Error:")
    print(e)
