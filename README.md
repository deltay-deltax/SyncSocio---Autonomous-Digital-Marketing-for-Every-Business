# SyncSocio — Agent-as-a-Service

SyncSocio is an AI-powered social media and digital marketing platform that acts as a fully autonomous marketing agency. It handles everything from content planning and AI-generated creatives to auto-publishing on Instagram and Facebook, DM automation, lead generation, and Razorpay billing — all from a single dashboard.

---

## What's Inside

| Service | Tech | Port |
| :--- | :--- | :--- |
| `frontend` | React + Vite (User dashboard) | 3000 (Docker) / 5173 (local) |
| `admin` | React + Vite (Admin portal) | 3001 (Docker) / 5174 (local) |
| `backend` | Node.js + Express API | 5050 |
| `ai_agents` | Python + FastAPI (AI agents) | 8000 |

---

## Prerequisites

Before you start, make sure you have:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — **recommended, easiest way**
- OR: Node.js 20+, Python 3.11+, and npm — for running manually

---

## Option 1 — Run with Docker (Recommended)

This is the easiest way. One command starts everything.

**Step 1 — Set up your environment files**

You need to create `.env` files for the backend and AI agents before running Docker. These files hold your API keys and are never committed to Git.

```bash
cp backend/.env.example backend/.env
cp ai_agents/.env.example ai_agents/.env
```

Now open each file and fill in your keys (see the [Environment Variables](#environment-variables) section below).

**Step 2 — Build and start**

```bash
docker compose up --build
```

That's it. Docker installs all dependencies, builds all services, and starts them.

**Step 3 — Open in browser**

| App | URL |
| :--- | :--- |
| Frontend (User App) | http://localhost:3000 |
| Admin Portal | http://localhost:3001 |
| Backend API | http://localhost:5050 |
| AI Agents | http://localhost:8000 |

**To stop everything:**
```bash
docker compose down
```

**To run in background:**
```bash
docker compose up -d
```

---

## Option 2 — Run Manually (Without Docker)

If you prefer to run each service in its own terminal:

**Step 1 — Install dependencies**

```bash
npm install --prefix backend
npm install --prefix frontend --legacy-peer-deps
npm install --prefix admin --legacy-peer-deps

python3 -m venv ai_agents/venv
ai_agents/venv/bin/pip install -r ai_agents/requirements.txt
```

**Step 2 — Set up environment files**

```bash
cp backend/.env.example backend/.env
cp ai_agents/.env.example ai_agents/.env
cp frontend/.env.example frontend/.env.local
cp admin/.env.example admin/.env.local
```

Fill in the keys as described below.

**Step 3 — Start each service in a separate terminal**

```bash
# Terminal 1 — Backend
npm --prefix backend start

# Terminal 2 — AI Agents
cd ai_agents && venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — Frontend
npm --prefix frontend run dev

# Terminal 4 — Admin
npm --prefix admin run dev -- --port 5174
```

---

## Environment Variables

### `backend/.env`

Create this file at `backend/.env`. All keys below are required for full functionality.

```env
# --- Server ---
PORT=5050

# --- Database ---
# Get this from your MongoDB Atlas cluster under "Connect > Drivers"
MONGO_URI=your_mongodb_atlas_connection_string

# --- Auth ---
# Any long random string (used to sign JWTs)
JWT_SECRET=your_secret_key_here

# Google OAuth — from console.cloud.google.com (OAuth 2.0 Client ID)
GOOGLE_CLIENT_ID=your_google_client_id

# --- Email (SMTP) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
# Your Gmail address and an App Password (not your regular Gmail password)
# Generate App Password: myaccount.google.com → Security → App Passwords
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM_EMAIL=no-reply@yourdomain.com

# SendGrid — from app.sendgrid.com → API Keys (optional, used as fallback)
SENDGRID_API_KEY=your_sendgrid_api_key

# --- Instagram / Meta ---
# From developers.facebook.com → your app → Instagram Basic Display
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=http://localhost:5050/api/auth/instagram/callback
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=any_random_string_you_choose

FACEBOOK_APP_SECRET=your_facebook_app_secret

# Meta Pixel & Conversions API — from Meta Events Manager
META_PIXEL_ID=your_meta_pixel_id
META_CAPI_ACCESS_TOKEN=your_meta_capi_token

# --- Cloudinary (image/video storage) ---
# From cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# --- Payments (Razorpay) ---
# From dashboard.razorpay.com → Settings → API Keys
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# --- AI ---
# From aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_gemini_api_key

# From platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxx

# Internal service URL (leave as-is for Docker, change for manual)
AI_SERVICE_URL=http://ai_agents:8000

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173
```

---

### `ai_agents/.env`

Create this file at `ai_agents/.env`.

```env
PORT=8000

# --- Database (same Atlas URI as backend) ---
MONGO_URI=your_mongodb_atlas_connection_string

# --- AI Providers ---
# Google Gemini — aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_gemini_api_key

# OpenAI — platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-xxxx

# FAL AI (image/video generation) — fal.ai → dashboard → API Keys
FAL_API_KEY=your_fal_api_key

# NVIDIA NIM — build.nvidia.com → API Keys (optional)
NVIDIA_API_KEY=your_nvidia_api_key

# --- Cloudinary (same as backend) ---
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# --- Meta (optional, for validation and publishing) ---
META_PIXEL_ID=your_meta_pixel_id
META_CAPI_ACCESS_TOKEN=your_meta_capi_token
```

---

### `frontend/.env.local` (manual run only)

Create this file at `frontend/.env.local`. Not needed for Docker.

```env
VITE_API_URL=http://localhost:5050/api
VITE_APP_URL=http://localhost:5173

# Google OAuth Client ID (same as backend)
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Meta Pixel ID (same as backend)
VITE_META_PIXEL_ID=your_meta_pixel_id
```

---

### `admin/.env.local` (manual run only)

Create this file at `admin/.env.local`. Not needed for Docker.

```env
VITE_API_URL=http://localhost:5050
VITE_APP_URL=http://localhost:5173
```

---

## Where to Get Each Key

| Key | Where to get it |
| :--- | :--- |
| `MONGO_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Cluster → Connect → Drivers |
| `JWT_SECRET` | Any long random string, e.g. generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com) → APIs → OAuth 2.0 |
| `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `FAL_API_KEY` | [fal.ai](https://fal.ai) → Dashboard → API Keys |
| `CLOUDINARY_*` | [Cloudinary Dashboard](https://cloudinary.com/console) |
| `RAZORPAY_*` | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys |
| `INSTAGRAM_*` | [Meta for Developers](https://developers.facebook.com) → Your App → Instagram |
| `SMTP_PASS` | Gmail → Account → Security → [App Passwords](https://myaccount.google.com/apppasswords) |
| `SENDGRID_API_KEY` | [SendGrid](https://app.sendgrid.com) → Settings → API Keys |
| `META_CAPI_*` | [Meta Events Manager](https://business.facebook.com/events_manager) |

---

## Notes

- Never commit your `.env` files — they are already in `.gitignore`.
- The backend and AI agents must share the **same** `MONGO_URI`.
- When running via Docker, the frontend and admin build at startup. If you change your `.env`, rebuild with `docker compose up --build`.
- For local dev, the frontend hot-reloads automatically on code changes. No rebuild needed.
