import asyncio
from main import api_scrape_brand_profile
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv("../backend/.env")

class ScrapeRequest(BaseModel):
    url: str
    businessCategory: str = None

async def run():
    req = ScrapeRequest(url="https://one8.com")
    try:
        print("Starting scrape for one8.com...")
        result = await api_scrape_brand_profile(req)
        print("Success! Products extracted:")
        for p in result.get("products", []):
            print(f"- {p.get('name')}")
            if "image" in p and p["image"]:
                print(f"  Image: {p['image'][:50]}...")
            elif "imageBase64" in p and p["imageBase64"]:
                print(f"  ImageBase64: {p['imageBase64'][:50]}...")
            else:
                print("  No image!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(run())
