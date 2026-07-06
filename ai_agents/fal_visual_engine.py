import os
# pyrefly: ignore [missing-import]
import fal_client
from typing import List, Optional, Dict, Any
import base64
from dotenv import load_dotenv
from prompt_architect import build_flux_negative_prompt

load_dotenv()

# LEGACY - replaced by gpt-image-2
def generate_fal_image_flux_legacy(prompt: str, image: str = None, aspect_ratio: str = "3:4"):
    """
    LEGACY: Static image generation using Flux Dev via FAL.ai.
    Kept for reference. Active static generation is handled by generate_fal_image_gpt2().

    Args:
        prompt: Text description for image generation
        image: Optional base64 image for img2img
        aspect_ratio: Image aspect ratio (default: 3:4 for Instagram)

    Returns:
        Dict with base64 encoded image
    """
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key

    try:
        print(f"FAL ENGINE LEGACY (Flux Dev): Generating image...")

        arguments = {
            "prompt": prompt,
            "negative_prompt": build_flux_negative_prompt(),
            "image_size": {
                "width": 1024,
                "height": 1280  # 4:5 ratio for Instagram
            },
            "num_inference_steps": 28,
            "guidance_scale": 3.5,
            "num_images": 1,
            "enable_safety_checker": False
        }

        model_endpoint = "fal-ai/flux/dev"
        if image:
            if image.startswith("http://") or image.startswith("https://") or image.startswith("data:"):
                image_url = image
            else:
                if "base64," in image:
                    image = image.split("base64,")[1]
                image_url = f"data:image/jpeg;base64,{image}"
            arguments["image_url"] = image_url
            arguments["strength"] = 0.65
            model_endpoint = "fal-ai/flux/dev/image-to-image"

        result = fal_client.subscribe(model_endpoint, arguments=arguments)

        if result and "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
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
        print(f"FAL FLUX LEGACY ENGINE ERROR: {str(e)}")
        raise e


def generate_fal_image_gpt2(prompt: str, image: any = None, image_size: str = "portrait_4_3"):
    """
    Static image generation using GPT-Image-2 via FAL.ai.
    When an image (or list of images) is provided, it uses the openai/gpt-image-2/edit endpoint
    (with fallbacks) to perform high-fidelity image-to-image edits.
    """
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key

    try:
        has_ref = False
        data_urls = []
        size_kb = 0
        if image:
            images = [image] if isinstance(image, str) else image
            for img in images:
                if not img: continue
                if img.startswith("http://") or img.startswith("https://") or img.startswith("data:"):
                    data_urls.append(img)
                else:
                    clean = img.split("base64,")[1] if "base64," in img else img
                    data_urls.append(f"data:image/jpeg;base64,{clean}")
                if not img.startswith("http"):
                    size_kb += len(img) * 3 // 4 // 1024
            if len(data_urls) > 0:
                has_ref = True

        if has_ref:
            # Image-to-image flow using GPT-Image-2 Edit endpoint
            print(f"\nFAL ENGINE (gpt-image-2/edit): Performing image-to-image with {len(data_urls)} refs...")
            print(f"  has_ref    : YES ({size_kb} KB)")
            print(f"\n--- PROMPT SENT TO FAL gpt-image-2/edit ---")
            print(prompt)
            print("--------------------------------------\n")

            edit_arguments = {
                "prompt": prompt,
                "image_urls": data_urls,
                "image_size": image_size,
                "quality": "low",
            }
            try:
                result = fal_client.subscribe(
                    "openai/gpt-image-2/edit",
                    arguments=edit_arguments,
                )
            except Exception as edit_err:
                print(f"[FAL] openai/gpt-image-2/edit failed: {edit_err}. Trying fal-ai/gpt-image-2/edit...")
                try:
                    result = fal_client.subscribe(
                        "fal-ai/gpt-image-2/edit",
                        arguments=edit_arguments,
                    )
                except Exception as edit_err2:
                    print(f"[FAL] gpt-image-2/edit failed: {edit_err2}. Falling back to Flux Image-to-Image...")
                    flux_args = {
                        "prompt": prompt,
                        "image_url": data_urls[0],
                        "strength": 0.5,
                        "image_size": image_size
                    }
                    result = fal_client.subscribe(
                        "fal-ai/flux/dev/image-to-image",
                        arguments=flux_args,
                    )
        else:
            # Standard Text-to-image flow
            print(f"\nFAL ENGINE (gpt-image-2): Generating static image...")
            print(f"  image_size : {image_size}")
            print(f"  has_ref    : NO")
            print(f"\n--- PROMPT SENT TO FAL gpt-image-2 ---")
            print(prompt)
            print("--------------------------------------\n")

            arguments = {
                "prompt": prompt,
                "image_size": image_size,
                "quality": "low",
            }
            result = fal_client.subscribe(
                "fal-ai/gpt-image-2",
                arguments=arguments,
            )

        # Extract image URL and convert to base64 for consistent return shape
        if result and "images" in result and len(result["images"]) > 0:
            image_url = result["images"][0]["url"]
            import requests
            response = requests.get(image_url)
            if response.status_code == 200:
                b64_image = base64.b64encode(response.content).decode('utf-8')
                return {"image": b64_image, "status": "success"}
            else:
                raise Exception(f"Failed to download image from FAL response: {response.status_code}")
        else:
            raise Exception("No image data in FAL response")

    except Exception as e:
        print(f"FAL GPT-IMAGE-2 ENGINE ERROR: {str(e)}")
        raise e


