> Historical branch review. The subsequent fictional-data demo integration is documented in [DEMO_INTEGRATION.md](DEMO_INTEGRATION.md).

# Software integration review and plan
Reviewed 27 October 2026 against the user's local clone. This is an independent review and prepared foundation, not a completed seven-module application.

## Exact branches
The screenshot represents seven responsibilities across eight software references. Local remote-tracking refs were inspected; no remote fetch was performed. Findings apply to this clone's snapshot.

| Module | Exact branch | Reviewed commit |
| --- | --- | --- |
| Auth, roles, audit | auth-and-audit-logs | 6ac21d1ae12080a294b4e49c027d3571ee9c701c |
| Doctors and availability | feature/doctor-schedule-availability-api | b29c04f96affe0be28e30966adcf3db4cec7b9f5 |
| Departments, services, settings | module-3/departments-services+settings | 49162e1bd36e1392a41598e529925eff3b0ed875 |
| Patients and calls | feature/patient-&-call-overview-module | 71086a51c06667daefb309dd0bfab1ae4f39ed39 |
| Leads and follow-ups | module5/leads-enquiries+follow-uptasks | 07d3c7f73ea70490f7c09c46b64a921411857e61 |
| Dashboard and reports | feature/dashboard-reports | e8ab33bde76f319a5fff663944dc627a6d848a62 |
| Older appointment reference | feature/appointemnts-module | e41d7177ef35fd561a500988af985a51ea50e6e8 |
| Standalone appointments | module7/standalone-module | 9c7295e619c654444cbfbc0ffcff81a48dc51bc7 |

Main: e41d7177ef35fd561a500988af985a51ea50e6e8.
Excluded: feature/ai-voice-receptionist-notifications. Its application code was not reviewed or merged. Existing compatibility endpoints inside auth are mentioned only where they affect shared APIs. Password-reset email belongs to auth, not the excluded notification application.

## Architecture and history
This is a full clone. Auth, module 3, module 5 and module 7 have independent Git root histories. Doctor, patient and dashboard branches share main's initial commit. Multiple branches define different apps in identical root package.json, src/App.jsx, layouts, styles, mock-data and deployment paths. Mechanical merging would collide or replace apps without connecting their data.

The blueprint proposed Laravel/MySQL. Selected tips contain JS/TS implementations; the only database-backed module uses PostgreSQL. There is no implemented Laravel backend among them. Recommended target: auth's NestJS API, Prisma/PostgreSQL and Next.js shell, with deliberate component and business-rule ports. This recommendation does not establish formal approval to change an externally mandated stack.

## Independent module findings
### Authentication and audit
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/6ac21d1ae12080a294b4e49c027d3571ee9c701c)

NestJS 10, Passport local/JWT, Argon2, Prisma 5, cookie-parser, Helmet and throttler; Jest/Supertest. Frontend is Next.js 14.2.24, React 18, Tailwind 3 and Lucide. Root uses Turbo/npm workspaces and shared types.

apps/api/prisma/schema.prisma defines users, roles, permissions, refresh/reset token hashes, patients, appointments and audit logs. There are no checked-in migrations or doctor/department/call/lead/task models. Existing patient CRUD overlaps module 4. Existing appointment API creates a patient stub and appointment without slot locking or idempotency. Availability is fixed UTC slots.

Cookie JWT auth exists, but refresh endpoint/rotation is missing. Demo fallback, inactive-user checks, incomplete revocation and permissive CORS need correction. See AUTHENTICATION.md. Audit redacts credential fields but writes can be lost through swallowed errors; API delete prevention is not database immutability.

### Doctors and schedules
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/b29c04f96affe0be28e30966adcf3db4cec7b9f5)

Express 4/TypeScript, cors, dotenv, Helmet and express-rate-limit; Vitest/Supertest. Routes expose doctor CRUD, leaves, availability and appointment operations at both /api and /.

src/services/availabilityService.ts forwards every operation to external n8n /hms endpoints. There is no in-repository slot engine, transaction or booking store. README claims of atomic booking depend on absent upstream implementation.

src/client/hmsClient.ts keeps HMS_API_KEY server-side as x-api-key; retries GET once on network/5xx, never auto-retries POST/PATCH, maps upstream 401 to configuration errors and network failures to 502. Booking forwards Idempotency-Key or generates a new UUID each call, which does not deduplicate caller retries without a stable supplied key.

