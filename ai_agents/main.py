from models import ProductEditRequest
import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Query
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
# pyrefly: ignore [missing-import]
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import re
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

# pyrefly: ignore [missing-import]
from langchain_core.globals import set_debug
set_debug(True)

# pyrefly: ignore [missing-import]
from bson import ObjectId
from agents import generate_strategy, analyze_brand_mix
from dm_flow_agent import process_calendar_for_dm_flows
from asset_agent import generate_asset_content
from ads_agent import get_ads_recommendations
from visual_engine import generate_carousel_images, mock_video_gen, generate_google_image
from fal_visual_engine import generate_fal_image_flux, generate_fal_carousel_ideogram, generate_fal_image_gpt2
from veo_engine import generate_veo_video
from meta_capi import send_meta_capi_event
from prompt_architect import build_ideogram_slide_prompt, _hex_to_words
from models import BrandInfo, StrategyResponse, StrategyImageRequest, EditMediaRequest, RefineCopyRequest, AutopilotRequest
from post_validator import validate_post, optimize_post, publisher_node
from vector_utils import find_similar_posts
from plan_agent import generate_weekly_plan
from caption_agent import generate_captions_and_hashtags
from strategy_image_agent import generate_strategy_images, refine_campaign_copy
import shutil
from langchain_google_genai import ChatGoogleGenerativeAI
from google import genai
from auditors.meta_auditor import MetaAuditor
from auditors.models import AuditorInput, AuditorResponse

# ── SaaS / Services / Consulting mode agents ───────────────────────────────
try:
    from saas_agents.saas_profiles import is_saas_brand
    from saas_agents.saas_image_agent import generate_saas_strategy_images
    _SAAS_AGENT_AVAILABLE = True
    # print("[Main] ✅ SaaS agents loaded successfully")
except ImportError as _saas_err:
    _SAAS_AGENT_AVAILABLE = False
    # print(f"[Main] ⚠️ SaaS agents not available: {_saas_err}")
    def is_saas_brand(cat): return False
    def generate_saas_strategy_images(*args, **kwargs): raise ValueError("SaaS agents not loaded")

app = FastAPI(title="SyncSocio AI Strategy Service")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [origin.strip() for origin in frontend_url.split(",")] if frontend_url else []
for fallback in [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "https://velocity-26.vercel.app",
    "https://www.syncsocio.com",
    "https://syncsocio.com"
]:
    if fallback not in origins:
        origins.append(fallback)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mongo Connection
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.get_database("test") # Explicitly use 'test' database
calendar_collection = db["content_calendars"]
brand_collection = db["brandprofiles"]
dm_flows_collection = db["dm_flows"]
assets_collection = db["assets"]
apilogs_collection = db["apilogs"]

async def log_api_call(provider: str, endpoint: str, cost_in_cents: float = 0.5, is_error: bool = False, error_message: str = "", user_id: str = None):
    try:
        doc = {
            "provider": provider if provider in ["FAL", "CLAUDE", "OPENAI", "GEMINI", "OTHER"] else "GEMINI",
            "endpoint": endpoint,
            "costInCents": cost_in_cents,
            "isError": is_error,
            "errorMessage": error_message,
            "createdAt": datetime.now(timezone.utc)
        }
        if user_id and ObjectId.is_valid(str(user_id)):
            doc["user"] = ObjectId(str(user_id))
        await apilogs_collection.insert_one(doc)
    except Exception as e:
        pass
        # print(f"[ApiLog] ⚠️ Failed to log API call: {e}")

@app.get("/")
def read_root():
    return {"message": "SyncSocio AI Agent Backend is running."}

@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now()}

import requests
from html.parser import HTMLParser
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class HTMLMetadataExtractor(HTMLParser):
    def __init__(self, base_url="", is_saas=False):
        super().__init__()
        self.base_url = base_url
        self.is_saas = is_saas
        self.title = ""
        self.title_captured = False
        self.meta_desc = ""
        self.current_tag = ""
        self.body_text = []
        self.ignore_tags = {"script", "style", "head", "noscript"} # Removed 'link' to allow parsing favicon links
        self.in_ignore = False
        self.images = []
        self.logo_candidates = []
        self.stylesheet_urls = []

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.current_tag = "title" if not self.title_captured else ""
        else:
            self.current_tag = tag
            
        if tag in self.ignore_tags and tag != "head":
            self.in_ignore = True
        
        attrs_dict = dict(attrs)
        if tag == "link":
            rel = attrs_dict.get("rel", "").lower()
            if "stylesheet" in rel:
                href = attrs_dict.get("href", "")
                if href:
                    from urllib.parse import urljoin
                    self.stylesheet_urls.append(urljoin(self.base_url, href))
            if any(x in rel for x in ["icon", "shortcut icon", "apple-touch-icon"]):
                href = attrs_dict.get("href", "")
                if href:
                    from urllib.parse import urljoin
                    abs_href = urljoin(self.base_url, href)
                    self.logo_candidates.append({"src": abs_href, "source": f"link-{rel}"})

        elif tag == "meta":
            property_val = attrs_dict.get("property", "").lower()
            name_val = attrs_dict.get("name", "").lower()
            if property_val == "description" or name_val == "description":
                self.meta_desc = attrs_dict.get("content", "")
            elif property_val == "og:description" or name_val == "og:description":
                if not self.meta_desc:
                    self.meta_desc = attrs_dict.get("content", "")
            elif property_val in ["og:image", "twitter:image"] or name_val in ["og:image", "twitter:image"]:
                content = attrs_dict.get("content", "")
                if content:
                    from urllib.parse import urljoin
                    abs_content = urljoin(self.base_url, content)
                    self.logo_candidates.append({"src": abs_content, "source": f"meta-{property_val or name_val}"})
                    
        elif tag == "img":
            src = attrs_dict.get("src", "")
            data_src = attrs_dict.get("data-src", "")
            srcset = attrs_dict.get("srcset", "")
            alt = attrs_dict.get("alt", "")
            
            # Choose the best source URL for the image
            target_src = ""
            best_srcset_src = ""
            if srcset:
                try:
                    # Parse srcset to find the highest-resolution or last candidate
                    candidates = [c.strip().split() for c in srcset.split(",") if c.strip()]
                    if candidates:
                        best_candidate = candidates[-1][0]
                        if best_candidate and not best_candidate.startswith("data:"):
                            best_srcset_src = best_candidate
                except Exception as parse_err:
                    pass
                    # print(f"[WEBSITE SCANNER] [PARSER-WARN] Failed parsing srcset '{srcset}': {parse_err}")

            if data_src and not data_src.startswith("data:"):
                target_src = data_src
            elif best_srcset_src:
                target_src = best_srcset_src
            elif src and not src.startswith("data:"):
                target_src = src
            
            if target_src:
                from urllib.parse import urljoin
                absolute_src = urljoin(self.base_url, target_src)
                self.images.append({"src": absolute_src, "alt": alt})

                # Check if this image looks like a brand logo
                src_lower = target_src.lower()
                is_logo = False
                for attr_name, attr_val in attrs:
                    if attr_name in ["src", "alt", "class", "id", "title"]:
                        val_lower = attr_val.lower()
                        if "logo" in val_lower or "brand" in val_lower or "header" in val_lower:
                            is_logo = True
                            break
                if is_logo or "logo" in src_lower or "icon" in src_lower:
                    self.logo_candidates.append({"src": absolute_src, "source": "img-logo-attr", "alt": alt})

    def handle_endtag(self, tag):
        if tag == "title":
            self.title_captured = True
        if tag in self.ignore_tags:
            self.in_ignore = False
        self.current_tag = ""

    def handle_data(self, data):
        if self.current_tag == "title":
            if not self.title_captured:
                self.title += data.strip()
        elif not self.in_ignore:
            text = data.strip()
            if text:
                self.body_text.append(text)

    def get_content(self):
        formatted_images = []
        seen_normalized = set()
        for img in self.images:
            src = img["src"]
            src_lower = src.lower()
            if not self.is_saas:
                if src.startswith("data:") or src.endswith(".svg") or "logo" in src_lower or "icon" in src_lower:
                    continue
            else:
                if src.startswith("data:"):
                    continue
            if not img["alt"].strip() and any(x in src_lower for x in ["dot", "star", "squiggle", "bg", "background", "hero_light", "hero_dark"]):
                continue
            
            # Normalize url to prevent duplicates of different sizes/resolutions
            normalized_src = src.split("?")[0]
            if normalized_src not in seen_normalized:
                seen_normalized.add(normalized_src)
                formatted_images.append(img)
                # Keep the scrape prompt compact. The first useful product images
                # are enough for catalog matching; hundreds of URLs only burn
                # tokens and rarely improve extraction quality.
                if len(formatted_images) >= 40:
                    break

        # Deduplicate logo candidates
        seen_logo = set()
        unique_logos = []
        for l in self.logo_candidates:
            src = l["src"]
            if src not in seen_logo and not src.startswith("data:"):
                seen_logo.add(src)
                unique_logos.append(l)

        # print(f"[WEBSITE SCANNER] [IMG-EXTRACT] Total unique high-quality images gathered for prompt: {len(formatted_images)}")
        # print(f"[WEBSITE SCANNER] [LOGO-EXTRACT] Total unique logo candidates gathered: {len(unique_logos)}")
        return {
            "title": self.title.strip(),
            "meta_description": self.meta_desc.strip(),
            # A focused excerpt is materially cheaper than sending the entire
            # storefront while still retaining the hero, offer, and product copy.
            "body_text": " ".join(self.body_text)[:18000],
            "images": formatted_images,
            "logo_candidates": unique_logos[:8],
            "stylesheet_urls": list(dict.fromkeys(self.stylesheet_urls))[:3],
        }

def call_openai_gpt(prompt: str, api_key: str, system_prompt: str = "", max_tokens: int = 2600):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    payload = {
        "model": "gpt-4o-mini",
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }
    response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=120)
    response.raise_for_status()
    result = response.json()
    return result["choices"][0]["message"]["content"]

def download_image_as_base64(url: str) -> str:
    if not url or not url.startswith("http"):
        # print(f"[WEBSITE SCANNER] [DOWNLOAD] ⚠️ Skipping invalid or non-http image URL: {url}")
        return ""
    try:
        # print(f"[WEBSITE SCANNER] [DOWNLOAD] 📥 Starting download of: {url}")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": url
        }
        res = requests.get(url, headers=headers, timeout=10, verify=False)
        # print(f"[WEBSITE SCANNER] [DOWNLOAD] Response Status: {res.status_code}, Length: {len(res.content)} bytes")
        if res.status_code == 200:
            import base64
            content_type = res.headers.get("Content-Type", "image/jpeg")
            if not content_type or "image" not in content_type:
                if url.endswith(".png"):
                    content_type = "image/png"
                elif url.endswith(".webp"):
                    content_type = "image/webp"
                elif url.endswith(".svg"):
                    content_type = "image/svg+xml"
                else:
                    content_type = "image/jpeg"
            elif "svg" in content_type:
                content_type = "image/svg+xml"
            encoded = base64.b64encode(res.content).decode("utf-8")
            # print(f"[WEBSITE SCANNER] [DOWNLOAD] ✅ Successfully base64-encoded. Content type: {content_type}")
            return f"data:{content_type};base64,{encoded}"
        else:
            pass
            # print(f"[WEBSITE SCANNER] [DOWNLOAD] ❌ Failed, HTTP status code: {res.status_code}")
    except Exception as e:
        pass
        # print(f"[WEBSITE SCANNER] [DOWNLOAD] ⚠️ Failed to download image {url}: {e}")
    return ""

class ScrapeRequest(BaseModel):
    url: str
    plan: Optional[str] = "Starter"
    businessCategory: Optional[str] = None
    metaEventId: Optional[str] = None
    userEmail: Optional[str] = None
    userPhone: Optional[str] = None


