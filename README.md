# HealthPulse Hospital Management System (HMS) — Unified Enterprise Integration

A comprehensive, production-grade Hospital Management System combining an authoritative NestJS backend, Next.js 14 administrative portal, Python FastAPI AI voice receptionist adapter, and shared type system backed by PostgreSQL (Neon).

---

## 🏗️ Architecture Overview

```mermaid
flowchart TB
    subgraph UI ["Frontend Client Layer"]
        WEB["Next.js 14 Web Portal<br/>(Port 3000 - Admin & Reception Desk)"]
        DEMO["React / Vite Demo<br/>(Port 5173 - Standalone Fallback)"]
    end

    subgraph API ["Authoritative Backend (apps/api - NestJS 10)"]
        AUTH["Auth & RBAC Guards<br/>(Passport JWT + Argon2id + CASL)"]
        AUDIT["Immutable Audit Interceptor<br/>(PHI & Secret Redaction)"]
        
        SCHED["Schedule & Slot Engine<br/>(Asia/Kolkata, Shifts, Leaves, Breaks)"]
        PAT["Patient Directory<br/>(MRN Generation, Duplicate Detection)"]
        APPT["Appointment Engine<br/>(Atomic Locking, Idempotency, State Machine)"]
        CRM["Leads & Follow-up Tasks<br/>(Enquiries, Priority Callbacks)"]
        CALLS["Call Logs Engine<br/>(Outcomes, Triage, Summary)"]
        REPORTS["Operational Reports Engine<br/>(KPI Aggregations & Status Breakdown)"]
        NOTIF["Notification Gateway<br/>(Mock Provider / Structured Logging)"]
    end

    subgraph VOICE ["Voice & Telephony (ai-voice-receptionist)"]
        FASTAPI["FastAPI Voice Service<br/>(Port 8000 - Direct HMS & n8n Dual Mode)"]
    end

    subgraph DB ["Persistence Layer"]
        PG[("PostgreSQL Database (Neon)<br/>Prisma ORM")]
    end

    WEB -->|"HTTP / REST (Cookies + Bearer)"| AUTH
    FASTAPI -->|"Scoped AI_SERVICE JWT"| AUTH
    AUTH --> AUDIT
    AUDIT --> SCHED & PAT & APPT & CRM & CALLS & REPORTS & NOTIF
    SCHED & PAT & APPT & CRM & CALLS & REPORTS & NOTIF --> PG
```

### Monorepo Structure

| Package / Directory | Technology | Purpose |
|---|---|---|
| [`apps/api`](./apps/api) | NestJS 10, Prisma ORM, PostgreSQL | Authoritative backend REST API, authentication, RBAC, slot engine, conflict-free booking, and audit trail |
| [`apps/web`](./apps/web) | Next.js 14 (App Router), Tailwind CSS | Administrative & clinical portal for doctors, receptionists, and hospital administrators |
| [`packages/shared-types`](./packages/shared-types) | TypeScript | Shared canonical domain entities, DTOs, enum definitions, and role-permission matrices |
| [`ai-voice-receptionist`](./ai-voice-receptionist) | Python 3.10+, FastAPI, httpx | Inbound voice call handling, triage, FAQ resolution, and automated booking via NestJS API |
| [`apps/demo`](./apps/demo) | React, Vite | Standalone browser-local presentation demo |
| [`scripts`](./scripts) | PowerShell, Bash, Node.js | One-click demo starters, database verification, and AI token generator |
| [`docs`](./docs) | Markdown | Test execution plans, integration specs, and operational architecture documentation |

---

## ⚡ Quick Start: One-Click Demo Launch

Ensure you have Node.js 18+ and a running PostgreSQL instance (or Neon connection string).

### Option 1: PowerShell (Windows)
```powershell
.\scripts\demo-start.ps1
```

### Option 2: Windows Batch
```cmd
scripts\demo-start.bat
```