src/server.ts has no inbound auth/authorization, so it must not bypass NestJS guards. Both servers default to port 4000. src/index.ts auto-start condition includes !process.env.VITEST, true during normal imports: separate a clean library entry point before importing into NestJS.

Reuse DTOs and resilience patterns. Build authoritative scheduling against the common database; retain upstream only as an explicit optional adapter after contract/ownership verification. Do not make software integration depend on excluded AI infrastructure. No live upstream requests were made.

### Departments, services, settings
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/49162e1bd36e1392a41598e529925eff3b0ed875)

React 18, Vite 5, Router 6, Tailwind 3, Lucide, Recharts and clsx. App.jsx has its own dashboard and shell. Pages seed component state from mockData.js; no API or database persistence. Settings.jsx handleSave only marks the UI saved and shows a message. Departments/services/consultation durations/opening hours must become common reference data for appointments.

### Patients and calls
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/71086a51c06667daefb309dd0bfab1ae4f39ed39)

React 19, Vite 8, Router 7, TanStack Query 5, Axios and Lucide differ from the React 18 module group. README/package label this module 6 despite patient/call ownership.

usepatients.js/usecalls.js keep per-hook in-memory fixtures. Duplicate checks normalize phone/email locally; separate instances are not a shared store. authcontent.jsx starts as demo administrator and accepts local login; replace with shared server auth.

API wrappers are unused by those active hooks. Axios defaults base to /api while endpoint constants already start /api, yielding /api/api under that default. Cross-origin cookies lack withCredentials configuration.

UI uses fullName, alternate phone, notes and lastContact; Prisma uses firstName/lastName, MRN and required birth date. Define DTO mappings and allow unknown demographics rather than inventing values. Duplicate-check and call endpoints are absent from auth. Reception call records remain in scope independently of AI voice service.

This branch duplicates leads/follow-ups/dashboard. Prefer module 5 as primary lead/task owner; retain useful call cross-links without duplicate entities.

### Leads and follow-ups
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/07d3c7f73ea70490f7c09c46b64a921411857e61)

React 18/Vite 5/Router 6/Tailwind 3 matches modules 3/7. Leads and FollowUps use independent component arrays from mockData.js; dashboard and task lead options use initial fixtures, so edits do not propagate. Staff fixture IDs must become User relationships. Reminders are UI fields, not durable delivery. Persist task due/completion state without importing excluded notifications.

### Dashboard and reports
[Reviewed source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/e8ab33bde76f319a5fff663944dc627a6d848a62)

React 18/Vite 6/Tailwind 3/Recharts 2/Lucide. App.jsx switches views locally. Components import MOCK datasets directly; queue actions do not mutate shared appointments. Export selects mock datasets separately from some table filters: use one filtered query for table/export. Prototype financial/admissions/clinical labels do not expand agreed operational reporting scope.

## Appointment branches and overlap
The exact older name is feature/appointemnts-module (including spelling). It equals main's commit/tree and contains README/.gitignore only. It is not a competing implementation.