def generate_brand_design_guide(brand_data: dict) -> str:
    """
    Compile the structured, evidence-only design system returned by the existing
    brand-profile call into the Markdown consumed by the UI and Art Director.

    This intentionally performs no second LLM request. A deterministic compiler
    prevents the model from collapsing a design system into a vague paragraph,
    keeps headings stable, and makes missing evidence explicit instead of guessed.
    """

    def _text(value: Any, fallback: str = "Not verified") -> str:
        cleaned = " ".join(str(value or "").split()).strip()
        return cleaned if cleaned else fallback

    def _items(value: Any, limit: int = 8) -> List[str]:
        if isinstance(value, list):
            return [_text(item, "") for item in value[:limit] if _text(item, "")]
        if isinstance(value, str) and value.strip():
            return [_text(part, "") for part in value.split(",")[:limit] if _text(part, "")]
        return []

    system = brand_data.get("brandDesignSystem")
    if isinstance(system, dict) and system:
        brand_name = _text(brand_data.get("brandName"), "Brand")
        identity = system.get("identity") if isinstance(system.get("identity"), dict) else {}
        typography = system.get("typography") if isinstance(system.get("typography"), list) else []
        colors = system.get("colors") if isinstance(system.get("colors"), list) else []
        ctas = system.get("ctaStyles") if isinstance(system.get("ctaStyles"), list) else []
        motifs = system.get("motifs") if isinstance(system.get("motifs"), list) else []
        hierarchy = system.get("hierarchy") if isinstance(system.get("hierarchy"), dict) else {}
        photography = system.get("photography") if isinstance(system.get("photography"), dict) else {}
        guardrails = system.get("guardrails") if isinstance(system.get("guardrails"), dict) else {}

        personality = ", ".join(_items(identity.get("personality"), 6)) or "Not verified"
        lines = [
            f"# Brand Design Guide: {brand_name}",
            "",
            "## 1. Brand Identity",
            f"**Core aesthetic:** {_text(identity.get('coreAesthetic'))}",
            f"**Brand tension:** {_text(identity.get('brandTension'))}",
            f"**Personality:** {personality}",
            f"**Creative principle:** {_text(identity.get('creativePrinciple'))}",
            "",
            "## 2. Typography",
        ]

        valid_type_rows = [row for row in typography[:8] if isinstance(row, dict) and _text(row.get("family"), "")]
        if valid_type_rows:
            for row in valid_type_rows:
                weights = ", ".join(_items(row.get("weights"), 6)) or "Not verified"
                lines.extend([
                    f"### {_text(row.get('role'), 'Font')} — {_text(row.get('family'))}",
                    f"- **Weights:** {weights}",
                    f"- **Usage:** {_text(row.get('usage'))}",
                    f"- **Tracking and case:** {_text(row.get('trackingAndCase'))}",
                    f"- **Fallback:** {_text(row.get('fallback'))}",
                ])
        else:
            lines.append("No exact typography roles were verified. Do not invent a font family.")

        lines.extend(["", "## 3. Color Palette"])
        valid_colors = [row for row in colors[:8] if isinstance(row, dict) and _text(row.get("hex"), "")]
        if valid_colors:
            lines.extend([
                "| Color | Hex | Functional role | Usage rule |",
                "| :--- | :--- | :--- | :--- |",
            ])
            for row in valid_colors:
                lines.append(
                    f"| {_text(row.get('name'), 'Verified color')} | `{_text(row.get('hex'))}` | "
                    f"{_text(row.get('role'))} | {_text(row.get('usage'))} |"
                )
        else:
            lines.append("No exact color tokens were verified. Do not invent a palette.")

        lines.extend(["", "## 4. Components & Visual Motifs", "### CTA system"])
        valid_ctas = [row for row in ctas[:5] if isinstance(row, dict)]
        if valid_ctas:
            for row in valid_ctas:
                lines.append(
                    f"- **{_text(row.get('name'), 'CTA')}:** {_text(row.get('shape'))}; "
                    f"radius {_text(row.get('radius'))}; fill {_text(row.get('fill'))}; "
                    f"text {_text(row.get('textColor'))}. Use for {_text(row.get('usage'))}."
                )
        else:
            lines.append("- CTA geometry and colors: Not verified.")

        lines.append("### Recurring motifs")
        valid_motifs = [row for row in motifs[:8] if isinstance(row, dict)]
        if valid_motifs:
            for row in valid_motifs:
                lines.append(
                    f"- **{_text(row.get('name'), 'Motif')}:** {_text(row.get('description'))} "
                    f"Use it for {_text(row.get('usage'))}."
                )
        else:
            lines.append("- No recurring visual motif was verified; do not manufacture one.")

        lines.extend([
            f"- **Icons and badges:** {_text(system.get('iconAndBadgeStyle'))}",
            f"- **Borders and surfaces:** {_text(system.get('borderAndSurfaceStyle'))}",
            "",
            "## 5. Hierarchy, Spacing & Photography",
            f"- **Headline scale:** {_text(hierarchy.get('headlineScale'))}",
            f"- **Body scale:** {_text(hierarchy.get('bodyScale'))}",
            f"- **Text density:** {_text(hierarchy.get('textDensity'))}",
            f"- **Spacing:** {_text(hierarchy.get('spacing'))}",
            f"- **Product prominence:** {_text(hierarchy.get('productProminence'))}",
            f"- **Lighting:** {_text(photography.get('lighting'))}",
            f"- **Camera and environment:** {_text(photography.get('cameraAndEnvironment'))}",
            f"- **Background treatment:** {_text(photography.get('backgroundTreatment'))}",
            f"- **Image treatment:** {_text(photography.get('imageTreatment'))}",
            "",
            "## 6. Designer Guardrails",
            "### Do",
        ])
        dos = _items(guardrails.get("do"), 8)
        donts = _items(guardrails.get("dont"), 8)
        lines.extend([f"- {item}" for item in dos] or ["- Follow only verified brand evidence."])
        lines.extend(["### Don't"])
        lines.extend([f"- {item}" for item in donts] or ["- Do not invent brand tokens or unsupported motifs."])
        return "\n".join(lines)[:10000]

    # Backward compatibility for profiles saved before structured extraction.
    extracted_guide = str(brand_data.get("brandDesignGuide") or "").strip()
    if extracted_guide:
        extracted_guide = re.sub(r"[ \t]+(?=##\s+)", "\n\n", extracted_guide)
        return extracted_guide[:7000]

    typography = str(brand_data.get("typography") or "").strip()
    primary = str(brand_data.get("primaryColor") or "").strip()
    secondary = str(brand_data.get("secondaryColor") or "").strip()
    brand_name = str(brand_data.get("brandName") or "Brand").strip()
    visual_vibe = str(brand_data.get("visualVibe") or "").strip()
    brand_tone = str(brand_data.get("brandTone") or "").strip()
    keywords = str(brand_data.get("brandKeywords") or "").strip()
    colors = ", ".join(value for value in (primary, secondary) if value) or "No verified color tokens"
    return (
        f"# Brand Design Guide: {brand_name}\n\n"
        f"## 1. Brand Identity\nVerified tone: {brand_tone or 'Not evidenced'}. "
        f"Verified visual direction: {visual_vibe or 'Not evidenced'}. "
        f"Brand cues: {keywords or 'Not evidenced'}.\n\n"
        f"## 2. Typography\nVerified font families: {typography or 'No exact family detected'}. "
        "Use a single display family for headlines and one highly legible family for body copy and CTAs; "
        "do not invent additional fonts.\n\n"
        f"## 3. Color System\nVerified palette: {colors}. Use the primary color as the dominant anchor, "
        "the secondary color for support, and preserve strong text/background contrast.\n\n"
        "## 4. Components & Motifs\nUse only website-evidenced button shapes, decorative motifs, icon styles, "
        "and surface treatments. Keep CTA styling consistent across a campaign.\n\n"
        "## 5. Composition & Guardrails\nKeep one dominant product or message, a clear headline-to-proof-to-CTA hierarchy, "
        "generous negative space, and no unsupported visual tokens or claims."
    )[:7000]

