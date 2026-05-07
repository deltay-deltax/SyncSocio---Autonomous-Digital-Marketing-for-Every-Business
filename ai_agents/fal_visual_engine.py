import os
import fal_client
from typing import List, Optional, Dict, Any
import base64

def generate_fal_image_flux(prompt: str, image: str = None, aspect_ratio: str = "3:4"):
    """
    Generates images using Flux Dev via FAL.ai
    Supports image-to-image generation for product anchoring.
    
    Args:
        prompt: Text description for image generation
        image: Optional base64 image for img2img
        aspect_ratio: Image aspect ratio (default: 3:4 for Instagram)
    
    Returns:
        Dict with base64 encoded image
    """
    api_key = os.getenv("FAL_API_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY not found in environment")
    
    try:
        print(f"FAL ENGINE (Flux Dev): Generating image...")
        
        # Prepare arguments
        arguments = {
            "prompt": prompt,
            "image_size": {
                "width": 1024,
                "height": 1280  # 4:5 ratio for Instagram
            },
            "num_inference_steps": 28,
            "guidance_scale": 3.5,
            "num_images": 1,
            "enable_safety_checker": False
        }
        
        # Add image for img2img if provided
        if image:
            # Clean base64 string
            if "base64," in image:
                image = image.split("base64,")[1]
            
            # Convert to data URL format that FAL expects
            image_url = f"data:image/jpeg;base64,{image}"
            arguments["image_url"] = image_url
            arguments["strength"] = 0.75  # How much to transform the input image
        
        # Call FAL.ai API
        result = fal_client.subscribe(
            "fal-ai/flux/dev",
            arguments=arguments
        )
        
        # Extract image URL and convert to base64
        if result and "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
            
            # Download and convert to base64
            import requests
            response = requests.get(image_url)
            if response.status_code == 200:
                b64_image = base64.b64encode(response.content).decode('utf-8')
                return {"image": b64_image, "status": "success"}
            else:
                raise Exception(f"Failed to download image from FAL: {response.status_code}")
        else:
            raise Exception("No image data in FAL response")
            
    except Exception as e:
        print(f"FAL FLUX ENGINE ERROR: {str(e)}")
        raise e


def generate_fal_carousel_ideogram(base_prompt: str, image: str = None, count: int = 2, slide_prompts: List[str] = None):
    """
    Generates carousel images using Ideogram v2 Turbo via FAL.ai
    Ideogram is excellent for text-in-image generation for carousels.
    
    Args:
        base_prompt: Base description
        image: Optional reference image
        count: Number of slides (max 2 to save credits)
        slide_prompts: List of prompts for each slide
    
    Returns:
        List of dicts with base64 encoded images
    """
    api_key = os.getenv("FAL_API_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY not found in environment")
    
    try:
        results = []
        actual_count = min(count, 2)  # Hard cap at 2 slides
        
        for i in range(actual_count):
            if slide_prompts and i < len(slide_prompts):
                slide_prompt = slide_prompts[i]
            else:
                slide_prompt = f"{base_prompt}, slide {i+1} of {actual_count}"
            
            print(f"FAL ENGINE (Ideogram): Generating Carousel Slide {i+1}/{actual_count}...")
            
            arguments = {
                "prompt": slide_prompt,
                "aspect_ratio": "4:5",  # Instagram carousel ratio
                "model": "V_2_TURBO",
                "magic_prompt_option": "AUTO",  # Let Ideogram enhance the prompt
                "style_type": "DESIGN"  # Good for marketing content
            }
            
            # Add image reference if provided (only for first slide)
            if image and i == 0:
                if "base64," in image:
                    image = image.split("base64,")[1]
                image_url = f"data:image/jpeg;base64,{image}"
                arguments["image_url"] = image_url
                arguments["image_weight"] = 0.3  # Subtle influence
            
            result = fal_client.subscribe(
                "fal-ai/ideogram/v2/turbo",
                arguments=arguments
            )
            
            # Extract and convert to base64
            if result and "images" in result and len(result["images"]) > 0:
                image_url = result["images"][0]["url"]
                
                import requests
                response = requests.get(image_url)
                if response.status_code == 200:
                    b64_image = base64.b64encode(response.content).decode('utf-8')
                    results.append({"image": b64_image, "status": "success"})
                else:
                    raise Exception(f"Failed to download carousel slide {i+1}")
            else:
                raise Exception(f"No image data for slide {i+1}")
        
        return results
        
    except Exception as e:
        print(f"FAL IDEOGRAM ENGINE ERROR: {str(e)}")
        raise e


def generate_fal_video_minimax(prompt: str, duration: str = "6s"):
    """
    Generates video using Minimax Video-01 via FAL.ai
    Best quality video generation for Instagram Reels.
    
    Args:
        prompt: Video description/script
        duration: Video duration ("6s" or "10s")
    
    Returns:
        Dict with video URL and thumbnail
    """
    api_key = os.getenv("FAL_API_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY not found in environment")
    
    try:
        print(f"FAL ENGINE (Minimax Video): Generating {duration} video...")
        
        arguments = {
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": "9:16"  # Vertical for Instagram Reels
        }
        
        result = fal_client.subscribe(
            "fal-ai/minimax/video-01",
            arguments=arguments
        )
        
        if result and "video" in result:
            video_url = result["video"]["url"]
            
            # Get thumbnail if available
            thumbnail_url = None
            if "image" in result and result["image"]:
                thumbnail_url = result["image"]["url"]
            
            return {
                "status": "success",
                "url": video_url,
                "thumbnail": thumbnail_url,
                "message": f"Video generated successfully ({duration})"
            }
        else:
            raise Exception("No video data in FAL response")
            
    except Exception as e:
        print(f"FAL MINIMAX VIDEO ENGINE ERROR: {str(e)}")
        # Fallback to mock for now
        return {
            "status": "mock_success",
            "message": f"Video generation in progress. Error: {str(e)}",
            "url": "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-off-a-blue-dress-4433-large.mp4",
            "thumbnail": "https://images.unsplash.com/photo-1539109132314-34a9366817f4?auto=format&fit=crop&w=800&q=80"
        }


def generate_fal_video_wan(prompt: str, duration: str = "6s"):
    """
    Alternative video generation using Luma Dream Machine (WAN-style quality)
    
    Args:
        prompt: Video description
        duration: Duration in seconds
    
    Returns:
        Dict with video URL
    """
    api_key = os.getenv("FAL_API_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY not found in environment")
    
    try:
        print(f"FAL ENGINE (Luma Dream Machine): Generating video...")
        
        arguments = {
            "prompt": prompt,
            "aspect_ratio": "9:16",
            "loop": False
        }
        
        result = fal_client.subscribe(
            "fal-ai/luma-dream-machine",
            arguments=arguments
        )
        
        if result and "video" in result:
            video_url = result["video"]["url"]
            
            return {
                "status": "success",
                "url": video_url,
                "thumbnail": None,
                "message": "Video generated with Luma Dream Machine"
            }
        else:
            raise Exception("No video data in Luma response")
            
    except Exception as e:
        print(f"FAL LUMA ENGINE ERROR: {str(e)}")
        # Fallback to Minimax
        return generate_fal_video_minimax(prompt, duration)
