## AI Tutor studybuddy

An AI-powered tutoring app with a Flask backend for AI features (RAG, image/video analysis, speech) and a Next.js frontend (App Router) that proxies API calls to Flask.

### Contents

- **Backend**: `testFrontend/FlaskApp/app.py` (Flask API)
- **AI features**: `aiFeatures/python/*` (RAG, web search, image/video, TTS/STT)
- **Frontend**: `web/` (Next.js 15, React 19, Tailwind 4)

## Prerequisites

- Python 3.11
- Node.js 20+ and npm 10+
- ffmpeg (for some audio/video features, optional)

## Quick Start (Local)

### 1) Clone and create a virtualenv

```powershell
cd C:\Projects\aitutor
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2) Environment variables (.env at repo root)

Create a `.env` file in the repository root with at least the following:

```dotenv
# Flask <-> Next proxy
FLASK_URL=http://127.0.0.1:5500

# Gemini / Google Generative AI (required for AI responses)
GOOGLE_API_KEY=your_google_api_key
# or
GEMINI_API_KEY=your_google_api_key

# Optional search providers
TAVILY_API_KEY=your_tavily_api_key
SERP_API_KEY=your_serp_api_key

# Frontend Supabase (optional; exposed to client by Next)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Notes:

- The frontend loads env from the monorepo root via `web/next.config.ts`.
- `FLASK_URL` is used by the Next API proxy in `web/src/app/api/[...flask]/route.ts`.

### 3) Run the Flask API (port 5500)

```powershell
cd C:\Projects\aitutor\testFrontend\FlaskApp
venv\Scripts\Activate.ps1
python app.py
```

You should see Flask listening on `http://127.0.0.1:5500`.

### 4) Run the Next.js app

```powershell
cd C:\Projects\aitutor\web
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Architecture Overview

- The frontend calls `web/src/app/api/[...flask]/route.ts` which proxies requests to the Flask API using `FLASK_URL`.
- Flask exposes endpoints for chat (`/ask`), RAG (`/initialize-rag`), web search (`/enhanced-search`), media processing (`/process-image`, `/process-video`), and speech (`/speech-to-text`, `/text-to-speech`).
- AI logic lives in `aiFeatures/python/ai_response.py` and related modules.

## Key Endpoints (Flask)

- Health and status

  - `GET /` → `{ status: "ok", service: "studybuddy Flask API" }`
  - `GET /health` → masked env + model status
  - `GET /status` → vector store status

- Chat

  - `POST /ask` → `{ response, hasRetrieval, hasWebSources, ... }`
    - body: `{ query: string, session_id?: string, web_search_results?: {...} }`

- RAG

  - `POST /initialize-rag` → initialize vector store
    - multipart form: `files[]` (PDFs) or `folder` path

- Web Search

  - `POST /enhanced-search` → structured web results
    - body: `{ query: string, search_type?: "educational" }`

- Media

  - `POST /process-image` (≤10MB)
  - `POST /process-video` (≤100MB)
  - `POST /ask-image` and `POST /ask-video` to ask questions using prior analysis

- Speech
  - `POST /speech-to-text`
  - `POST /text-to-speech`
  - `POST /stop-speech`, `POST /stop-listening`

All the above are also reachable via the Next proxy at `/api/<path>` when the frontend is running.

## Scripts

Frontend (from `web/`):

```bash
npm run dev   # Next dev server
npm run build # Next build
npm start     # Start production server
npm run lint  # ESLint
```

## Sample Results

![op1](op1.png)
![op2](op2.png)
![op3](op3.png)