@app.post("/scrape-brand-profile")
async def api_scrape_brand_profile(payload: ScrapeRequest, request: Request):
    url = payload.url
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    if payload.metaEventId:
        client_ip = request.client.host if request.client else None
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
            
        # print("🔥 [TESTING] Firing Meta CAPI Event: URLDropped (Python Backend)")
        send_meta_capi_event(
            event_name="URLDropped",
            event_id=payload.metaEventId,
            user_data={
                "email": payload.userEmail,
                "phone": payload.userPhone,
                "client_ip": client_ip,
                "client_user_agent": request.headers.get("user-agent")
            },
            custom_data={"website_url": url}
        )
    
    is_fallback = False
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        try:
            response = requests.get(url, headers=headers, timeout=12, verify=False)
        except Exception as e:
            if url.startswith("https://"):
                url_http = url.replace("https://", "http://")
                response = requests.get(url_http, headers=headers, timeout=12, verify=False)
            else:
                raise e
                
        if response.status_code != 200:
            raise Exception(f"HTTP status {response.status_code}")
            
        html_content = response.text
        
        parser = HTMLMetadataExtractor(base_url=url)
        parser.feed(html_content)
        extracted = parser.get_content()
        
        if not extracted["body_text"].strip():
            raise Exception("No readable text content found on the webpage.")
            
        # Inspect at most three linked stylesheets. This adds no model call and
        # greatly improves exact font/color extraction for modern storefronts.
        import re
        style_sources = [html_content]
        for stylesheet_url in extracted.get("stylesheet_urls", [])[:3]:
            try:
                css_response = requests.get(stylesheet_url, headers=headers, timeout=6, verify=False)
                if css_response.ok:
                    style_sources.append(css_response.text[:250000])
            except Exception:
                continue
        style_text = "\n".join(style_sources)

        # Extract typography candidates using regex
        google_font_urls = re.findall(r'https://fonts\.googleapis\.com/css[2]?\?[^"\'\s>]+', style_text)
        google_fonts = []
        for f_url in google_font_urls:
            decoded_url = f_url.replace("&amp;", "&")
            families = re.findall(r'(?:family=)([^&\'"\s]+)', decoded_url)
            for fam in families:
                clean_fam = fam.split(":")[0].replace("+", " ").strip()
                if clean_fam and clean_fam not in google_fonts:
                    google_fonts.append(clean_fam)
                    
        # Keep quoted custom families such as "WindsorEF" or 'Ano'. The old
        # expression stopped at the opening quote and silently lost the fonts
        # that most materially affect brand fidelity.
        font_family_matches = re.findall(
            r'(?:font-family|--[\w-]*(?:font|type)[\w-]*)\s*:\s*([^;}]+)',
            style_text,
            flags=re.IGNORECASE,
        )
        css_fonts = []
        generics = {"sans-serif", "serif", "monospace", "system-ui", "-apple-system", "blinkmacsystemfont", 
                    "segoe ui", "helvetica neue", "helvetica", "arial", "geneva", "tahoma", "verdana", 
                    "trebuchet ms", "times new roman", "georgia", "courier new", "inherit", "initial", "unset"}
        for match in font_family_matches:
            fonts = [f.strip().strip("'\"") for f in match.split(",")]
            for f in fonts:
                if f:
                    f_lower = f.lower()
                    is_css_expression = any(token in f_lower for token in ("var(", "url(", "calc("))
                    is_css_measurement = bool(re.search(r'\d(?:px|rem|em|%|vh|vw)\b', f_lower))
                    if (
                        f_lower not in generics
                        and not is_css_expression
                        and not is_css_measurement
                        and re.search(r'[a-zA-Z]', f)
                        and f not in css_fonts
                    ):
                        css_fonts.append(f)
                        
        typography_candidates = list(dict.fromkeys(google_fonts + css_fonts))[:10]

        # Extract hex colors
        hex_colors = re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', style_text)
        from collections import Counter
        color_counts = Counter([c.upper() for c in hex_colors])
        top_colors = [c for c, _ in color_counts.most_common(15)]

        # Preserve the small amount of CSS context that materially changes a
        # design guide. Frequency-only color/font lists lose role, weight,
        # radius, and component information. This evidence is compact and is
        # sent through the same extraction call, so it adds no extra AI request.
        font_face_evidence = []
        for block in re.findall(r'@font-face\s*\{([^{}]{1,1600})\}', style_text, flags=re.IGNORECASE):
            family_match = re.search(r'font-family\s*:\s*([^;}]+)', block, flags=re.IGNORECASE)
            if not family_match:
                continue
            family = family_match.group(1).strip().strip("'\"")[:80]
            weight_match = re.search(r'font-weight\s*:\s*([^;}]+)', block, flags=re.IGNORECASE)
            weight = weight_match.group(1).strip()[:40] if weight_match else "unspecified"
            evidence = f"{family} (weight {weight})"
            if family and evidence not in font_face_evidence:
                font_face_evidence.append(evidence)
            if len(font_face_evidence) >= 12:
                break

        named_color_evidence = []
        for token_name, token_value in re.findall(
            r'(--[\w-]{2,80})\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b',
            style_text,
        ):
            evidence = f"{token_name}={token_value.upper()}"
            if evidence not in named_color_evidence:
                named_color_evidence.append(evidence)
            if len(named_color_evidence) >= 18:
                break

        component_style_evidence = []
        relevant_selector = re.compile(
            r'(^|[\s,.#>:+~-])(h1|h2|h3|headline|heading|body|button|btn|cta|badge|card)([\s,.#>:+~\[\]-]|$)',
            flags=re.IGNORECASE,
        )
        relevant_properties = (
            "font-family", "font-weight", "font-size", "line-height",
            "letter-spacing", "text-transform", "background-color",
            "background", "color", "border-radius",
        )
        for rule in re.finditer(r'([^{}]{1,180})\{([^{}]{1,1200})\}', style_text):
            selector = " ".join(rule.group(1).split())[-140:]
            if not relevant_selector.search(selector):
                continue
            declarations = []
            rule_body = rule.group(2)
            for prop in relevant_properties:
                value_match = re.search(
                    rf'(?<![-\w]){re.escape(prop)}\s*:\s*([^;}}]+)',
                    rule_body,
                    flags=re.IGNORECASE,
                )
                if value_match:
                    value = " ".join(value_match.group(1).split())[:90]
                    if "url(" not in value.lower():
                        declarations.append(f"{prop}={value}")
            if declarations:
                evidence = f"{selector}: {', '.join(declarations[:7])}"
                if evidence not in component_style_evidence:
                    component_style_evidence.append(evidence)
            if len(component_style_evidence) >= 14:
                break

        motif_terms = [
            "wave", "curve", "pill", "starburst", "badge", "marquee",
            "arch", "rounded", "blob", "botanical", "grain", "texture",
        ]
        style_text_lower = style_text.lower()
        observed_motif_terms = [term for term in motif_terms if term in style_text_lower]
        design_evidence = (
            "Font-face declarations: " + ("; ".join(font_face_evidence) or "None") + "\n"
            "Named color tokens: " + ("; ".join(named_color_evidence) or "None") + "\n"
            "Relevant component rules:\n- " + ("\n- ".join(component_style_evidence) or "None") + "\n"
            "Observed motif/class signals: " + (", ".join(observed_motif_terms) or "None")
        )[:6500]

        # print("\n" + "="*80)
        # print(f"[WEBSITE SCANNER] [START] Initiating scan for URL: {url}")
        # print(f"[WEBSITE SCANNER] [TITLE] Extracted Title: {extracted['title']}")
        # print(f"[WEBSITE SCANNER] [META] Extracted Meta Description: {extracted['meta_description']}")
        # print(f"[WEBSITE SCANNER] [LOGOS] Extracted Unique Logo Candidates: {len(extracted['logo_candidates'])}")
        # print(f"[WEBSITE SCANNER] [FONTS] Extracted Typography Candidates: {typography_candidates}")
        # print(f"[WEBSITE SCANNER] [COLORS] Extracted Hex Colors: {top_colors}")
        # print(f"[WEBSITE SCANNER] [IMAGES] Extracted Unique Image URLs Count: {len(extracted['images'])}")
        # print(f"[WEBSITE SCANNER] [TEXT] Raw text character length: {len(extracted['body_text'])}")
        # print("="*80 + "\n")
            
    except Exception as scrape_err:
        # Do not spend tokens on an ungrounded fallback when the storefront is
        # unreadable. Manual entry is cheaper and safer than invented data.
        raise HTTPException(
            status_code=422,
            detail="The website could not be read. Add the brand details manually instead."
        )
        
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key is missing on the server. Please configure OPENAI_API_KEY in the backend.")
        
    try:
        system_prompt = """You are an expert brand researcher and product/service cataloging agent. 
Analyze the website's title, meta description, lists of logo candidates, typography candidates, page images, and body text content to extract the brand's profile information and standard products or services list.

Your output must be a valid JSON object matching the following structure. If any field or product/service detail is not found, keep it as an empty string ("") or empty array ([]).

TRUTH AND COST RULES:
- Never invent a product, variant, offer, guarantee, statistic, claim, font, or color.
- Return only distinct products explicitly evidenced in the supplied page, maximum {PRODUCT_LIMIT}.
- Keep descriptions under 200 characters and all fact arrays to at most 4 short items.
- Preserve only facts that can materially change an ad: benefits, quantitative proof, offer, guarantee, and variant/purchase option.

DESIGN-SYSTEM COMPLETENESS RULES:
- `brandDesignSystem` is required and every nested key in the schema must be returned.
- Treat CSS declarations and named variables as stronger evidence than generic marketing prose.
- Return 2-4 typography roles when evidenced, preserving exact family names, weights, and headline/body/CTA assignments. Never call a body font the primary headline font.
- Return 4-8 materially distinct evidenced colors when available, including primary anchor, background, text, CTA/accent, and restricted sale/urgency colors. Preserve exact hex values.
- Return 1-3 evidenced CTA variants and 1-6 evidenced recurring motifs. A hover color alone is not a complete CTA style.
- Make hierarchy, spacing, photography, and guardrails operational enough that an art director could execute an ad without seeing the website.
- Avoid generic filler such as "clean and modern" unless accompanied by exact visual evidence. Use empty strings/arrays for unsupported details; never guess to fill the schema.
- Return 4-8 concise `do` rules and 4-8 concise `dont` rules when evidence permits.

For each product or service, select an image only when its name clearly matches the supplied alt text or filename. Never assign a random product image. Leave `imageBase64` empty when no clear match exists.

For the brand logo, use only a clear logo candidate. If none is evidenced, set "logo" to an empty string; never substitute a general product image.

JSON Structure:
{
  "brandName": "Name of the brand (extracted from title/content or default: empty string)",
  "businessCategory": "Choose ONE from: 'Baby & Kids', 'Food & Beverage', 'Home & Living', 'Education & Training', 'Real Estate & Property', 'Travel & Hospitality', 'Mobile Apps', 'IT & Technical Tools', 'Gaming & Entertainment', 'Fashion & Apparel', 'Beauty & Personal Care', 'Health & Wellness', 'Coaching & Consulting', 'Architecture', 'Financial Services', 'Newsletters', 'Online Marketplaces', 'Digital Products', 'E-Commerce', 'Services', 'SaaS & Digital' (default: empty string)",
  "mainGoal": "Choose ONE from: 'Grow followers', 'Sell products / get orders', 'Build brand awareness', 'Get leads / enquiries' (default: 'Sell products / get orders')",
  "website": "The original URL that was scanned",
  "location": {
    "country": "Target country if found, otherwise empty string",
    "city": "Target city if found, otherwise empty string"
  },
  "logo": "URL of the brand's logo image selected from candidates or empty string",
  "typography": "Exact detected font family names, comma-separated. Empty string if exact names are not evidenced.",
  "usp": "A concise, punchy Unique Selling Point summarizing the brand's key differentiator (under 150 characters)",
  "competitors": ["rival_handle_1", "rival_handle_2"],
  "targetAudiences": ["Up to 3 concise audience groups evidenced by the brand or product positioning"],
  "ageRange": "Choose ONE from: '18-24', '25-34', '35-44', '45+' (default: empty string)",
  "genderFocus": "Choose ONE from: 'All', 'Male', 'Female' (default: 'All')",
  "painPoint": "A clear customer pain point solved by this brand (under 150 characters)",
  "brandTone": "Choose ONE from: 'Warm & Friendly', 'Professional & Clean', 'Fun & Energetic', 'Inspirational', 'Luxury & Premium' (default: 'Warm & Friendly')",
  "visualVibe": "Choose ONE from: 'Minimalist', 'Vibrant', 'Luxury', 'Edgy' (default: 'Minimalist')",
  "brandKeywords": "A comma-separated string of 3-5 keywords describing the brand vibe",
  "primaryColor": "Most clearly evidenced primary brand hex from Detected colors; empty if uncertain",
  "secondaryColor": "Most clearly evidenced secondary brand hex from Detected colors; empty if uncertain",
  "brandDesignSystem": {
    "identity": {
      "coreAesthetic": "Specific evidenced aesthetic, not a generic adjective",
      "brandTension": "The deliberate balance that makes the design recognizable, e.g. nostalgic yet modern; empty if not evidenced",
      "personality": ["3-6 evidenced personality traits"],
      "creativePrinciple": "One operational sentence explaining how designers preserve the identity"
    },
    "typography": [
      {
        "family": "Exact evidenced font family",
        "role": "Primary Headline | Secondary/Body | CTA | System Fallback",
        "weights": ["Only evidenced weights"],
        "usage": "Where and how the family is used",
        "trackingAndCase": "Evidenced tracking, casing, or scale treatment; empty if unknown",
        "fallback": "Evidence-based safe fallback or empty string"
      }
    ],
    "colors": [
      {
        "name": "Descriptive semantic color name (e.g., 'Hunter Green', 'Citron Yellow', 'Charcoal') based on the hex value",
        "hex": "Exact evidenced hex",
        "role": "Primary anchor | Secondary | Background | Text | CTA | Accent | Restricted urgency",
        "usage": "Specific pairing and usage rule"
      }
    ],
    "ctaStyles": [
      {
        "name": "Standard CTA or evidenced variant",
        "shape": "Exact evidenced shape",
        "radius": "Exact CSS value when evidenced, otherwise empty string",
        "fill": "Exact evidenced color token/hex",
        "textColor": "Exact evidenced color token/hex",
        "usage": "When this variant is used"
      }
    ],
    "motifs": [
      {
        "name": "Evidenced recurring motif",
        "description": "Exact geometry or visual treatment",
        "usage": "Where it appears and what it organizes"
      }
    ],
    "iconAndBadgeStyle": "Evidenced icon, checkmark, seal, badge, or callout treatment",
    "borderAndSurfaceStyle": "Evidenced borders, corners, shadows, texture, and surface treatment",
    "hierarchy": {
      "headlineScale": "Evidenced size range or relative scale",
      "bodyScale": "Evidenced size/line-height or relative scale",
      "textDensity": "Copy-density and hierarchy rule",
      "spacing": "Whitespace, gutter, and alignment rule",
      "productProminence": "How dominant the product should be"
    },
    "photography": {
      "lighting": "Evidenced lighting direction and mood",
      "cameraAndEnvironment": "Evidenced camera/framing and environment",
      "backgroundTreatment": "Evidenced backdrop and color-block treatment",
      "imageTreatment": "Evidenced realism, grain, contrast, props, or retouching style"
    },
    "guardrails": {
      "do": ["4-8 specific evidence-based rules"],
      "dont": ["4-8 specific evidence-based prohibitions"]
    }
  },
  "products": [
    {
      "name": "Product or Service Name (e.g., 'Amazon S3' or 'EC2')",
      "serviceProvider": "Company/Platform providing this service if it is a cloud/digital service or tool (e.g., 'AWS', 'Google Cloud', 'Stripe', or the brand name itself)",
      "description": "Short description of the product or service (strictly 200 characters or less, rephrased for conciseness)",
      "price": "The ORIGINAL / MRP / regular (higher) price. Return ONLY the numeric value — strip all currency symbols (Rs., ₹, $, etc.) and return just the number (e.g., '249', '29.99'). Empty string if not found.",
      "offerPrice": "The DISCOUNTED / SALE / offer (lower) price if shown separately. MUST be strictly less than price. Strip currency symbols, return just the number. Empty string if no separate discounted price exists.",
      "keyBenefit": "One-liner key benefit or feature of this product/service",
      "verifiedBenefits": ["Up to 4 short, explicitly stated benefits"],
      "proofPoints": ["Up to 4 quantitative specifications or verified claims such as 5g sugar or 9g fiber"],
      "offerDetails": "Exact discount, bundle, or subscription offer in 120 characters or less; empty if absent",
      "guarantee": "Exact verified guarantee in 100 characters or less; empty if absent",
      "variantDetails": ["Up to 3 verified pack sizes or purchase options"],
      "sourceUrl": "The scanned page URL",
      "imageUrls": ["Up to 3 absolute image URLs for this product or its variants from the provided list of images"],
      "specifications": [
        {
          "label": "Auto-categorized header (e.g., Ingredients, Nutritional Facts, Material Used, Fabric, Size Chart, Fit: neck/sleeve, Claims, Cautions)",
          "value": "Extracted details from the page. Bring maximum info you can find."
        }
      ]
    }
  ]
}
"""
        product_limit = 5
        if payload.plan:
            plan_lower = payload.plan.lower()
            if "pro" in plan_lower or "agency" in plan_lower:
                product_limit = 12
            elif "growth" in plan_lower:
                product_limit = 8
        
        system_prompt = system_prompt.replace("{PRODUCT_LIMIT}", str(product_limit))

        if is_fallback:
            user_prompt = f"Scrape URL: {url} (SCRAPER BLOCKED/FAILED - PLEASE USE OFFLINE TRAINING KNOWLEDGE TO INFER DETAILS)\nTitle: {extracted['title']}\nMeta Description: {extracted['meta_description']}\n\nList of logo candidates:\nNone (scraper failed)\n\nDetected typography candidates:\nNone (scraper failed)\n\nDetected colors:\nNone (scraper failed)\n\nList of page images:\nNone (scraper failed)\n\nWebpage visible text:\n{extracted['body_text']}"
        else:
            logo_info_str = "\n".join([f"- URL: {l['src']} | Source: {l['source']}" for l in extracted["logo_candidates"]])
            typo_info_str = ", ".join(typography_candidates) if typography_candidates else "None detected"
            color_info_str = ", ".join(top_colors) if top_colors else "None detected"
            images_info_str = "\n".join([f"- URL: {img['src']} | Alt text: {img['alt']}" for img in extracted["images"]])
            user_prompt = f"Scrape URL: {url}\nTitle: {extracted['title']}\nMeta Description: {extracted['meta_description']}\n\nList of logo candidates:\n{logo_info_str}\n\nDetected typography candidates:\n{typo_info_str}\n\nDetected colors:\n{color_info_str}\n\nCompact CSS design evidence:\n{design_evidence}\n\nList of page images:\n{images_info_str}\n\nWebpage visible text:\n{extracted['body_text']}"
        
        # print("\n" + "="*80)
        # print("[WEBSITE SCANNER] [PROMPT] PROMPT BEING SENT TO GPT:")
        # print(f"System Prompt:\n{system_prompt}\n")
        # print(f"User Prompt:\n{user_prompt}")
        # print("="*80 + "\n")
        
        # The richer guide shares this existing extraction call; there is still
        # no second model request. The larger ceiling only prevents truncation
        # when a catalog and a complete design system are returned together.
        gpt_response_text = call_openai_gpt(user_prompt, openai_key, system_prompt, max_tokens=4200)
        
        # print("\n" + "="*80)
        # print("[WEBSITE SCANNER] [IN] GPT RESPONSE RECEIVED:")
        # print(gpt_response_text)
        # print("="*80 + "\n")
        
        import json
        scraped_data = json.loads(gpt_response_text)
        scraped_data["website"] = url
        
        # Keep logo image URL as is to avoid local storage quota issues
        logo_url = scraped_data.get("logo", "")
        # print(f"[WEBSITE SCANNER] [LOGO] Scraped Logo URL: {logo_url or 'None'}")

        # Convert matched product image URLs to base64 strings (skipped for quota)
        products = scraped_data.get("products", [])
        
        # Enforce plan-based limits
        plan_lower = (payload.plan or "Starter").lower()
        product_limit = 12 if "pro" in plan_lower else (8 if "growth" in plan_lower else 5)
        
        if len(products) > product_limit:
            products = products[:product_limit]
            scraped_data["products"] = products
            
        # print(f"[WEBSITE SCANNER] [PRODUCTS] Skipping base64 conversion for {len(products)} products to save storage quota...")
        
        # Normalize price / offerPrice on every product (strip currency symbols, fix swaps)
        scraped_data["products"] = [
            normalize_compact_ad_facts(normalize_product_prices(p), source_url=url)
            for p in products
            if isinstance(p, dict) and str(p.get("name") or "").strip()
        ]

        # Compact guide comes from the same extraction call: no extra LLM request.
        scraped_data["brandDesignGuide"] = generate_brand_design_guide(scraped_data)

        return scraped_data
        
    except Exception as gpt_err:
        pass
        # print(f"GPT extraction error for {url}: {gpt_err}")
        raise HTTPException(status_code=500, detail=f"AI Extraction failed: {str(gpt_err)}")

def _parse_price_num(val):
    """Extract the first numeric value from a price string like 'Rs. 249', '₹1,199', '29.99'."""
    import re
    if not val:
        return None
    s = str(val).strip()
    # Remove everything except digits, commas, periods
    s = re.sub(r'[^\d,.]', '', s)
    # Remove thousand-separator commas
    s = s.replace(',', '')
    # Extract first valid number
    m = re.search(r'\d+(?:\.\d+)?', s)
    return float(m.group()) if m else None

def normalize_product_prices(product: dict) -> dict:
    """
    Clean up price / offerPrice fields on a scraped product dict:
    - Strip currency symbols so only the numeric string remains (e.g. 'Rs. 249' → '249')
    - If offerPrice > price (AI swapped them), swap them back
    - If only one price exists, leave offerPrice empty
    """
    price_raw = product.get('price', '')
    offer_raw = product.get('offerPrice', '')

    price_num = _parse_price_num(price_raw)
    offer_num = _parse_price_num(offer_raw)

    # Normalise to plain numeric strings (strip currency symbols etc.)
    if price_num is not None:
        product['price'] = str(int(price_num)) if price_num == int(price_num) else str(price_num)
    if offer_num is not None:
        product['offerPrice'] = str(int(offer_num)) if offer_num == int(offer_num) else str(offer_num)

    # Swap if AI returned them inverted (offer > price)
    if price_num is not None and offer_num is not None and offer_num > price_num:
        product['price'], product['offerPrice'] = product['offerPrice'], product['price']

    return product


def normalize_compact_ad_facts(product: dict, source_url: str = "") -> dict:
    """Bound the small verified fact set carried into the ad Director prompt."""
    def _short_list(value, limit: int, item_chars: int = 120):
        if not isinstance(value, list):
            return []
        result = []
        seen = set()
        for item in value:
            text = str(item or "").strip()[:item_chars]
            key = text.casefold()
            if text and key not in seen:
                seen.add(key)
                result.append(text)
            if len(result) >= limit:
                break
        return result

    product["verifiedBenefits"] = _short_list(product.get("verifiedBenefits"), 4)
    product["proofPoints"] = _short_list(product.get("proofPoints"), 4)
    product["variantDetails"] = _short_list(product.get("variantDetails"), 3)
    product["offerDetails"] = str(product.get("offerDetails") or "").strip()[:120]
    product["guarantee"] = str(product.get("guarantee") or "").strip()[:100]
    product["sourceUrl"] = str(product.get("sourceUrl") or source_url or "").strip()[:500]
    return product


