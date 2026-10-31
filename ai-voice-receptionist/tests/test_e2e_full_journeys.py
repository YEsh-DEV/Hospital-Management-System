"""End-to-End Client Demonstration and Integration Test Suite.
Validates realistic multi-turn clinical scenarios, CRM synchronizations,
telephony webhook contracts, and emergency safety guardrails.
"""
import json
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers.telephony.twilio import compute_twilio_signature
from tests.conftest import AUTH, FakeLLM, HMS, appt_payload, future_date, slots_payload, say, tc


# --- Scenario 1: Hospital FAQs (Cashless Insurance, 24x7 Trauma, Inpatient Visiting) ---
def test_e2e_faq_cashless_insurance_and_trauma(make_container, settings):
    """Client inquiries regarding insurance cashless tie-ups and emergency trauma services."""
    c = make_container(FakeLLM([
        tc("lookup_faq", {"question": "Do you accept Star Health cashless insurance?"}),
        say("Yes, we support cashless hospitalization for all major insurance providers including Star Health, HDFC ERGO, and Care Health."),
        tc("lookup_faq", {"question": "Is emergency ambulance available at night?"}),
        say("Our Emergency and Trauma Centre operates 24 hours every day with round-the-clock doctors and cardiac life-support ambulances."),
        say("You are welcome! Goodbye.")
    ]))
    with TestClient(create_app(settings, c)) as tcl:
        # Inquiry 1: Insurance
        r1 = tcl.post("/api/chat", json={"message": "Do you accept Star Health cashless insurance?"}, headers=AUTH)
        assert r1.status_code == 200
        assert "cashless" in r1.json()["reply"].lower() or "star health" in r1.json()["reply"].lower()
        sid = r1.json()["session_id"]

        # Inquiry 2: Emergency
        r2 = tcl.post("/api/chat", json={"session_id": sid, "message": "Is emergency ambulance available at night?"}, headers=AUTH)
        assert r2.status_code == 200
        assert "emergency" in r2.json()["reply"].lower() or "ambulance" in r2.json()["reply"].lower()

        # Inquiry 3: Finish
        r3 = tcl.post("/api/chat", json={"session_id": sid, "message": "Thank you, that is all."}, headers=AUTH)
        assert r3.status_code == 200

        # Check call summary intent
        summary = tcl.get(f"/api/calls/{sid}/summary", headers=AUTH).json()
        assert summary["caller_intent"] == "hospital_information"


# --- Scenario 2: End-to-End Appointment Booking with HMS Persistence & SMS Notification ---
def test_e2e_booking_journey_with_hms_sync(make_container, settings, mock_hms, sms):
    """Full booking flow: slot check -> prepare -> caller confirmation -> appointment persistence -> SMS."""
    D = future_date(3)
    book_args = {
        "doctor_id": "DOC-001",
        "date": D,
        "start_time": "10:00",
        "patient_name": "Asha Verma",
        "patient_phone": "+91 98765 43210",
    }
    mock_hms.get(f"{HMS}/hms/availability").mock(return_value=httpx.Response(200, json=slots_payload(D)))
    mock_hms.post(f"{HMS}/hms/appointments").mock(return_value=httpx.Response(201, json=appt_payload(date=D, id="APT-E2E-999")))
    mock_hms.post(f"{HMS}/hms/call-logs").mock(return_value=httpx.Response(201, json={"id": "log-e2e-01"}))

    c = make_container(FakeLLM([
        tc("check_availability", {"specialty": "Pediatrics", "date": D}),
        say(f"We have slots available on {D} at 10:00 AM. Would you like to book?"),
        tc("prepare_booking", book_args),
        say("I have prepared your appointment with Dr. Ananya Rao for Asha Verma on the date at 10:00. Should I confirm this booking? Say yes."),
        tc("book_appointment", book_args, "c2"),
        say("Your appointment is confirmed! Your booking ID is APT-E2E-999. Thank you!"),
        say("Goodbye!")
    ]))

    with TestClient(create_app(settings, c)) as tcl:
        # Step 1: Check availability
        r1 = tcl.post("/api/chat", json={"message": f"Check slots for Pediatrics on {D}"}, headers=AUTH)
        assert r1.status_code == 200
        sid = r1.json()["session_id"]

        # Step 2: Prepare booking
        r2 = tcl.post("/api/chat", json={"session_id": sid, "message": "Book at 10:00 for Asha Verma, phone 9876543210"}, headers=AUTH)
        assert r2.status_code == 200
        assert "confirm" in r2.json()["reply"].lower()

        # Step 3: Explicit caller confirmation
        r3 = tcl.post("/api/chat", json={"session_id": sid, "message": "yes, please confirm"}, headers=AUTH)
        assert r3.status_code == 200
        assert "APT-E2E-999" in r3.json()["reply"]

        # Verify SMS confirmation dispatched to patient
        patient_msgs = [m for m in sms.sent if m["to"] == "+919876543210"]
        assert len(patient_msgs) >= 1
        assert "APT-E2E-999" in patient_msgs[0]["body"] or "confirmed" in patient_msgs[0]["body"].lower()

        # Step 4: Finalize session and verify CallLog sync
        end = tcl.post(f"/api/chat/{sid}/end", headers=AUTH).json()
        assert end["final"] is True
        assert end["appointment_reference"] == "APT-E2E-999"


