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
    payload = {"contentType": "image/png", "description": "source_mouse"}
    response = requests.post(assets_url, headers=headers, json=payload)
    if response.status_code != 200: return None
    res_data = response.json()
    asset_id = res_data.get("assetId")
    upload_url = res_data.get("uploadUrl")
    with open(img_path, "rb") as f:
        img_bytes = f.read()
    put_headers = {"Content-Type": "image/png", "x-amz-meta-nvcf-asset-description": "source_mouse"}
    requests.put(upload_url, data=img_bytes, headers=put_headers)
    return asset_id

def test_flux_asset_final():
    asset_id = upload_asset("source_mouse.png")
    if not asset_id: return

    print(f"Asset ID: {asset_id}")
    print("Waiting 15 seconds...")
    time.sleep(15)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Attempt 1: asset_id keyword + match_input_image
    payload = {
        "prompt": "Now the mouse is holding pizza instead",
        "image": f"data:image/png;asset_id,{asset_id}",
        "aspect_ratio": "match_input_image",
        "steps": 30,
        "cfg_scale": 3.5,
        "seed": 0
    }

    print("Attempt 1: asset_id keyword...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success with asset_id keyword!")
        save_image(response.json(), "output_final_asset.png")
        return

    # Attempt 2: example_id keyword (what user had) + match_input_image
    print("Attempt 2: example_id keyword...")
    payload["image"] = f"data:image/png;example_id,{asset_id}"
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Success with example_id keyword!")
        save_image(response.json(), "output_final_example.png")
    else:
        print(f"Response: {response.text}")

def save_image(response_body, filename):
    if "image" in response_body:
        img_data = response_body["image"]
        if img_data.startswith("data:image"):
            base64_str = img_data.split(",")[1]
            with open(filename, "wb") as f:
                f.write(base64.b64decode(base64_str))
            print(f"Output saved to {filename}")

if __name__ == "__main__":
    test_flux_asset_final()
