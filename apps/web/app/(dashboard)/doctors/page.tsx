'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api-client';
import {
  Stethoscope,
  Search,
  Clock,
  CalendarCheck,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  dept: string;
  status: 'Available' | 'On Duty' | 'In Surgery' | 'On Leave';
  nextSlot: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapApiDoctor(d: any): DoctorItem {
  return {
    id: d.id,
    name: d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`,
    specialty: d.specialization ?? d.specialty ?? 'General Practice',
    dept: d.department?.name ?? d.dept ?? 'General',
    status: d.isActive ? 'Available' : 'On Leave',
    nextSlot: '—',
  };
}

function formatSlotTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return isoString;
  }
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Sub-component: Availability Popover ─────────────────────────────────────

function SlotPopover({
  doctorId,
  doctorName,
  onClose,
}: {
  doctorId: string;
  doctorName: string;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await apiClient.getDoctorAvailability(doctorId, todayDateString());
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
      } else {
        const raw = res.data as any;
        // API may return { slots: [...] } or directly an array
        const slotsArr: AvailabilitySlot[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.slots)
          ? raw.slots
          : [];
        setSlots(slotsArr);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [doctorId]);

  return (
    <div className="mt-3 border border-[#BFDBFE] rounded-xl bg-[#EFF6FF] p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#1E3A8A]">
          Today&apos;s Available Slots
        </span>
        <button
          onClick={onClose}
          className="text-[#6B7280] hover:text-[#111827] transition-colors text-xs"
          aria-label="Close slots"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-1.5 text-[#6B7280]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Checking availability…
        </div>
      ) : error ? (
        <p className="text-[#DC2626]">Could not load slots: {error}</p>
      ) : slots.length === 0 ? (
        <p className="text-[#6B7280]">No available slots today.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((slot, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-white border border-[#BFDBFE] rounded-lg font-mono text-[#1D4ED8] font-medium"
            >
              {formatSlotTime(slot.start)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DoctorsPage() {
  const { currentRole, currentUser } = useRole();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openSlotDoctorId, setOpenSlotDoctorId] = useState<string | null>(null);

  const isDoctor = currentRole === 'DOCTOR';

  // ── Fetch doctors from live API ──────────────────────────────────────────
  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    const res = await apiClient.getDoctors();
    if (res.data && Array.isArray(res.data)) {
      setDoctors((res.data as any[]).map(mapApiDoctor));
      setIsLive(true);
    } else {
      // Fallback: keep empty list but mark as not live
      setIsLive(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.dept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Status badge ─────────────────────────────────────────────────────────
  const getStatusBadge = (status: DoctorItem['status']) => {
    switch (status) {
      case 'Available':
        return <Badge variant="success">Available</Badge>;
      case 'On Duty':
        return <Badge variant="info">On Duty</Badge>;
      case 'In Surgery':
        return <Badge variant="warning">In Surgery</Badge>;
      case 'On Leave':
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ── Toggle slot popover ──────────────────────────────────────────────────
  const handleBookSlot = (doctorId: string) => {
    setOpenSlotDoctorId((prev) => (prev === doctorId ? null : doctorId));
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#111827]">Doctors &amp; Schedules</h2>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            ) : (
              !isLoading && (
                <span className="text-xs text-[#9CA3AF] border border-dashed border-[#D1D5DB] px-2 py-0.5 rounded-full">
                  Offline
                </span>
              )
            )}
          </div>
          <p className="text-sm text-[#6B7280]">
            Clinical rosters, department allocation, and practitioner availability.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={loadDoctors}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Prominent "My Schedule" if user is a DOCTOR */}
      {isDoctor && (
        <Card className="border-[#BFDBFE] bg-[#EFF6FF]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white">
                  <Stethoscope className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base text-[#1E3A8A]">My Duty Schedule</CardTitle>
                  <p className="text-xs text-[#1D4ED8]">Assigned to: {currentUser.fullName}</p>
                </div>
              </div>
              <Badge variant="success">Active On Duty</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-[#BFDBFE]">
                <span className="text-[#6B7280] block">Today&apos;s Consultations</span>
                <span className="text-lg font-bold text-[#111827]">8 patients</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#BFDBFE]">
                <span className="text-[#6B7280] block">Next Consultation</span>
                <span className="text-lg font-bold text-[#111827]">14:00 (Amelia W.)</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#BFDBFE]">
                <span className="text-[#6B7280] block">Duty Hours</span>
                <span className="text-lg font-bold text-[#111827]">08:00 – 17:00 UTC</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Filter Card */}
      <Card>
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
          <Input
            placeholder="Search practitioners or specialties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#F3F4F6]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-[#F3F4F6] rounded w-3/4" />
                    <div className="h-3 bg-[#F3F4F6] rounded w-1/2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="h-3 bg-[#F3F4F6] rounded w-full" />
                <div className="h-3 bg-[#F3F4F6] rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-[#6B7280] text-sm">
          {doctors.length === 0
            ? 'No doctors found. The API may be unavailable.'
            : 'No practitioners match your search.'}
        </div>
      ) : (
        /* Doctor Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] shrink-0">
                      <Stethoscope className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{doc.name}</CardTitle>
                      <p className="text-xs text-[#2563EB] font-medium">{doc.dept}</p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <p className="text-[#6B7280]">{doc.specialty}</p>
                <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] text-[#6B7280]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Next Slot:
                  </span>
                  <span className="font-medium text-[#111827]">{doc.nextSlot}</span>
                </div>

                {/* Book Slot button */}
                <Button
                  size="sm"
                  variant={doc.status === 'On Leave' ? 'outline' : 'outline'}
                  disabled={doc.status === 'On Leave'}
                  className="w-full h-8 gap-1.5 text-xs mt-1 text-[#2563EB] border-[#BFDBFE] hover:bg-[#EFF6FF]"
                  onClick={() => handleBookSlot(doc.id)}
                >
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {openSlotDoctorId === doc.id ? 'Hide Slots' : 'View Today\'s Slots'}
                  {openSlotDoctorId === doc.id ? (
                    <ChevronUp className="h-3 w-3 ml-auto" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  )}
                </Button>

                {/* Slot popover (inline) */}
                {openSlotDoctorId === doc.id && (
                  <SlotPopover
                    doctorId={doc.id}
                    doctorName={doc.name}
                    onClose={() => setOpenSlotDoctorId(null)}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