@app.post("/scrape-single-product")
async def api_scrape_single_product(payload: ScrapeRequest):
    url = payload.url
    openai_key = os.getenv("OPENAI_API_KEY")
    business_category = payload.businessCategory or ""
    _is_saas = is_saas_brand(business_category)
    
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
        
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
        
    is_fallback = False
    extracted = None
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        # Force offline fallback for console / login / auth / dashboard pages
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        netloc_lower = parsed_url.netloc.lower()
        path_lower = parsed_url.path.lower()
        
        is_console_or_auth = (
            "console." in netloc_lower or 
            "login" in netloc_lower or 
            "signin" in netloc_lower or 
            "auth" in netloc_lower or
            "dashboard" in netloc_lower or
            "login" in path_lower or 
            "signin" in path_lower or 
            "signup" in path_lower or
            "accounts.google" in netloc_lower
        )
        if is_console_or_auth:
            raise Exception("Console or auth-walled URL detected. Forcing offline LLM synthesis fallback.")

        try:
            response = requests.get(url, headers=headers, timeout=12, verify=False)
        except Exception as e:
            if url.startswith("https://"):
                url_http = url.replace("https://", "http://")
                response = requests.get(url_http, headers=headers, timeout=12, verify=False)
            else:
                raise e
                
        response.raise_for_status()
        html_content = response.text
        
        parser = HTMLMetadataExtractor(base_url=url, is_saas=_is_saas)
        parser.feed(html_content)
        extracted = parser.get_content()
        
        # Inject standard fallback logo as a candidate to ensure high-quality logo detection for cloud/digital services
        fallback_logos_mapping = {
            "amazon s3": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg",
            "s3": "https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg",
            "amazon ec2": "https://upload.wikimedia.org/wikipedia/commons/9/99/AWS_Simple_Icons_Compute_Amazon_EC2.svg",
            "ec2": "https://upload.wikimedia.org/wikipedia/commons/9/99/AWS_Simple_Icons_Compute_Amazon_EC2.svg",
            "amazon web services": "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
            "amazon": "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
            "aws": "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
            "google cloud": "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
            "gcp": "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg",
            "stripe": "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg",
            "salesforce": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
            "mongodb": "https://upload.wikimedia.org/wikipedia/commons/3/32/MongoDb-Logo.svg",
        }
        
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        netloc_lower = parsed_url.netloc.lower()
        path_lower = parsed_url.path.lower()
        title_lower = extracted.get("title", "").lower()
        
        injected_logo = ""
        injected_alt = ""
        if "s3" in path_lower or "s3" in netloc_lower or "s3" in title_lower:
            injected_logo = fallback_logos_mapping["amazon s3"]
            injected_alt = "Amazon S3 Logo"
        elif "ec2" in path_lower or "ec2" in netloc_lower or "ec2" in title_lower:
            injected_logo = fallback_logos_mapping["amazon ec2"]
            injected_alt = "Amazon EC2 Logo"
        elif "aws" in netloc_lower or "amazon" in netloc_lower or "aws" in title_lower:
            injected_logo = fallback_logos_mapping["aws"]
            injected_alt = "Amazon Web Services Logo"
        elif "stripe" in netloc_lower or "stripe" in title_lower:
            injected_logo = fallback_logos_mapping["stripe"]
            injected_alt = "Stripe Logo"
        elif "salesforce" in netloc_lower or "salesforce" in title_lower:
            injected_logo = fallback_logos_mapping["salesforce"]
            injected_alt = "Salesforce Logo"
        elif "mongodb" in netloc_lower or "mongodb" in title_lower:
            injected_logo = fallback_logos_mapping["mongodb"]
            injected_alt = "MongoDB Logo"
        elif "google cloud" in title_lower or "gcp" in netloc_lower or "google cloud" in netloc_lower:
            injected_logo = fallback_logos_mapping["google cloud"]
            injected_alt = "Google Cloud Logo"
            
        if injected_logo:
            if "logo_candidates" not in extracted:
                extracted["logo_candidates"] = []
            extracted["logo_candidates"].append({"src": injected_logo, "alt": injected_alt, "source": "injected-fallback"})
            # print(f"[SCRAPER] Injected fallback logo candidate: {injected_logo} for URL {url}")
        
        if not extracted["body_text"].strip():
            raise Exception("No readable text content found on the webpage.")
            
    except Exception as scrape_err:
        # Never spend tokens synthesizing a physical product that could not be
        # verified. SaaS/service URLs retain the legacy fallback because many
        # of them are intentionally auth-walled.
        if not _is_saas:
            raise HTTPException(
                status_code=422,
                detail="The product page could not be read. Add the product manually instead."
            )
        is_fallback = True
        
        # Parse host/path to infer service details
        from urllib.parse import urlparse
        parsed_url = urlparse(url)
        path_parts = [p for p in parsed_url.path.split('/') if p]
        domain_parts = parsed_url.netloc.split('.')
        
        # If AWS console url e.g. console.aws.amazon.com/ec2/home
        inferred_name = ""
        netloc_lower = parsed_url.netloc.lower()
        if "aws" in netloc_lower or "amazon" in netloc_lower:
            # Check path or subdomain
            aws_service = ""
            for part in path_parts + domain_parts:
                if part.lower() in ["ec2", "s3", "rds", "lambda", "dynamodb", "ecs", "eks", "sqs", "sns", "iam", "route53", "cloudfront", "vpc"]:
                    aws_service = part.upper()
                    break
            if aws_service:
                inferred_name = f"Amazon {aws_service}"
            else:
                inferred_name = "Amazon Web Services"
        elif "stripe" in netloc_lower:
            inferred_name = "Stripe Payments"
        elif "salesforce" in netloc_lower:
            inferred_name = "Salesforce CRM"
        elif "mongodb" in netloc_lower:
            inferred_name = "MongoDB Atlas"
        elif "google" in netloc_lower or "gcp" in netloc_lower:
            inferred_name = "Google Cloud Platform"
        else:
            # General fallback: get last non-empty path part or domain name
            if path_parts:
                inferred_name = path_parts[-1].replace('-', ' ').replace('_', ' ').capitalize()
            else:
                inferred_name = domain_parts[-2].capitalize() if len(domain_parts) >= 2 else domain_parts[0].capitalize()
                
        # Fallback logos for common services (ordered by specificity)
        fallback_logos_ordered = [
            ("amazon s3", "https://upload.wikimedia.org/wikipedia/commons/b/bc/Amazon-S3-Logo.svg"),
            ("amazon ec2", "https://upload.wikimedia.org/wikipedia/commons/9/99/AWS_Simple_Icons_Compute_Amazon_EC2.svg"),
            ("amazon web services", "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"),
            ("google cloud", "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg"),
            ("salesforce", "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg"),
            ("mongodb", "https://upload.wikimedia.org/wikipedia/commons/3/32/MongoDb-Logo.svg"),
            ("stripe", "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"),
            ("amazon", "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"),
            ("aws", "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"),
            ("gcp", "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg"),
        ]
        logo_url = ""
        lower_inferred = inferred_name.lower()
        for key, val in fallback_logos_ordered:
            if key in lower_inferred:
                logo_url = val
                break
                
        extracted = {
            "title": inferred_name,
            "meta_description": f"Service details for {inferred_name}",
            "body_text": f"Scraping was blocked by firewall or required login. Synthesizing details for service/product: {inferred_name}.",
            "images": [{"src": logo_url, "alt": inferred_name}] if logo_url else []
        }
        
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API Key is missing on the server. Please configure OPENAI_API_KEY in the backend.")
        
    try:
        system_prompt = """You are an expert product and service cataloging agent. 
Analyze the website's title, meta description, lists of found image URLs, and body text content to extract the details of the main product, SaaS tool, feature, or cloud/digital service (e.g., AWS EC2, S3, Stripe Payments, MongoDB Atlas, Salesforce CRM, etc.) shown on this page.

Your output must be a valid JSON object matching the following structure. Do NOT extract multiple products or services, just the primary one. If any detail is not found, keep it as an empty string ("")—DO NOT invent fake information.
The description MUST be strictly 200 characters or less.

Identify the service provider (e.g. AWS/Amazon Web Services, Google Cloud, Microsoft, Stripe, Shopify, or the brand name itself) if the page describes a service, API, or cloud infrastructure component.

CRITICAL INSTRUCTION: Dive deep into the webpage text. Often, details like "Ingredients", "How to use", "Product Details", or "Key Features" are available. You MUST extract these sections comprehensively and add them as individual items in the `specifications` array. Do not just return basic fields.

For the product/service, select exactly 2 of the most relevant image URLs from the provided list. CRITICAL: The 1st URL in the array MUST be the FRONT/PRIMARY view of the product. The 2nd URL MUST be the BACK/SECONDARY view (or the ingredient/nutrition label). Use the image alt text and filenames to infer the angle (e.g., looking for words like "front", "back", "label"). If a back view cannot be found, provide the 2 best standalone product shots. Store these in the `imageUrls` array. If no matching image is found, leave `imageUrls` empty.

JSON Structure:
{
  "name": "Product or Service Name (e.g., 'Amazon S3' or 'EC2')",
  "serviceProvider": "The company/platform providing this service (e.g., 'AWS' or 'Amazon Web Services', 'Google Cloud', 'Stripe', 'Salesforce')",
  "description": "Short description (strictly 200 characters or less, rephrased for conciseness)",
  "price": "The ORIGINAL / MRP / regular (higher) price of the product shown on the page. Extract the numeric value only — strip all currency symbols (Rs., ₹, $, etc.) and return just the number (e.g., '249', '29.99'). Use an empty string if not found.",
  "offerPrice": "The DISCOUNTED / SALE / offer (lower) price, if shown separately from the original price. MUST be strictly less than `price` — if the page only shows one price, leave this empty. Never put a higher value here than in `price`. Strip currency symbols and return just the number (e.g., '199'). Use an empty string if no separate discounted price exists.",
  "keyBenefit": "One-liner key benefit or feature of this product/service",
  "verifiedBenefits": ["Up to 4 short, explicitly stated benefits"],
  "proofPoints": ["Up to 4 quantitative specifications or verified claims"],
  "offerDetails": "Exact discount, bundle, or subscription offer in 120 characters or less; empty if absent",
  "guarantee": "Exact verified guarantee in 100 characters or less; empty if absent",
  "variantDetails": ["Up to 3 verified pack sizes or purchase options"],
  "specifications": [
    {
      "label": "Section Name (e.g., Ingredients, How to Use, Product Details, Specifications, Material)",
      "value": "Extract the FULL text from these sections. Dive deep into the webpage text—do not summarize too heavily if it contains important ingredients or instructions."
    }
  ],
  "sourceUrl": "The scanned page URL",
  "imageUrls": [
    "1st MUST be FRONT PRIMARY view",
    "2nd MUST be BACK SECONDARY view (if available)"
  ]
}
"""
        all_imgs = extracted.get("images", [])
        if "logo_candidates" in extracted:
            all_imgs = all_imgs + extracted["logo_candidates"]
            
        images_info_str = "\n".join([f"- URL: {img.get('src', '')} | Alt text: {img.get('alt', '')}" for img in all_imgs])
        user_prompt = f"Scrape URL: {url}\nTitle: {extracted['title']}\nMeta Description: {extracted['meta_description']}\n\nList of page images:\n{images_info_str}\n\nWebpage visible text:\n{extracted['body_text']}"
        
        gpt_response_text = call_openai_gpt(user_prompt, openai_key, system_prompt, max_tokens=900)
        
        import json
        scraped_data = json.loads(gpt_response_text)
        
        # Normalize price / offerPrice (strip currency symbols like 'Rs. 249' → '249', fix swapped values)
        scraped_data = normalize_compact_ad_facts(
            normalize_product_prices(scraped_data),
            source_url=url,
        )
            
        return scraped_data
        
    except Exception as gpt_err:
        pass
        # print(f"GPT extraction error for single product {url}: {gpt_err}")
        raise HTTPException(status_code=500, detail=f"AI Extraction failed: {str(gpt_err)}")


@app.post("/analyze-mix")
async def api_analyze_mix(userId: str = Query(...), durationWeeks: int = Query(1)):
    """
    Returns an optimized content mix based on the brand's profile from MongoDB.
    """
    try:
        # print(f"DEBUG: Analyzing mix for user {userId}")
        # Fetch brand profile (searching by either profile ID or user ID for robustness)
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId) if ObjectId.is_valid(userId) else userId},
                {"user": ObjectId(userId) if ObjectId.is_valid(userId) else userId}
            ]
        })
        
        if not brand_doc:
            # print(f"DEBUG: Brand profile NOT FOUND for user {userId}")
            raise HTTPException(status_code=404, detail="Brand profile not found")
        
        # print(f"DEBUG: Brand profile found for {brand_doc.get('brandName')}")

        brand_info = {
            "brandName": brand_doc.get("brandName", "Unknown"),
            "businessCategory": (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "General")),
            "brandTone": brand_doc.get("brandTone", "Professional"),
            "targetAudiences": brand_doc.get("targetAudiences", []),
            "usp": brand_doc.get("usp", "Not specified"),
            "painPoint": brand_doc.get("painPoint", "Not specified"),
            "mainGoal": brand_doc.get("mainGoal", "Growth"),
            "selectedPlan": brand_doc.get("selectedPlan", "SyncSocio Starter"),
            "durationWeeks": durationWeeks
        }
        
        # print("DEBUG: Calling analyze_brand_mix agent...")
        result = analyze_brand_mix(brand_info)
        # print(f"DEBUG: Agent Response: {result}")
        return result
    except Exception as e:
        pass
        # print(f"ERROR in /analyze-mix: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-strategy")
