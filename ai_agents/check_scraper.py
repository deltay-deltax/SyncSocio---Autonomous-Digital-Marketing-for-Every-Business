import asyncio
from main import extract_images_from_html
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        r = await client.get("https://beastlife.in/")
        html = r.text
        images = extract_images_from_html(html, "https://beastlife.in/")
        for img in images:
            if "mega" in img.lower() or "carnitine" in img.lower():
                print(img)

asyncio.run(main())