The script automatically:
1. Validates PostgreSQL connectivity (`DATABASE_URL`).
2. Pushes the schema and runs Prisma client generation.
3. Seeds the database with **8 doctors**, **20 patients**, **30 appointments**, **10 leads**, **10 tasks**, and **6 call logs**.
4. Starts the NestJS API on [http://localhost:4000](http://localhost:4000).
5. Starts the Next.js Web App on [http://localhost:3000](http://localhost:3000).

---

## 🔑 Demonstration Accounts & Login

The login portal at [http://localhost:3000/login](http://localhost:3000/login) uses **standard email and password credentials**.
> **Note on Role Selection**: The role is automatically determined by the backend database upon authentication. There is no client-side role dropdown, preventing authorization mismatches or role spoofing.

All pre-seeded test accounts use the password: **`SuperSecret123#`**

| Role | Email | Password | Permissions & Access Scope |
|---|---|---|---|
| **SUPER_ADMIN** | `superadmin@hospital.com` | `SuperSecret123#` | Full unrestricted access, user management, system audit logs |
| **ADMIN** | `admin@hospital.com` | `SuperSecret123#` | Department, doctor, service management, clinical oversight, operational reports |
| **RECEPTIONIST** | `reception@hospital.com` | `SuperSecret123#` | Patient lookup/registration, doctor availability, booking, CRM leads, and call logs |
| **DOCTOR** | `doctor@hospital.com` | `SuperSecret123#` | Personal schedule roster, assigned patient consultations, appointment status updates |
| **NURSE** | `nurse@hospital.com` | `SuperSecret123#` | Patient directory lookup, vitals & consultation assistance |
| **AI_SERVICE** | *Machine Token* | *N/A* | Scoped machine JWT: `availability:read`, `booking:create`, `call:manage` (interactive login blocked) |

> **Tip**: On the login page, click any demo persona card in the **Demo Accounts** panel to auto-fill the email and password, then click **Sign In**.

---

## 🚀 Manual Step-by-Step Setup

### 1. Backend API (`apps/api`)

```powershell
cd apps/api

# Install dependencies
npm install

# Configure environment
copy .env.example .env
# Ensure DATABASE_URL is set (e.g. postgresql://user:pass@host/hms?sslmode=require)

# Sync database & seed records
npx prisma db push
npx prisma generate
npm run prisma:seed

# Run automated tests (44 tests across 4 test suites)
npm test

# Start API server in development mode (port 4000)
npm run dev
```

### 2. Frontend Web App (`apps/web`)

```powershell
cd apps/web

# Install dependencies
npm install

# Build static & server pages
npm run build

# Start Next.js development server (port 3000)
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. AI Voice Receptionist (`ai-voice-receptionist`)

```powershell
cd ai-voice-receptionist

# Create & activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
pip install uvicorn fastapi

# Configure environment
copy .env.example .env
```

To connect the voice receptionist directly to your local NestJS backend:
1. Generate an authoritative machine JWT:
   ```powershell
   npx tsx scripts/generate-ai-token.ts
   ```
2. In `ai-voice-receptionist/.env`, configure:
   ```env
   HMS_BASE_URL=http://localhost:4000/api
   HMS_PATH_PREFIX=
   HMS_API_KEY=<PASTE_GENERATED_JWT_TOKEN>
   ```
3. Run the automated Python test suite and start the service:
   ```powershell
   # Run all 78 pytest unit and integration tests
   pytest -q

   # Start FastAPI server (port 8000)
   uvicorn app.main:app --reload --port 8000
   ```

---

## 🩺 Core User Journeys & Business Rules

### Journey A: Receptionist Booking Flow
1. Receptionist searches patient by phone or registers a new patient with automatic duplicate warnings.
2. Selects Department and Doctor to query real-time availability via `GET /api/doctors/:id/availability?date=YYYY-MM-DD`.
3. System calculates slots based on doctor shift hours, breaks (e.g., 13:00 - 14:00), approved leaves, and booked intervals in `Asia/Kolkata` time.
4. Receptionist picks an available slot and submits booking (`POST /api/appointments`). The slot is atomically reserved.

### Journey B: Automated AI Voice Receptionist Flow
1. Inbound call triggers telephony or simulation webhook (`POST /voice/webhook`).
2. AI receptionist identifies itself, parses caller intent, and queries real-time doctor availability via NestJS.
3. Upon caller selection, submits a booking request using a unique `requestId` (idempotency key).
4. Booking is recorded with source `AI_VOICE` and status `REQUESTED` pending receptionist confirmation. Duplicate submissions return the existing booking (`isReplay: true`) without creating double entries.
5. Structured call outcome (`COMPLETED`, `ESCALATED`, `ABANDONED`) and transcript summary are logged into `CallLog`.

### Journey C: Enquiries & Callback Tasks
1. Prospective patients inquiring about pricing, schedules, or services are captured under `Lead` (`POST /api/leads`).
2. A linked `FollowUpTask` is generated with priority (`HIGH`, `MEDIUM`, `URGENT`) and scheduled due date.
3. Reception staff view tasks on the dashboard and mark them completed upon resolution.

### Journey D: Conflict Prevention & Doctor Leave Handling
1. If a doctor is on approved leave (`DoctorLeave`), the slot generator outputs zero slots for that interval.
2. Overlapping appointment bookings trigger an immediate `409 Conflict` database rejection.
3. Double-bookings are prevented via PostgreSQL interactive transaction locks.

---

## 🧪 Comprehensive Automated Test Coverage

The project features **122 automated tests** across both backend and voice layers, all continuously passing.

### 1. NestJS Backend Test Suites (`apps/api`)
Run via `npm test` in `apps/api`:
```text
PASS test/schedule-and-slots.spec.ts
PASS test/integrated-journeys.spec.ts
PASS test/verification-matrix.spec.ts
PASS test/ai-voice-integration.spec.ts

Test Suites: 4 passed, 4 total
Tests:       44 passed, 44 total
Snapshots:   0 total
Time:        ~14s
```

- **`test/schedule-and-slots.spec.ts` (7 tests)**: Validates shift boundary arithmetic, lunch break exclusion, doctor leave suppression, and slot subtraction.
- **`test/integrated-journeys.spec.ts` (2 tests)**: End-to-end execution of multi-step hospital workflows and database mutations.
- **`test/verification-matrix.spec.ts` (11 tests)**: Validates Argon2id hashing, PHI secret redaction in audit trails, RBAC permission enforcement (403 Forbidden), and audit trail immutability.
- **`test/ai-voice-integration.spec.ts` (21 tests)**: Complete implementation of integration test cases **INT-001 through INT-016** (doctor availability, booking, idempotency replays, call logging, lead capture, emergency 112 refusal, and RBAC token enforcement).

### 2. Python AI Voice Receptionist Test Suite (`ai-voice-receptionist`)
Run via `pytest -q` in `ai-voice-receptionist`:
```text
.......................................................................... [100%]
78 passed in 13.91s
```
- **`test_api.py`**: Telephony webhook handlers, caller intent routing, and payload parsing.
- **`test_appointment_service.py`**: Slot filtering, conflict checks, and booking state transitions.
- **`test_hms_api.py`**: HTTP client resilience, Bearer authentication headers, and NestJS error handling.
- **`test_notifications.py`**: Confirmation notifications and mock SMS/email delivery.
- **`test_receptionist.py`**: Conversational dialog states, emergency escalation rules, and fallback triggers.
- **`test_reminders.py`**: Appointment reminder scheduler and time-window evaluation.

---

## 📖 System Documentation

Detailed technical documentation and architecture blueprints are maintained in the repository:

- **[System Functional Overview (`SYSTEM_FUCTIONAL_OVERVIEW.md`)](./SYSTEM_FUCTIONAL_OVERVIEW.md)**:
  - High-level component architecture & physical topology
  - End-to-end data flow diagrams for all 4 user journeys
  - Full Role-Based Access Control (RBAC) permission matrix
  - AI Voice Receptionist integration contract & payload formats
  - Database schema & entity relationships

- **[AI Voice Receptionist Integration Test Plan (`docs/AdvFiction HMS_AI_Voice_Receptionist_Integration_Test_Plan.md`)](./docs/AdvFiction%20HMS_AI_Voice_Receptionist_Integration_Test_Plan.md)**:
  - Complete verification matrix for test cases INT-001 through INT-016
  - Test execution logs and formal sign-off record

---

## 🔒 Security & Compliance Standards

- **Password Hashing**: GPU-resistant Argon2id with unique salt and server pepper (`NFR-1.2`).
- **Role-Based Access Control**: Granular CASL permission decorators (`@RequirePermissions`) enforced across all API endpoints.
- **Audit Logging**: Immutable, append-only audit trail (`AuditLog`) tracking all modifications with sensitive credential/token redaction (`stripSecrets`).
- **Timezone Anchor**: Hospital clinical operations strictly pinned to **`Asia/Kolkata` (IST, UTC+05:30)** to avoid cross-client scheduling drift.
- **AI Safety Guardrails**: AI receptionist service refuses emergency triage and enforces immediate transfer to emergency services (`112`).
