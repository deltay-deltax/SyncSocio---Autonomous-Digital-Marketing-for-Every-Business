import os
import requests
import base64
import io
import time
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

def upload_asset_to_nvcf(api_key, img_bytes, content_type="image/png"):
    """
    Step-by-step upload to NVCF Assets API.
    """
    assets_url = "https://api.nvcf.nvidia.com/v2/nvcf/assets"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    
    payload = {
        "contentType": content_type,
        "description": "Test Image for FLUX"
    }
    
    print(f"1. Creating asset entry at {assets_url}...")
    try:
        response = requests.post(assets_url, headers=headers, json=payload)
        if response.status_code != 200:
            print(f"   Failed to create asset: {response.status_code} - {response.text}")
            return None
        
        res_data = response.json()
        asset_id = res_data.get("assetId")
        upload_url = res_data.get("uploadUrl")
        
        print(f"2. Asset ID: {asset_id}")
        print(f"   Uploading binary data to pre-signed URL...")
        
        upload_resp = requests.put(
            upload_url, 
            data=img_bytes, 
            headers={"Content-Type": content_type}
        )
        
        if upload_resp.status_code in [200, 201, 202]:
            print("3. Upload successful.")
            return asset_id
        else:
            print(f"   Upload failed: {upload_resp.status_code} - {upload_resp.text}")
            return None
    except Exception as e:
        print(f"   Exception during upload: {str(e)}")
        return None

def test_flux_final():
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    if not api_key:
        print("Error: NVIDIA_API_KEY not found")
        return

    # Create a small dummy image
    img = Image.new('RGB', (1024, 1024), color='red')
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_bytes = buffered.getvalue()
    
    print("--- Starting Asset Workflow ---")
    asset_id = upload_asset_to_nvcf(api_key, img_bytes)
    
    if not asset_id:
        print("Asset upload failed.")
        return

    print("Wait 3 seconds for replication...")
    time.sleep(3)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    prompt = "a macro wildlife photo of a red frog in a rainforest pond, highly detailed, eye-level shot"
    
    # We will try both example_id (from error) and asset_id (standard)
    # The user's snippet used example_id, so we try that FIRST.
    payload = {
        "prompt": prompt,
        "width": 1024,
        "height": 1024,
        "seed": 0,
        "steps": 4,
        "image": [f"data:image/png;example_id,{asset_id}"]
    }

    print(f"\n--- Calling FLUX with asset_id: {asset_id} ---")
    try:
        response = requests.post(invoke_url, headers=headers, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS!")
            res_data = response.json()
            if "artifacts" in res_data:
                b64 = res_data["artifacts"][0]["base64"]
                with open("flux_asset_result.png", "wb") as f:
                    f.write(base64.b64decode(b64))
                print("Result saved to flux_asset_result.png")
        else:
            print(f"FAILED: {response.text}")
            
            # If example_id fails with a different error, try asset_id
            if "example_id" in response.text:
                print("Retrying with asset_id keyword...")
                payload["image"] = [f"data:image/png;asset_id,{asset_id}"]
                response = requests.post(invoke_url, headers=headers, json=payload)
                print(f"Status (retry): {response.status_code}")
                print(f"Response (retry): {response.text}")

    except Exception as e:
        print(f"EXCEPTION: {str(e)}")

if __name__ == "__main__":
    test_flux_final()
