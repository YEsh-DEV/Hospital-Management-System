'use client';

import React, { useState } from 'react';
import { useRole } from '@/context/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Toast, useToast } from '@/components/ui/toast';
import { AccessDenied } from '@/components/ui/access-denied';
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  Users,
  Sliders,
  RotateCcw,
  Save,
} from 'lucide-react';

const PERMISSION_MATRIX = [
  { capability: 'User & Role Administration', superAdmin: true, admin: false, receptionist: false, doctor: false, nurse: false, aiService: false },
  { capability: 'Audit Trail Viewer (Append-only)', superAdmin: true, admin: false, receptionist: false, doctor: false, nurse: false, aiService: false },
  { capability: 'Doctor & Department Rostering', superAdmin: true, admin: true, receptionist: false, doctor: false, nurse: false, aiService: false },
  { capability: 'Patient Registration & Booking', superAdmin: true, admin: true, receptionist: true, doctor: false, nurse: false, aiService: false },
  { capability: 'Clinical Record Access (Assigned)', superAdmin: true, admin: true, receptionist: false, doctor: true, nurse: true, aiService: false },
  { capability: 'Slot Availability Check (API)', superAdmin: true, admin: true, receptionist: true, doctor: true, nurse: true, aiService: true },
  { capability: 'Booking Request Create (API)', superAdmin: true, admin: true, receptionist: true, doctor: true, nurse: true, aiService: true },
];

const INITIAL_SAFEGUARDS = {
  mfaSuperAdmin: true,
  strictIpAudit: true,
  rateLimitShield: true,
  aiScopedTokenOnly: true,
  sessionTimeout8h: true,
};

const STAFF_USERS = [
  { id: 'usr_superadmin_01', name: 'Dr. Arthur Vance', email: 'superadmin@hospital.com', role: 'SUPER_ADMIN', status: 'Active' },
  { id: 'usr_admin_02', name: 'Clara Oswald', email: 'admin@hospital.com', role: 'ADMIN', status: 'Active' },
  { id: 'usr_recept_03', name: 'Emily Thorne', email: 'reception@hospital.com', role: 'RECEPTIONIST', status: 'Active' },
  { id: 'usr_doc_04', name: 'Dr. Sarah Jenkins', email: 'dr.jenkins@hospital.com', role: 'DOCTOR', status: 'Active' },
  { id: 'usr_nurse_05', name: 'Nurse Joy', email: 'nurse.joy@hospital.com', role: 'NURSE', status: 'Active' },
];