async def api_generate_strategy(brand_info: BrandInfo):
    try:
        # print(f"DEBUG: Generating strategy for ID: {brand_info.userId}")
        # 1. Fetch the full brand data from MongoDB (searching by either profile ID or user ID)
        brand_doc = await brand_collection.find_one({
            "$or": [
                {"_id": ObjectId(brand_info.userId) if ObjectId.is_valid(brand_info.userId) else brand_info.userId},
                {"user": ObjectId(brand_info.userId) if ObjectId.is_valid(brand_info.userId) else brand_info.userId},
                {"brandName": brand_info.brandName}
            ]
        })
        if not brand_doc:
            # Last ditch: search by user ID as string or object
            brand_doc = await brand_collection.find_one({
               "user": brand_info.userId
            })
            
        if not brand_doc:
            raise HTTPException(status_code=404, detail=f"Brand profile not found for ID: {brand_info.userId}")
            
        # print(f"Generating strategy for: {brand_doc.get('brandName')}")
        
        # Construct the context for the agent
        full_brand_profile = {
            "brandName": brand_doc.get("brandName"),
            "businessCategory": (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "General")),
            "brandTone": brand_doc.get("brandTone"),
            "targetAudiences": brand_doc.get("targetAudiences", []),
            "usp": brand_doc.get("usp"),
            "painPoint": brand_doc.get("painPoint"),
            "mainGoal": brand_doc.get("mainGoal"),
            "primaryColor": brand_doc.get("primaryColor", "#2563EB"),
            "secondaryColor": brand_doc.get("secondaryColor", "#60A5FA"),
            "visualVibe": brand_doc.get("visualVibe", "Modern"),
            "brandKeywords": brand_doc.get("brandKeywords", ""),
            "selectedPlan": brand_doc.get("selectedPlan", "SyncSocio Starter")
        }
        
        product_brief = brand_info.productBrief or {}
        if not isinstance(product_brief, dict):
            product_brief = {}
        # Add businessCategory from brand profile to product_brief
        product_brief['category'] = full_brand_profile.get('businessCategory', 'General')
        
        suggested_mix = brand_info.suggestedMix
        custom_instruction = brand_info.customInstruction
        duration_weeks = brand_info.durationWeeks
        
        # 2. Run the LangGraph Agent
        result = generate_strategy(
            full_brand_profile, 
            product_brief, 
            suggested_mix=suggested_mix,
            custom_instruction=custom_instruction,
            duration_weeks=duration_weeks
        )
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        
        calendar = result.get("content_calendar", [])
        # Add stable IDs to posts
        for idx, post in enumerate(calendar):
            if "id" not in post:
                post["id"] = str(idx + 1)
        
        # 3. DM Flow Intelligence Agent — analyse each post for DM automation
        try:
            calendar = process_calendar_for_dm_flows(calendar, full_brand_profile)
        except Exception as dm_err:
            pass
            # print(f"[DM-AGENT] Non-critical error (strategy still valid): {dm_err}")

        # 4. Save generated DM flows to MongoDB
        dm_flows_created = []
        for post in calendar:
            dm_flow = post.get("dm_flow")
            if dm_flow:
                dm_flow_doc = {
                    "user": ObjectId(brand_info.userId),
                    "name": dm_flow.get("name", "AI Suggested Flow"),
                    "trigger": dm_flow.get("trigger", "comment"),
                    "targetType": dm_flow.get("targetType", "all"),
                    "targetMediaId": dm_flow.get("targetMediaId", ""),
                    "keyword": dm_flow.get("keyword", "LINK"),
                    "keywordNormalized": dm_flow.get("keyword", "link").strip().lower(),
                    "commentReplyMessage": dm_flow.get("commentReplyMessage", ""),
                    "messages": dm_flow.get("messages", []),
                    "active": False,
                    "source": "ai_suggested",
                    "linkedPostId": post.get("id"),
                    "linkedPostTopic": post.get("topic", ""),
                    "stats": {"triggered": 0, "replied": 0, "clicked": 0, "conversions": 0},
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }
                try:
                    insert_result = await dm_flows_collection.insert_one(dm_flow_doc)
                    dm_flow["_id"] = str(insert_result.inserted_id)
                    dm_flows_created.append(dm_flow)
                    # print(f"[DM-AGENT] 💾 Saved draft DM flow: {dm_flow.get('name')} (ID: {dm_flow['_id']})")
                except Exception as save_err:
                    pass
                    # print(f"[DM-AGENT] ⚠️ Failed to save DM flow: {save_err}")

        # 5. Save calendar to MongoDB
        calendar_entry = {
            "userId": ObjectId(brand_info.userId),
            "posts": calendar,
            "durationWeeks": duration_weeks,
            "createdAt": datetime.now(timezone.utc),
            "status": "active"
        }
        
        await calendar_collection.insert_one(calendar_entry)
        
        await log_api_call("GEMINI", "/generate-strategy", cost_in_cents=2.0, user_id=brand_info.userId)
        # print(f"[DM-AGENT] 🎉 Strategy complete: {len(calendar)} posts, {len(dm_flows_created)} DM flows")
        
        return {
            "userId": brand_info.userId,
            "calendar": calendar,
            "dmFlows": dm_flows_created
        }
    except Exception as e:
        await log_api_call("GEMINI", "/generate-strategy", cost_in_cents=0, is_error=True, error_message=str(e), user_id=brand_info.userId if 'brand_info' in locals() else None)
        # print(f"Error in strategy generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regenerate-strategy")
async def api_regenerate_strategy(brand_info: BrandInfo):
    """
    Regenerates ONLY the rejected posts while preserving the overall schedule format.
    """
    try:
        # print(f"DEBUG: Regenerating {len(brand_info.rejectedItems or [])} items for user {brand_info.userId}")
        
        full_brand_profile = {
            "userId": brand_info.userId,
            "brandName": brand_info.brandName,
            "businessCategory": brand_info.businessCategory,
            "mainGoal": brand_info.mainGoal,
            "targetAudiences": brand_info.targetAudiences,
            "brandTone": brand_info.brandTone,
            "visualVibe": brand_info.visualVibe,
            "socialPlatforms": brand_info.socialPlatforms,
            "primaryColor": brand_info.primaryColor,
            "secondaryColor": brand_info.secondaryColor,
            "usp": brand_info.usp,
            "painPoint": brand_info.painPoint,
            "selectedPlan": brand_info.selectedPlan,
            "durationWeeks": brand_info.durationWeeks,
        }
        
        product_brief = brand_info.productBrief or {}
        if not isinstance(product_brief, dict):
            product_brief = {}
        if not product_brief.get("name"):
            product_brief["name"] = ""
        if not product_brief.get("description"):
            product_brief["description"] = ""
        rejected_items = [{"id": r.id, "prompt": r.prompt} for r in (brand_info.rejectedItems or [])]
        
        result = generate_strategy(
            full_brand_profile, 
            product_brief, 
            suggested_mix={},
            custom_instruction="",
            rejected_items=rejected_items,
            duration_weeks=brand_info.durationWeeks
        )
        
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])
        
        calendar = result.get("content_calendar", [])
        # Add stable IDs to posts
        for idx, post in enumerate(calendar):
            if "id" not in post:
                post["id"] = str(idx + 1)
        return {"content_calendar": calendar}
        
    except Exception as e:
        pass
        # print(f"DEBUG: Exception in regenerate strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-plan")
async def api_generate_plan(payload: Dict[str, Any]):
    user_id = payload.get('userId')
    try:
        brand_data = payload.get('brand_info', payload)
        brand_name = brand_data.get('brandName', 'Unknown')
        # print(f"DEBUG: Generating 7-day plan for {brand_name}")
        result = generate_weekly_plan(payload)
        await log_api_call("GEMINI", "/generate-plan", cost_in_cents=1.0, user_id=user_id)
        return {
            "plan": result.get("plan", []),
            "prompts": result.get("prompts", []),
            "count": len(result.get("plan", []))
        }
    except Exception as e:
        await log_api_call("GEMINI", "/generate-plan", cost_in_cents=0, is_error=True, error_message=str(e), user_id=user_id)
        # print(f"Error in plan generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-captions")
async def api_generate_captions(payload: Dict[str, Any]):
    user_id = payload.get('userId')
    try:
        brand_name = payload.get('brandName', 'Unknown')
        # print(f"DEBUG: Generating captions for {brand_name}")
        result = generate_captions_and_hashtags(payload)
        await log_api_call("GEMINI", "/generate-captions", cost_in_cents=1.0, user_id=user_id)
        return {
            "captions": result.get("captions", []),
            "prompts": result.get("prompts", []),
            "count": len(result.get("captions", []))
        }
    except Exception as e:
        await log_api_call("GEMINI", "/generate-captions", cost_in_cents=0, is_error=True, error_message=str(e), user_id=user_id)
        # print(f"Error in caption generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate-post")
