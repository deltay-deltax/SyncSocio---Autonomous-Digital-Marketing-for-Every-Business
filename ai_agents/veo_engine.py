"""
Veo 3.1 Fast — Video Generation Engine
=======================================
Replaces the FAL-based Seedance/Wan/Minimax video pipeline with Google's
Veo 3.1 Fast model via the google-genai SDK (Developer API / AI Studio).

Supports both:
  • Text-to-Video  → prompt only
  • Image-to-Video → prompt + reference image (base64 or URL)

Generated videos are uploaded to Cloudinary and returned as public URLs,
matching the return schema of the legacy FAL video functions.

Cost: ~$0.80 per 8-second video (Pay-As-You-Go tier).
"""

import os
import io
import time
import uuid
import base64
import tempfile
import traceback
import requests as http_requests

import cloudinary
import cloudinary.uploader

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# ── Constants ────────────────────────────────────────────────────────────────
VEO_MODEL = "veo-3.1-fast-generate-001"

# Polling config (exponential backoff for scalability)
POLL_INITIAL_DELAY = 10      # seconds — first check
POLL_MAX_DELAY     = 60      # seconds — cap
POLL_BACKOFF       = 1.5     # multiplier per iteration
POLL_TIMEOUT       = 600     # 10 minutes total before giving up


def _ensure_cloudinary():
    """Idempotent Cloudinary configuration from env vars."""
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )


def _resolve_image_bytes(image: str) -> bytes:
    """
    Accept a base64 string (with or without data-URI prefix) or an HTTPS URL
    and return raw image bytes suitable for the genai SDK.
    """
    if image.startswith("http://") or image.startswith("https://"):
        print(f"  VEO: Downloading reference image from URL...")
        resp = http_requests.get(image, timeout=30)
        resp.raise_for_status()
        return resp.content

    # Strip data-URI prefix if present
    raw_b64 = image
    if "base64," in image:
        raw_b64 = image.split("base64,", 1)[1]

    return base64.b64decode(raw_b64)


def _detect_mime(raw_b64: str) -> str:
    """Detect MIME type from base64 magic bytes (mirrors FAL engine logic)."""
    if raw_b64.startswith("iVBORw0KGgo"):
        return "image/png"
    if raw_b64.startswith("UklGR"):
        return "image/webp"
    if raw_b64.startswith("R0lGOD"):
        return "image/gif"
    return "image/jpeg"


def _upload_video_to_cloudinary(video_path: str) -> str:
    """
    Upload a local video file to Cloudinary and return the secure URL.
    Uses the 'syncsocio/veo_videos' folder for easy identification.
    """
    _ensure_cloudinary()
    print(f"  VEO: Uploading video to Cloudinary...")
    result = cloudinary.uploader.upload(
        video_path,
        resource_type="video",
        folder="syncsocio/veo_videos",
        public_id=f"veo_{uuid.uuid4().hex[:12]}",
    )
    url = result.get("secure_url")
    print(f"  VEO: ✅ Cloudinary upload complete → {url}")
    return url


# ═════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═════════════════════════════════════════════════════════════════════════════

