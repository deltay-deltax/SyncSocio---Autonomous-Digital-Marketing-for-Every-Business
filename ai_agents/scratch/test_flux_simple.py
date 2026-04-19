import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def test_flux_simple():
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "prompt": "a simple red circle on a white background",
        "width": 1024,
        "height": 1024,
        "seed": 0,
        "steps": 1
    }
    
    print("Testing basic T2I...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")

if __name__ == "__main__":
    test_flux_simple()
