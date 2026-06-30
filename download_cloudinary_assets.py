import os
import requests
import cloudinary
import cloudinary.api
from dotenv import load_dotenv

# Load the .env from the backend folder
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

# Verify credentials exist
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

if not all([cloud_name, api_key, api_secret]):
    print("❌ Error: Cloudinary credentials not found in backend/.env!")
    print("Please make sure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.")
    exit(1)

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret
)

def download_all_assets():
    download_dir = os.path.join(os.path.dirname(__file__), 'cloudinary_downloads')
    os.makedirs(download_dir, exist_ok=True)
    
    print(f"Starting download to: {download_dir}")
    
    next_cursor = None
    total_downloaded = 0
    
    while True:
        # Fetch up to 500 video resources from the syncsocio/videos folder
        try:
            res = cloudinary.api.resources(
                resource_type="video",
                type="upload",
                prefix="syncsocio/videos/",
                max_results=500, 
                next_cursor=next_cursor
            )
        except Exception as e:
            print(f"Failed to fetch video resources from Cloudinary: {e}")
            break
            
        resources = res.get('resources', [])
        
        for r in resources:
            url = r['secure_url']
            # Replace slashes with underscores to avoid folder creation issues
            public_id = r['public_id'].replace('/', '_')
            format_type = r.get('format', 'mp4') # Default to mp4 for videos if missing
            
            filename = os.path.join(download_dir, f"{public_id}.{format_type}")
            
            print(f"Downloading Video: {public_id}.{format_type}...")
            try:
                # Videos can be larger, so we stream the download
                response = requests.get(url, stream=True, timeout=60)
                response.raise_for_status()
                
                with open(filename, 'wb') as handler:
                    for chunk in response.iter_content(chunk_size=8192):
                        handler.write(chunk)
                total_downloaded += 1
            except Exception as e:
                print(f"Failed to download video {url}: {e}")
                
        # Handle pagination if there are more than 500 assets
        if 'next_cursor' in res:
            next_cursor = res['next_cursor']
            print("Fetching next page of assets...")
        else:
            break
            
    print(f"\nDone! Successfully downloaded {total_downloaded} assets to the 'cloudinary_downloads' folder.")

if __name__ == "__main__":
    download_all_assets()
