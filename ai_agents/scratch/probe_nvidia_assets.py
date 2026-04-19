import os
import requests
from dotenv import load_dotenv

load_dotenv()

def probe_assets():
    api_key = os.getenv("NVIDIA_API_KEY")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    endpoints = [
        "https://api.nvcf.nvidia.com/v2/nvcf/assets",
        "https://api.nvcf.nvidia.com/v2/assets",
        "https://ai.api.nvidia.com/v1/assets",
        "https://integrate.api.nvidia.com/v1/assets",
    ]
    
    for url in endpoints:
        print(f"Testing {url}...")
        try:
            # Try a POST with empty payload or minimal payload
            response = requests.post(url, headers=headers, json={"contentType": "image/png"})
            print(f"  Result: {response.status_code}")
            if response.status_code == 200:
                print("  FOUND VALID ENDPOINT!")
                print(f"  Response: {response.json()}")
                break
        except Exception as e:
            print(f"  Error: {e}")

if __name__ == "__main__":
    probe_assets()
