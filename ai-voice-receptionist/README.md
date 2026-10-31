# MediSlot – AI Voice Receptionist + Notifications

> **Module Overview:** The `ai-voice-receptionist` module is the voice and conversational AI front-desk engine of the Hospital Management System (HMS). It handles inbound patient calls, natural-language appointment inquiries, slot availability lookups, atomic booking creation, intelligent human escalation, and multi-channel patient notifications.

---

## 1. System Integration Architecture & Port Map

The Hospital Management System monorepo allocates dedicated ports for each service:

| Service | Port | Technology | Purpose |
|---|---|---|---|
| **`apps/web`** | `http://localhost:3000` | Next.js / React | Main Hospital Administration, Receptionist Portal, Patient Directory |
| **`apps/api`** | `http://localhost:4000` | NestJS / Prisma | Core Hospital Business Logic, Database, Doctor Rostering & Schedules |
| **`apps/demo`** | `http://localhost:5173` | React / Vite | Interactive Standalone Presentation & Demo Application |
| **`ai-voice-receptionist`** | `http://localhost:8000` | FastAPI / Python 3.12 | AI Receptionist Engine, Voice Webhooks, Chat Widget, Notifications |

### Data Flow Diagram

```
                 +-------------------------------------------------------+
                 |            Inbound Caller (Phone / PSTN)              |
                 +-------------------------------------------------------+
                                            |
                                            v (Audio / STT / TTS)
                               +--------------------------+
                               |     Twilio Voice API     |
                               +--------------------------+
                                            |
                                            v POST /api/calls/inbound
+-------------------------------------------------------------------------------------------------------+
|  ai-voice-receptionist  (FastAPI on Port 8000)                                                        |
|                                                                                                       |
|  +--------------------+    +-----------------------+    +------------------+    +-------------------+ |
|  |  Voice Webhooks    |    |  Receptionist Agent   |    |  Two-Stage Gate  |    |  Notification     | |
|  |  (Twilio / Mock)   |--->|  (Groq LLM + Tools)   |--->|  (Live Slot Conf)|--->|  (Twilio SMS/     | |
|  +--------------------+    +-----------------------+    +------------------+    |   SMTP Email)     | |
|             ^                                                    |              +-------------------+ |
|             |                                                    |                        |           |
|  +--------------------+                                          |                        v           |
|  |  Web Chat & Audio  |                                          |              +-------------------+ |
|  |  Widget API        |                                          |              |  Patient Mobile / | |
|  |  (/api/chat)       |                                          |              |  Staff Email      | |
|  +--------------------+                                          |              +-------------------+ |
+-------------|----------------------------------------------------|------------------------------------+
              ^                                                    v
              | (REST with X-Internal-Api-Key)                     | (Authoritative HMS Contract)
              |                                                    v
+-----------------------------+                  +------------------------------------------------------+
|  Frontend Applications      |                  |  HMS Backend (Authoritative Data Source)             |
|  - apps/web  (Port 3000)    |                  |  Option A: Cloud n8n Webhook (Ready now)             |
|  - apps/demo (Port 5173)    |                  |  Option B: apps/api NestJS Backend (Port 4000)       |
+-----------------------------+                  +------------------------------------------------------+
```

---

## 2. Team Integration Guide (How Other Modules Connect)

### A. Frontend Integration (`apps/web` and `apps/demo`)

The AI Receptionist provides a REST API that frontend components can call directly from the browser or from Next.js API routes.

#### 1. Authentication & CORS
- **Header:** Include `X-Internal-Api-Key: test-internal-key` (matches `INTERNAL_API_KEY` in `.env`).
- **CORS:** Built-in `CORSMiddleware` is enabled for all origins (`*`) and methods (`GET`, `POST`, `PATCH`, `OPTIONS`). OPTIONS preflight requests bypass rate limiting automatically.

#### 2. Interactive Receptionist Chat (`POST /api/chat`)
Use this endpoint to embed the AI Receptionist into the website, web widget, or demo interface.