def generate_fal_image_flux(prompt: str, image: str = None, aspect_ratio: str = "3:4"):
    """
    Public entry point for static image generation.
    Delegates to generate_fal_image_gpt2() — signature unchanged so all
    existing callers (main.py etc.) work without modification.

    Args:
        prompt:       Text prompt for generation.
        image:        Optional base64 product image for edit/reference mode.
        aspect_ratio: Kept for API compatibility; gpt-image-2 uses "1024x1536" internally.

    Returns:
        Dict with base64 encoded image: {"image": str, "status": "success"}
    """
    return generate_fal_image_gpt2(prompt=prompt, image=image)


def generate_fal_carousel_ideogram(base_prompt: str, image: any = None, count: int = 3, slide_prompts: List[str] = None, image_size: str = "portrait_4_3"):
    """
    Generates carousel images using GPT-Image-2 (Text-to-Image / Edit) via FAL.ai.
    Uses openai/gpt-image-2/edit for image-to-image when a product reference image is present.
    """
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key
    
    try:
        results = []
        actual_count = count  # Dynamic — respects user selection (3, 5, 7, etc.)
        
        data_urls = []
        if image:
            images = [image] if isinstance(image, str) else image
            for img in images:
                if not img: continue
                if img.startswith("http://") or img.startswith("https://") or img.startswith("data:"):
                    data_urls.append(img)
                else:
                    clean = img.split("base64,")[1] if "base64," in img else img
                    data_urls.append(f"data:image/jpeg;base64,{clean}")
        
        import requests
        from concurrent.futures import ThreadPoolExecutor

        def generate_slide(i):
            features_product = True
            if slide_prompts and i < len(slide_prompts):
                sp = slide_prompts[i]
                if isinstance(sp, dict):
                    slide_prompt = sp.get("prompt", "")
                    features_product = sp.get("features_product", True)
                else:
                    slide_prompt = sp
            else:
                slide_prompt = f"{base_prompt}, slide {i+1} of {actual_count}"
            
            print(f"FAL ENGINE (gpt-image-2): Generating Carousel Slide {i+1}/{actual_count} (features_product: {features_product})...")
            
            if len(data_urls) > 0 and features_product:
                # Use GPT-Image-2 edit (image-to-image)
                arguments = {
                    "prompt": slide_prompt,
                    "image_urls": data_urls,
                    "image_size": image_size,
                    "quality": "low",
                }
                model_endpoint = "openai/gpt-image-2/edit"
            else:
                # Use GPT-Image-2 text-to-image
                arguments = {
                    "prompt": slide_prompt,
                    "image_size": image_size,
                    "quality": "low",
                }
                model_endpoint = "fal-ai/gpt-image-2"
                
            try:
                result = fal_client.subscribe(
                    model_endpoint,
                    arguments=arguments
                )
            except Exception as e:
                # Fallback path if edit fails
                if len(data_urls) > 0 and features_product:
                    print(f"[FAL] openai/gpt-image-2/edit failed for slide {i+1}: {e}. Trying fal-ai/gpt-image-2/edit...")
                    try:
                        result = fal_client.subscribe(
                            "fal-ai/gpt-image-2/edit",
                            arguments=arguments
                        )
                    except Exception as e2:
                        print(f"[FAL] fal-ai/gpt-image-2/edit failed for slide {i+1}: {e2}. Falling back to text-to-image...")
                        arguments_t2i = {
                            "prompt": slide_prompt,
                            "image_size": "portrait_4_3",
                            "quality": "low",
                        }
                        result = fal_client.subscribe(
                            "fal-ai/gpt-image-2",
                            arguments=arguments_t2i
                        )
                else:
                    raise e
            
            # Extract and convert to base64
            if result and "images" in result and len(result["images"]) > 0:
                image_url = result["images"][0]["url"]
                
                response = requests.get(image_url)
                if response.status_code == 200:
                    b64_image = base64.b64encode(response.content).decode('utf-8')
                    return {"image": b64_image, "status": "success", "index": i}
                else:
                    raise Exception(f"Failed to download carousel slide {i+1}")
            else:
                raise Exception(f"No image data for slide {i+1}")

        with ThreadPoolExecutor(max_workers=actual_count) as executor:
            thread_results = list(executor.map(generate_slide, range(actual_count)))
            
        thread_results.sort(key=lambda x: x["index"])
        for r in thread_results:
            del r["index"]
            results.append(r)
        
        return results
        
    except Exception as e:
        print(f"FAL GPT-IMAGE-2 CAROUSEL ENGINE ERROR: {str(e)}")
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
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key
    
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


