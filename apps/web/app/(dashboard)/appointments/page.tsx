'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Toast, useToast } from '@/components/ui/toast';
import { PermissionGate } from '@/components/rbac/PermissionGate';
import apiClient from '@/lib/api-client';
import {
  CalendarCheck,
  Plus,
  Bot,
  Clock,
  Search,
  Filter,
  XCircle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  X,
  User,
  Loader2,
} from 'lucide-react';

interface AppointmentItem {
  id: string;
  patientName: string;
  doctorName: string;
  department: string;
  time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REQUESTED';
  source: string;
  isAi: boolean;
}

interface AvailabilitySlot {
  start: string;
  end: string;
}

const MOCK_APPOINTMENTS: AppointmentItem[] = [
  { id: 'apt_1102', patientName: 'Amelia Williams', doctorName: 'Dr. Sarah Jenkins', department: 'Cardiology', time: '2026-10-19 10:00', status: 'CONFIRMED', source: 'AI Voice Receptionist', isAi: true },
  { id: 'apt_1103', patientName: 'Marcus Vance', doctorName: 'Dr. Arthur Vance', department: 'Neurology', time: '2026-10-19 11:30', status: 'SCHEDULED', source: 'Web Reception Desk', isAi: false },
  { id: 'apt_1104', patientName: 'Eleanor Pond', doctorName: 'Dr. Sarah Jenkins', department: 'Cardiology', time: '2026-10-19 14:00', status: 'CONFIRMED', source: 'AI Voice Receptionist', isAi: true },
  { id: 'apt_1105', patientName: 'David Tennant', doctorName: 'Dr. Emily Rose', department: 'Pediatrics', time: '2026-10-19 15:30', status: 'SCHEDULED', source: 'Web Reception Desk', isAi: false },
  { id: 'apt_1106', patientName: 'Rose Tyler', doctorName: 'Dr. Jack Harkness', department: 'Emergency Care', time: '2026-10-19 16:15', status: 'COMPLETED', source: 'Web Reception Desk', isAi: false },
  { id: 'apt_1107', patientName: 'Rory Williams', doctorName: 'Dr. Arthur Vance', department: 'Neurology', time: '2026-10-20 09:00', status: 'CANCELLED', source: 'Patient Request', isAi: false },
];