async def api_validate_post(
    files: List[UploadFile] = File(...),
    userId: str = Form(...),
    contentType: str = Form(...),
    description: str = Form(...)
):
    try:
        # 1. Save uploaded files locally
        media_paths = []
        upload_dir = "uploaded_posts"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            media_path = f"{upload_dir}/{userId}_{timestamp}{ext}"
            with open(media_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)
            media_paths.append(media_path)

        # 2. Fetch brand profile (searching by both ID types)
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId)},
                {"user": ObjectId(userId)}
            ]
        })
        loc = brand_doc.get("location", {}) if brand_doc else {}
        location_str = f"{loc.get('city', '')}, {loc.get('country', '')}".strip(", ") or "Global"
        
        brand_profile = {
            "brandName": brand_doc.get("brandName", "") if brand_doc else "",
            "businessCategory": (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")) if brand_doc else "",
            "mainGoal": brand_doc.get("mainGoal", "") if brand_doc else "",
            "brandTone": brand_doc.get("brandTone", "Professional & Engaging") if brand_doc else "",
            "targetAudience": ", ".join(brand_doc.get("targetAudiences", [])) if brand_doc else "General",
            "usp": brand_doc.get("usp", "") if brand_doc else "",
            "primaryCTA": brand_doc.get("primaryCTA", "") if brand_doc else "",
            "businessLocation": location_str,
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
        }

        # 3. Retrieve 'Winner's Circle' posts from Vector Search
        winner_posts = await find_similar_posts(description, userId)

        # 4. Run SyncSocio Optimizer Flow
        result = optimize_post({
            "userId": userId,
            "mediaPaths": media_paths,
            "contentType": contentType,
            "description": description,
            "brandProfile": brand_profile,
            "winnerPosts": winner_posts
        })

        # 5. Save to MongoDB and return
        analysis_entry = {
            "userId": ObjectId(userId),
            "mediaUrl": media_paths[0] if media_paths else "",
            "mediaUrls": media_paths,
            "contentType": contentType,
            "description": description,
            "growthFactor": result.get("growth_factor", 0),
            "analysis": result.get("critique", {}),
            "bestPostingTime": result.get("best_posting_time", ""),
            "suggestions": result.get("suggestions", []),
            "status": "analyzed",
            "createdAt": datetime.now(timezone.utc)
        }
        insert_result = await db["post_analyses"].insert_one(analysis_entry)

        return {
            "analysisId": str(insert_result.inserted_id),
            "growthFactor": result.get("growth_factor", 0),
            "critique": result.get("critique", {}),
            "bestPostingTime": result.get("best_posting_time", ""),
            "suggestions": result.get("suggestions", []),
            "mediaPaths": media_paths
        }
    except Exception as e:
        pass
        # print(f"Validate Post Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/smart-schedule")
async def api_smart_schedule(request: Request):
    """Generates intelligent scheduling recommendations for selected posts."""
    try:
        from scheduler_agent import optimize_schedule
        payload = await request.json()
        result = optimize_schedule(payload)
        return {"schedule": result}
    except Exception as e:
        pass
        # print(f"Smart Schedule Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/schedule-post/{analysis_id}")
async def api_schedule_post(analysis_id: str, request: Request):
    """Triggers auto-publish for a previously analyzed post."""
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        body = await request.json()
        platforms = body.get("platforms", {"instagram": True, "facebook": False})
        scheduled_at = body.get("scheduledAt") # New: respect manual adjustments
        
        doc = await db["post_analyses"].find_one({"_id": ObjectId(analysis_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Analysis not found")

        # Fetch brand profile for credentials
        brand_doc = await db["brandprofiles"].find_one({"user": ObjectId(doc["userId"])})
        brand_profile = {
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
            "instagramPageId": brand_doc.get("instagramPageId", "") if brand_doc else "",
            "instagramPageAccessToken": brand_doc.get("instagramPageAccessToken", "") if brand_doc else "",
        }

        # Build state for publisher
        post_state = {
            "user_id": doc["userId"],
            "media_paths": doc.get("mediaUrls", [doc.get("mediaUrl")]),
            "content_type": doc["contentType"],
            "description": doc["description"],
            "brand_profile": brand_profile,
            "account_insights": {},
            "winner_posts": [],
            "critique": doc.get("analysis", {}),
            "growth_factor": doc.get("growthFactor", 0),
            "best_posting_time": scheduled_at or doc.get("bestPostingTime", ""),
            "suggestions": doc.get("suggestions", []),
            "media_analysis": "",
            "iteration": 0,
            "error": "",
            "platforms": platforms
        }

        result = publisher_node(post_state)

        # Check if scheduled for future
        is_future_scheduled = False
        best_time_iso = post_state.get("best_posting_time")
        if best_time_iso:
            try:
                scheduled_dt = datetime.fromisoformat(best_time_iso)
                now_dt = datetime.now(scheduled_dt.tzinfo) if scheduled_dt.tzinfo else datetime.now()
                diff_mins = (scheduled_dt - now_dt).total_seconds() / 60
                if 20 < diff_mins < (75 * 24 * 60):
                    is_future_scheduled = True
            except Exception as pe:
                pass
                # print(f"[PUBLISHER DEBUG] Error comparing datetime: {pe}")

        if result.get("error"):
            status = "failed"
        elif is_future_scheduled:
            status = "scheduled"
        else:
            status = "published"

        update_fields = {
            "status": status,
            "isAgentAssisted": True
        }
        if result.get("ig_media_id"):
            update_fields["instagramMediaId"] = result["ig_media_id"]
        if result.get("permanent_url"):
            update_fields["permanentUrl"] = result["permanent_url"]
        
        # Save the actual scheduled time for History grouping
        # If it was published IMMEDIATELY (fallback), we use now. Otherwise use the target time.
        if status == "published" and result.get("permanent_url"):
            update_fields["scheduledAt"] = datetime.now(timezone.utc)
        elif post_state.get("best_posting_time"):
            try:
                # best_posting_time may be an ISO string
                if isinstance(post_state["best_posting_time"], str):
                    update_fields["scheduledAt"] = datetime.fromisoformat(post_state["best_posting_time"].replace('Z', '+00:00'))
                else:
                    update_fields["scheduledAt"] = post_state["best_posting_time"]
            except Exception:
                update_fields["scheduledAt"] = datetime.now(timezone.utc)
        else:
            update_fields["scheduledAt"] = datetime.now(timezone.utc)

        await db["post_analyses"].update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": update_fields}
        )

        return {"status": status, "error": result.get("error", "")}
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid analysis ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/direct-publish")
async def api_direct_publish(
    files: List[UploadFile] = File(...),
    userId: str = Form(...),
    contentType: str = Form(...),
    description: str = Form(...),
    platforms: str = Form(...),
    scheduledAt: Optional[str] = Form(None)
):
    """Bypasses optimization and publishes content directly."""
    import json
    from bson import ObjectId
    try:
        # 1. Parse platforms JSON string
        try:
            platforms_dict = json.loads(platforms)
        except:
            platforms_dict = {"instagram": True, "facebook": False}

        # 2. Save uploaded files locally
        media_paths = []
        upload_dir = "uploaded_posts"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            ext = os.path.splitext(file.filename)[1]
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            media_path = f"{upload_dir}/{userId}_{timestamp}{ext}"
            with open(media_path, "wb") as buf:
                shutil.copyfileobj(file.file, buf)
            media_paths.append(media_path)

        # 3. Fetch brand profile for credentials
        brand_doc = await db["brandprofiles"].find_one({
            "$or": [
                {"_id": ObjectId(userId)},
                {"user": ObjectId(userId)}
            ]
        })
        brand_profile = {
            "instagramAccessToken": brand_doc.get("instagramAccessToken", "") if brand_doc else "",
            "instagramBusinessAccountId": brand_doc.get("instagramBusinessAccountId", "") if brand_doc else "",
            "instagramPageId": brand_doc.get("instagramPageId", "") if brand_doc else "",
            "instagramPageAccessToken": brand_doc.get("instagramPageAccessToken", "") if brand_doc else "",
        }

        # 4. Build state for publisher (Minimum state needed)
        post_state = {
            "user_id": userId,
            "media_paths": media_paths,
            "content_type": contentType,
            "description": description,
            "brand_profile": brand_profile,
            "account_insights": {},
            "winner_posts": [],
            "critique": {"improved_hook": description, "hashtags": []}, # No AI changes
            "growth_factor": 0,
            "best_posting_time": scheduledAt,
            "suggestions": [],
            "media_analysis": "Direct Publish",
            "iteration": 0,
            "error": "",
            "platforms": platforms_dict
        }

        # 5. Run Publisher directly
        result = publisher_node(post_state)

        status = "failed" if result.get("error") else "published"
        
        # 6. Save to history (post_analyses)
        analysis_entry = {
            "userId": ObjectId(userId),
            "mediaUrl": media_paths[0] if media_paths else "",
            "mediaUrls": media_paths,
            "contentType": contentType,
            "description": description,
            "growthFactor": 0,
            "analysis": post_state["critique"],
            "bestPostingTime": scheduledAt or datetime.now(timezone.utc).isoformat(),
            "scheduledAt": datetime.fromisoformat(scheduledAt.replace('Z', '+00:00')) if scheduledAt else datetime.now(timezone.utc),
            "suggestions": [],
            "status": status,
            "isAgentAssisted": False, # Flag as direct
            "createdAt": datetime.now(timezone.utc),
            "platforms": platforms_dict
        }
        
        if result.get("ig_media_id"):
            analysis_entry["instagramMediaId"] = result["ig_media_id"]
        if result.get("permanent_url"):
            analysis_entry["permanentUrl"] = result["permanent_url"]

        await db["post_analyses"].insert_one(analysis_entry)

        return {"status": status, "error": result.get("error", "")}
    except Exception as e:
        pass
        # print(f"Direct Publish Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class VisualGenRequest(BaseModel):
    prompt: str
    format: str
    slides: Optional[int] = 2
    image: Optional[str] = None
    slide_prompts: Optional[List[str]] = None
    category: Optional[str] = "Lifestyle/Luxury"
    headline: Optional[str] = "Viral Content"
    userId: Optional[str] = None

def map_category_for_refiner(business_category: str) -> str:
    """
    Maps comprehensive business categories from Onboarding to Refiner Agent categories.
    
    Returns one of:
    - "Lifestyle/Luxury" - for premium, aesthetic-focused brands
    - "Startups/Tech" - for tech, SaaS, digital products
    - "Advertising Poster/Sale" - for e-commerce, promotions
    """
    category_lower = business_category.lower()
    
    # Lifestyle/Luxury categories
    luxury_keywords = [
        'baby', 'kids', 'food', 'beverage', 'fashion', 'apparel', 
        'beauty', 'personal care', 'home', 'living', 'travel', 'hospitality'
    ]
    
    # Tech/Startups categories
    tech_keywords = [
        'mobile', 'apps', 'technical', 'tools', 'saas', 'digital', 
        'online marketplace', 'it'
    ]
    
    # E-Commerce/Sale categories
    ecommerce_keywords = [
        'e-commerce', 'ecommerce', 'gaming', 'entertainment', 'newsletter'
    ]
    
    # Check for matches
    if any(keyword in category_lower for keyword in luxury_keywords):
        return "Lifestyle/Luxury"
    elif any(keyword in category_lower for keyword in tech_keywords):
        return "Startups/Tech"
    elif any(keyword in category_lower for keyword in ecommerce_keywords):
        return "Advertising Poster/Sale"
    else:
        # Default for services, education, real estate, etc.
        return "Lifestyle/Luxury"

async def refine_image_prompt(brand_dna: str, user_desc: str, headline: str, category: str, prev_slide_context: Optional[str] = None):
    """
    The 'Refiner Agent' System Instruction implementation.
    Transforms raw input into a professional, high-fidelity image prompt.
    """
    system_instruction = f"""
Role: You are an expert AI Prompt Architect for Nano Banana 2 (Gemini 3.1 Flash Image). Your task is to transform raw user input into a professional, high-fidelity image prompt.

Judging Criteria & Decision Tree:
Analyze the USER_INPUT and apply the following logic:

IF Category is "Lifestyle/Luxury" (Jewelry, Cosmetics, F&B):
Focus: Aesthetic elegance and texture.
Mandatory: Soft cinematic studio lighting, 85mm f/1.8 lens for shallow depth of field, premium materials (marble, velvet, silk), and warm or jewel-tone palettes.
Rule: Product must be the hero, centered with soft-focus bokeh.

IF Category is "Startups/Tech" (SaaS, Apps, AaaS):
Focus: Trust, clarity, and realism.
Mandatory: Natural daylight, clean white spaces (minimalism), real-world environments (wood desks, plants).
Strict Rule: Even if "iPhone" or "MacBook" is mentioned, generate it in a natural, bright environment—NEVER use dark "gaming" studios or glowing neon desk setups unless explicitly requested.

IF Category is "Advertising Poster/Sale":
Focus: Bold hierarchy and readability.
Mandatory: 4:5 aspect ratio, high-contrast colors, clear separation between the background and the text overlay area. Use "Graphic Design" keywords like 'bold Swiss-style layout' or 'modern sans-serif typography'.

IF Category is "Carousel Slide":
Focus: Perfect symmetry and safe zones for Instagram UI.
Layout Rule: Split the composition into three horizontal bands.
Top 20%: Reserved for the Headline.
Center 60%: Reserved for the primary Product/Subject.
Bottom 20%: Reserved for the CTA/Subtext.
Mandatory: Explicitly mention "Clean minimal layout, 4:5 aspect ratio."
Visual Rule: Ensure the background (e.g., gradient) is seamless so it connects visually if the user generates multiple slides. 

Memory Rule: If 'Previous Slide Context' is provided, maintain 100% visual consistency with it (lighting, background, material physics) while only changing the primary subject/action.

Global Rules (Apply to all):
- ZERO LABEL POLICY: Strictly DO NOT include keywords like "HEADLINE:", "SUBTEXT:", or "TEXT:" in your output. Only provide the raw copy.
- NO BRACKETS: Strictly DO NOT use square brackets [ or ] in the text.
- TEXT VISIBILITY: Ensure the text color provides maximum contrast against the background elements.
- CONTENT SPECIFIC RULES:
  * For "Static Image": ALWAYS set TEXT OVERLAY to "STRICTLY NO TEXT. THE IMAGE MUST BE PURE PHOTOGRAPHY WITH NO LETTERS, LOGOS, OR CHARACTERS."
  * For "Carousel Slide": The TEXT OVERLAY must ONLY contain the raw creative copy for that slide. Each slide MUST have a unique headline/subtext that progresses the narrative.

Output Format (Example):
"A bright modern tech-lab with soft blue lighting. A technician is focused on a intricate repair. The main headline 'FAST REPAIR' is visible in a bold white sans-serif font at the top. Directly underneath it, the smaller subtext 'Quality you can count on' is layered in a clean readable font. Shot on 35mm, ISO 100."

[ENSURE NO BRACKETS, NO LABELS, NO REPETITION, MUST INCLUDE UNIQUE SUBTEXT]

Input Data:
Brand DNA: {brand_dna}
Slide Strategic Context: {user_desc}
Category: {category}
Previous Slide Context: {prev_slide_context if prev_slide_context else "None (This is the first slide)"}

Output Guidelines:
Return ONLY the raw cinematic prompt. DO NOT include meta-labels. 
Example of what NOT to do: "Headline: Hello". 
Example of what TO DO: "A bright office. A person typing. The text 'UPGRADE NOW' in bold white."
"""
    try:
        client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        # Using gemini-2.5-flash as the "Refiner Agent" (Nano Banana 2)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=system_instruction
        )
        refined_prompt = response.text.strip()
        
        # Enforce max character limit (increased to 5000 to prevent text overlay description truncation)
        if len(refined_prompt) > 5000:
            refined_prompt = refined_prompt[:4997] + "..."
            
        return refined_prompt
    except Exception as e:
        pass
        # print(f"Refiner Agent Error: {str(e)}")
        return user_desc # Fallback to original description

@app.post("/generate-visuals")
async def api_generate_visuals(request: VisualGenRequest):
    try:
        # Step 0: Fetch Brand DNA and Industry Category from Brand Profile
        brand_dna = "A premium growth-focused brand."
        industry_category = "Lifestyle/Luxury"  # Default fallback
        img_quality = "low"
        
        if request.userId:
            brand_doc = await db["brandprofiles"].find_one({
                "$or": [
                    {"_id": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId},
                    {"user": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId}
                ]
            })
            
            user_plan = "starter"
            if brand_doc:
                user_plan = str(brand_doc.get("selectedPlan", "starter")).lower()
            img_quality = "medium" if "pro" in user_plan.lower() else "low"

            if brand_doc:
                location = brand_doc.get('location')
                country = 'Unknown'
                if isinstance(location, dict):
                    country = location.get('country') or brand_doc.get('country') or 'Unknown'
                else:
                    country = brand_doc.get('country') or 'Unknown'

                brand_dna = f"""
                Brand: {brand_doc.get('brandName')}
                Country: {country}
                Goal: {brand_doc.get('mainGoal')}
                Category: {(brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "General"))}
                Tone: {brand_doc.get('brandTone')}
                Vibe: {brand_doc.get('visualVibe')}
                USP: {brand_doc.get('usp')}
                Pain Point: {brand_doc.get('painPoint')}
                Target: {", ".join(brand_doc.get('targetAudiences', []))}
                Primary Color: {brand_doc.get('primaryColor')}
                Secondary Color: {brand_doc.get('secondaryColor')}
                """
                
                # Map industry category from brand profile to Refiner Agent categories
                business_category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", ''))
                industry_category = map_category_for_refiner(business_category)

        # Step 1: Refine the prompt
        # Determine category for refiner (Carousel Slide vs others)
        refiner_category = industry_category
        if request.format == "Carousel":
            refiner_category = "Carousel Slide"
            
        refined_prompt = await refine_image_prompt(
            brand_dna=brand_dna,
            user_desc=request.prompt,
            headline=request.headline,
            category=refiner_category
        )
        
        # print(f"\n--- REFINED IMAGE PROMPT ---\n{refined_prompt}\n--------------------------\n")
        
        type_str = ""
        result = None
        
        if request.format == "Static Image":
            # Use FAL.ai gpt-image-2 for static images.
            # gpt-image-2 follows natural language directly — no camera rigs, no negative prompts.
            # print("Using FAL.ai gpt-image-2 for Static Image generation...")

            # Resolve brand fields for the structured prompt
            _bd = brand_doc if (request.userId and brand_doc) else {}
            _brand_name       = _bd.get('brandName', '')
            _business_cat     = (_bd.get("otherCategory") if _bd.get("businessCategory") == "Other" and _bd.get("otherCategory") else _bd.get("businessCategory", ''))
            _brand_tone       = _bd.get('brandTone', '')
            _visual_vibe      = _bd.get('visualVibe', '')
            _primary_color    = _bd.get('primaryColor', '')
            _secondary_color  = _bd.get('secondaryColor', '')
            _usp              = _bd.get('usp', '')
            _logo             = _bd.get('logo', '')
            _primary_words    = _hex_to_words(_primary_color)
            _secondary_words  = _hex_to_words(_secondary_color)
            _product_name     = request.prompt  # best available product descriptor
            _headline         = request.headline or ''
            _has_image        = bool(request.image)

            # Inline scene description (creative_compositor.py not yet present)
            _cat_lower = _business_cat.lower()
            if any(k in _cat_lower for k in ['beauty', 'cosmetic', 'skincare', 'food', 'beverage', 'personal care']):
                _scene_desc = (
                    f"A premium studio product shot. Dark matte slate surface. "
                    f"Three-point cinematic lighting. Shallow depth of field bokeh background. "
                    f"Dominant color palette: {_primary_words} and {_secondary_words}."
                )
            elif any(k in _cat_lower for k in ['saas', 'app', 'tech', 'software']):
                _scene_desc = (
                    f"A clean bright workspace with natural daylight from the left. "
                    f"Light oak desk, airy feel. Dominant palette: {_primary_words} accented by {_secondary_words}."
                )
            else:
                _scene_desc = (
                    f"A clean minimal background. Soft directional light. "
                    f"Dominant palette: {_primary_words} and {_secondary_words}."
                )

            if _logo:
                _logo_ref = _logo if _logo.startswith("http") else "[Logo image is uploaded and available for branding]"
                _logo_instruction = f"Brand Logo reference: {_logo_ref}\nIncorporate the brand logo reference cleanly on the creative. Do not assume or add any fake logos or text."
            else:
                _logo_instruction = "Do not assume or add any fake logos or text."

            static_prompt = f"""
You are generating a premium Indian D2C brand advertisement image.

{"Keep the product exactly as it appears in the reference image. Do not alter the packaging, shape, label text, or colors of the product itself." if _has_image else ""}

BACKGROUND SCENE:
{_scene_desc}

PRODUCT:
Product: {_product_name}
Place the product as the hero element — centered, large, grounded on the surface.
Soft drop shadow beneath the product base.

TEXT ON IMAGE:
- Large bold headline at the bottom of the image: "{_headline}"
- Brand name in small subtle text at the bottom-left corner: "{_brand_name}"

STYLE:
Brand tone: {_brand_tone}
Visual vibe: {_visual_vibe}
USP context: {_usp}
{_logo_instruction}
Indian D2C brand aesthetic. Commercial advertising quality.
Clean, premium, minimal. No random props. No clutter.
Not a stock photo. Not AI-looking.
""".strip()

            # print(f"\n--- GPT-IMAGE-2 STATIC PROMPT ---\n{static_prompt}\n---------------------------------\n")
            result = generate_fal_image_flux(static_prompt, image=request.image, quality=img_quality)
            type_str = "image"
        elif request.format == "Carousel":
            # Use FAL.ai Ideogram for carousel slides (image-to-image based on user product image)
            # print("Using FAL.ai Ideogram for Carousel generation...")
            # Dynamic slide count — respects user selection (3, 5, 7, etc.)
            count = request.slides if request.slides else 3
            
            # For carousels, refine each slide with memory of the previous one
            # Then inject headline + subtext into a structured Ideogram prompt via build_ideogram_slide_prompt()
            slides_results = []
            current_context = ""

            # slide_prompts are SlideMetadata dicts from the strategy phase.
            # Each dict has: visual_prompt, headline, subtext, position.
            # Fall back to plain strings if the client sent raw text prompts.
            raw_slide_prompts = request.slide_prompts if request.slide_prompts else [
                f"Slide {i+1} for {request.prompt}" for i in range(count)
            ]

            for i, sp in enumerate(raw_slide_prompts):
                # Support both dict (SlideMetadata) and plain string slide prompts
                if isinstance(sp, dict):
                    slide_visual = sp.get("visual_prompt", str(sp))
                    slide_headline = sp.get("headline", request.headline or "")
                    slide_subtext = sp.get("subtext", "")
                else:
                    # Plain string — refine it and extract headline from request
                    refined_slide = await refine_image_prompt(
                        brand_dna=brand_dna,
                        user_desc=sp,
                        headline=request.headline,
                        category="Carousel Slide",
                        prev_slide_context=current_context if i > 0 else None
                    )
                    slide_visual = refined_slide
                    slide_headline = request.headline or ""
                    slide_subtext = ""

                # Dynamically construct slide prompt following the new prompt structure
                brand_name = brand_doc.get("brandName", "") if brand_doc else ""
                main_goal = brand_doc.get("mainGoal", "") if brand_doc else ""
                business_category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", "")) if brand_doc else ""
                brand_tone = brand_doc.get("brandTone", "") if brand_doc else ""
                visual_vibe = brand_doc.get("visualVibe", "") if brand_doc else ""
                usp = brand_doc.get("usp", "") if brand_doc else ""
                pain_point = brand_doc.get("painPoint", "") if brand_doc else ""
                target_audiences = ", ".join(brand_doc.get("targetAudiences", [])) if (brand_doc and isinstance(brand_doc.get("targetAudiences"), list)) else str(brand_doc.get("targetAudiences", "")) if brand_doc else ""
                primary_color = brand_doc.get("primaryColor", "") if brand_doc else ""
                secondary_color = brand_doc.get("secondaryColor", "") if brand_doc else ""
                website = brand_doc.get("website", "") if brand_doc else ""

                brand_dna_total = f"""Brand DNA:
- Brand Name: {brand_name}
- Goal/Mission: {main_goal}
- Business Category: {business_category}
- Brand Tone: {brand_tone}
- Visual Vibe: {visual_vibe}
- USP: {usp}
- Pain Point Addressed: {pain_point}
- Target Audiences: {target_audiences}
- Primary Color: {primary_color}
- Secondary Color: {secondary_color}
- Website: {website}"""

                desc_text = f"Campaign description/theme: {request.prompt}" if request.prompt else "Theme: General brand promotion"

                # Check if slide visual prompt has product details
                product_related_all = f"Product/Scene: {slide_visual}"
                if slide_headline:
                    product_related_all += f"\n- Headline: {slide_headline}"
                if slide_subtext:
                    product_related_all += f"\n- Subtext: {slide_subtext}"

                # Slide purpose: Hook, Insight, CTA
                if i == 0:
                    purpose = "Hook"
                elif i == count - 1:
                    purpose = "CTA"
                else:
                    purpose = f"Insight {i}"

                ideogram_prompt = f"""{brand_dna_total}

Description Text:
{desc_text}

Product Details:
{product_related_all}

Create a highly engaging ad creative carousel for slide {i + 1} {purpose}"""
                
                features_product = True
                if isinstance(sp, dict):
                    features_product = sp.get("features_product", True)
                
                # print("\n" + "="*80)
                # print(f"[CAROUSEL GENERATOR] Endpoint Slide {i+1} Prompt:")
                # print(ideogram_prompt)
                # print(f"Features Product: {features_product}")
                # print("="*80 + "\n")
                
                slides_results.append({
                    "prompt": ideogram_prompt,
                    "features_product": features_product
                })
                current_context = f"Primary: {primary_color}, Secondary: {secondary_color}, Tone: {brand_tone}"

            # Generate carousel with Ideogram (image-to-image based on user product image)
            result = generate_fal_carousel_ideogram(
                base_prompt=refined_prompt,
                image=request.image,
                count=count,
                slide_prompts=slides_results,
                quality=img_quality
            )
            type_str = "carousel"
        elif request.format == "Reel":
            # Use Google Veo 3.1 Fast for video generation
            # print("Using Google Veo 3.1 Fast for Reel generation...")
            result = generate_veo_video(
                prompt=refined_prompt,
                image=request.image,
                aspect_ratio="9:16",
                duration=8
            )
            type_str = "video"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")

        return {
            "status": "success", 
            "type": type_str, 
            "data": result
        }
            
    except Exception as e:
        pass
        # print(f"Visual Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ─── STRATEGY IMAGE GENERATION ENDPOINT ───
@app.post("/generate-strategy-images")
async def api_generate_strategy_images(request: StrategyImageRequest):
    """
    Generates AI images/carousels/videos for the Strategy content studio page.
    Fetches the full brand DNA from MongoDB, builds structured prompts,
    and calls FAL.ai (gpt-image-2 / Ideogram / Minimax) accordingly.
    """
    try:
        # print(f"\n[StrategyImages] 📥 Request: userId={request.userId} layout={request.layout} count={request.count}")

        # 1. Fetch brand profile from MongoDB
        brand_doc = None
        if request.brandId:
            brand_doc = await brand_collection.find_one({
                "_id": ObjectId(request.brandId) if ObjectId.is_valid(request.brandId) else request.brandId
            })
            
        if not brand_doc:
            brand_doc = await brand_collection.find_one({
                "$or": [
                    {"_id": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId},
                    {"user": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId},
                ]
            })

        if not brand_doc:
            raise HTTPException(status_code=404, detail="Brand profile not found")

        # print(f"[StrategyImages] ✅ Brand found: {brand_doc.get('brandName')} | platform={request.platform or 'N/A'}")

        # If Nepal target, force language to English or Nepali
        location = brand_doc.get("location")
        country = "Unknown"
        if isinstance(location, dict):
            country = location.get("country") or brand_doc.get("country") or "Unknown"
        else:
            country = brand_doc.get("country") or "Unknown"

        if country.lower() == "nepal" and request.language:
            if request.language.lower() not in ["english", "nepali"]:
                request.language = "english"

        # 1.5 Populate all requested products with full MongoDB data
        import asyncio
        from visual_description_agent import generate_visual_description
        if request.products:
            populated_products = []
            vision_calls_made = 0
            # Cap vision calls to save credits on large batches (e.g. Sprints)
            max_vision_calls = 5
            for p_in in request.products:
                p_dict = dict(p_in)
                product_id = str(p_dict.get("_id") or "")
                if ObjectId.is_valid(product_id):
                    stored_product = await db["products"].find_one({"_id": ObjectId(product_id)})
                    if stored_product:
                        for field in (
                            "name", "description", "price", "offerPrice", "keyBenefit",
                            "verifiedBenefits", "proofPoints", "offerDetails", "guarantee",
                            "variantDetails", "sourceUrl", "imageBase64", "imageUrls",
                            "adVisualDescription", "adVisualDescriptionStatus",
                        ):
                            if field in stored_product:
                                p_dict[field] = stored_product[field]
                        
                        appearance = str(p_dict.get("adVisualDescription") or "").strip()
                        product_image = str(p_dict.get("imageBase64") or (p_dict.get("imageUrls") and p_dict.get("imageUrls")[0]) or "").strip()
                        if not appearance and product_image.startswith("http") and vision_calls_made < max_vision_calls:
                            vision_calls_made += 1
                            await db["products"].update_one(
                                {"_id": stored_product["_id"]},
                                {"$set": {"adVisualDescriptionStatus": "processing"}},
                            )
                            appearance = await asyncio.to_thread(
                                generate_visual_description,
                                image_urls=[product_image],
                                product_name=str(p_dict.get("name") or ""),
                            )
                            if appearance:
                                p_dict["adVisualDescription"] = appearance
                                p_dict["adVisualDescriptionStatus"] = "ready"
                                await db["products"].update_one(
                                    {"_id": stored_product["_id"]},
                                    {"$set": {
                                        "adVisualDescription": appearance,
                                        "adVisualDescriptionStatus": "ready",
                                    }},
                                )
                            else:
                                await db["products"].update_one(
                                    {"_id": stored_product["_id"]},
                                    {"$set": {"adVisualDescriptionStatus": "failed"}},
                                )
                populated_products.append(p_dict)
            request.products = populated_products

        # 2. Detect if SaaS/Services/Consulting brand and route accordingly
        business_category = (brand_doc.get("otherCategory") if brand_doc.get("businessCategory") == "Other" and brand_doc.get("otherCategory") else brand_doc.get("businessCategory", ""))
        _is_saas = _SAAS_AGENT_AVAILABLE and is_saas_brand(business_category)

        if _is_saas:
            # Block ecomm layout for SaaS brands
            if request.layout == "ecomm":
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "E-Comm Listing is not available for SaaS/Services/Consulting brands. "
                        "Please use Image, Carousel, Video, or Festival instead."
                    ),
                )

            # print(f"[StrategyImages] 🤖 SaaS mode active for '{brand_doc.get('brandName')}' [{business_category}]")


            import asyncio
            # Route to SaaS image agent
            posts = await asyncio.to_thread(
                generate_saas_strategy_images,
                brand_doc=brand_doc,
                layout=request.layout,
                count=request.count,
                slide_count=request.slideCount,
                aspect_ratio=request.aspectRatio,
                idea=request.idea,
                ref_images=request.refImages or [],
                products=request.products,
                ad_template=request.adTemplate,
                language=request.language,
                video_kind=request.videoKind,
                avatar_description=request.avatarDescription,
                video_script=request.videoScript,
                video_resolution=request.videoResolution or "1080p",
                video_duration=request.videoDuration,
                comment_keyword=request.commentKeyword,
            )
        elif request.layout == "ads":
            import asyncio
            from ad_creative_agent import generate_ad_creatives

            ad_products = [request.products[0]] if request.products else []

            posts = await asyncio.to_thread(
                generate_ad_creatives,
                brand_doc=brand_doc,
                products=ad_products,
                count=request.count,
                campaign_goal=request.campaignGoal or "discover",
                campaign_angle=request.campaignAngle or "auto",
                idea=request.idea,
                aspect_ratio=request.aspectRatio or "1:1",
                ref_images=request.refImages or [],
                user_plan=request.userPlan or "",
                language=request.language or "English",
                brand_design_guide=brand_doc.get("brandDesignGuide", "")
            )

            # Enrich each ad creative with a full Instagram caption + hashtags
            from strategy_image_agent import generate_instagram_caption_and_hashtags
            import asyncio as _asyncio

            async def _enrich_caption(idx, post):
                prod = ad_products[0] if ad_products else None
                # Use Director's short caption as a hint for the caption agent
                director_hint = post.get("caption", "")
                idea_with_hint = f"{request.idea or ''} | {director_hint}".strip(" |") if director_hint else request.idea
                caption = await _asyncio.to_thread(
                    generate_instagram_caption_and_hashtags,
                    brand_doc=brand_doc,
                    product=prod,
                    layout="ads",
                    idea=idea_with_hint,
                    language=request.language or "English",
                    template_label=post.get("angle", "Ad Creative"),
                    index=idx,
                    trigger_keyword=request.commentKeyword or "",
                )
                post["caption"] = caption
                return post

            posts = list(await _asyncio.gather(*[_enrich_caption(i, p) for i, p in enumerate(posts)]))
        else:
            import asyncio
            posts = await asyncio.to_thread(
                generate_strategy_images,
                brand_doc=brand_doc,
                layout=request.layout,
                count=request.count,
                slide_count=request.slideCount,
                aspect_ratio=request.aspectRatio,
                idea=request.idea,
                ref_images=request.refImages or [],
                products=request.products,
                platform=request.platform or "",
                ad_template=request.adTemplate,
                language=request.language,
                generate_image=request.generateImage,
                video_kind=request.videoKind,
                avatar_description=request.avatarDescription,
                video_script=request.videoScript,
                video_resolution=request.videoResolution or "1080p",
                video_duration=request.videoDuration,
                text_mode=request.textMode or "low",
                avatar_url=request.avatarUrl,
                comment_keyword=request.commentKeyword,
                whatsapp_template=request.whatsappTemplate,
            )

        # 3. Log the FAL API Cost to MongoDB (apilogs collection)
        try:
            apilogs_collection = db["apilogs"]
            provider = "FAL"
            endpoint = "fal-ai/gpt-image-2"
            
            if request.layout == "image" or request.layout == "photoshoot":
                cost_in_cents = len(posts) * 2  # Approx 2 cents per image
            elif request.layout == "carousel":
                cost_in_cents = len(posts) * request.slideCount * 1 # Approx 1 cent per slide
            elif request.layout == "video":
                provider = "GEMINI"
                cost_in_cents = len(posts) * 80 # Approx 80 cents per Veo 3.1 video
                endpoint = "google/veo-3.1-fast"
            elif request.layout in ["whatsapp", "email"]:
                provider = "GEMINI"
                cost_in_cents = len(posts) * 1  # ~1 cent per campaign (LLM copy only, no image gen)
                endpoint = "google/gemini-campaign-copy"
            else:
                # ecomm, festival, all_in_one, ads, or any future layout
                cost_in_cents = len(posts) * 2

            apilog_doc = {
                "user": ObjectId(request.userId),
                "provider": provider,
                "endpoint": endpoint,
                "costInCents": cost_in_cents,
                "isError": False,
                "errorMessage": "",
                "createdAt": datetime.now(timezone.utc)
            }
            await apilogs_collection.insert_one(apilog_doc)
            # print(f"[StrategyImages] 💰 Logged API cost: {cost_in_cents} cents for {len(posts)} posts")
        except Exception as log_err:
            pass
            # print(f"[StrategyImages] ⚠️ Failed to log API cost: {log_err}")

        return {"status": "success", "posts": posts, "count": len(posts)}

    except HTTPException:
        raise
    except Exception as e:
        pass
        # print(f"[StrategyImages] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- PERFORMANCE AUDITOR ---
