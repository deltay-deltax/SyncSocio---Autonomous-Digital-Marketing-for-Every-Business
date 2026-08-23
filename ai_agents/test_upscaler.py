import os
import fal_client
from dotenv import load_dotenv

load_dotenv()

def test_upscaler():
    test_url = "https://picsum.photos/1024"
    print("Testing Aura-SR with scale 2...")
    try:
        result = fal_client.subscribe(
            "fal-ai/aura-sr",
            arguments={"image_url": test_url}
        )
        print("Aura-SR Default Success!")
        print(result)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upscaler()
