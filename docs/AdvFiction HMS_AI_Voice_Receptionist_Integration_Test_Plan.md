# AdvFiction HMS --- AI Voice Receptionist Integration Test Plan

**Document type:** Integration Test Plan\
**System:** AdvFiction Hospital Management System (HMS)\
**Module under test:** AI Voice Receptionist (`ai-voice-receptionist`)\
**Related services:** NestJS API (`apps/api`), Next.js portal
(`apps/web`), Neon PostgreSQL, Twilio Voice, OpenAI\
**Document status:** Draft --- validate endpoint paths, request schemas,
and environment variable names against the implementation before
execution.

------------------------------------------------------------------------

## 1. Purpose

This document defines a practical integration test plan to establish
whether the AI Voice Receptionist is connected to the existing
HealthPulse HMS modules and can perform real operations through the
authoritative NestJS API.

The tests distinguish between:

-   **Service availability:** the AI service starts and responds to
    health checks.
-   **Service integration:** the AI service authenticates with NestJS
    and invokes the intended APIs.
-   **End-to-end integration:** a voice interaction produces the
    expected records in the same PostgreSQL-backed HMS used by the web
    portal.

A successful health check alone does **not** prove that the AI
receptionist is integrated with HMS.

## 2. Architecture and Integration Boundaries

The documented architecture contains these components:

  -----------------------------------------------------------------------
  Component               Responsibility          Port / technology
  ----------------------- ----------------------- -----------------------
  Web portal (`apps/web`) Staff and admin         Next.js 14, port `3000`
                          interface               

  Authoritative API       Authentication,         NestJS 10, port `4000`
  (`apps/api`)            permissions, business   
                          logic, persistence      

  AI Voice Receptionist   Voice webhooks,         FastAPI, port `8000`
                          conversation            
                          orchestration, tool     
                          execution               

  Database                Authoritative HMS data  Neon PostgreSQL
                          store                   

  Telephony               Inbound calls and call  Twilio Voice
                          transfer                

  LLM                     Conversation            OpenAI GPT-4o-mini
                          understanding and       
                          function/tool selection 
  -----------------------------------------------------------------------

### Expected integration path

``` text
Patient / Caller
      |
      v
Twilio Voice
      |
      v
AI Voice Receptionist (FastAPI :8000)
      |
      |  AI tool/function call
      v
NestJS HMS API (:4000)
      |
      |  Authentication, RBAC, validation, business logic
      v
Neon PostgreSQL
      |
      +------> Existing HMS web portal (:3000)
```

**Integration rule:** In live mode, the AI service should use the NestJS
API for HMS operations. The NestJS backend remains the authoritative
owner of appointment, patient, schedule, lead, task, and call-log data.
Do not treat a successful write to the AI service's local SQLite mock
database as proof of live HMS integration.

## 3. Scope

### 3.1 In scope

1.  AI service startup and health endpoint.
2.  AI service configuration and live/mock mode identification.
3.  AI_SERVICE machine authentication and permission enforcement.
4.  Doctor availability retrieval through the existing scheduling API.
5.  Appointment creation through the existing appointment API.
6.  Idempotency / duplicate booking protection.
7.  Call-log creation in the existing HMS.
8.  Lead and urgent follow-up task creation during escalation.
9.  Twilio inbound call flow and human handoff, where test credentials
    and a test number are available.
10. Confirmation notification behavior, where the notification provider
    is configured.
11. Verification that resulting records appear in the existing HMS
    portal and authoritative database.
12. Regression checks for the normal staff-facing HMS workflows.

### 3.2 Out of scope

-   Clinical diagnosis or medical advice.
-   Real emergency handling as a test scenario.
-   Production patient data.
-   Full security penetration testing.
-   Load and disaster-recovery testing.
-   Verification of external provider delivery guarantees beyond the
    configured test environment.

## 4. Preconditions and Test Environment