def generate_fal_video_wan(prompt: str, image: str = None, aspect_ratio: str = "9:16"):
    """
    Video generation using Wan-2.1 Image-to-Video (or Text-to-Video fallback) via FAL.ai.
    Optimized for the lowest budget/cost using 480p resolution.
    
    Args:
        prompt: Video description/script
        image: Optional base64 product image or image URL for image-to-video animation
        aspect_ratio: Video aspect ratio ("9:16", "1:1", etc.)
    
    Returns:
        Dict with video URL, thumbnail, and success status
    """
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key
    
    try:
        if image:
            print(f"FAL ENGINE (Wan-2.1 Image-to-Video): Generating 720p video...")
            if image.startswith("http://") or image.startswith("https://") or image.startswith("data:"):
                image_url = image
            else:
                if "base64," in image:
                    image = image.split("base64,")[1]
                image_url = f"data:image/jpeg;base64,{image}"
            
            arguments = {
                "prompt": prompt,
                "image_url": image_url,
                "resolution": "720p",
                "aspect_ratio": aspect_ratio
            }
            model_id = "fal-ai/wan-i2v"
        else:
            print(f"FAL ENGINE (Wan-2.1 Text-to-Video): Generating 720p video...")
            arguments = {
                "prompt": prompt,
                "resolution": "720p",
                "aspect_ratio": aspect_ratio
            }
            model_id = "fal-ai/wan-t2v"
            
        result = fal_client.subscribe(
            model_id,
            arguments=arguments
        )
        
        if result and "video" in result:
            video_url = result["video"]["url"]
            # Get thumbnail if available
            thumbnail_url = None
            if "image" in result and result["image"]:
                thumbnail_url = result["image"]["url"]
            
            # Fallback to input image if no thumbnail is generated by model
            if not thumbnail_url and image:
                if image.startswith("http://") or image.startswith("https://") or image.startswith("data:"):
                    thumbnail_url = image
                else:
                    if "base64," in image:
                        image = image.split("base64,")[1]
                    thumbnail_url = f"data:image/jpeg;base64,{image}"
                
            return {
                "status": "success",
                "url": video_url,
                "thumbnail": thumbnail_url,
                "message": "Video generated with Wan-2.1"
            }
        else:
            raise Exception("No video data in Wan response")
            
    except Exception as e:
        print(f"FAL WAN ENGINE ERROR: {str(e)}")
        # Fallback to minimax
        return generate_fal_video_minimax(prompt, "6s")


def generate_fal_video_seedance(prompt: str, image: str, aspect_ratio: str = "9:16", duration: str = "5"):
    """
    Video generation using ByteDance's Seedance 2.0 Image-to-Video Fast model.
    Accepts starting image and prompts for animation.
    
    Args:
        prompt: Video description/script
        image: Base64 starting image or image URL
        aspect_ratio: Video aspect ratio ("9:16", "1:1", etc.)
        duration: Video duration in seconds (e.g. "5" or "8")
    
    Returns:
        Dict with video URL, thumbnail, and success status
    """
    api_key = os.getenv("FAL_API_KEY") or os.getenv("FAL_KEY")
    if not api_key:
        raise ValueError("FAL_API_KEY or FAL_KEY not found in environment")
    os.environ["FAL_KEY"] = api_key
    
    try:
        print(f"FAL ENGINE (Seedance 2.0 Image-to-Video Fast): Generating {duration}s 720p video...")
        if image.startswith("http://") or image.startswith("https://") or image.startswith("data:"):
            image_url = image
        else:
            if "base64," in image:
                image = image.split("base64,")[1]
            image_url = f"data:image/jpeg;base64,{image}"
        
        arguments = {
            "prompt": prompt,
            "image_url": image_url,
            "resolution": "720p",
            "aspect_ratio": aspect_ratio,
            "duration": duration,
            "generate_audio": True
        }
        
        result = fal_client.subscribe(
            "bytedance/seedance-2.0/fast/image-to-video",
            arguments=arguments
        )
        
        if result and "video" in result:
            video_url = result["video"]["url"]
            thumbnail_url = None
            if "image" in result and result["image"]:
                thumbnail_url = result["image"]["url"]
            
            if not thumbnail_url:
                thumbnail_url = image_url
                
            return {
                "status": "success",
                "url": video_url,
                "thumbnail": thumbnail_url,
                "message": "Video generated with Seedance 2.0 Fast"
            }
        else:
            raise Exception("No video data in Seedance response")
            
    except Exception as e:
        print(f"FAL SEEDANCE ENGINE ERROR: {str(e)}")
        # Fallback to minimax
        return generate_fal_video_minimax(prompt, "6s")