function mapApiAppointment(a: any): AppointmentItem {
  const scheduledAt = a.scheduledStart || a.scheduledAt
    ? new Date(a.scheduledStart || a.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })
    : '—';
  const patientName = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.patientName ?? 'Unknown Patient');
  const doctorName = a.doctor ? (a.doctor.name.startsWith('Dr.') ? a.doctor.name : `Dr. ${a.doctor.name}`) : (a.doctorName ?? 'Unknown Doctor');
  const department = a.doctor?.department?.name ?? a.department ?? '—';
  return {
    id: a.id,
    patientName,
    doctorName,
    department,
    time: scheduledAt,
    status: a.status as AppointmentItem['status'],
    source: a.source ?? 'Web Reception Desk',
    isAi: a.source === 'AI_VOICE',
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

export default function AppointmentsPage() {
  const { currentRole } = useRole();
  const [appointments, setAppointments] = useState<AppointmentItem[]>(MOCK_APPOINTMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const { toast, show: showToast, hide: hideToast } = useToast();

  // Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [patientPhone, setPatientPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    const filters: Record<string, string> = {};
    if (statusFilter !== 'ALL') {
      filters.status = statusFilter;
    }
    const res = await apiClient.getAppointments(filters);
    if (res?.data && Array.isArray(res.data)) {
      setAppointments(res.data.map(mapApiAppointment));
      setIsLive(true);
    } else {
      setAppointments(MOCK_APPOINTMENTS);
      setIsLive(false);
    }
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Load departments when booking modal opens
  useEffect(() => {
    if (showBookingModal) {
      (async () => {
        const res = await apiClient.getDepartments();
        if (res?.data && Array.isArray(res.data)) {
          setDepartments(res.data);
          if (res.data.length > 0 && !selectedDeptId) {
            setSelectedDeptId(res.data[0].id);
          }
        }
      })();
    }
  }, [showBookingModal]);

  // Load doctors filtered by department
  useEffect(() => {
    if (showBookingModal) {
      (async () => {
        const res = await apiClient.getDoctors(selectedDeptId || undefined);
        if (res?.data && Array.isArray(res.data)) {
          setDoctors(res.data);
          if (res.data.length > 0) {
            setSelectedDoctorId(res.data[0].id);
          } else {
            setSelectedDoctorId('');
          }
        }
      })();
    }
  }, [showBookingModal, selectedDeptId]);

  // Load availability slots when doctor and date change
  useEffect(() => {
    if (showBookingModal && selectedDoctorId && selectedDate) {
      (async () => {
        setSlotsLoading(true);
        setSelectedSlot(null);
        const res = await apiClient.getDoctorAvailability(selectedDoctorId, selectedDate);
        if (res?.data) {
          const raw = res.data as any;
          const slotsArr: AvailabilitySlot[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.slots)
            ? raw.slots
            : [];
          setAvailableSlots(slotsArr);
        } else {
          setAvailableSlots([]);
        }
        setSlotsLoading(false);
      })();
    } else {
      setAvailableSlots([]);
    }
  }, [showBookingModal, selectedDoctorId, selectedDate]);

  // Lookup patient by phone
  const handlePhoneBlur = async () => {
    if (patientPhone.length >= 10) {
      const res = await apiClient.getPatients(patientPhone);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const p = res.data[0];
        setPatientName(`${p.firstName} ${p.lastName}`);
      }
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPhone || !selectedDoctorId || !selectedSlot) {
      showToast('Please select a doctor, slot, and provide patient phone.', 'error');
      return;
    }

    setBookingLoading(true);
    const selectedDept = departments.find((d) => d.id === selectedDeptId);
    const res = await apiClient.createAppointment({
      patientPhone,
      patientName: patientName || undefined,
      doctorId: selectedDoctorId,
      department: selectedDept?.name || 'General Medicine',
      slotStart: selectedSlot.start,
      slotEnd: selectedSlot.end,
      source: 'RECEPTION',
      notes: notes || undefined,
    });

    setBookingLoading(false);

    if (res?.error) {
      showToast(`Booking failed: ${res.error}`, 'error');
    } else {
      showToast('Appointment booked successfully!', 'success');
      setShowBookingModal(false);
      setPatientPhone('');
      setPatientName('');
      setNotes('');
      setSelectedSlot(null);
      loadAppointments();
    }
  };

  const handleConfirmCancel = async (id: string) => {
    if (isLive) {
      const res = await apiClient.cancelAppointment(id, cancelReason || 'Cancelled by receptionist');
      if (res?.error) { showToast(`Failed to cancel: ${res.error}`, 'error'); return; }
    }
    setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status: 'CANCELLED' } : apt)));
    setCancellingId(null);
    setCancelReason('');
    showToast('Appointment cancelled successfully.', 'success');
  };

  const filtered = appointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AppointmentItem['status']) => {
    switch (status) {
      case 'CONFIRMED': return <Badge variant="success">Confirmed</Badge>;
      case 'SCHEDULED': return <Badge variant="info">Scheduled</Badge>;
      case 'REQUESTED': return <Badge variant="warning">Requested</Badge>;
      case 'CANCELLED': return <Badge variant="danger">Cancelled</Badge>;
      case 'COMPLETED': return <Badge variant="secondary">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const statuses = ['ALL', 'REQUESTED', 'CONFIRMED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} variant={toast.variant} visible={toast.visible} onClose={hideToast} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#111827]">Appointments &amp; Scheduling</h2>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            ) : (
              <span className="text-xs text-[#9CA3AF] border border-dashed border-[#D1D5DB] px-2 py-0.5 rounded-full">Demo data</span>
            )}
          </div>
          <p className="text-sm text-[#6B7280]">Manage doctor availability slots and patient appointments.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAppointments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <PermissionGate permission="appointment:create">
            <Button size="sm" className="gap-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white" onClick={() => setShowBookingModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Appointment
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
            <Input
              placeholder="Search patient, doctor, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  statusFilter === s
                    ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                    : 'bg-white text-[#374151] border-[#D1D5DB] hover:border-[#9CA3AF]'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-[#6B7280] text-sm gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No appointments found"
            description="No appointments match the current search or status filter."
            action={
              <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); }}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Appointments">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-xs border-b border-[#F3F4F6]">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor &amp; Department</th>
                  <th className="py-3 px-4 hidden md:table-cell">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-[#F9FAFB]/70 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-mono text-[#374151]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#9CA3AF]" aria-hidden="true" />
                        <span>{apt.time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#111827]">{apt.patientName}</td>
                    <td className="py-3.5 px-4 text-[#374151]">
                      <div>{apt.doctorName}</div>
                      <div className="text-xs text-[#6B7280]">{apt.department}</div>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell">
                      {apt.isAi ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-full">
                          <Bot className="h-3 w-3" aria-hidden="true" /> AI Receptionist
                        </span>
                      ) : (
                        <span className="text-xs text-[#6B7280]">{apt.source}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(apt.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {cancellingId === apt.id ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <Input
                            placeholder="Cancellation reason (optional)"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="h-7 text-xs max-w-[200px]"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#DC2626] font-medium">Cancel?</span>
                            <Button variant="destructive" size="sm" className="h-7 px-2 text-xs" onClick={() => handleConfirmCancel(apt.id)}>
                              Confirm
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { setCancellingId(null); setCancelReason(''); }}>
                              No
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                            <PermissionGate permission="appointment:cancel">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
                                onClick={() => setCancellingId(apt.id)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                              </Button>
                            </PermissionGate>
                          )}
                          {apt.status === 'COMPLETED' && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* New Appointment Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6]">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-lg font-bold text-[#111827]">Book New Appointment</h3>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-[#6B7280] hover:text-[#111827] p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Step 1: Patient Details */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">1. Patient Information</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#374151] mb-1 block">Phone Number *</label>
                    <Input
                      required
                      placeholder="e.g. 9876543210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      onBlur={handlePhoneBlur}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#374151] mb-1 block">Patient Name</label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Department & Doctor */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">2. Department &amp; Practitioner</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-[#374151] mb-1 block">Department</label>
                    <select
                      className="w-full h-10 border border-[#D1D5DB] rounded-lg px-3 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      value={selectedDeptId}
                      onChange={(e) => setSelectedDeptId(e.target.value)}
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#374151] mb-1 block">Doctor</label>
                    <select
                      className="w-full h-10 border border-[#D1D5DB] rounded-lg px-3 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                    >
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.specialization || 'Consultant'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Date & Available Slots */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">3. Date &amp; Available Slot</label>
                <div>
                  <label className="text-xs text-[#374151] mb-1 block">Consultation Date</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                <div className="mt-2">
                  <span className="text-xs text-[#374151] mb-1 block">Available Time Slots:</span>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-[#6B7280] py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                      Fetching real-time slots...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-xs text-[#DC2626] bg-[#FEF2F2] p-2.5 rounded-lg border border-[#FCA5A5]">
                      No slots available for this doctor on selected date.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                      {availableSlots.map((slot, idx) => {
                        const isSelected = selectedSlot?.start === slot.start;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                              isSelected
                                ? 'bg-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/40'
                                : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                            }`}
                          >
                            {formatSlotTime(slot.start)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Notes */}
              <div>
                <label className="text-xs text-[#374151] mb-1 block">Appointment Notes / Symptoms</label>
                <textarea
                  className="w-full border border-[#D1D5DB] rounded-lg p-2 text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  rows={2}
                  placeholder="Routine consultation, cardiac checkup, referral..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBookingModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={bookingLoading || !selectedSlot}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-1.5"
                >
                  {bookingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
