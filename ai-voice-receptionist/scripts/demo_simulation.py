"""
Interactive Client Demonstration Runner for MediSlot / HealthPulse AI Voice Receptionist.
Enables presenting realistic, live conversational journeys (appointment booking, doctor inquiries,
emergency triage, insurance/cashless guidance, and FAQ resolution) directly in the terminal without active Twilio telephony.
"""
from __future__ import annotations

import asyncio
import os
import sys

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import get_settings
from app.container import build_container
from app.models.schemas import SessionState


DEMO_SCENARIOS = [
    {
        "title": "Clinical Booking Journey (Doctor Inquiry + Slot Confirmation)",
        "turns": [
            "Hello, I need an appointment with an orthopedist or general physician for tomorrow.",
            "Yes, please book with Dr. Priya Nair at 10:00 AM. My name is Rahul Sharma and my phone number is 9876543210.",
            "Yes, that's correct, please confirm the booking.",
        ]
    },
    {
        "title": "Emergency Guardrail Demonstration (Acute Chest Pain Triage Redirection)",
        "turns": [
            "Help, my father is having severe chest pain and cannot breathe properly!",
        ]
    },
    {
        "title": "Cashless Insurance & TPA Hospitalization Inquiry",
        "turns": [
            "Do you accept Star Health or HDFC ERGO cashless insurance, and where is the TPA desk?",
            "Thank you! What are the inpatient visiting hours for family members?",
        ]
    },
    {
        "title": "24x7 Pharmacy & Diagnostic Lab Reports Inquiry",
        "turns": [
            "Is your hospital pharmacy open 24 hours at night, and when can I collect blood test reports?",
        ]
    },
    {
        "title": "Human Staff Handoff / Callback Escalation",
        "turns": [
            "I want to speak with a human receptionist right now regarding a complex bill discrepancy.",
        ]
    }
]


async def run_scenario(scenario_idx: int):
    settings = get_settings()
    c = build_container(settings)

    scenario = DEMO_SCENARIOS[scenario_idx]
    print("\n" + "=" * 70)
    print(f">> DEMO SCENARIO: {scenario['title']}")
    print("=" * 70)

    # Initialize a demo call
    call = c.calls.create(channel="phone", caller_number="+919876543210")
    call_id = call.id
    print(f"\n[TELEPHONY] Inbound Call Connected. Call ID: {call_id} | Caller: +91 98765 43210")
    print(f"[RECEPTIONIST] 'Welcome to {settings.hospital_name}. How can I assist you today?'\n")

    for i, user_utterance in enumerate(scenario["turns"], 1):
        print(f">> CALLER (Turn {i}): \"{user_utterance}\"")
        turn_result = await c.receptionist.handle_turn(call_id, user_utterance)

        # Print AI Reply
        print(f">> AI RECEPTIONIST: \"{turn_result.reply}\"")

        if turn_result.handoff_requested:
            print("   [ACTION]: Human Staff Handoff Initiated")
        if turn_result.end_call:
            print("   [ACTION]: Call Ending Flagged")

        print("-" * 70)

    # Finalize summary
    summary = await c.summaries.finalize(call_id)
    print(f"\n>> CALL FINALIZED:")
    print(f"   Intent   : {summary.caller_intent}")
    print(f"   Outcome  : {summary.outcome}")
    print(f"   Summary  : {summary.summary}")
    if summary.appointment_reference:
        print(f"   Ref Code : {summary.appointment_reference}")
    print("=" * 70 + "\n")

    await c.aclose()


async def interactive_mode():
    settings = get_settings()
    c = build_container(settings)

    print("\n" + "=" * 70)
    print(">> INTERACTIVE LIVE CONVERSATION MODE (Type 'exit' to end call)")
    print("=" * 70)

    call = c.calls.create(channel="phone", caller_number="+919876543210")
    call_id = call.id
    print(f"\n[TELEPHONY] Inbound Call Started (Call ID: {call_id})")
    print(f">> AI: 'Welcome to {settings.hospital_name}. How can I help you today?'\n")

    while True:
        try:
            user_input = input(">> You (Caller): ").strip()
        except (KeyboardInterrupt, EOFError):
            break

        if not user_input or user_input.lower() in ("exit", "quit", "bye"):
            print("\n[CALL ENDED]")
            break

        turn_result = await c.receptionist.handle_turn(call_id, user_input)
        print(f">> AI: \"{turn_result.reply}\"")
        if turn_result.handoff_requested:
            print("   [ACTION]: Human Staff Handoff Initiated")
        if turn_result.end_call:
            print("   [ACTION]: Call Ending Flagged")
        print()

    summary = await c.summaries.finalize(call_id)
    print("\n>> FINAL CALL SUMMARY:")
    print(f"Summary: {summary.summary}")
    await c.aclose()


def main():
    print("""
    ======================================================================
               HEALTHPULSE HMS / MEDISLOT AI VOICE RECEPTIONIST
                         CLIENT DEMO SIMULATOR
    ======================================================================
    Select a demo journey to showcase to your client:
    
      1. Clinical Booking Journey (Doctor Inquiry + Slot Confirmation)
      2. Emergency Guardrail (Acute Chest Pain Triage Redirection)
      3. Cashless Insurance & TPA Hospitalization Inquiry
      4. 24x7 Pharmacy & Diagnostic Lab Reports Inquiry
      5. Human Receptionist Handoff / Escalation
      6. Free-form Interactive Live Voice/Chat
      7. Exit
    ======================================================================
    """)
    try:
        choice = input("Enter choice (1-7): ").strip()
    except (KeyboardInterrupt, EOFError):
        return

    if choice in ("1", "2", "3", "4", "5"):
        asyncio.run(run_scenario(int(choice) - 1))
    elif choice == "6":
        asyncio.run(interactive_mode())
    else:
        print("Demo simulation session exited.")


if __name__ == "__main__":
    main()