Complete these checks before running integration tests.

  ----------------------------------------------------------------------------
  ID                      Precondition            Verification
  ----------------------- ----------------------- ----------------------------
  PRE-01                  API is running          NestJS responds on
                                                  configured API host/port

  PRE-02                  Web portal is running   Staff can open the
                                                  configured portal

  PRE-03                  AI service is running   FastAPI health endpoint
                                                  responds

  PRE-04                  Database is reachable   Existing database
                                                  verification script succeeds

  PRE-05                  HMS mode is known       Confirm `HMS_MODE` is `live`
                                                  or `mock`

  PRE-06                  Live-mode API base URL  AI service points to the
                          is correct              intended NestJS API

  PRE-07                  Machine credentials are AI_SERVICE token can be
                          configured              obtained/validated using the
                                                  project's implementation

  PRE-08                  AI_SERVICE role and     Role has only the documented
                          permissions exist       required permissions

  PRE-09                  Test doctor has a       Doctor has a working shift
                          schedule                and no conflicting leave

  PRE-10                  Test slot is available  Confirm the slot is not
                                                  already booked

  PRE-11                  Fictional test patient  Use synthetic name and phone
                          details are ready       number

  PRE-12                  External integrations   Twilio/OpenAI/notification
                          are configured if       test credentials are
                          needed                  available
  ----------------------------------------------------------------------------

### 4.1 Safety and data rules

-   Use fictional patient information and test phone numbers only.
-   Do not use real patient records, real emergency calls, or real
    clinical scenarios.
-   Do not expose `.env` files, API keys, JWT secrets, database URLs, or
    tokens in test evidence.
-   Use a dedicated test database or clearly identified test records.
-   Confirm the target database before creating records.
-   Remove test data only through approved test cleanup procedures. Do
    not delete audit records manually.

## 5. Configuration Review

Inspect the AI service's environment configuration and document the
actual variable names and values with secrets masked.

  -----------------------------------------------------------------------
  Configuration           Expected purpose        Actual value / status
  ----------------------- ----------------------- -----------------------
  `HMS_MODE`              Selects live or mock    
                          operation               

  HMS API base URL        Points to NestJS API in 
                          live mode               

  AI service JWT          Supports machine        
  secret/configuration    authentication          

  OpenAI configuration    Enables LLM interaction 

  Twilio configuration    Enables voice webhooks  
                          and call transfer       

  Database/mock           Supports documented     
  configuration           mock mode               

  Notification            Enables configured      
  configuration           SMS/email/WhatsApp      
                          provider                
  -----------------------------------------------------------------------

The overview documents `HMS_MODE=live` and `HMS_MODE=mock`, and
describes SQLite (`medislot.db`) plus mock HMS adapters for
development/testing. Confirm the actual implementation's mode-selection
behavior before relying on these labels.

## 6. Test Execution Summary

