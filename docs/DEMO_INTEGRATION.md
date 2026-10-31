# Integrated demo status
27 October 2026. Branch: integration/software-modules-2026-10-27.

The user's follow-up explicitly authorized integration using fictional demo values. The runnable target is now apps/demo, a standalone React/Vite application using one browser-persisted dataset. This supersedes the earlier review's "foundation only" status; it does not claim completion of the proposed database/backend integration.

## Connected scope
| Software responsibility | Integrated behavior | Source treatment |
| --- | --- | --- |
| Auth/roles/audit | Fictional account sign-in/out, restricted navigation/actions, shared actor/time/action log | Auth foundation remains; standalone demo uses explicit local roles instead of the unverified JWT backend |
| Doctors/schedules | Profile/status, working days, multiple shifts/breaks, leave, capacity and availability | Upstream contract retained; software-only local scheduling replaces external n8n calls |
| Departments/services/settings | Shared CRUD, service/consultation durations, opening hours, languages/escalation settings | Ported module 3 screens, connected shared state |
| Patients/calls | Patient CRUD/duplicate checks/profile, booking/call links, masked reception call history, logging and last contact | Ported patient components and validation; shared hooks replace local arrays |
| Leads/follow-up | Shared leads/tasks, staff/owner/due/reminder fields, enquiry conversion from booking | Ported module 5 screens; new leads appear in task forms; current hospital date replaces hardcoded date |
| Dashboard/reports | Derived KPIs, appointment trends, call outcomes, appointment/enquiry/call/task reports and CSV | Dashboard SummaryCard reused; fixture-based charts/reports rebuilt against shared data |
| Appointments | Request, confirm, check-in, complete, no-show, cancel and reschedule; persistent request-key replay | Module 7 fixtures/status/workflow adapted to shared booking service and views |

feature/appointemnts-module equals main and contributes no application code. feature/ai-voice-receptionist-notifications was not merged. No telephony, voice-agent workflow or notification delivery was added. Historical fixture source labels are normalized to Phone Call in new seeds.

## Demo architecture
- src/state/domain.js: pure calendar/availability, overlap/capacity, booking/idempotency, references, metrics/report/CSV rules.
- src/state/store.js: shared mutations, demo-role checks, audit and browser persistence.
- src/state/DemoContext.jsx: React adapter used by every module.
- src/modules: selected branch components/data/contract with provenance.
- src/pages: integrated navigation, schedule, booking, reporting and cross-module views.
- One localStorage key contains all demo entities. SessionStorage stores the chosen fictional user.
- Request keys and their payload fingerprints/results persist alongside bookings.
- Hospital schedule calculations and call-day metrics use Asia/Kolkata. Dates in the seeds shift relative to initialization day.
- Code-split pages and shared chart bundles keep each feature within one application/shell.
- No HTTP calls to an HMS backend, remote database, email service or n8n are necessary.

## Start from the repository root
~~~powershell
npm run demo:install
npm run demo
~~~
Open http://127.0.0.1:5173. Dependencies are already installed in the prepared worktree.

After a production build, a dependency-free local preview is available:
~~~powershell
cd apps/demo
node serve.mjs
~~~
The packaged demo includes dist and Run Demo.cmd, so Node.js is sufficient to present without npm installation. The local server binds only to 127.0.0.1 and handles SPA refreshes.

The standalone demo has its own package-lock.json and is deliberately excluded from inherited npm workspace membership to avoid Windows workspace-symlink failures. Existing apps/api and apps/web are preserved; their builds and production auth remain separate and unverified.

## Validation
- 52 tests: 27 new shared-domain/store integration checks plus 25 patient utility tests.
- Checks cover persisted booking/replay, changed request payload, duplicate contacts/bookings, overlap/capacity, split shifts, breaks/leave/closed days, service duration, reschedule/status rules, linked enquiry conversion, current patient names in reports, references, timezone boundary, CSV escaping/filter parity, permissions/logout, failed storage writes, settings/tasks/reset and call-to-patient contact updates.
- Existing patient validator import typo is bridged with validators.js; incorrect mask expectation is corrected to eight masked digits for a twelve-digit input.
- Vite production build passes.
- Browser verified fictional sign-in, all module pages, duplicate booking rejection, successful linked booking, confirmation, patient-profile visibility, persistence after refresh and date/department report filtering.
- Browser registered a new fictional patient successfully.
- Dashboard screenshot saved as a user-facing preview.
- No database/JWT API, email, external upstream or actual multi-user concurrency claim is made by these tests.

## Deliberate demo boundaries
This is a single-active-tab presentation app with browser-local data, not a server database or cross-user transaction system. Opening a different origin/browser gives a separate dataset. Client roles and local audit can be edited in developer tools and are not production security controls. Demo passwords are fixed and there is no real password-reset email flow. Reminder configuration is recorded but no messages are sent. The earlier auth backend issues remain documented in AUTHENTICATION.md.

The role demo is visibly labelled, rather than silently falling back from failed production authentication. The original auth branch source is not weakened to make the demo run.

## Git safety
Original main is unchanged. Selected code is integrated through explicit source ports; histories of independent prototypes were not blindly merged. Only auth ancestry was merged into this branch's foundation. No push, remote merge, deployment, database write or real credential use occurred. Remote push/merge still requires the user's confirmation.
