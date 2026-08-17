# Velocity / SyncSocio local development

This repository contains four runnable applications:

- `frontend`: customer React/Vite app on port 5173
- `admin`: admin React/Vite app on port 5174
- `backend`: Node/Express API on port 5050
- `ai_agents`: FastAPI AI service on port 8000

The separate `lead_system` directory contains the Playwright-based lead scraper.

## Prerequisites

- Node.js 20.19 or newer and npm
- Python 3.12
- MongoDB, either a local instance or MongoDB Atlas
- API credentials for whichever external integrations you use

The web apps and both backend health endpoints can start without provider credentials. Database-backed routes require `MONGO_URI`, while AI, publishing, payment, email, and social features require their corresponding credentials.

## Install

```bash
npm ci --prefix frontend
npm ci --prefix backend
npm ci --prefix admin

python3.12 -m venv ai_agents/venv
ai_agents/venv/bin/python -m pip install -r ai_agents/requirements.txt

python3.12 -m venv lead_system/venv
lead_system/venv/bin/python -m pip install -r lead_system/requirements.txt
lead_system/venv/bin/python -m playwright install chromium
```

Copy the example environment files before adding credentials:

```bash
cp frontend/.env.example frontend/.env.local
cp admin/.env.example admin/.env.local
cp backend/.env.example backend/.env
cp ai_agents/.env.example ai_agents/.env
```

Never commit real credentials. The local environment files are ignored by Git.

## Database

Set the same `MONGO_URI` in `backend/.env` and `ai_agents/.env`. Use a MongoDB Atlas connection string, or point both services at a manually installed local MongoDB server such as `mongodb://127.0.0.1:27017/test`.

## Run

Open four terminals from the repository root:

```bash
npm --prefix backend start
```

```bash
cd ai_agents
venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

```bash
npm --prefix frontend run dev
```

```bash
npm --prefix admin run dev -- --port 5174
```

Open the customer app at `http://localhost:5173` and the admin app at `http://localhost:5174`. Backend health is available at `http://localhost:5050/`; AI health is at `http://localhost:8000/health`.

## Verify

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
npx --prefix frontend --no-install vitest run
npm --prefix admin run lint
npm --prefix admin run build
ai_agents/venv/bin/python -m pip check
lead_system/venv/bin/python -m pip check
```

Run the lead scraper with a narrow target first:

```bash
cd lead_system
venv/bin/python main.py --city Ahmedabad --keyword "Digital Marketing Agency"
```