- **URL:** `http://localhost:8000/api/chat`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  X-Internal-Api-Key: test-internal-key
  ```
- **Request Body:**
  ```json
  {
    "message": "Hi, I need an appointment with Dr. Sarah Smith tomorrow morning.",
    "session_id": null,
    "caller_number": "+919876543210"
  }
  ```
- **Response Body (`200 OK`):**
  ```json
  {
    "session_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "reply": "Dr. Sarah Smith in Cardiology has free slots tomorrow at 10:00 AM and 11:30 AM. Would you like me to book the 10:00 AM slot for you?",
    "ended": false,
    "handoff_requested": false
  }
  ```

##### Frontend React / TypeScript Example:
```typescript
export async function sendMessageToAIReceptionist(message: string, sessionId?: string) {
  const response = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Api-Key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'test-internal-key',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId || null,
      caller_number: '+919876543210',
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Receptionist error: ${response.statusText}`);
  }

  const data = await response.json();
  return data; // { session_id, reply, ended, handoff_requested }
}
```

#### 3. Call Summaries & Outcomes (`GET /api/calls/{call_id}/summary`)
Used by receptionists to view auto-generated summaries of completed patient calls.

- **URL:** `http://localhost:8000/api/calls/{call_id}/summary`
- **Method:** `GET`
- **Response Body (`200 OK`):**
  ```json
  {
    "call_id": "call-12345",
    "summary": "Caller requested appointment with Dr. Sarah Smith for cardiology consultation. Confirmed booking for 2026-10-31 10:00 AM. Confirmation SMS dispatched.",
    "outcome": "completed",
    "handoff_requested": false,
    "created_at": "2026-10-30T14:30:00Z"
  }
  ```

#### 4. Human Handoff & Escalation Callbacks (`GET /api/callbacks`)
When a caller asks to speak to human staff or an emergency keyword is detected, the AI receptionist automatically logs a staff callback task.

- **URL:** `http://localhost:8000/api/callbacks?status=pending`
- **Method:** `GET`
- **Response Body (`200 OK`):**
  ```json
  [
    {
      "id": "cb-987",
      "call_id": "call-12345",
      "caller_number": "+919876543210",
      "reason": "Caller requested to speak with front-desk staff regarding insurance pre-authorization.",
      "status": "pending",
      "created_at": "2026-10-30T14:35:00Z"
    }
  ]
  ```

---

### B. Backend Integration (`apps/api` or n8n HMS)

The AI Receptionist integrates seamlessly with both Akhil's n8n cloud webhook and the local NestJS `apps/api` service.

#### Dual-Mode Configuration:

Switching between cloud n8n and the local NestJS backend requires **zero code changes**—only 2 lines in `.env`:

* **Mode 1: Live Cloud n8n HMS (Tested & Working Now):**
  ```env
  HMS_BASE_URL=https://akhil12.app.n8n.cloud/webhook
  HMS_PATH_PREFIX=/hms
  HMS_API_KEY=hms_ed1bcc2cf79317bd4db332d6d23fd66566e3782517af0b5f
  ```

* **Mode 2: Local NestJS / Express HMS Backend (`apps/api` on Port 4000):**
  ```env
  HMS_BASE_URL=http://localhost:4000/api
  HMS_PATH_PREFIX=
  HMS_API_KEY=test-hms-api-key
  ```

#### Contract Handshake:
The HMS client in `app/services/hms_api.py` automatically normalizes:
- Standard wrapped envelopes: `{ "success": true, "data": [...] }`
- Direct arrays: `[ { "id": "doc-1", ... } ]`
- Error payloads: `{ "success": false, "error": { "code": "SLOT_TAKEN", "details": { "alternatives": [...] } } }`

---

## 3. Demo Readiness & Verification Proof

This module has been tested end-to-end against live external dependencies and is **100% demo-ready**:

| Verification Check | Target / Environment | Live Result | Status |
|---|---|---|:---:|
| **Doctor Roster** | Akhil's Live n8n HMS | Fetched 7 active doctors across 5 departments | **PASSED (200 OK)** |
| **Doctor Availability** | Akhil's Live n8n HMS | Fetched 11 free slots for active schedule | **PASSED (200 OK)** |
| **Live Appointment Booking** | Akhil's Live n8n HMS | Created live appointment `APT-261026-JKF6F1` | **PASSED (201 Created)** |
| **Conflict & Overlap Prevention** | Akhil's Live n8n HMS | Returns `409 Conflict` (`SLOT_TAKEN`) + alternatives | **PASSED (409 Conflict)** |
| **Appointment Cancellation** | Akhil's Live n8n HMS | Slot released (`slot_released: true`) | **PASSED (200 OK)** |
| **Conversational LLM Engine** | Groq (`openai/gpt-oss-120b`) | Tool-calling verified, <500ms latency | **PASSED** |
| **Twilio Telephony & Mock** | Inbound / Status Webhooks | HMAC SHA1 signature verification passed | **PASSED** |
| **Automated Test Suite** | 6 test modules (`pytest -q`) | **78 out of 78 tests passed** in 24s | **100% GREEN** |

---

## 4. Quickstart Guide (Teammates Setup)

### Step 1: Environment Setup (Windows PowerShell)

```powershell
# Navigate to the module directory
cd ai-voice-receptionist

# Create a virtual environment using Python 3.12
py -3.12 -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

*(On macOS / Linux use `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`)*

### Step 2: Verify Configuration

The working `.env` file is already in the repository root of `ai-voice-receptionist/`. The default configuration uses the verified Groq LLM model and Akhil's live n8n cloud webhook:

```env
APP_ENV=development
PORT=8000
INTERNAL_API_KEY=test-internal-key

# LLM Configuration (Groq API)
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=openai/gpt-oss-120b
OPENAI_API_KEY=gsk_...

# HMS Backend (Live n8n Webhook)
HMS_BASE_URL=https://akhil12.app.n8n.cloud/webhook
HMS_PATH_PREFIX=/hms
HMS_API_KEY=hms_ed1bcc2cf79317bd4db332d6d23fd66566e3782517af0b5f
```

### Step 3: Start the Service

```powershell
uvicorn app.main:app --reload --port 8000
```

### Step 4: Verify Health & Endpoints

Open your browser or terminal:
- **Health Check:** `http://localhost:8000/health`
  ```json
  {
    "status": "ok",
    "prototype": true,
    "modes": {
      "hms": "live",
      "llm": "openai",
      "telephony": "mock",
      "email": "mock",
      "sms": "twilio"
    }
  }
  ```
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

### Step 5: Run Automated Tests

```powershell
pytest -q
```
*Result: `78 passed in ~24s`*

---

## 5. Live Demo Script (Step-by-Step for Client Presentation)

When presenting to clients, you can demonstrate both the **Web Chat Interface** and the **Voice Call Simulation**:

### Demo Workflow 1: Live Interactive Receptionist Chat
1. Send an introductory greeting:
   ```json
   POST /api/chat
   { "message": "Hello, who is this?" }
   ```
   *Receptionist identifies itself clearly as the Hospital's virtual AI receptionist.*

2. Inquire about doctor availability:
   ```json
   POST /api/chat
   { "message": "Do you have any cardiologists available tomorrow?", "session_id": "<session_id>" }
   ```
   *Receptionist executes `check_doctor_availability` tool in real time against the live HMS and lists available slots for Dr. Sarah Smith.*

3. Book an appointment:
   ```json
   POST /api/chat
   { "message": "Yes, please book the 10:00 AM slot for patient Priya Patel at 9876543210.", "session_id": "<session_id>" }
   ```
   *The two-stage gate triggers: the receptionist re-verifies the live slot, confirms the patient details, books the appointment atomically via the HMS API, and sends an SMS confirmation.*

4. Show Double-Booking Protection:
   *Attempt to book the exact same slot again in a new session. The receptionist will inform the caller that the slot was just taken and immediately offer alternative times.*

### Demo Workflow 2: Safety & Emergency Escalation
1. Send an emergency keyword:
   ```json
   POST /api/chat
   { "message": "I am experiencing severe chest pain and cannot breathe." }
   ```
2. *Result:* The AI **immediately** provides emergency hotline instructions and triggers a staff escalation callback without giving unauthorized medical advice.

---

## 6. Directory Structure & Architecture

```
ai-voice-receptionist/
|-- app/
|   |-- main.py                   # FastAPI entrypoint, CORS configuration, lifespan management
|   |-- config.py                 # Pydantic v2 typed settings, secret redaction, env validation
|   |-- container.py              # Dependency injection container (services, repositories, providers)
|   |-- db.py                     # SQLAlchemy session lifecycle, auto-migration for SQLite/Postgres
|   |-- security.py               # RateLimitMiddleware (sliding window) & X-Internal-Api-Key auth
|   |-- logging_config.py         # JSON/plain logging with automatic secret masking
|   |-- utils.py                  # E.164 phone normalization, Indian number validation
|   |-- api/
|   |   |-- chat.py               # POST /api/chat (web conversational widget endpoint)
|   |   |-- voice_webhooks.py     # POST /api/calls/inbound, status, and turn events (Twilio TwiML)
|   |   |-- callbacks.py          # GET / POST /api/callbacks (human escalation queue)
|   |   `-- summaries.py          # GET /api/calls/{call_id}/summary (call outcomes & summaries)
|   |-- services/
|   |   |-- hms_api.py            # Authoritative HMS client (doctors, slots, atomic booking, cancel)
|   |   |-- receptionist_service.py # Core conversation orchestration & multi-turn dialog manager
|   |   |-- openai_service.py     # OpenAI/Groq compatible chat completions & tool invocation
|   |   |-- appointment_service.py# Two-stage confirmation gate & slot-taking prevention
|   |   |-- handoff_service.py    # Staff escalation & callback task generation
|   |   |-- notification_service.py # SMS & email dispatcher with delivery deduplication
|   |   |-- reminder_service.py   # Background poll loop for 24h appointment reminders
|   |   |-- summary_service.py    # Clinical/administrative call summarization
|   |   `-- faq_service.py        # Hospital FAQ matcher from verified knowledge base
|   |-- tools/
|   |   `-- appointment_tools.py  # Structured OpenAI function tools (Pydantic schema definitions)
|   |-- models/
|   |   |-- db_models.py          # SQLAlchemy models (Call, Callback, Reminder, Notification, Booking)
|   |   `-- schemas.py            # Pydantic schemas for requests, responses, and events
|   |-- repositories/             # Clean repository pattern for database persistence
|   `-- providers/                # Pluggable telephony (Twilio/Mock), SMS (Twilio/Mock), Email (SMTP/Mock)
|-- tests/                        # 78 unit and integration tests across 6 modules
|-- postman/                      # Postman collection for complete API testing
|-- .env                          # Local environment variables (tested with live Groq & n8n HMS)
|-- .env.example                  # Template configuration file
|-- requirements.txt              # Pinned Python package dependencies
|-- render.yaml                   # Free-tier cloud deployment blueprint for Render
`-- README.md                     # This comprehensive documentation guide
```

---

## 7. Environment Variables Reference

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `APP_ENV` | Environment mode (`development` or `production`) | `development` |
| `PORT` | Listening HTTP port | `8000` |
| `INTERNAL_API_KEY` | Shared secret header (`X-Internal-Api-Key`) | `test-internal-key` |
| `OPENAI_API_KEY` | LLM API Key (Groq or OpenAI) | `gsk_...` |
| `OPENAI_BASE_URL` | Base URL for LLM API | `https://api.groq.com/openai/v1` |
| `OPENAI_MODEL` | Active model identifier | `openai/gpt-oss-120b` |
| `HMS_BASE_URL` | Authoritative HMS URL | `https://akhil12.app.n8n.cloud/webhook` |
| `HMS_PATH_PREFIX` | Route prefix for HMS | `/hms` (or empty for local NestJS) |
| `HMS_API_KEY` | Authentication key for HMS API | `hms_...` |
| `TELEPHONY_PROVIDER` | Active voice provider (`twilio` or `mock`) | `mock` (or `twilio` with account SID) |
| `SMS_PROVIDER` | Active SMS provider (`twilio` or `mock`) | `twilio` |
| `EMAIL_PROVIDER` | Active email provider (`smtp` or `mock`) | `mock` |
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./medislot.db` |
| `REMINDERS_ENABLED`| Enable background 24h appointment reminders | `true` |
