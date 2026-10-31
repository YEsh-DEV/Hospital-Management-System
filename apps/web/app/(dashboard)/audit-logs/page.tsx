'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AccessDenied } from '@/components/ui/access-denied';
import { AuditLogItem } from '@hospital/shared-types';
import {
  Download,
  RotateCw,
  Search,
  X,
  Lock,
  FileCode2,
} from 'lucide-react';

const MOCK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_90812',
    userId: 'usr_superadmin_01',
    userName: 'Dr. Arthur Vance',
    userRole: 'SUPER_ADMIN',
    action: 'user.role_change',
    auditableType: 'User',
    auditableId: 'usr_9812',
    ipAddress: '192.168.1.12',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    performedAt: '2026-10-18T14:32:10Z',
    oldValues: { roleId: 3, roleName: 'RECEPTIONIST' },
    newValues: { roleId: 2, roleName: 'ADMIN' },
  },
  {
    id: 'aud_90813',
    userId: 'usr_doc_04',
    userName: 'Dr. Sarah Jenkins',
    userRole: 'DOCTOR',
    action: 'patient.read',
    auditableType: 'Patient',
    auditableId: 'pat_4019',
    ipAddress: '10.0.4.15',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    performedAt: '2026-10-18T14:28:45Z',
    oldValues: null,
    newValues: { action: 'PHI_ACCESS', accessedFields: ['diagnoses', 'medications'] },
  },
  {
    id: 'aud_90814',
    userId: null,
    userName: 'AI Voice Receptionist',
    userRole: 'AI_SERVICE',
    action: 'booking.create',
    auditableType: 'Appointment',
    auditableId: 'apt_1102',
    ipAddress: '172.16.0.4',
    userAgent: 'VoiceAgent/2.1 (External-Webhook)',
    performedAt: '2026-10-18T14:10:02Z',
    oldValues: null,
    newValues: {
      patientPhone: '+1-555-0199',
      department: 'Cardiology',
      scheduledStart: '2026-10-19T10:00:00Z',
      status: 'CONFIRMED',
    },
  },
  {
    id: 'aud_90815',
    userId: 'usr_recept_03',
    userName: 'Emily Thorne',
    userRole: 'RECEPTIONIST',
    action: 'patient.update',
    auditableType: 'Patient',
    auditableId: 'pat_3088',
    ipAddress: '192.168.1.44',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    performedAt: '2026-10-18T13:55:18Z',
    oldValues: { phone: '+1-555-0100', address: '12 Elm Street' },
    newValues: { phone: '+1-555-0199', address: '45 Oak Avenue' },
  },
  {
    id: 'aud_90816',
    userId: 'usr_nurse_05',
    userName: 'Nurse Joy',
    userRole: 'NURSE',
    action: 'appointment.update',
    auditableType: 'Appointment',
    auditableId: 'apt_995',
    ipAddress: '10.0.8.22',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    performedAt: '2026-10-18T13:40:00Z',
    oldValues: { status: 'SCHEDULED' },
    newValues: { status: 'CONFIRMED', triageNotes: 'Vitals normal' },
  },
];