def generate_veo_video(
    prompt: str,
    image: str = None,
    aspect_ratio: str = "9:16",
    duration: int = 8,
    resolution: str = "1080p",
) -> dict:
    """
    Generate a video using Google Veo 3.1 Fast.

    Args:
        prompt:       Text description / video script.
        image:        Optional reference image (base64 or HTTPS URL) for
                      image-to-video generation.  If None → text-to-video.
        aspect_ratio: "9:16" (portrait/Reels), "16:9" (landscape), "1:1".
        duration:     Video length in seconds (default 8).
        resolution:   Video output resolution ("1080p" default, "720p").

    Returns:
        dict matching the legacy FAL schema:
        {
            "status":    "success" | "error",
            "url":       "<cloudinary_video_url>",
            "thumbnail": "<thumbnail_url>" | None,
            "message":   "<human description>"
        }
    """
    # Set the credentials file for Vertex AI
    cred_path = os.path.join(os.path.dirname(__file__), "veo_credentials.json")
    if not os.path.exists(cred_path):
        raise ValueError(f"Vertex AI credentials not found at {cred_path}")
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

    try:
        # Initialize for Vertex AI instead of standard Developer API
        client = genai.Client(
            vertexai=True,
            project="syncsocio-veo",
            location="us-central1"
        )

        # ── Build generation kwargs ──────────────────────────────────────
        gen_kwargs = {
            "model": VEO_MODEL,
            "prompt": prompt,
            "config": types.GenerateVideosConfig(
                aspect_ratio=aspect_ratio,
                duration_seconds=duration,
                resolution=resolution,
                generate_audio=True,
                person_generation="ALLOW_ADULT",
            ),
        }

        # ── Image-to-Video: attach reference image ──────────────────────
        if image:
            print(f"VEO ENGINE: Image-to-Video mode — resolving reference image...")
            image_bytes = _resolve_image_bytes(image)
            gen_kwargs["image"] = types.Image(
                image_bytes=image_bytes,
                mime_type="image/jpeg",
            )
            print(f"VEO ENGINE: Reference image loaded ({len(image_bytes)} bytes)")
        else:
            print(f"VEO ENGINE: Text-to-Video mode")

        # ── Dispatch generation (long-running operation) ─────────────────
        print(f"VEO ENGINE ({VEO_MODEL}): Generating {duration}s {aspect_ratio} video...")
        operation = client.models.generate_videos(**gen_kwargs)

        # ── Poll with exponential backoff ────────────────────────────────
        delay = POLL_INITIAL_DELAY
        elapsed = 0.0

        while not operation.done:
            if elapsed >= POLL_TIMEOUT:
                raise TimeoutError(
                    f"Veo video generation timed out after {POLL_TIMEOUT}s"
                )
            print(f"  VEO: Waiting {delay:.0f}s... (elapsed {elapsed:.0f}s)")
            time.sleep(delay)
            elapsed += delay
            delay = min(delay * POLL_BACKOFF, POLL_MAX_DELAY)

            # Refresh operation status (handles 429 via SDK retries)
            operation = client.operations.get(operation)

        # ── Extract generated video ─────────────────────────────────────
        if getattr(operation, 'error', None):
            err_msg = str(operation.error)
            print(f"VEO ENGINE API ERROR: {err_msg}")
            raise Exception(f"Veo Backend Error: {err_msg}")

        if not getattr(operation, 'response', None) or not getattr(operation.response, 'generated_videos', None):
            raise Exception("Veo returned no video in the response")

        generated_video = operation.response.generated_videos[0]

        # ── Download video bytes and save to temp file ──────────────────
        print(f"  VEO: Extracting video bytes from Vertex response...")
        
        tmp_dir = tempfile.mkdtemp()
        tmp_path = os.path.join(tmp_dir, f"veo_{uuid.uuid4().hex[:8]}.mp4")
        with open(tmp_path, "wb") as f:
            f.write(generated_video.video.video_bytes)
        print(f"  VEO: Saved to temp → {tmp_path}")

        # ── Upload to Cloudinary for a public URL ───────────────────────
        video_url = _upload_video_to_cloudinary(tmp_path)

        # ── Cleanup temp file ───────────────────────────────────────────
        try:
            os.remove(tmp_path)
            os.rmdir(tmp_dir)
        except OSError:
            pass

        print(f"VEO ENGINE: ✅ Video generated successfully → {video_url}")

        return {
            "status": "success",
            "url": video_url,
            "thumbnail": None,  # Veo does not provide a separate thumbnail
            "message": f"Video generated with Veo 3.1 Fast ({duration}s, {aspect_ratio}, {resolution})",
        }

    except Exception as e:
        print(f"VEO ENGINE ERROR: {str(e)}")
        traceback.print_exc()
        return {
            "status": "error",
            "url": None,
            "thumbnail": None,
            "message": f"Veo video generation failed: {str(e)}",
        }
