"""LLM access behind a tiny interface: real OpenAI client, or a scripted MOCK for keyless local runs."""
from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Protocol

from app.config import Settings
from app.utils import today_ist

log = logging.getLogger(__name__)


class LLMError(Exception):
    pass


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class AssistantMessage:
    content: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"role": "assistant", "content": self.content}
        if self.tool_calls:
            d["tool_calls"] = [{"id": t.id, "type": "function",
                                "function": {"name": t.name, "arguments": t.arguments}} for t in self.tool_calls]
        return d


class LLMClient(Protocol):
    is_mock: bool

    async def chat(self, messages: list[dict], tools: list[dict], tool_choice: str = "auto") -> AssistantMessage: ...


class OpenAIChatClient:
    is_mock = False

    def __init__(self, settings: Settings):
        from openai import AsyncOpenAI  # imported lazily so mock mode needs no key
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key.get_secret_value(),
            base_url=settings.openai_base_url,
            timeout=settings.openai_timeout_seconds,
            max_retries=2
        )
        self.model = settings.openai_model

    async def chat(self, messages, tools, tool_choice="auto") -> AssistantMessage:
        from openai import OpenAIError
        try:
            resp = await self._client.chat.completions.create(
                model=self.model, messages=messages, tools=tools, tool_choice=tool_choice, temperature=0.2)
        except OpenAIError as exc:
            raise LLMError(type(exc).__name__) from exc
        msg = resp.choices[0].message
        calls = [ToolCall(id=t.id, name=t.function.name, arguments=t.function.arguments)
                 for t in (msg.tool_calls or [])]
        return AssistantMessage(content=msg.content, tool_calls=calls)

    async def aclose(self) -> None:
        await self._client.close()


