import os
import requests
import base64
import io
import time
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

def upload_asset_correctly(api_key, img_bytes, content_type="image/png"):
    """
    Correctly uploads an asset to NVCF, matching headers for S3 signature.
    """
    assets_url = "https://api.nvcf.nvidia.com/v2/nvcf/assets"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    
    # Use empty description or none to avoid metadata header issues
    payload = {
        "contentType": content_type,
        "description": "FLUX_INPUT"
    }
    
    print(f"Creating asset entry...")
    response = requests.post(assets_url, headers=headers, json=payload)
    if response.status_code != 200:
        print(f"Failed to create asset: {response.status_code} - {response.text}")
        return None
    
    res_data = response.json()
    asset_id = res_data.get("assetId")
    upload_url = res_data.get("uploadUrl")
    
    print(f"Uploading to S3 (Asset ID: {asset_id})...")
    
    # We MUST include the metadata header if we provided it in the POST
    put_headers = {
        "Content-Type": content_type,
        "x-amz-meta-nvcf-asset-description": "FLUX_INPUT"
    }
    
    upload_resp = requests.put(
        upload_url, 
        data=img_bytes, 
        headers=put_headers
    )
    
    if upload_resp.status_code in [200, 201, 202]:
        print("Upload successful.")
        return asset_id
    else:
        print(f"Upload failed: {upload_resp.status_code} - {upload_resp.text}")
        return None

def test_flux_real_asset():
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    # Create a small but valid FLUX image
    img = Image.new('RGB', (1024, 1024), color='purple')
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_bytes = buffered.getvalue()
    
    asset_id = upload_asset_correctly(api_key, img_bytes)
    if not asset_id: return

    print("Wait 5 seconds for asset processing on NVIDIA side...")
    time.sleep(5)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # The error was "Expected: example_id". 
    # However, in some docs it is "asset_id". We will try example_id first.
    payload = {
        "prompt": "a macro wildlife photo of a purple frog in a rainforest pond",
        "width": 1024,
        "height": 1024,
        "seed": 0,
        "steps": 4,
        # Based on my hack test (500 error), 'example_id' keyword passed validation.
        "image": [f"data:image/png;example_id,{asset_id}"]
    }

    print("Requesting FLUX with Asset...")
    response = requests.post(invoke_url, headers=headers, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_flux_real_asset()
