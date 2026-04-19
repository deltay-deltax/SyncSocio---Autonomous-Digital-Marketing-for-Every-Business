import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def test_flux_image_url():
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    # Use a public image URL (placeholder)
    img_url = "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=1024"
    
    formats = [
        {"image": img_url},
        {"image": [img_url]},
    ]
    
    for payload_part in formats:
        payload = {
            "prompt": "a macro wildlife photo of a frog, based on the composition of the provided image",
            "width": 1024,
            "height": 1024,
            "seed": 0,
            "steps": 1,
            **payload_part
        }
        
        print(f"Testing with payload part: {list(payload_part.keys())} as {type(payload_part['image'])}")
        response = requests.post(invoke_url, headers=headers, json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")

if __name__ == "__main__":
    test_flux_image_url()