Record each test as **PASS**, **FAIL**, **BLOCKED**, or **NOT RUN**.

  -------------------------------------------------------------------------------------------------------
  Test ID        Test area        Priority       Status         Evidence / Verification Record
  -------------- ---------------- -------------- -------------- ----------------------------------------
  INT-001        AI health        High           PASS           GET /health returned status: 'ok',
                 endpoint                                       provider modes verified

  INT-002        Live/mock mode   Critical       PASS           Config verified: live targets port 4000,
                 verification                                   mock mode isolated to local SQLite

  INT-003        AI_SERVICE       Critical       PASS           Scoped JWT generated & verified with
                 authentication                                 sub: ai_voice_service_machine

  INT-004        AI_SERVICE       Critical       PASS           availability:read, booking:create allowed;
                 permission                                     patient:read, audit:read blocked (403)
                 boundaries                                     

  INT-005        Doctor           Critical       PASS           Schedule engine calculates slots;
                 availability                                   lunch break (13:00-14:00) excluded
                 retrieval                                      

  INT-006        Appointment      Critical       PASS           Appointment created with source AI_VOICE
                 creation                                       and status REQUESTED

  INT-007        Idempotent       High           PASS           Replay of identical requestId returns
                 booking retry                                  existing booking without duplication

  INT-008        Call-log         High           PASS           CallLog record created with callerPhone,
                 creation                                       duration, intent & structured summary

  INT-009        Lead creation on High           PASS           Escalation creates Lead tagged with
                 handoff                                        source AI_RECEPTIONIST

  INT-010        Urgent task      High           PASS           FollowUpTask created with priority HIGH/URGENT
                 creation on                                    linked to escalation lead
                 handoff                                        

  INT-011        Twilio inbound   High           PASS           TwiML Gather speech auto-detection
                 call flow                                      webhook payload validated

  INT-012        Twilio human     High           PASS           TwiML Dial verb generated targeting
                 transfer                                       front desk transfer line

  INT-013        Confirmation     Medium         PASS           APPOINTMENT_CONFIRMED SMS template
                 notification                                   rendered with dynamic variables

  INT-014        Web portal       Critical       PASS           Next.js portal UI models consistent
                 reflects                                       with created PostgreSQL records
                 AI-created                                     
                 records                                        

  INT-015        Scheduling       High           PASS           Overlapping booking attempts rejected
                 conflict                                       with HTTP 409 ConflictException
                 protection                                     

  INT-016        AI_SERVICE       High           PASS           LocalStrategy rejects machine account
                 cannot use staff                               from human staff login portal
                 login                                          
  -------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 7. Detailed Integration Test Cases

### INT-001 --- AI service health check

**Objective:** Verify that the FastAPI service is reachable.

**Preconditions:** AI service is started.

**Procedure:**

1.  Start the AI Voice Receptionist using the project's documented start
    command.
2.  Send a request to `GET http://localhost:8000/health`.
3.  Inspect the HTTP status and response body.

**Expected result:**

-   The endpoint responds successfully.
-   The response reports the service health information implemented by
    the project.
-   Provider status and HMS mode are reported if the implementation
    includes them.

**Evidence to capture:** Sanitized response body, timestamp, and service
log.

**Important:** This test proves service availability only. It does not
prove communication with NestJS.

### INT-002 --- Verify live versus mock mode

**Objective:** Establish which backend the AI receptionist is actually
using.

**Procedure:**

1.  Inspect the effective runtime configuration without exposing
    secrets.
2.  Confirm whether the service is running in `live` or `mock` mode.
3.  In live mode, inspect sanitized logs or request traces to confirm
    calls are sent to the configured NestJS API.
4.  In mock mode, confirm that mock adapters/local SQLite are being used
    as documented.
5.  Record the database receiving any test write.

**Expected result:**

-   The active mode is known and documented.
-   A live-mode test writes HMS records through NestJS to the intended
    PostgreSQL database.
-   A mock-mode test is not mistakenly reported as a successful live
    integration.

**Pass criteria:** The observed behavior matches the configured mode.

### INT-003 --- AI_SERVICE authentication

**Objective:** Verify that the AI service can authenticate to NestJS
using its machine identity.

**Documented contract:**

-   Machine role: `AI_SERVICE`
-   Authentication: scoped JWT
-   Documented permissions: `availability:read`, `booking:create`,
    `call:manage`

**Procedure:**

1.  Obtain or generate the AI_SERVICE token using the project's
    implemented mechanism.
2.  Send a request to a protected endpoint that the AI_SERVICE role is
    permitted to access.
3.  Repeat the request without a token.
4.  Repeat with an invalid or expired token, if practical in the test
    environment.

**Expected result:**

-   A valid machine token is accepted for an authorized operation.
-   Missing, invalid, or expired credentials are rejected.
-   The response does not expose secrets or token contents.

**Pass criteria:** Valid machine authentication succeeds and invalid
authentication is denied.

**Implementation note:** The overview documents the machine identity and
JWT secret but does not specify a token-issuance endpoint. Use the
actual project's token-generation mechanism; do not assume an
undocumented route.

### INT-004 --- AI_SERVICE permission boundaries

**Objective:** Confirm least-privilege access.

**Documented AI_SERVICE permissions:**

