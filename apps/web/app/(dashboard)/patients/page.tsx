'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/context/RoleContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Toast, useToast } from '@/components/ui/toast';
import { PermissionGate } from '@/components/rbac/PermissionGate';
import apiClient from '@/lib/api-client';
import { PatientRecord } from '@hospital/shared-types';
import {
  Plus,
  Search,
  Eye,
  Edit,
  UserCheck,
  RefreshCw,
  X,
} from 'lucide-react';

const MOCK_PATIENTS: PatientRecord[] = [
  { id: 'pat_4019', mrn: 'MRN-2026-0042', firstName: 'Eleanor', lastName: 'Pond', dateOfBirth: '1989-05-12', gender: 'Female', phone: '+1-555-0144', email: 'eleanor.p@example.com', status: 'ACTIVE', createdAt: '2026-01-10T08:00:00Z', updatedAt: '2026-10-18T14:28:45Z' },
  { id: 'pat_3088', mrn: 'MRN-2026-0089', firstName: 'Marcus', lastName: 'Vance', dateOfBirth: '1975-11-23', gender: 'Male', phone: '+1-555-0199', email: 'marcus.v@example.com', status: 'ACTIVE', createdAt: '2026-02-14T09:30:00Z', updatedAt: '2026-10-18T13:55:18Z' },
  { id: 'pat_1102', mrn: 'MRN-2026-0112', firstName: 'Amelia', lastName: 'Williams', dateOfBirth: '1995-03-30', gender: 'Female', phone: '+1-555-0182', email: 'amelia.w@example.com', status: 'ACTIVE', createdAt: '2026-03-01T11:15:00Z', updatedAt: '2026-10-17T16:20:00Z' },
  { id: 'pat_1105', mrn: 'MRN-2026-0115', firstName: 'David', lastName: 'Tennant', dateOfBirth: '1971-04-18', gender: 'Male', phone: '+1-555-0191', email: 'david.t@example.com', status: 'ACTIVE', createdAt: '2026-04-02T10:00:00Z', updatedAt: '2026-10-16T11:10:00Z' },
  { id: 'pat_1108', mrn: 'MRN-2026-0118', firstName: 'Rose', lastName: 'Tyler', dateOfBirth: '1987-07-24', gender: 'Female', phone: '+1-555-0163', email: 'rose.t@example.com', status: 'ACTIVE', createdAt: '2026-04-12T14:20:00Z', updatedAt: '2026-10-15T09:45:00Z' },
  { id: 'pat_1120', mrn: 'MRN-2026-0130', firstName: 'Rory', lastName: 'Williams', dateOfBirth: '1988-12-05', gender: 'Male', phone: '+1-555-0177', email: 'rory.w@example.com', status: 'INACTIVE', createdAt: '2026-05-18T16:00:00Z', updatedAt: '2026-09-20T10:30:00Z' },
];

interface CreatePatientForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
}

const emptyForm: CreatePatientForm = { firstName: '', lastName: '', dateOfBirth: '', gender: 'Other', phone: '', email: '' };

export default function PatientsPage() {
  const { currentRole, canEditPatients } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>(MOCK_PATIENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState<CreatePatientForm>(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    const res = await (apiClient as any).getPatients?.(searchTerm || undefined);
    if (res?.data && Array.isArray(res.data)) {
      setPatients(res.data);
      setIsLive(true);
    } else {
      setPatients(MOCK_PATIENTS);
      setIsLive(false);
    }
    setIsLoading(false);
  }, [searchTerm]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => loadPatients(), 400);
    return () => clearTimeout(t);
  }, [loadPatients]);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      showToast('First name, last name, and phone are required.', 'error');
      return;
    }
    setIsCreating(true);
    const res = await (apiClient as any).createPatient?.(form);
    setIsCreating(false);
    if (res?.error) {
      showToast(`Failed to create patient: ${res.error}`, 'error');
      return;
    }
    showToast(`Patient ${form.firstName} ${form.lastName} registered successfully.`, 'success');
    setShowCreateModal(false);
    setForm(emptyForm);
    loadPatients();
  };

  const filtered = isLive
    ? patients // API already filtered server-side
    : patients.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} variant={toast.variant} visible={toast.visible} onClose={hideToast} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#111827]">Patient Records</h2>
            {isLive ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            ) : (
              <span className="text-xs text-[#9CA3AF] border border-dashed border-[#D1D5DB] px-2 py-0.5 rounded-full">Demo data</span>
            )}
          </div>
          <p className="text-sm text-[#6B7280]">Review patient directory and medical record numbers (fictional records).</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={loadPatients} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canEditPatients && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Patient
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="relative max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
          <Input
            placeholder="Search by name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex items-center justify-center text-[#6B7280] text-sm gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading patients...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No patients found"
            description="No patient records match your current search query."
            action={<Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>Clear search</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Patients">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-xs border-b border-[#F3F4F6]">
                <tr>
                  <th className="py-3 px-4">MRN</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Date of Birth</th>
                  <th className="py-3 px-4 hidden md:table-cell">Gender</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Contact Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtered.map((patient) => (
                  <tr key={patient.id} className="hover:bg-[#F9FAFB]/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#2563EB]">{patient.mrn}</td>
                    <td className="py-3.5 px-4 font-medium text-[#111827]">{patient.firstName} {patient.lastName}</td>
                    <td className="py-3.5 px-4 text-[#6B7280] hidden sm:table-cell">{patient.dateOfBirth}</td>
                    <td className="py-3.5 px-4 text-[#6B7280] hidden md:table-cell">{patient.gender}</td>
                    <td className="py-3.5 px-4 font-mono text-[#6B7280] hidden lg:table-cell">{patient.phone}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={patient.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                        {patient.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-[#2563EB] hover:text-[#1D4ED8]">
                        <Eye className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> View
                      </Button>
                      {canEditPatients && (
                        <Button variant="outline" size="sm" className="h-8 text-xs text-[#374151]">
                          <Edit className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#111827] text-lg">Register New Patient</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 block">First Name *</label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Eleanor" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 block">Last Name *</label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Pond" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 block">Date of Birth</label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full h-10 border border-[#D1D5DB] rounded-lg px-3 text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#374151] mb-1 block">Phone *</label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91-XXXXX-XXXXX" />
            </div>

            <div>
              <label className="text-xs font-medium text-[#374151] mb-1 block">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="patient@example.com" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Registering...' : 'Register Patient'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