[Module 7 source](https://github.com/advfictiondigitallabs-byte/Hospital-Management-System-/tree/9c7295e619c654444cbfbc0ffcff81a48dc51bc7) provides richer requested/confirmed/checked-in/completed/cancelled/no-show UI, but:

1. NewBooking.jsx:37 starts appointments at an empty array. Conflict checks exclude the seeded schedule and other users.
2. confirmBooking appends only to that page's array. Appointments.jsx independently initializes initialAppointments; navigating loses the new booking.
3. Equal start-time comparisons do not detect interval overlaps, capacity or concurrent writes.
4. Patient/doctor/day local matching is not persistent request idempotency. New-patient requests have no existing patient ID to match.
5. TIME_SLOTS, doctor/patient/department fixtures are unrelated to module 2/3 data. Status changes and rescheduling are local. No booking HTTP API exists in module 7.

There are three actual appointment sources: module 7 UI, auth's incomplete database API and doctor's external adapter. Keep module 7 UI, replace auth's mock availability/booking logic, and reconcile doctor DTOs through one service/optional adapter. Use one booking store.

## Common contracts to establish
These are proposed target decisions, not implemented features.

| Concern | Current divergence | Target |
| --- | --- | --- |
| Authentication | JWT cookies vs local demo login | One verified session and guarded API |
| Navigation | Multiple routers/sidebars/dashboards | One Next.js shell; port owned client components |
| Routes | /auth, /api, /hms, duplicated /api/api | /auth session routes; /api domain routes; /hms inside optional adapter |
| IDs | UUIDs, PT/DOC IDs, fixture codes | Database foreign keys plus explicit external mappings |
| Patient fields | fullName vs split names, incompatible required fields | Typed DTOs and optional unknown demographics |
| Time | UTC mock, IST, local strings | UTC stored instants; Asia/Kolkata schedule/display zone |
| Status | SCHEDULED/pending/requested/checked-in/no-show | REQUESTED, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED, NO_SHOW; legacy mappings and legal transitions |
| Responses | Arrays vs success/data wrappers | One typed envelope/pagination/error contract |
| Retries | Local checks or per-call UUID | Persistent stable key, payload fingerprint and replay result |
| Reports | Unrelated fixture collections | Same persisted records and filters across charts/tables/export |

Add Department, Service, ConsultationType, HospitalSettings, Doctor, WorkingInterval, Break, Leave, Lead, FollowUpTask, CallLog and IdempotencyRecord. Extend Appointment with relational IDs, enum and version. Add appropriate indexes and migrations with synthetic seeds. Do not apply schema changes to a remote database as part of review.

## Integration order
1. Foundation/auth: one monorepo/lockfile and explicit runtime/package manager; remove fail-open demo paths; require secrets; fix active-user checks, refresh rotation, token purpose and revocation. Restrict CORS and define same-origin hosting. Verify login/me/logout/reset/denial.
2. Schema/contracts: establish IDs/status/timezone/errors/permissions/DTOs; migrations on isolated development database; missing domain permissions.
3. Reference data/patients: departments/services/settings, doctor shifts/breaks/leave and patient APIs; port module 3/patient views. Server duplicate checks with manual resolution for shared family numbers.
4. Booking authority: serialize on stable doctor/day resource or equivalent database mechanism; check interval overlaps/capacity inside transaction. Persist idempotency key/fingerprint/result atomically, define replay/conflicting payload behavior. Audit reliably and define schedule-change rules.
5. Appointment UI: port module 7, load reference data/slots, submit stable keys and refetch shared queries; remove local arrays.
6. Calls/leads/tasks: patient call screens plus module 5 lead/task screens; one entity per domain, typed links, owner/assignee permissions, durable due/completion.
7. Dashboard/reports last: replace mocks with aggregates, remove duplicate dashboards, align filters and exports.
8. Release gate: clean install/build/type checks, isolated DB migrations/seeds, session/permission tests, browser workflow and concurrent booking/idempotency tests. Review final diff; obtain approval before remote push/merge.

Port in small commits with provenance. Do not combine app roots or nest independent BrowserRouters into Next.js. Keep source snapshots outside active npm workspaces until deliberately packaged.

## Validation performed
Windows, Node 24.21.0, npm 11.19.0. Checks used exported snapshots under work/sources, not main. Installs used --ignore-scripts --no-audit --no-fund and local cache. Branches without standard lockfiles resolve versions allowed by ranges; builds do not prove reproducible installation. No dependency upgrade committed.

| Source | Result |
| --- | --- |
| Doctors | 11/11 existing Vitest tests pass; TypeScript build passes. Fetch mocked: upstream concurrency unverified. |
| Departments | Production build passes; large-bundle warning |
| Patients/calls | Build passes. Validation suite cannot import validators.js (actual filename validdators.js). Mask suite 7 pass, 1 fails: expected seven stars vs actual eight for twelve-digit input. |
| Leads/tasks | Build passes; large-bundle warning |
| Dashboard/reports | Build passes |
| Module 7 | Build passes; large-bundle warning; no test script |
| Older appointment ref | Equals main; nothing to build |
| Auth | Install blocked by Windows EPERM creating workspace symlinks. Build/tests not run. Installer warns about pinned Next.js 14.2.24; plan patched-version upgrade before deployment. |

Doctor command: npm test -- --maxWorkers=1 --no-file-parallelism.
Patient command: npm run test:run -- --maxWorkers=1 --no-file-parallelism.
Builds: npm run build.
No actual database, email, browser session or end-to-end integration verified.

## Prepared local branch
integration/software-modules-2026-10-27 is a separate worktree under this chat's work/integration. It starts from main and merges only reviewed auth via explicit unrelated-history merge. The .gitignore conflict preserves both exclusion sets and allows docs. Auth code is preserved with documented defects: foundation, not deployment approval.

Other branch tips are pinned in software-module-sources.json but not merged/wired. Original clone stays on main. No excluded branch ancestry, remote push/merge, deployment or database write. Remote push/merge requires explicit user confirmation.
