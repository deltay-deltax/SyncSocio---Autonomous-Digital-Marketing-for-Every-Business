import os, time
import requests
import json
import base64
from typing import List, Dict, Any

def generate_nvidia_image(prompt: str, image: str = None, width: int = 1024, height: int = 1024):
    """
    Generates a single image using NVIDIA's FLUX.1-dev model.
    Supports image-to-image/reference if 'image' is provided as a base64 string.
    """
    invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev"
    api_key = os.getenv("NVIDIA_API_KEY")
    
    if not api_key:
        raise ValueError("NVIDIA_API_KEY not found in environment")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }

    # NVIDIA NIM for FLUX has a strict 800 character limit for prompts
    safe_prompt = prompt[:795] if len(prompt) > 800 else prompt

    payload = {
        "prompt": safe_prompt,
        "mode": "base",
        "cfg_scale": 3.5,
        "width": width,
        "height": height,
        "seed": 0,
        "steps": 50 
    }

    try:
        if image:
            # Attempt I2I with the most standard NIM format for managed services
            raw_b64 = image
            if "," in image:
                raw_b64 = image.split(",")[1]
            
            payload = {
                "prompt": safe_prompt,
                "mode": "base",
                "cfg_scale": 3.5,
                "width": width,
                "height": height,
                "seed": 0,
                "steps": 50,
                "image": [f"data:image/png;base64,{raw_b64}"]
            }
            print(f"NVIDIA Engine: Trying I2I-JSON for prompt: {prompt[:50]}...")
            response = requests.post(invoke_url, headers=headers, json=payload)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"NVIDIA I2I Failed ({response.status_code}): {response.text}. Falling back to T2I...")
        
        # Fallback / Default T2I with Retries
        # payload is already set above for T2I
        
        for attempt in range(3):
            try:
                print(f"NVIDIA Engine: Generating T2I-JSON (Attempt {attempt+1}) for prompt length: {len(safe_prompt)}")
                response = requests.post(invoke_url, headers=headers, json=payload, timeout=50) # Increased timeout for more steps
                response.raise_for_status()
                
                res_data = response.json()
                print(f"NVIDIA Response Keys: {list(res_data.keys())}")
                
                # Normalize response for frontend
                if "artifacts" in res_data and len(res_data["artifacts"]) > 0:
                    res_data["image"] = res_data["artifacts"][0].get("base64")
                
                return res_data
            except Exception as e:
                print(f"NVIDIA Attempt {attempt+1} failed: {str(e)}")
                if attempt < 2:
                    time.sleep(2 * (attempt + 1)) # Exponential backoff
                else:
                    raise e
        
    except Exception as e:
        print(f"NVIDIA Critical Error: {str(e)}")
        raise e
    
    if response.status_code != 200:
        print(f"NVIDIA Error: {response.text}")
        response.raise_for_status()
        
    return response.json()

def generate_carousel_images(base_prompt: str, image: str = None, count: int = 3, slide_prompts: List[str] = None):
    """
    Generates multiple images for a carousel.
    If slide_prompts is provided, it uses each prompt specifically.
    """
    results = []
    for i in range(count):
        if slide_prompts and i < len(slide_prompts):
            slide_prompt = slide_prompts[i]
        else:
            slide_prompt = f"{base_prompt}, slide {i+1} of a visual sequence, consistent style"
            
        img_data = generate_nvidia_image(slide_prompt, image=image)
        results.append(img_data)
        
    return results

def mock_video_gen(prompt: str):
    """
    Mock for video generation as requested.
    """
    return {
        "status": "mock_success",
        "message": "Video generation is currently in preview. Mocking output.",
        "url": "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-off-a-blue-dress-4433-large.mp4", # A sample stock fashion video
        "thumbnail": "https://images.unsplash.com/photo-1539109132314-34a9366817f4?auto=format&fit=crop&w=800&q=80"
    }