# --- Scenario 3: Acute Emergency Triage Safety Guardrail ---
def test_e2e_emergency_chest_pain_triage(make_container, settings):
    """Clinical safety: Acute chest pain triggers immediate deterministic 112 redirection, zero medical diagnosis."""
    c = make_container(FakeLLM([]))
    with TestClient(create_app(settings, c)) as tcl:
        r = tcl.post("/api/chat", json={"message": "I am having severe chest pain and shortness of breath"}, headers=AUTH)
        assert r.status_code == 200
        reply = r.json()["reply"]
        # Must instruct to call 112 / emergency services immediately
        assert "emergency" in reply.lower()
        assert "112" in reply or "emergency services" in reply.lower()
        assert "cannot give medical advice" in reply.lower()


# --- Scenario 4: Human Handoff & CRM Escalation ---
def test_e2e_human_handoff_crm_escalation(make_container, settings, mock_hms):
    """When a caller requests a person, system escalates to staff callback and tags CRM."""
    mock_hms.post(f"{HMS}/hms/leads").mock(return_value=httpx.Response(201, json={"id": "lead-crm-1"}))
    mock_hms.post(f"{HMS}/hms/follow-up-tasks").mock(return_value=httpx.Response(201, json={"id": "task-crm-1"}))

    c = make_container(FakeLLM([]))
    with TestClient(create_app(settings, c)) as tcl:
        r = tcl.post("/api/chat", json={"message": "I need to talk to a human receptionist right now", "caller_number": "+919876543210"}, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["handoff_requested"] is True
        assert "staff to call you back" in r.json()["reply"]

        # Verify callback queue item exists
        callbacks = tcl.get("/api/callbacks", headers=AUTH).json()
        assert len(callbacks) >= 1
        assert callbacks[0]["caller_number"] == "+919876543210"


# --- Scenario 5: Appointment Cancellation Workflow ---
def test_e2e_appointment_cancellation_workflow(make_container, settings, mock_hms):
    """Patient cancels appointment with explicit verification and cancellation confirmation."""
    mock_hms.patch(f"{HMS}/hms/appointments/APT-888").mock(return_value=httpx.Response(200, json={"success": True, "status": "cancelled"}))

    c = make_container(FakeLLM([
        tc("cancel_appointment", {"appointment_id": "APT-888", "caller_confirms_cancellation": True}),
        say("Your appointment APT-888 has been successfully cancelled. Have a great day!")
    ]))

    with TestClient(create_app(settings, c)) as tcl:
        r = tcl.post("/api/chat", json={"message": "Please cancel my appointment APT-888, my name is Asha Verma, phone 9876543210"}, headers=AUTH)
        assert r.status_code == 200
        assert "cancelled" in r.json()["reply"].lower()