import os
import requests
import base64
import io
import json
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

def test_flux_hack():
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    # Create a tiny 1x1 image to minimize payload
    img = Image.new('RGB', (1, 1), color='green')
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    # HACK TEST: Replace 'base64' with 'example_id' in the data URI
    # The error said "Expected: example_id, got: base64"
    # So we give it "example_id" followed by the base64 data
    payload = {
        "prompt": "a macro wildlife photo of a frog",
        "width": 1024,
        "height": 1024,
        "seed": 0,
        "steps": 1,
        "image": [f"data:image/png;example_id,{img_str}"]
    }
    
    print("Testing 'example_id' hack...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")

if __name__ == "__main__":
    test_flux_hack()
