"""Human handoff / callback fallback. Saves a callback locally, alerts staff, and synchronizes to HMS CRM."""
from __future__ import annotations

import logging
from typing import Any

from app.repositories.callback_repository import CallbackRepository
from app.services.notification_service import NotificationService
from app.utils import mask_phone

log = logging.getLogger(__name__)


class HandoffService:
    def __init__(self, repo: CallbackRepository, notifications: NotificationService, hms: Any = None):
        self.repo, self.notifications, self.hms = repo, notifications, hms

    async def request(self, reason: str, call_id: str | None = None, caller_number: str | None = None,
                      patient_name: str | None = None, notes: str | None = None) -> dict:
        row, created = self.repo.create(reason, call_id, caller_number, patient_name, notes)
        if created:
            body = (f"Callback #{row.id} requested.\nReason: {reason}\nCall: {call_id or '-'}\n"
                    f"Caller: {mask_phone(caller_number) or 'unknown'} (full number via GET /api/callbacks)")
            await self.notifications.alert_staff("callback", f"Callback required (#{row.id})", body,
                                                 dedupe_key=f"callback:{row.id}")
            # Synchronize to authoritative NestJS backend (POST /api/leads and POST /api/follow-up-tasks)
            if self.hms and hasattr(self.hms, "create_crm_lead"):
                try:
                    lead_payload = {
                        "name": patient_name or "Caller Emergency Triage",
                        "phone": caller_number or "0000000000",
                        "source": "AI_RECEPTIONIST",
                        "notes": f"Reason: {reason}. {notes or ''}".strip(),
                    }
                    lead_res = await self.hms.create_crm_lead(lead_payload)
                    lead_id = lead_res.get("id") if isinstance(lead_res, dict) else None
                    if lead_id and hasattr(self.hms, "create_follow_up_task"):
                        task_payload = {
                            "leadId": lead_id,
                            "title": f"URGENT: Caller callback requested ({reason})",
                            "priority": "HIGH",
                            "dueDate": None,
                        }
                        await self.hms.create_follow_up_task(task_payload)
                except Exception as exc:
                    log.warning("Could not sync handoff to HMS CRM: %s", exc)
        return {"callback_id": row.id, "created": created}