class MockLLMClient:
    """Deterministic conversational model for high-reliability local runs and client demos
    WITHOUT requiring external API keys. Supports greetings, FAQs, doctor listing, slot availability,
    multi-turn appointment booking preparation, confirmation, and cancellation."""
    is_mock = True

    async def chat(self, messages, tools, tool_choice="auto") -> AssistantMessage:
        last = messages[-1]
        if last["role"] == "tool":
            return AssistantMessage(content=self._render(json.loads(last["content"])))
        text = (last.get("content") or "").lower().strip()

        # Check conversation history for pending prepared booking args
        prepared_args = None
        for m in reversed(messages):
            if m.get("role") == "assistant" and m.get("tool_calls"):
                for tc in m["tool_calls"]:
                    fn = tc.get("function", {})
                    if fn.get("name") == "prepare_booking":
                        try:
                            prepared_args = json.loads(fn.get("arguments", "{}"))
                            break
                        except Exception:
                            pass
            if prepared_args:
                break

        # 1. Confirmation turn for prepared booking
        if prepared_args and re.search(r"\b(yes|confirm|proceed|please confirm|sure|go ahead|book it|correct|that's correct|thats correct)\b", text):
            return AssistantMessage(tool_calls=[ToolCall("m_book", "book_appointment", json.dumps(prepared_args))])

        # 2. Doctor listing
        if re.search(r"\b(doctor|doctors|specialist|specialists|physician|physicians)\b", text) and not re.search(r"\b(book|reserve|schedule|cancel)\b", text):
            return AssistantMessage(tool_calls=[ToolCall("m1", "list_doctors", "{}")])

        # 3. Check availability / booking request with dates & specialties
        m_date = re.search(r"(\d{4}-\d{2}-\d{2})", text)
        if m_date:
            date_str = m_date.group(1)
        elif "tomorrow" in text or any("tomorrow" in (m.get("content") or "").lower() for m in messages):
            date_str = (today_ist() + timedelta(days=1)).isoformat()
        else:
            date_str = (today_ist() + timedelta(days=2)).isoformat()

        spec = re.search(r"(pediatrics|pediatric|cardiology|cardiac|dermatology|orthopedics|orthopedist|general medicine|physician)", text)
        m_time = re.search(r"\b(\d{1,2}:\d{2})\b", text)
        m_name = re.search(r"(?:patient\s+(?:is|name\s+is)?|name\s+is\s+)([A-Za-z\s]+?)(?:,|\.|\s+phone|\s+and|$)", text)
        m_phone = re.search(r"\b(\d{10})\b", text)

        # Booking preparation if slot or booking intent is present
        if re.search(r"\b(book|reserve|schedule)\b", text) and (spec or re.search(r"dr\.", text) or m_time):
            patient_name = m_name.group(1).strip() if m_name else "Rahul Sharma"
            patient_phone = m_phone.group(1) if m_phone else "9876543210"
            doctor_id = "DOC-001" if (spec and "pediatric" in spec.group(1)) else "DOC-002"
            slot_time = m_time.group(1) if m_time else "10:00"
            prep_args = {
                "doctor_id": doctor_id,
                "date": date_str,
                "start_time": slot_time,
                "patient_name": patient_name,
                "patient_phone": patient_phone,
            }
            return AssistantMessage(tool_calls=[ToolCall("m_prep", "prepare_booking", json.dumps(prep_args))])

        # Availability check
        if (m_date or "tomorrow" in text) and spec:
            specialty_name = "Pediatrics" if "pediatric" in spec.group(1) else "Cardiology"
            return AssistantMessage(tool_calls=[ToolCall("m2", "check_availability", json.dumps(
                {"specialty": specialty_name, "date": date_str}))])

        # 4. Cancellation lookup
        m_cancel = re.search(r"\b(cancel)\b", text)
        m_apptid = re.search(r"\b(apt-[\w-]+|appt-[\w-]+)\b", text)
        if m_cancel and m_apptid:
            cancel_args = {
                "appointment_id": m_apptid.group(1).upper(),
                "caller_confirms_cancellation": True,
            }
            return AssistantMessage(tool_calls=[ToolCall("m_cancel", "cancel_appointment", json.dumps(cancel_args))])

        # 5. FAQs (insurance, emergency, opening hours, location, etc.)
        if re.search(r"\b(hours|open|opening|timing|timings|location|address|department|contact|staff|insurance|cashless|tpa|emergency|ambulance|pharmacy|lab|blood|test|visiting|how do i book|booking)\b", text):
            return AssistantMessage(tool_calls=[ToolCall("m3", "lookup_faq", json.dumps({"question": text[:200]}))])

        # 6. Farewell
        if re.search(r"\b(bye|goodbye|thank|thanks|done)\b", text):
            return AssistantMessage(content="You are welcome! Thank you for contacting HealthPulse Hospital. Have a wonderful day! Goodbye.")

        # Default helpful assistant response
        return AssistantMessage(content=(
            "Welcome to HealthPulse Hospital Virtual Reception. I can help you check live doctor availability, "
            "book or cancel appointments, and answer questions about hospital services, insurance, and OPD timings. "
            "How may I assist you today?"))

    @staticmethod
    def _render(r: dict) -> str:
        if r.get("doctors") is not None:
            names = ", ".join(f"{d['name']} ({d['specialty']})" for d in r["doctors"]) or "none"
            return f"Our active doctors are: {names}."
        if r.get("results") is not None:
            if not r["results"]:
                return "There are no free slots on that date."
            return " ".join(f"{x['doctor_name']}: {', '.join(x['slots'])}." for x in r["results"])
        if r.get("found"):
            return r["answers"][0]["answer"]
        if r.get("found") is False:
            return "I don't have an approved answer for that. I can request a staff callback if you like."
        if r.get("status") == "ready_for_confirmation":
            rb = r.get("read_back", {})
            return (f"I have prepared your appointment with {rb.get('doctor')} on {rb.get('date')} at {rb.get('time')} "
                    f"for {rb.get('patient_name')} (phone ending in {rb.get('phone_ending')}). "
                    f"Would you like me to confirm this booking for you? Please say yes to confirm.")
        if r.get("status") == "confirmed":
            return f"Your appointment is confirmed! Your booking reference ID is {r.get('appointment_id')}. An SMS confirmation has been sent to your registered phone number."
        if r.get("status") == "cancelled":
            return f"Your appointment {r.get('appointment_id')} has been successfully cancelled."
        if r.get("status") == "conflict":
            alts = ", ".join(r.get("alternatives", [])) or "alternative dates"
            return f"That slot was just taken. Available alternative times are: {alts}. Would any of those suit you?"
        return r.get("message") or "Done."


def build_llm_client(settings: Settings) -> LLMClient:
    if settings.openai_api_key.get_secret_value():
        return OpenAIChatClient(settings)
    log.warning("OPENAI_API_KEY missing -> using scripted MOCK LLM (deterministic client demo mode)")
    return MockLLMClient()