export default function AuditLogsPage() {
  const { currentRole, canAccessAuditLogs } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // RBAC Evaluation: 403 Access Forbidden for non-SUPER_ADMIN
  if (!canAccessAuditLogs) {
    return (
      <AccessDenied
        title="403 — Access Restricted"
        description="The Audit Trail Log is an append-only store restricted strictly to the Super Admin role. Your current account does not have authorization to view security audit logs."
        backHref="/dashboard"
        backLabel="Return to Dashboard"
      />
    );
  }

  // Filter logs
  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      log.auditableId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action.includes(actionFilter);
    const matchesEntity = entityFilter === 'ALL' || log.auditableType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#111827]">Audit Trail Logs</h2>
            <Badge variant="superadmin">Super Admin Only</Badge>
          </div>
          <p className="text-sm text-[#6B7280]">
            Review security events and sensitive data access. Designed with privacy safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Audit snapshot export generated.')}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Audit entries refreshed.')}
            className="gap-1.5"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" aria-hidden="true" />
            <Input
              placeholder="Search Actor or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              aria-label="Filter by action"
            >
              <option value="ALL">All Actions</option>
              <option value="user.role_change">user.role_change</option>
              <option value="patient.read">patient.read</option>
              <option value="patient.update">patient.update</option>
              <option value="booking.create">booking.create</option>
              <option value="appointment.update">appointment.update</option>
            </select>
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full h-10 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              aria-label="Filter by entity type"
            >
              <option value="ALL">All Entities</option>
              <option value="Patient">Patient</option>
              <option value="Appointment">Appointment</option>
              <option value="User">User</option>
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-[#6B7280]">
            Showing {filteredLogs.length} matching entries
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" aria-label="Audit Logs">
            <thead className="bg-[#F9FAFB] text-[#6B7280] uppercase font-semibold text-xs border-b border-[#F3F4F6]">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4 hidden sm:table-cell">Action</th>
                <th className="py-3 px-4 hidden md:table-cell">Resource</th>
                <th className="py-3 px-4 hidden lg:table-cell">Entity ID</th>
                <th className="py-3 px-4 hidden lg:table-cell">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-[#F9FAFB]/70 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono text-xs text-[#6B7280] whitespace-nowrap">
                    {new Date(log.performedAt).toLocaleString('en-US', {
                      timeZone: 'UTC',
                      hour12: false,
                    })} UTC
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-[#111827]">{log.userName || 'System'}</div>
                    <div className="text-xs text-[#6B7280]">{log.userRole || 'AI_SERVICE'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#374151] hidden sm:table-cell">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#6B7280] hidden md:table-cell">
                    {log.auditableType}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#2563EB] hidden lg:table-cell">
                    {log.auditableId}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#6B7280] hidden lg:table-cell">
                    {log.ipAddress}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[#2563EB] hover:text-[#1D4ED8]"
                      onClick={() => setSelectedLog(log)}
                    >
                      <FileCode2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> View Diff
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[#F3F4F6] text-xs text-[#6B7280] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
            <span>Immutable write-only audit trail</span>
          </div>
          <div>Showing 1 – {filteredLogs.length} of {filteredLogs.length} entries</div>
        </div>
      </Card>

      {/* JSON Diff Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-[#111827]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#F3F4F6] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
              <div>
                <h3 className="font-semibold text-[#111827] text-sm">
                  Audit Event: {selectedLog.action} (#{selectedLog.id})
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Entity: {selectedLog.auditableType} ({selectedLog.auditableId})
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6]"
                aria-label="Close details"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[#F9FAFB] p-4 rounded-xl border border-[#F3F4F6]">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Actor</span>
                  <span className="font-semibold text-[#111827]">{selectedLog.userName}</span>
                  <span className="text-[#6B7280] block text-[10px]">({selectedLog.userRole})</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Timestamp & IP</span>
                  <span className="font-mono text-[#111827] block">{selectedLog.performedAt}</span>
                  <span className="font-mono text-[#6B7280] text-[10px]">{selectedLog.ipAddress}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#6B7280] block text-[11px]">User Agent</span>
                  <span className="font-mono text-[#6B7280] text-[10px] break-all">
                    {selectedLog.userAgent}
                  </span>
                </div>
              </div>

              {/* Data Mutation Snapshot: Before & After */}
              <div>
                <p className="font-semibold uppercase tracking-wider text-[11px] text-[#6B7280] mb-2">
                  Data Mutation Snapshot (JSON Diff)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before / Old Values */}
                  <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                    <span className="text-[#DC2626] font-semibold block mb-1 text-[11px]">
                      BEFORE (old_values)
                    </span>
                    <pre className="font-mono text-[11px] text-[#991B1B] overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.oldValues
                        ? JSON.stringify(selectedLog.oldValues, null, 2)
                        : '(null — new creation or read action)'}
                    </pre>
                  </div>

                  {/* After / New Values */}
                  <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                    <span className="text-[#047857] font-semibold block mb-1 text-[11px]">
                      AFTER (new_values)
                    </span>
                    <pre className="font-mono text-[11px] text-[#065F46] overflow-x-auto whitespace-pre-wrap">
                      {selectedLog.newValues
                        ? JSON.stringify(selectedLog.newValues, null, 2)
                        : '(null)'}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] text-[#D97706] text-xs flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-[#D97706]" aria-hidden="true" />
                <span>
                  This record is permanently signed and append-only. Passwords and credentials are never captured.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#F3F4F6] bg-[#F9FAFB] flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