export default function SettingsPage() {
  const { currentRole, canManageUsers } = useRole();
  const [activeTab, setActiveTab] = useState<'matrix' | 'safeguards' | 'staff'>('matrix');
  const [safeguards, setSafeguards] = useState(INITIAL_SAFEGUARDS);
  const [savedSafeguards, setSavedSafeguards] = useState(INITIAL_SAFEGUARDS);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const isDirty = JSON.stringify(safeguards) !== JSON.stringify(savedSafeguards);

  if (!canManageUsers) {
    return (
      <AccessDenied
        title="403 — Settings Restricted"
        description="Configuration and RBAC matrices can only be viewed or modified by Super Admins and Operations Admins."
        backHref="/dashboard"
        backLabel="Return to Dashboard"
      />
    );
  }

  const handleSaveSafeguards = () => {
    setSavedSafeguards(safeguards);
    showToast('Security safeguards updated successfully.', 'success');
  };

  const handleDiscardSafeguards = () => {
    setSafeguards(savedSafeguards);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          visible={toast.visible}
          onClose={hideToast}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#111827]">Settings & Governance</h2>
        <p className="text-sm text-[#6B7280]">
          Manage RBAC matrices, platform safeguards, and authorized staff accounts.
        </p>
      </div>

      {/* Tabs bar */}
      <div className="inline-flex rounded-xl bg-white p-1 border border-[#F3F4F6] shadow-sm gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'matrix'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
          }`}
        >
          Permissions Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('safeguards')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'safeguards'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
          }`}
        >
          Security Safeguards
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            activeTab === 'staff'
              ? 'bg-[#2563EB] text-white shadow-sm'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
          }`}
        >
          Staff Directory
        </button>
      </div>

      {/* TAB 1: Permissions Matrix */}
      {activeTab === 'matrix' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-[#F3F4F6]">
            <h3 className="text-sm font-semibold text-[#111827]">
              Role-Based Access Control (RBAC) Authority Matrix
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Backend-enforced permission boundaries across all human and service identities.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Permissions matrix">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-xs border-b border-[#F3F4F6]">
                <tr>
                  <th className="py-3 px-4">Capability / Resource</th>
                  <th className="py-3 px-4 text-center">Super Admin</th>
                  <th className="py-3 px-4 text-center">Admin</th>
                  <th className="py-3 px-4 text-center">Receptionist</th>
                  <th className="py-3 px-4 text-center">Doctor</th>
                  <th className="py-3 px-4 text-center">Nurse</th>
                  <th className="py-3 px-4 text-center">AI Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.capability} className="hover:bg-[#F9FAFB]/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#111827]">{row.capability}</td>
                    <td className="py-3.5 px-4 text-center">
                      {row.superAdmin ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.admin ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.receptionist ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.doctor ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.nurse ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.aiService ? <Check className="h-4 w-4 text-[#047857] mx-auto" /> : <X className="h-4 w-4 text-[#9CA3AF] mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Security Safeguards */}
      {activeTab === 'safeguards' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-[#111827]">Configurable Platform Safeguards</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Toggle security controls and runtime authentication policies.
            </p>
          </div>

          <div className="space-y-5 divide-y divide-[#F3F4F6]">
            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Strict Rate Limiting</p>
                <p className="text-xs text-[#6B7280]">Limit login attempts to 5 per minute per IP</p>
              </div>
              <Toggle
                checked={safeguards.rateLimitShield}
                onChange={(val) => setSafeguards((s) => ({ ...s, rateLimitShield: val }))}
                label=""
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Detailed IP & User-Agent Auditing</p>
                <p className="text-xs text-[#6B7280]">Capture request context on all mutative events</p>
              </div>
              <Toggle
                checked={safeguards.strictIpAudit}
                onChange={(val) => setSafeguards((s) => ({ ...s, strictIpAudit: val }))}
                label=""
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Scoped AI Service Tokens</p>
                <p className="text-xs text-[#6B7280]">Restrict AI Receptionist agent strictly to availability and booking</p>
              </div>
              <Toggle
                checked={safeguards.aiScopedTokenOnly}
                onChange={(val) => setSafeguards((s) => ({ ...s, aiScopedTokenOnly: val }))}
                label=""
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm font-medium text-[#111827]">Enforce Session Expiration</p>
                <p className="text-xs text-[#6B7280]">Require re-authentication after browser closure or session timeout</p>
              </div>
              <Toggle
                checked={safeguards.sessionTimeout8h}
                onChange={(val) => setSafeguards((s) => ({ ...s, sessionTimeout8h: val }))}
                label=""
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: Staff Accounts */}
      {activeTab === 'staff' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-[#F3F4F6]">
            <h3 className="text-sm font-semibold text-[#111827]">Authorized Staff Accounts</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Active staff credentials and role assignments. Super Admin escalation is protected.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" aria-label="Staff directory">
              <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-xs border-b border-[#F3F4F6]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {STAFF_USERS.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F9FAFB]/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#111827]">{user.name}</td>
                    <td className="py-3.5 px-4 text-[#6B7280]">{user.email}</td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          user.role === 'SUPER_ADMIN'
                            ? 'superadmin'
                            : user.role === 'DOCTOR'
                            ? 'success'
                            : user.role === 'RECEPTIONIST'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#047857]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Floating Bottom Save Bar for Dirty Safeguards */}
      {isDirty && (
        <div className="fixed bottom-6 inset-x-6 z-50 flex items-center justify-between rounded-2xl bg-[#0F172A] px-6 py-4 text-white shadow-2xl max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-150">
          <div className="flex items-center gap-3">
            <Sliders className="h-5 w-5 text-[#3B82F6]" aria-hidden="true" />
            <span className="text-sm font-medium">You have unsaved changes in safeguards.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardSafeguards}
              className="bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSafeguards}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
