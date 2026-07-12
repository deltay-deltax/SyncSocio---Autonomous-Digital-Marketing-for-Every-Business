# SyncSocio Project Overview

## 1. Executive Summary
**SyncSocio** is an advanced AI-powered Social Media and Digital Marketing Platform (also referred to as "Agent-as-a-Service"). The platform acts as a fully autonomous marketing agency for users, enabling them to automate direct messaging (DM Automation), automatically generate and publish social media strategies, create compelling images and videos utilizing top-tier visual LLMs, and optimize social media posts for Facebook and Instagram.

The platform significantly lowers the barrier to entry for digital marketing by combining rich aesthetic UI experiences with powerful backend AI orchestration.

## 2. Core Features
- **Intelligent Onboarding:** Scrapes a user's brand website to automatically deduce brand profile, SaaS classification, tone, and target audience.
- **Content Strategy & Planning:** Generates weekly and monthly social media content plans (Content Mix and Content Calendar).
- **Automated Asset Generation:**
  - *Images:* Carousel images, Google search image scraping, Flux AI generations.
  - *Video:* Generates short-form reels and videos using Minimax and Wan AI models.
- **Auto-Publishing & Validation:** Optimizes captions and hashtags before automatically validating and publishing content to Instagram and Facebook pages.
- **DM Automation:** Generates automated DM flows and funnels to convert social media comments into qualified leads.
- **Ads Recommendations:** Strategizes paid social media ad placements based on brand profile.
- **Credits & Billing:** Integrated Razorpay billing system with a credit-based consumption model for advanced AI features.

## 3. Technical Architecture

SyncSocio employs a modern three-tier architecture:

### Frontend (React + Vite)
- **Frameworks:** React (TypeScript), Vite for fast bundling.
- **Styling:** Tailwind CSS, Radix UI primitives, Framer Motion for complex micro-interactions and animations (e.g., the Launch Curtain).
- **Key Modules:** Redux/Context for state, dynamic routing for dashboard pages (`/dashboard/feed`, `/dashboard/analytics`, `/dashboard/strategy`).

### Backend (Node.js + Express)
- **Frameworks:** Express.js, Mongoose (MongoDB).
- **Services:** 
  - **Cloudinary:** Media storage and delivery.
  - **Sendgrid & Nodemailer:** Transactional email management.
  - **Razorpay:** Payments and credit top-ups.
- **Role:** Handles user authentication (Google Auth, Apple Sign-in, JWTs), database interactions, site settings, and scheduling (Node Cron).

### AI Agent Layer (Python + FastAPI)
- **Frameworks:** FastAPI, Uvicorn, Motor (Async MongoDB).
- **AI Orchestration:** LangGraph and LangChain.
- **LLMs & Image Generation:**
  - `langchain-google-genai` (Gemini) for text synthesis, strategy, and caption generation.
  - `fal-client` for interacting with cutting-edge visual models (Flux, Ideogram for carousels, Minimax, Wan, GPT2).
- **Core Agents:** 
  - `plan_agent.py`: Generates the weekly content plan.
  - `visual_engine.py` / `fal_visual_engine.py`: Handles complex image/video processing.
  - `dm_flow_agent.py`: Constructs automated DM funnels.
  - `post_validator.py`: Orchestrates the publishing pipeline and social API hooks.
  - `meta_auditor.py`: Specialized auditor for validating Meta compliance.

## 4. Database Structure
SyncSocio utilizes **MongoDB** with the following key collections:
- `BrandProfile`: Core identity, scraped knowledge, and settings for a given brand.
- `User`: Standard authentication and credit tracking.
- `ContentCalendar` / `StrategyCreative`: Planned posts and their generated assets.
- `Asset`: Centralized library for all generated imagery and videos.
- `DMFlow`: Configured conversational automations for Instagram DMs.
- `PostAnalysis`: Tracks history, optimization metrics, and publish statuses.
- `Transaction`: Razorpay payment ledger.

## 5. Conclusion
SyncSocio bridges the gap between complex AI generation pipelines and user-friendly SaaS interfaces. By deeply integrating AI into the digital marketing workflow—from ideation and asset generation to validation and auto-publishing—it provides businesses with an affordable, autonomous marketing powerhouse.