@app.post("/audit-performance", response_model=AuditorResponse)
async def api_audit_performance(input_data: AuditorInput):
    """
    The 'SyncSocio Pulse' Auditor endpoint.
    Analyzes historical Meta metrics and predicts the optimal Content Mix.
    """
    try:
        auditor = MetaAuditor()
        result = await auditor.audit_and_align(input_data)
        return result
    except Exception as e:
        pass
        # print(f"Audit Route Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ads-recommendations")
async def ads_recommendations(request: Request):
    try:
        data = await request.json()
        brand_profile = data.get("brand_profile")
        posts = data.get("posts", [])
        
        if not brand_profile:
            return {"error": "Missing brand_profile"}
        
        # print(f"DEBUG: Analyzing {len(posts)} posts for ad recommendations...")
        recommendations = get_ads_recommendations(brand_profile, posts)
        return {"recommendations": recommendations}
    except Exception as e:
        pass
        # print(f"Ads Agent Route Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── UGC SCRIPT GENERATOR ───────────────────────────────────────────────────

class UGCScriptRequest(BaseModel):
    brandName: str = ""
    brandTone: str = ""
    usp: str = ""
    productName: str = ""
    productDescription: str = ""
    keyBenefit: str = ""
    avatarDescription: str = ""
    isSaas: bool = False
    language: str = "english"
    videoDuration: int = 8

