# test_scrape.py
import asyncio
from main import api_scrape_single_product, ScrapeRequest

async def test():
    req = ScrapeRequest(url="https://aws.amazon.com/")
    print("Testing scrape...")
    res = await api_scrape_single_product(req)
    print("Result keys:", res.keys())
    print("Name:", res.get("name"))
    print("Provider:", res.get("serviceProvider"))
    img_b64 = res.get("imageBase64")
    print("Image length:", len(img_b64) if img_b64 else 0)
    print("Image prefix:", img_b64[:100] if img_b64 else "None")

asyncio.run(test())