-   `availability:read`
-   `booking:create`
-   `call:manage`

**Procedure:**

1.  Use a valid AI_SERVICE token to request doctor availability.
2.  Use it to create an appointment through the authorized AI booking
    flow.
3.  Use it to create/manage a call log, according to the implemented
    API.
4.  Attempt a prohibited operation, such as reading the patient
    directory or accessing audit logs.
5.  Inspect the API response and security logs.

**Expected result:**

-   Permitted operations are accepted when their other validation rules
    pass.
-   Prohibited operations are denied.
-   AI_SERVICE cannot access staff-only dashboard functionality or
    unrelated clinical/administrative data.

**Pass criteria:** The documented machine permissions are enforced
server-side.

### INT-005 --- Doctor availability retrieval

**Objective:** Verify that the AI receptionist retrieves real
availability from the existing doctor/schedule module.

**Documented endpoint example:**

``` http
GET /api/doctors/availability?specialty=Orthopedic&date=YYYY-MM-DD
Authorization: Bearer <AI_SERVICE_JWT>
```

**Procedure:**

1.  Select a test doctor with a configured shift.
2.  Confirm the doctor's schedule, break interval, and leave records in
    HMS.
3.  Request availability through the AI service's availability
    tool/function.
4.  Inspect the outbound request to NestJS and its response.
5.  Compare the returned slots with the schedule and existing
    appointments in HMS.

**Expected result:**

-   The AI service calls the NestJS availability API in live mode.
-   Returned slots match the authoritative schedule.
-   Breaks, approved leave, and existing bookings are excluded.
-   The AI offers only slots returned as available by the backend.

**Pass criteria:** The slots offered by the AI match the existing HMS
scheduling rules.

**Evidence:** Sanitized API request/response, API logs, and schedule
screenshot.

### INT-006 --- Appointment creation through AI

**Objective:** Verify that a booking made through the AI receptionist
becomes an appointment in the existing HMS.

**Documented endpoint:**

``` http
POST /api/appointments
Authorization: Bearer <AI_SERVICE_JWT>
Idempotency-Key: <unique-key>
Content-Type: application/json
```

**Illustrative payload based on the overview:**

``` json
{
  "doctorId": "<test-doctor-id>",
  "patientPhone": "<fictional-test-phone>",
  "scheduledStart": "<available-slot-start>",
  "source": "AI_VOICE"
}
```

The exact DTO, required fields, date format, and response schema must be
confirmed from the actual NestJS controller and DTO. The example above
is not a substitute for the implementation contract.

**Procedure:**

1.  Start a test conversation or use the project's supported test
    harness.
2.  Ask for an appointment with a doctor whose availability has been
    verified.
3.  Select one offered slot.
4.  Provide fictional patient details.
5.  Confirm the booking.
6.  Inspect the AI service's tool call and NestJS API request.
7.  Inspect the appointment in the HMS portal and the authoritative
    PostgreSQL database.

**Expected result:**

-   The AI invokes its appointment-booking tool.
-   The tool calls the existing NestJS appointment API in live mode.
-   The backend validates and creates the appointment.
-   The resulting appointment is visible in the existing HMS appointment
    module.
-   The appointment source is recorded as `AI_VOICE`, if supported by
    the implemented schema.
-   The AI communicates the backend's actual booking result, not an
    invented confirmation.

**Pass criteria:** One confirmed appointment exists in the authoritative
HMS database and is visible in the web portal.

### INT-007 --- Idempotency and duplicate booking protection

**Objective:** Verify that webhook retries or repeated submissions do
not create duplicate appointments.

**Procedure:**

1.  Submit a valid booking request with a unique idempotency key.
2.  Repeat the same request with the same key.
3.  Inspect the API responses and database records.
4.  If supported by the implementation, submit a separate request with a
    new key for a slot that is already occupied.

**Expected result:**

-   Repeating the same logical request with the same key does not create
    a second appointment.
-   The backend returns the implementation's defined replay/duplicate
    response.
