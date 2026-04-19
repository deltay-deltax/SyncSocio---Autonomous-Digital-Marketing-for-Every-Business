import requests
import base64
import os
from PIL import Image
import io

# User provided URL and Key
invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev"
api_key = "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"

def test_flux_base64():
    # 1. Prepare small base64 image
    img = Image.open("source_mouse.png")
    img = img.resize((512, 512)) # Resize to be safe with base64 size
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Trying with direct base64
    payload = {
        "prompt": "Now the mouse is holding pizza instead",
        "image": f"data:image/png;base64,{img_str}",
        "aspect_ratio": "1:1",
        "steps": 30,
        "cfg_scale": 3.5,
        "seed": 0 
    }

    print(f"Invoking {invoke_url} with Base64...")
    response = requests.post(invoke_url, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"Error {response.status_code}: {response.text}")
        # If it failed, let's try the "example_id" way but with a real asset again
        return False

    response_body = response.json()
    print("Success with Base64!")
    save_image(response_body, "output_base64.png")
    return True

def save_image(response_body, filename):
    if "image" in response_body:
        img_data = response_body["image"]
        if img_data.startswith("data:image"):
            base64_str = img_data.split(",")[1]
            with open(filename, "wb") as f:
                f.write(base64.b64decode(base64_str))
            print(f"Output saved to {filename}")
        else:
            print("Response Format Unknown.")

if __name__ == "__main__":
    test_flux_base64()
