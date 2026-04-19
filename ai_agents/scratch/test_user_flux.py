import requests
import base64
import os
import time

# User provided URL and Key
invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev"
api_key = "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"

def upload_asset(img_path):
    assets_url = "https://api.nvcf.nvidia.com/v2/nvcf/assets"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    
    payload = {
        "contentType": "image/png",
        "description": "source_mouse"
    }
    
    print(f"Creating asset entry for {img_path}...")
    response = requests.post(assets_url, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Failed to create asset: {response.status_code} - {response.text}")
        return None
    
    res_data = response.json()
    asset_id = res_data.get("assetId")
    upload_url = res_data.get("uploadUrl")
    
    with open(img_path, "rb") as f:
        img_bytes = f.read()

    print(f"Uploading to S3 (Asset ID: {asset_id})...")
    put_headers = {
        "Content-Type": "image/png",
        "x-amz-meta-nvcf-asset-description": "source_mouse"
    }
    
    upload_resp = requests.put(upload_url, data=img_bytes, headers=put_headers)
    
    if upload_resp.status_code in [200, 201, 202]:
        print("Upload successful.")
        return asset_id
    else:
        print(f"Upload failed: {upload_resp.status_code} - {upload_resp.text}")
        return None

def test_flux_model():
    # 1. Upload the mouse image as an asset
    asset_id = upload_asset("source_mouse.png")
    if not asset_id:
        print("Aborting: Asset upload failed.")
        return

    # Wait for asset to be processed
    print("Waiting 10 seconds for NVIDIA to process asset...")
    time.sleep(10)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    # Based on user's hint and test_flux_real_asset.py logic
    payload = {
        "prompt": "Now the mouse is holding pizza instead",
        "image": f"data:image/png;example_id,{asset_id}",
        "aspect_ratio": "1:1",
        "steps": 30,
        "cfg_scale": 3.5,
        "seed": 0
    }

    print(f"Invoking {invoke_url}...")
    response = requests.post(invoke_url, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"Error {response.status_code}: {response.text}")
        return

    response_body = response.json()
    print("Generation Success!")
    
    # Save the output image
    if "image" in response_body:
        img_data = response_body["image"]
        # If it's base64, usually starts with data:image/png;base64,
        if img_data.startswith("data:image"):
            base64_str = img_data.split(",")[1]
            with open("output_mouse_pizza.png", "wb") as f:
                f.write(base64.b64decode(base64_str))
            print("Output saved to output_mouse_pizza.png")
        else:
            print("Response Format Unknown (not base64 data URI). Full response:")
            print(response_body)
    else:
        print("No image in response. Response body:")
        print(response_body)

if __name__ == "__main__":
    test_flux_model()
