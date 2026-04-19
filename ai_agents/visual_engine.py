import os, requests, json, base64
from typing import List, Dict, Any
from google import genai
from google.genai import types

def generate_google_image(prompt: str, image: str = None, aspect_ratio: str = "3:4"):
    """
    Generates a high-fidelity image using Nano Banana 2 (Gemini 3.1 Flash Image).
    Utilizes the multimodal ImageConfig protocol for perfect product anchoring.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment")

    try:
        # Step 1: Initialize SDK Client
        client = genai.Client(api_key=api_key)
        model_id = "gemini-3.1-flash-image-preview"

        # Step 2: Base64 Cleaning (Strip Data URL prefix)
        image_data = image
        if image_data and "base64," in image_data:
            image_data = image_data.split("base64,")[1]

        # Step 3: Build Contents (Images first, then Text for better anchoring)
        contents = []
        if image_data:
            print("GOOGLE ENGINE: Anchoring generation to product reference binary...")
            contents.append(types.Part.from_bytes(
                data=base64.b64decode(image_data),
                mime_type="image/jpeg"
            ))
        contents.append(types.Part.from_text(text=prompt))

        # Step 4: THE SDK CONFIG (As confirmed by official beta specs)
        # We use response_modalities to explicitly tell the model to return an IMAGE.
        print(f"GOOGLE ENGINE (Nano Banana 2): Generating Image via {model_id}...")
        
        response = client.models.generate_content(
            model=model_id,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size="2K"
                )
            )
        )

        # Step 5: Extract and Base64 Encode the Pixel Data
        # The SDK returns raw binary (bytes), which FastAPI cannot serialize as JSON.
        if response.candidates:
            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    raw_bytes = part.inline_data.data
                    # Convert raw bytes to a standard Base64 string for the web frontend
                    b64_image = base64.b64encode(raw_bytes).decode('utf-8')
                    return {"image": b64_image, "status": "success"}
        
        raise Exception("No pixel data found in model response parts.")

    except Exception as e:
        print(f"GOOGLE CRITICAL ENGINE ERROR: {str(e)}")
        raise e

def generate_carousel_images(base_prompt: str, image: str = None, count: int = 2, slide_prompts: List[str] = None):
    """
    Generates multiple images for a carousel using the Nano Banana Engine.
    """
    results = []
    actual_count = min(count, 2)
    
    for i in range(actual_count):
        if slide_prompts and i < len(slide_prompts):
            slide_prompt = slide_prompts[i]
        else:
            slide_prompt = f"{base_prompt}, slide {i+1} of 2, consistent minimal product photography style"
            
        print(f"CAROUSEL: Generating Slide {i+1}/{actual_count} using Nano Banana 2...")
        img_data = generate_google_image(slide_prompt, image=image)
        results.append(img_data)
        
    return results

def mock_video_gen(prompt: str):
    """
    Mock for video generation as requested.
    """
    return {
        "status": "mock_success",
        "message": "Video generation is currently in preview. Mocking output.",
        "url": "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-off-a-blue-dress-4433-large.mp4",
        "thumbnail": "https://images.unsplash.com/photo-1539109132314-34a9366817f4?auto=format&fit=crop&w=800&q=80"
    }