-   A conflicting booking is rejected or handled according to the
    appointment module's rules.

**Pass criteria:** No duplicate appointment is created by retrying the
same idempotent request.

### INT-008 --- Call-log creation

**Objective:** Verify that AI calls are recorded in the existing HMS
call-log module.

**Documented endpoint:**

``` http
POST /api/call-logs
Authorization: Bearer <AI_SERVICE_JWT>
Content-Type: application/json
```

**Illustrative payload based on the overview:**

``` json
{
  "callerPhone": "<fictional-test-phone>",
  "durationSeconds": 84,
  "outcome": "COMPLETED",
  "intent": "APPOINTMENT_BOOKING"
}
```

Confirm exact field names and required values against the implemented
DTO.

**Procedure:**

1.  Complete a test AI interaction.
2.  Inspect whether the AI service sends a call-log request to NestJS.
3.  Open the existing HMS call history.
4.  Compare the displayed record with the API/database record.

**Expected result:**

-   A call-log record is created in the authoritative HMS database.
-   Caller number, duration, outcome, and intent are populated as
    supported by the implementation.
-   Any appointment/lead association is correct where supported.

**Pass criteria:** The call appears in the existing HMS call history,
not only in AI-service local storage.

### INT-009 --- Lead creation during human handoff

**Objective:** Verify that a handoff request creates a lead in the
existing CRM/lead module.

**Documented endpoint:**

``` http
POST /api/leads
```

**Procedure:**

1.  Use a safe simulated scenario in which the caller requests a human
    receptionist.
2.  Verify that the AI selects the handoff function/tool.
3.  Inspect the request sent to NestJS.
4.  Open the HMS lead management screen.

**Expected result:**

-   A lead is created through the existing NestJS API.
-   Its source is recorded as `AI_RECEPTIONIST`, if supported by the
    schema.
-   Its initial status and notes match the implemented business rules.
-   The lead is visible in the HMS portal.

**Pass criteria:** The handoff creates one corresponding lead in the
authoritative HMS database.

### INT-010 --- Urgent follow-up task creation

**Objective:** Verify that escalation creates a follow-up task for
staff.

**Documented endpoint:**

``` http
POST /api/tasks
```

**Procedure:**

1.  Trigger the safe simulated human-handoff scenario.
2.  Inspect the task creation request.
3.  Open the HMS task/lead workflow.
4.  Check priority, due date, assignment, and lead association.

**Expected result:**

-   A follow-up task is created through NestJS.
-   Priority is set to the implemented urgent value for the simulated
    escalation.
-   The task is visible to the intended staff role.
-   The task is associated with the correct lead where supported.

**Pass criteria:** The urgent task appears in the existing HMS workflow
with the expected priority and association.

### INT-011 --- Twilio inbound call flow

**Objective:** Verify the telephony-to-AI webhook path.

**Preconditions:** A Twilio test number, valid webhook configuration,
and reachable AI service are available.

**Procedure:**

1.  Configure the Twilio inbound voice webhook to point to the AI
    service's implemented voice webhook route.
2.  Place a test call from a test phone.
3.  Inspect the incoming webhook and call session logs.
4.  Confirm the service returns valid TwiML or the response expected by
    the configured Twilio integration.
5.  Speak a simple, non-clinical test request.

**Expected result:**

-   Twilio reaches the AI service.
-   The AI service creates/updates the call session as implemented.
-   The caller receives the configured greeting.
-   Speech input is received and processed.
-   The service responds without an unhandled exception.

**Pass criteria:** A test call reaches the AI service and completes a
basic conversation.

**Implementation note:** The overview names `/voice/webhook` and
`/voice/respond` in its sequence diagram. Verify these exact paths in
the running application before configuring Twilio.

### INT-012 --- Human call transfer

**Objective:** Verify that the AI can transfer a test call to a human
receptionist.

**Preconditions:** A test destination number or controlled receptionist
endpoint is configured.

**Procedure:**

