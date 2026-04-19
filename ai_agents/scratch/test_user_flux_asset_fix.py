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

def test_flux_asset_list():
    asset_id = upload_asset("source_mouse.png")
    if not asset_id: return

    print("Waiting 15 seconds for NVIDIA to process asset...")
    time.sleep(15)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Trying with image as a STRING first, but with the exact template from the user
    # "data:image/png;example_id,0" suggests 0 is the index or something.
    # But usually it's the ID.
    
    # Let's try what worked in test_flux_real_asset.py (which was a list)
    payload = {
        "prompt": "Now the mouse is holding pizza instead",
        "image": f"data:image/png;example_id,{asset_id}",
        "aspect_ratio": "1:1",
        "steps": 30,
        "cfg_scale": 3.5,
        "seed": 0
    }

    print(f"Invoking {invoke_url} (String payload)...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status (String): {response.status_code}")
    if response.status_code != 200:
        print(f"String Response: {response.text}")
        
    # Now try as a LIST 
    payload["image"] = [f"data:image/png;example_id,{asset_id}"]
    print(f"Invoking {invoke_url} (List payload)...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status (List): {response.status_code}")
    if response.status_code == 200:
        print("Success with List!")
        save_image(response.json(), "output_asset_list.png")
    else:
        print(f"List Response: {response.text}")

def save_image(response_body, filename):
    if "image" in response_body:
        img_data = response_body["image"]
        if img_data.startswith("data:image"):
            base64_str = img_data.split(",")[1]
            with open(filename, "wb") as f:
                f.write(base64.b64decode(base64_str))
            print(f"Output saved to {filename}")

if __name__ == "__main__":
    test_flux_asset_list()
