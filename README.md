# Gohar — AI Kheti Salahkar 🌾

Open-source AI-driven local-language farming advisor for smallholder farmers near Lucknow and across northern India.

## Features & Current Status
- **Responsive Web UI**: Accessible on mobile phones and desktop with high-contrast, clean layout.
- **20 Indian Languages**: Hindi, English, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Odia, Malayalam, Punjabi, Assamese, Maithili, Bhojpuri, Kashmiri, Nepali, Santali, Sindhi, and Meitei (Manipuri).
- **Voice Typing & Spoken Responses**: Integrated Web Speech recognition and synthesis.
- **Asynchronous High-Throughput Backend**: Built on FastAPI and `httpx` with connection pooling, non-blocking I/O, security headers, and GZip compression.
- **In-Memory Knowledge Retrieval**: Preloads and indexes curated agronomy guides covering Wheat, Paddy, Mustard, Maize, and Pulses.
- **Seasonal Guides & Crop Nutrition**: Curated checklists for Kharif, Rabi, and Zaid, with ICAR and Soil Health Card references.
- **Production-Ready Deployment**: Includes `Dockerfile`, `docker-compose.yml`, `render.yaml`, `Procfile`, and automated CI/CD workflows.

> **Important:** This is an open-source prototype. Fertilizer guidance and pest recommendations are educational. Always verify critical decisions with a current Soil Health Card, product labels, and your local Krishi Vigyan Kendra (KVK).

---

## Quickstart (Local Development)

### 1. Prerequisites
- Python 3.10+
- (Optional) [Ollama](https://ollama.com/) with Gemma 4:
  ```cmd
  ollama run gemma4:e2b
  ```

### 2. Run with Python & Uvicorn
```cmd
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server with auto-reload
python main.py
```
Open `http://127.0.0.1:8000/` in your browser.
API Health Check: `http://127.0.0.1:8000/health`

### 3. Run Automated Tests
```cmd
pytest -v
```

---

## Deployment Options

### Option A: Render (One-Click / Blueprint)
1. Fork or push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), choose **New → Blueprint** and connect this repository.
3. Render reads `render.yaml` automatically and configures:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
4. Set `OLLAMA_URL` in Render Environment settings to your hosted inference endpoint (e.g. `https://your-llm-host.example/api/generate`).

### Option B: Docker Container (Cloud Run / AWS / VPS)
Build and run the Docker image:
```bash
docker build -t gohar-app .
docker run -p 8000:8000 --env-file .env.example gohar-app
```

Or with Docker Compose:
```bash
docker compose up -d
```

### Option C: PaaS (Heroku / Railway / Fly.io)
Deploy directly using the included `Procfile`:
```text
web: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for the HTTP server (automatically bound by Render/Cloud Run) |
| `HOST` | `0.0.0.0` | Host IP binding address |
| `OLLAMA_URL` | `http://127.0.0.1:11434/api/generate` | Reachable Ollama-compatible `/api/generate` endpoint |
| `OLLAMA_API_KEY` | *(empty)* | Optional Bearer authorization token for remote hosted inference |
| `GOHAR_MODEL` | `gemma4:e2b` | LLM model tag accepted by the inference provider |
| `GOHAR_OLLAMA_TIMEOUT` | `300` | Inference request timeout in seconds |
| `GOHAR_ALLOWED_ORIGINS` | *(localhost, Render)* | Comma-separated CORS allowed origins |

---

## Repository Layout
```text
├── index.html            # Static web UI
├── style.css             # Responsive stylesheets & animations
├── script.js             # Client logic, voice recognition & chat
├── main.py               # Async FastAPI server, retrieval & inference
├── requirements.txt      # Production dependencies
├── Dockerfile            # Container definition
├── docker-compose.yml    # Multi-container orchestration
├── render.yaml           # Render Blueprint specification
├── Procfile              # PaaS process configuration
├── .env.example          # Environment variables template
├── test_app.py           # Automated test suite
├── wheat.md              # Wheat agronomy knowledge note
├── paddy.md              # Paddy / Rice agronomy knowledge note
├── mustard.md            # Mustard agronomy knowledge note
├── maize.md              # Maize agronomy knowledge note
├── pulses.md             # Pulses (Gram & Arhar) agronomy knowledge note
└── .github/workflows/    # CI and GitHub Pages deployment workflows
```

## License
MIT License. © 2026 FourBitDevelopers.