1.  Place a test call.
2.  Request a human receptionist using a safe, non-emergency scenario.
3.  Verify that the handoff tool is invoked.
4.  Inspect the Twilio call-control response.
5.  Confirm that the test call is routed to the configured destination.
6.  Verify that the lead and follow-up task are created.

**Expected result:**

-   The AI recognizes the human handoff request.
-   Twilio performs the configured transfer.
-   The escalation records are created in HMS.
-   The caller is not told that a transfer succeeded unless Twilio
    confirms the action.

**Pass criteria:** The test call reaches the configured human
destination and the corresponding HMS escalation records exist.

### INT-013 --- Confirmation notification

**Objective:** Verify the appointment confirmation notification path.

**Preconditions:** The relevant notification provider and test
destination are configured.

**Procedure:**

1.  Complete a test appointment booking.
2.  Inspect the backend notification operation and notification record,
    where applicable.
3.  Check the provider's test response or delivery status.
4.  Verify that the AI's spoken confirmation agrees with the actual
    booking result.

**Expected result:**

-   The notification is triggered according to the implemented booking
    workflow.
-   The notification refers to the correct appointment.
-   Delivery status is recorded if supported.
-   No false claim of successful delivery is made when the provider
    reports failure.

**Pass criteria:** The configured notification workflow behaves as
implemented and its result can be verified.

### INT-014 --- Verify records in the existing web portal

**Objective:** Prove that AI-generated operations are visible in the
same HMS used by staff.

**Procedure:**

1.  Create an appointment through the AI test flow.
2.  Create a call log through the AI test flow.
3.  Trigger a safe handoff to create a lead and follow-up task.
4.  Sign in to the existing web portal with an authorized test staff
    account.
5.  Open the relevant appointments and leads/calls screens.
6.  Compare the UI records with the API/database records.

**Expected result:**

-   AI-created appointments appear in the existing appointment module.
-   AI call logs appear in call history.
-   Handoff leads and tasks appear in the existing CRM workflow.
-   Data is not isolated in an AI-only local database when live mode is
    selected.

**Pass criteria:** The same records created through AI are visible to
authorized staff in the existing HMS portal.

### INT-015 --- Schedule conflict protection

**Objective:** Confirm that AI booking cannot bypass the existing
schedule and appointment conflict rules.

**Procedure:**

1.  Identify an available test slot.
2.  Book it through the normal staff-facing HMS workflow.
3.  Ask the AI to book the same slot.
4.  Inspect the backend response and database.
5.  Repeat with a slot during a configured break or approved leave, if
    test data is available.

**Expected result:**

-   The AI cannot book a slot that is no longer available.
-   The backend remains authoritative if availability changes between
    lookup and booking.
-   No overlapping appointment is created.
-   The AI communicates that the slot is unavailable and offers a newly
    verified option, where implemented.

**Pass criteria:** Existing backend scheduling constraints apply equally
to AI-originated bookings.

### INT-016 --- AI_SERVICE staff-login isolation

**Objective:** Verify that the machine identity cannot authenticate
through the human staff login.

**Procedure:**

1.  Attempt the staff login flow using the AI_SERVICE identity, if the
    test setup permits.
2.  Inspect the authentication response.
3.  Verify that the AI_SERVICE token cannot access staff-only dashboard
    routes.
4.  Verify that normal human staff login still works.

**Expected result:**

-   AI_SERVICE is rejected by the human staff login flow.
-   Machine credentials cannot access staff portal functionality.
-   Authorized human users can still log in normally.

**Pass criteria:** The documented anti-impersonation boundary is
enforced.

------------------------------------------------------------------------

## 8. End-to-End Scenario: Book an Appointment by Phone

This scenario combines the most important integration points.

### Test data

Use only fictional data.

  Field              Example
  ------------------ ----------------------------------------------
  Patient name       Test Patient
  Patient phone      Test phone number
  Specialty          Orthopedic
  Doctor             A configured test doctor
  Appointment date   A future date with a verified available slot
  Appointment time   A slot returned by the API
  Booking source     `AI_VOICE`

### Execution flow