@app.post("/generate-ugc-script")
async def api_generate_ugc_script(request: UGCScriptRequest):
    """
    Generates a tight 8-second UGC talking-head video script using Gemini.
    Takes brand info, product info, and avatar description.
    """
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import SystemMessage, HumanMessage

        llm = ChatGoogleGenerativeAI(
            model="gemini-flash-lite-latest",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.8,
        )

        tone_line   = f"Brand tone: {request.brandTone}." if request.brandTone else ""
        usp_line    = f"USP: {request.usp}." if request.usp else ""
        prod_line   = f"Product: {request.productName}." if request.productName else ""
        desc_line   = f"Description: {request.productDescription}." if request.productDescription else ""
        benefit_line = f"Key benefit: {request.keyBenefit}." if request.keyBenefit else ""
        avatar_line = f"Creator/Avatar: {request.avatarDescription}." if request.avatarDescription else ""

        if request.isSaas:
            style_guide = (
                "Write a B2B professional talking-head script. "
                "Open with a bold insight or statistic, deliver the value proposition, end with a soft CTA. "
                "NO discount language. NO sale urgency. Professional but personable tone."
            )
        else:
            style_guide = (
                "Write a D2C creator-style UGC talking-head script. "
                "Open with a hook (relatable problem or wow moment), deliver the benefit, end with a CTA. "
                "Casual, energetic, authentic Gen-Z / millennial tone. "
                "Feel free to use light slang or emojis in the script."
            )

        sys_msg = (
            f"You are an expert short-form video scriptwriter. {style_guide} "
            f"The script MUST be written entirely in {request.language.upper()}. "
            f"The script MUST be deliverable in exactly {request.videoDuration} seconds when spoken naturally "
            "(roughly 2.5 words per second). Output ONLY the script text — no labels, "
            "no stage directions, no quotation marks, no markdown."
        )

        user_msg = (
            f"Brand: {request.brandName}\n"
            f"{tone_line}\n{usp_line}\n{prod_line}\n{desc_line}\n{benefit_line}\n{avatar_line}\n\n"
            f"Write the {request.videoDuration}-second UGC script now."
        ).strip()

        response = llm.invoke([SystemMessage(content=sys_msg), HumanMessage(content=user_msg)])
        content = response.content
        if isinstance(content, list):
            content = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)

        script = content.strip().strip('"').strip("'")
        # print(f"[UGCScript] ✅ Generated: {script[:80]}...")
        return {"status": "success", "script": script}

    except Exception as e:
        pass
        # print(f"[UGCScript] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refine-campaign-copy")
async def api_refine_campaign_copy(request: RefineCopyRequest):
    """
    Refines existing text copy (email/whatsapp) via Gemini based on a user instruction.
    Preserves structural HTML if it's an email.
    """
    try:
        brand_doc = await db["brandprofiles"].find_one({"user": ObjectId(request.userId)})
        if not brand_doc:
            raise HTTPException(status_code=404, detail="Brand not found")

        result = refine_campaign_copy(
            brand_doc=brand_doc,
            subject=request.subject,
            body=request.body,
            instruction=request.instruction,
            layout=request.layout,
            language=request.language
        )
        return {"status": "success", "data": result}
    except Exception as e:
        pass
        # print(f"❌ Error refining copy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/edit-strategy-media")
async def api_edit_strategy_media(request: EditMediaRequest):
    """
    Edits a generated image/video/carousel-slide using FAL engines.
    """
    try:
        # print(f"\n[EditMedia] 📥 Request: type={request.type} instruction='{request.instruction}'")

        # Map aspect ratio to FAL's image size
        size_map = {
            "1:1": "square_hd",
            "4:5": "portrait_4_3",
            "9:16": "portrait_16_9",
            "16:9": "landscape_16_9",
            "2:3": "portrait_4_3"
        }
        image_size = size_map.get(request.aspectRatio or "1:1", "square_hd")

        # Clean/pass base64 representation of the image
        image_data = request.image

        if request.type == "video":
            raise HTTPException(status_code=400, detail="Editing is not supported for video format.")

        else:
            # Edit the image using gpt-image-2 for all other formats (image, carousel, ecomm, etc. across saas and non-saas)
            res = generate_fal_image_gpt2(
                prompt=request.instruction,
                image=image_data,
                image_size=image_size
            )
            return {
                "status": "success",
                "image": res.get("image"),
                "type": request.type
            }

    except HTTPException:
        raise
    except Exception as e:
        pass
        # print(f"[EditMedia] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/product-image-editor")
async def api_product_image_editor(request: ProductEditRequest):
    """
    Edits a product image to match a reference image style using GPT-Image-2.
    """
    try:
        # print(f"\n[ProductEditor] 📥 Request received")

        import re
        import json
        
        safe_brand_dna = ""
        img_quality = "low"
        if request.brand_dna:
            try:
                dna_dict = json.loads(request.brand_dna)
                # Keep only relevant fields for image generation
                keys_to_keep = ['brandName', 'businessCategory', 'usp', 'targetAudiences', 'brandTone', 'visualVibe', 'brandKeywords', 'primaryColor', 'secondaryColor']
                pruned_dna = {k: dna_dict[k] for k in keys_to_keep if k in dna_dict}
                safe_brand_dna = json.dumps(pruned_dna)
                
                user_plan = str(dna_dict.get("selectedPlan", "starter")).lower()
                if "pro" in user_plan.lower():
                    img_quality = "medium"
                else:
                    img_quality = "low"
            except Exception:
                pass
                # If not JSON or fails, just truncate it
                safe_brand_dna = request.brand_dna[:1000]
                
        safe_prod_info = request.prod_info[:1000] if request.prod_info else ""
        if request.prod_image and request.prod_info:
            prompt = (
                f"Apply the style, lighting, and composition of the reference image to the product image.\n"
                f"Generate the output with the same orientation and aspect ratio as the reference image.\n"
                f"Brand Guidelines: {safe_brand_dna}\n"
                f"Product Details: {safe_prod_info}\n"
                f"User Instruction: {request.instruction}"
            )
            # generate_fal_image_gpt2 accepts a list of images (reference + product + logo)
            images = [request.ref_image, request.prod_image]
            if request.logo_image:
                images.append(request.logo_image)
        else:
            prompt = (
                f"Edit the image according to the instruction.\n"
                f"Generate the output with the same orientation and aspect ratio as the reference image.\n"
                f"Brand Guidelines: {safe_brand_dna}\n"
                f"User Instruction: {request.instruction}"
            )
            images = [request.ref_image]
            if request.logo_image:
                images.append(request.logo_image)
        
        # Map aspect ratio to FAL's image size
        size_map = {
            "1:1": "square_hd",
            "4:5": "portrait_4_3",
            "9:16": "portrait_16_9",
            "16:9": "landscape_16_9",
            "2:3": "portrait_4_3"
        }
        image_size = size_map.get(request.aspectRatio or "1:1", "square_hd")
        
        res = generate_fal_image_gpt2(
            prompt=prompt,
            image=images,
            image_size=image_size,
            quality=img_quality,
        )
        
        return {
            "status": "success",
            "image": res.get("image")
        }

    except Exception as e:
        pass
        # print(f"[ProductEditor] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/generate-autopilot")
async def api_generate_autopilot(request: AutopilotRequest):
    try:
        # print(f"\n[Autopilot] 📥 Request: userId={request.userId} weeks={request.weeks} language={request.language}")
        
        # 1. Fetch brand profile from MongoDB
        brand_doc = await brand_collection.find_one({
            "$or": [
                {"_id": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId},
                {"user": ObjectId(request.userId) if ObjectId.is_valid(request.userId) else request.userId}
            ]
        })
        if not brand_doc:
            raise HTTPException(status_code=404, detail="Brand profile not found")
            
        # 2. Fetch products details from MongoDB products collection
        product_collection = db["products"]
        product_ids = [ObjectId(pid) for pid in request.selectedProductIds if ObjectId.is_valid(pid)]
        products = []
        vision_calls_made = 0
        max_vision_calls = 5
        
        from visual_description_agent import generate_visual_description
        
        async for prod in product_collection.find({"_id": {"$in": product_ids}}):
            prod["_id"] = str(prod["_id"])
            if "user" in prod:
                prod["user"] = str(prod["user"])
            if "brandId" in prod:
                prod["brandId"] = str(prod["brandId"])
                
            appearance = str(prod.get("adVisualDescription") or "").strip()
            product_image = str(prod.get("imageBase64") or "").strip()
            if not appearance and product_image.startswith("http") and vision_calls_made < max_vision_calls:
                vision_calls_made += 1
                await db["products"].update_one(
                    {"_id": ObjectId(prod["_id"])},
                    {"$set": {"adVisualDescriptionStatus": "processing"}},
                )
                import asyncio
                appearance = await asyncio.to_thread(
                    generate_visual_description,
                    image_urls=[product_image],
                    product_name=str(prod.get("name") or ""),
                )
                if appearance:
                    prod["adVisualDescription"] = appearance
                    prod["adVisualDescriptionStatus"] = "ready"
                    await db["products"].update_one(
                        {"_id": ObjectId(prod["_id"])},
                        {"$set": {
                            "adVisualDescription": appearance,
                            "adVisualDescriptionStatus": "ready",
                        }},
                    )
                else:
                    await db["products"].update_one(
                        {"_id": ObjectId(prod["_id"])},
                        {"$set": {"adVisualDescriptionStatus": "failed"}},
                    )
                    
            products.append(prod)
            
        if not products:
            raise HTTPException(status_code=400, detail="No selected products found in database")
            
        # 3. Call autopilot_agent
        from autopilot_agent import generate_autopilot_campaign
        import asyncio
        
        campaign_posts = await asyncio.to_thread(
            generate_autopilot_campaign,
            brand_info=brand_doc,
            products=products,
            upcoming_festivals=request.upcomingFestivals,
            language=request.language,
            weeks=request.weeks
        )
        
        return {
            "status": "success",
            "posts": campaign_posts
        }
    except Exception as e:
        pass
        # print(f"[Autopilot] ❌ Route error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class AvatarRequest(BaseModel):
    description: str
    gender: str = "female"

@app.post("/generate-avatar")
async def generate_avatar_endpoint(req: AvatarRequest):
    try:
        from fal_visual_engine import generate_fal_image_gpt2
        import asyncio
        
        prompt = f"""Create a photorealistic portrait of a fictional adult {req.gender} from India.

The person should have natural Indian facial features and appearance while remaining unique and not resembling any real individual.

{req.description}

Medium-shot portrait.
Facing directly toward the camera.
Looking into the lens.
Professional fashion studio photography.
Soft diffused lighting.
Neutral light gray background.
High facial detail.
Natural skin texture.
Premium modern clothing.
Commercial fashion catalog style.
Photorealistic."""

        # Run in thread since fal_visual_engine is sync
        try:
            result = await asyncio.to_thread(
                generate_fal_image_gpt2,
                prompt=prompt,
                image_size="portrait_4_3"
            )
            return {"status": "success", "image": result["image"]}
        except Exception as api_err:
            error_str = str(api_err).lower()
            if "content_policy_violation" in error_str or "content checker" in error_str:
                raise HTTPException(
                    status_code=400, 
                    detail="Content Policy Violation: Your prompt was flagged by the AI safety filter. Please avoid using sensitive words (e.g., sexy, nude, attractive, etc.) and try again."
                )
            raise api_err
            
    except HTTPException:
        raise
    except Exception as e:
        # print(f"[AvatarGen] ❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── AI Ads Creative: Visual Description Generator ─────────────────────────────
# Called automatically by productRoutes.js (Node backend) after a product is saved.
# Generates a forensic packaging description and writes it back to MongoDB.
# Only used by ad_creative_agent.py (Block 2). Has zero effect on other modes.

import asyncio
visual_desc_semaphore = asyncio.Semaphore(3)  # Max 3 concurrent OpenAI Vision calls to prevent 429 rate limits

class AdVisualDescRequest(BaseModel):
    productId: str
    productName: str
    imageUrls: List[str]  # Up to 2 Cloudinary URLs

@app.post("/generate-ad-visual-description")
async def api_generate_ad_visual_description(request: AdVisualDescRequest):
    """
    Fire-and-forget endpoint called by productRoutes.js after product creation.
    Runs GPT-4o Vision to generate a forensic visual description of the product
    packaging, then writes the result back to the products MongoDB collection.
    """
    from visual_description_agent import generate_visual_description
    import asyncio

    # Mark as processing immediately so we don't double-trigger
    products_collection = db["products"]
    try:
        await products_collection.update_one(
            {"_id": ObjectId(request.productId)},
            {"$set": {"adVisualDescriptionStatus": "processing"}}
        )
    except Exception:
        pass

    async def _run():
        async with visual_desc_semaphore:
            try:
                desc1 = ""
                if request.imageUrls and len(request.imageUrls) > 0:
                    desc1 = await asyncio.to_thread(
                        generate_visual_description,
                        image_urls=[request.imageUrls[0]],
                        product_name=request.productName
                    )
                
                desc2 = ""
                if request.imageUrls and len(request.imageUrls) > 1:
                    desc2 = await asyncio.to_thread(
                        generate_visual_description,
                        image_urls=[request.imageUrls[1]],
                        product_name=request.productName
                    )

                if desc1:
                    await products_collection.update_one(
                        {"_id": ObjectId(request.productId)},
                        {"$set": {
                            "adVisualDescription": desc1,
                            "adVisualDescriptionSecondary": desc2,
                            "adVisualDescriptionStatus": "ready"
                        }}
                    )
                    print(f"[VisualDescAgent] ✅ Saved description for product {request.productId}")
                else:
                    await products_collection.update_one(
                        {"_id": ObjectId(request.productId)},
                        {"$set": {"adVisualDescriptionStatus": "failed"}}
                    )
            except Exception as e:
                print(f"[VisualDescAgent] ❌ Background task error: {e}")
                try:
                    await products_collection.update_one(
                        {"_id": ObjectId(request.productId)},
                        {"$set": {"adVisualDescriptionStatus": "failed"}}
                    )
                except Exception:
                    pass

    # Fire and forget — return immediately, description generates in background queue
    asyncio.create_task(_run())
    return {"status": "processing", "productId": request.productId}


@app.post("/regenerate-ad-visual-description")
async def api_regenerate_ad_visual_description(request: AdVisualDescRequest):
    """
    Force-regenerates adVisualDescription for an existing product.
    Useful when the prompt has been upgraded and existing descriptions need a refresh.
    Accepts the same payload as /generate-ad-visual-description.
    """
    from visual_description_agent import generate_visual_description
    import asyncio

    products_collection = db["products"]
    try:
        await products_collection.update_one(
            {"_id": ObjectId(request.productId)},
            {"$set": {"adVisualDescriptionStatus": "processing"}}
        )
    except Exception:
        pass

    async def _run():
        try:
            desc1 = ""
            if request.imageUrls and len(request.imageUrls) > 0:
                desc1 = await asyncio.to_thread(
                    generate_visual_description,
                    image_urls=[request.imageUrls[0]],
                    product_name=request.productName
                )
            
            desc2 = ""
            if request.imageUrls and len(request.imageUrls) > 1:
                desc2 = await asyncio.to_thread(
                    generate_visual_description,
                    image_urls=[request.imageUrls[1]],
                    product_name=request.productName
                )

            if desc1:
                await products_collection.update_one(
                    {"_id": ObjectId(request.productId)},
                    {"$set": {
                        "adVisualDescription": desc1,
                        "adVisualDescriptionSecondary": desc2,
                        "adVisualDescriptionStatus": "ready"
                    }}
                )
                print(f"[VisualDescAgent] ✅ Re-generated description for product {request.productId}")
            else:
                await products_collection.update_one(
                    {"_id": ObjectId(request.productId)},
                    {"$set": {"adVisualDescriptionStatus": "failed"}}
                )
        except Exception as e:
            print(f"[VisualDescAgent] ❌ Regen error: {e}")
            try:
                await products_collection.update_one(
                    {"_id": ObjectId(request.productId)},
                    {"$set": {"adVisualDescriptionStatus": "failed"}}
                )
            except Exception:
                pass

    asyncio.create_task(_run())
    return {"status": "regenerating", "productId": request.productId}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