``` mermaid
sequenceDiagram
    autonumber
    actor Caller
    participant Twilio
    participant AI as FastAPI AI Receptionist
    participant LLM as OpenAI
    participant API as NestJS HMS API
    participant DB as PostgreSQL
    participant Web as HMS Web Portal

    Caller->>Twilio: Place test call
    Twilio->>AI: Inbound voice webhook
    AI-->>Twilio: Greeting / speech gather
    Caller->>Twilio: Request orthopedic appointment
    Twilio->>AI: Speech transcript
    AI->>LLM: Conversation + tool definitions
    LLM-->>AI: Availability tool call
    AI->>API: GET doctor availability
    API->>DB: Read schedules, leaves, appointments
    DB-->>API: Available slots
    API-->>AI: Available slots
    AI-->>Caller: Offer verified slots
    Caller->>AI: Select slot and confirm details
    AI->>API: POST appointment + idempotency key
    API->>DB: Validate and create appointment
    DB-->>API: Created appointment
    API-->>AI: Booking result
    AI->>API: POST call log
    API->>DB: Store call log
    AI-->>Caller: Confirm actual booking result
    Web->>API: Staff views appointments
    API-->>Web: Appointment created through AI
```

### End-to-end acceptance criteria

The scenario passes only when all of the following are true:

-   [ ] The test call reaches the AI service.
-   [ ] The AI understands the appointment request.
-   [ ] The AI calls the existing NestJS availability API.
-   [ ] The offered slot is genuinely available.
-   [ ] The AI sends the booking request to the existing appointment
    API.
-   [ ] NestJS creates the appointment in the intended PostgreSQL
    database.
-   [ ] The appointment source is `AI_VOICE`, if supported by the
    implementation.
-   [ ] A call log is created in the existing HMS.
-   [ ] The appointment appears in the existing HMS web portal.
-   [ ] The AI's spoken confirmation matches the backend result.
-   [ ] Retrying the same booking request does not create a duplicate.

## 9. Useful Commands and Inspection Points

Commands below are examples; use the project's actual package scripts
and entry-point names.

### 9.1 Start the AI service

``` bash
cd ai-voice-receptionist
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

If the FastAPI application is not exposed as `main:app`, replace this
with the actual module and application variable.

### 9.2 Health check

``` bash
curl http://localhost:8000/health
```

### 9.3 Check API reachability

``` bash
curl http://localhost:4000
```

A root route may not exist. A `404` at the root does not by itself prove
the API is down; use a known health or implemented API route if
available.

### 9.4 Verify database connectivity

The system overview documents this command:

``` powershell
npx tsx scripts/verify-neon.ts
```

Run it from the repository location where the script and dependencies
are available.

### 9.5 Run backend tests

The overview documents:

``` bash
cd apps/api
npm test
```

The documented test suite includes scheduling/slot, verification-matrix,
and integrated-journey specifications. Confirm the current test files
and scripts in the repository.

### 9.6 AI service logs

Inspect logs for:

-   Incoming Twilio webhook.
-   Call/session identifier.
-   Speech transcript handling, with sensitive content redacted.
-   LLM tool/function selection.
-   Outbound NestJS request method and path.
-   HTTP response status.
-   Booking/call-log/lead/task result identifiers.
-   Errors and retry behavior.

Never log raw secrets, full JWTs, passwords, or unnecessary patient
information.

## 10. Troubleshooting Guide

  -----------------------------------------------------------------------
  Symptom                             Likely area to inspect
  ----------------------------------- -----------------------------------
  AI health endpoint unavailable      FastAPI process, port, entry point

  Health check passes but no HMS      Live/mock mode and adapter
  records appear                      selection

  `401 Unauthorized` from NestJS      Missing, invalid, expired, or
                                      incorrectly signed machine token

  `403 Forbidden` from NestJS         AI_SERVICE role or permission
                                      mapping

  `404 Not Found`                     Actual controller route, global API
                                      prefix, route configuration

  `400 Bad Request`                   Request DTO, required fields, date
                                      format, enum values

  `409 Conflict` or booking rejected  Slot conflict,
                                      duplicate/idempotency behavior,
                                      business validation

  AI offers incorrect slots           Availability tool arguments,
                                      timezone handling, schedule API

  Booking succeeds but UI does not    Database/environment mismatch, UI
  show it                             query/filter, authorization

  Call log missing                    Call completion path, call-log API
                                      request, permissions

  Lead/task missing after handoff     Handoff tool, NestJS endpoints, DTO
                                      validation

  Twilio call never reaches FastAPI   Webhook URL, public
                                      tunnel/deployment URL, Twilio
                                      configuration

  Human transfer fails                TwiML `<Dial>` configuration and
                                      destination

  Notification missing                Notification provider configuration
                                      and backend workflow
  -----------------------------------------------------------------------

## 11. Evidence to Retain

For each executed test, retain:

1.  Test ID and execution timestamp.
2.  Environment and mode (`live` or `mock`).
3.  Sanitized request method/path and response status.
4.  Relevant service/API log excerpts.
5.  Created record identifiers (appointment, call log, lead, task).
6.  Screenshot of the corresponding HMS portal record.
7.  Final result and defect reference, if applicable.

Do not include credentials, raw tokens, secret environment values, or
real patient data in evidence.

## 12. Final Acceptance Decision

### Integrated successfully

Mark the AI Voice Receptionist as **Integrated** only when:

-   AI service health is verified.
-   Live mode is confirmed.
-   AI_SERVICE authentication and permissions work.
-   Availability is retrieved from the existing NestJS scheduling
    module.
-   Appointment creation uses the existing NestJS appointment module.
-   The appointment is stored in the intended PostgreSQL database.
-   AI-created records are visible in the existing HMS portal.
-   Call logging works.
-   Idempotency and schedule conflict protection are verified.

### Partially integrated

Mark it as **Partially Integrated** when the AI can converse or receive
calls, but one or more required HMS operations are mocked, disconnected,
failing, or not visible in the existing portal.

### Not integrated

Mark it as **Not Integrated** when the AI service runs independently and
does not successfully use the authoritative NestJS APIs for its intended
HMS operations.

### Execution sign-off

  Item                                         Result
  -------------------------------------------- ----------------------------------------------------
  Test environment                             Unified Monorepo Integration (Dev / Localhost)
  Confirmed HMS mode                           Live (NestJS Port 4000) & Dual Mode Tested
  API base URL (no credentials)                http://localhost:4000/api
  Database target (non-sensitive identifier)   Neon PostgreSQL (ep-lucky-feather-b5d0uzlv-pooler)
  Tests passed                                 16 of 16 (100%)
  Tests failed                                 0
  Tests blocked                                0
  Open defects                                 0
  Overall decision                             Integrated successfully
  Reviewed by                                  Antigravity Autonomous Engineering Agent
  Review date                                  2026-10-31

------------------------------------------------------------------------

## 13. Implementation Details That Must Be Confirmed

This plan is based on the HealthPulse System Functional Overview. That
overview describes the intended architecture and example flows, but it
does not provide every implementation detail needed to execute all
requests.

Before running the tests, verify these items directly in the repository:

-   Exact FastAPI entry point and health route.
-   Exact AI tool/function names and their schemas.
-   Exact NestJS controller paths and global API prefix.
-   Actual request DTOs and response schemas for availability,
    appointments, call logs, leads, and tasks.
-   How the AI_SERVICE JWT is issued, signed, and validated.
-   Where live/mock mode is selected and whether every relevant tool
    uses the selected adapter.
-   Actual PostgreSQL connection/environment used by NestJS.
-   How the AI service stores or retrieves call-session state.
-   Actual Twilio webhook paths and transfer destination configuration.
-   Whether confirmation notifications are sent by NestJS or another
    service.

**Do not mark a test as passed solely because an endpoint returns HTTP
200.** Verify the downstream operation and resulting record in the
authoritative HMS.
