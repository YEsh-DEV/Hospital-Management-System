'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/context/RoleContext';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/rbac/PermissionGate';
import {
  Users,
  CalendarCheck,
  Stethoscope,
  ShieldAlert,
  Bot,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  Activity,
  PhoneCall,
} from 'lucide-react';
import { RoleName } from '@hospital/shared-types';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { currentRole, currentUser, canAccessAuditLogs } = useRole();
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [aiAppointments, setAiAppointments] = useState<any[]>([]);
  const [aiCalls, setAiCalls] = useState<any[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [aiCounts, setAiCounts] = useState({ appts: 0, leads: 0, calls: 0, tasks: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 1. Backend Reports & Audit Logs
      try {
        const [reportsRes, auditRes] = await Promise.allSettled([
          apiClient.getReportsSummary(),
          canAccessAuditLogs ? apiClient.getAuditLogs({ limit: '5' }) : Promise.resolve({ data: { data: [] } }),
        ]);

        if (isMounted) {
          if (reportsRes.status === 'fulfilled' && reportsRes.value.data) {
            setLiveMetrics(reportsRes.value.data);
          }
          if (auditRes.status === 'fulfilled' && (auditRes.value as any)?.data?.data) {
            setRecentLogs((auditRes.value as any).data.data.slice(0, 5));
          }
        }
      } catch {
        // Fallback gracefully
      }

      // 2. Direct Cross-Port AI Voice Receptionist Queries
      let fetchedAiAppts: any[] = [];
      let fetchedAiCalls: any[] = [];
      let liveOnline = false;

      try {
        const apptRes = await fetch('http://localhost:8000/demo/appointments', { signal: AbortSignal.timeout(1500) });
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          if (Array.isArray(apptData)) {
            fetchedAiAppts = apptData;
            liveOnline = true;
          }
        }
      } catch {}

      try {
        const callRes = await fetch('http://localhost:8000/demo/calls', { signal: AbortSignal.timeout(1500) });
        if (callRes.ok) {
          const callData = await callRes.json();
          if (Array.isArray(callData)) {
            fetchedAiCalls = callData;
            liveOnline = true;
          }
        }
      } catch {}

      // 3. LocalStorage Merge & Counter Updates
      if (typeof window !== 'undefined') {
        try {
          const storedAppts = JSON.parse(localStorage.getItem('advfiction_demo_appointments') || '[]');
          const storedLeads = JSON.parse(localStorage.getItem('advfiction_demo_leads') || '[]');
          const storedCalls = JSON.parse(localStorage.getItem('advfiction_demo_calls') || '[]');
          const storedTasks = JSON.parse(localStorage.getItem('advfiction_demo_tasks') || '[]');

          if (Array.isArray(storedAppts)) {
            const existingIds = new Set(fetchedAiAppts.map((a: any) => a.id));
            for (const sa of storedAppts) {
              if (!existingIds.has(sa.id)) {
                fetchedAiAppts.push(sa);
              }
            }
          }

          if (Array.isArray(storedCalls)) {
            const existingCallIds = new Set(fetchedAiCalls.map((c: any) => c.id));
            for (const sc of storedCalls) {
              if (!existingCallIds.has(sc.id)) {
                fetchedAiCalls.push(sc);
              }
            }
          }

          if (isMounted) {
            setAiAppointments(fetchedAiAppts);
            setAiCalls(fetchedAiCalls);
            setIsLiveConnected(liveOnline || fetchedAiAppts.length > 0);
            setAiCounts({
              appts: fetchedAiAppts.length,
              leads: Array.isArray(storedLeads) ? storedLeads.length : 0,
              calls: fetchedAiCalls.length > 0 ? fetchedAiCalls.length : (Array.isArray(storedCalls) ? storedCalls.length : 0),
              tasks: Array.isArray(storedTasks) ? storedTasks.filter((t: any) => t.status === 'PENDING').length : 0,
            });
          }
        } catch {}
      }
    }

    loadData();

    const handleStorage = () => loadData();
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(loadData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [canAccessAuditLogs]);

  // Derived stats with AI activity sync
  const baseApptTotal = liveMetrics?.appointments?.total !== undefined ? liveMetrics.appointments.total : 42;
  const baseApptConfirmed = liveMetrics?.appointments?.confirmed !== undefined ? liveMetrics.appointments.confirmed : 34;
  const apptCount = String(baseApptTotal + aiCounts.appts);
  const apptSub = `${baseApptConfirmed + aiCounts.appts} confirmed · ${liveMetrics?.appointments?.requested || 8} pending`;

  const leadCount = String((liveMetrics?.leads?.total !== undefined ? liveMetrics.leads.total : 14) + aiCounts.leads);
  const callCount = String((liveMetrics?.calls?.total !== undefined ? liveMetrics.calls.total : 28) + aiCounts.calls);
  const taskCount = String((liveMetrics?.tasks?.pending !== undefined ? liveMetrics.tasks.pending : 6) + aiCounts.tasks);

  function getStatCards(role: RoleName) {
    switch (role) {
      case 'DOCTOR':
        return [
          { title: "Today's Consultations", value: '8', subtitle: 'Live schedule active', icon: <Stethoscope className="h-[22px] w-[22px] text-[#2563EB]" />, iconBg: 'bg-[#EFF6FF]' },
          { title: 'Appointments Today', value: apptCount, subtitle: apptSub, icon: <CalendarCheck className="h-[22px] w-[22px] text-[#10B981]" />, iconBg: 'bg-[#ECFDF5]' },
          { title: 'Assigned Patients', value: '24', subtitle: 'Active care plans', icon: <Users className="h-[22px] w-[22px] text-[#8B5CF6]" />, iconBg: 'bg-[#FAF5FF]' },
          { title: 'Pending Reviews', value: taskCount, subtitle: 'Tasks requiring attention', icon: <Clock className="h-[22px] w-[22px] text-[#F59E0B]" />, iconBg: 'bg-[#FFFBEB]' },
        ];
      case 'RECEPTIONIST':
        return [
          { title: 'Total Appointments', value: apptCount, subtitle: apptSub, icon: <CalendarCheck className="h-[22px] w-[22px] text-[#10B981]" />, iconBg: 'bg-[#ECFDF5]' },
          { title: 'Reception Calls', value: callCount, subtitle: 'Recorded call interactions', icon: <PhoneCall className="h-[22px] w-[22px] text-[#2563EB]" />, iconBg: 'bg-[#EFF6FF]' },
          { title: 'Active Leads', value: leadCount, subtitle: 'Enquiries requiring callback', icon: <Activity className="h-[22px] w-[22px] text-[#8B5CF6]" />, iconBg: 'bg-[#FAF5FF]' },
          { title: 'Follow-up Tasks', value: taskCount, subtitle: 'Pending receptionist tasks', icon: <Clock className="h-[22px] w-[22px] text-[#F59E0B]" />, iconBg: 'bg-[#FFFBEB]' },
        ];
      default: // SUPER_ADMIN, ADMIN, NURSE
        return [
          { title: 'Appointments Today', value: apptCount, subtitle: apptSub, icon: <CalendarCheck className="h-[22px] w-[22px] text-[#10B981]" />, iconBg: 'bg-[#ECFDF5]' },
          { title: 'Enquiries & Leads', value: leadCount, subtitle: 'Prospective hospital visits', icon: <Activity className="h-[22px] w-[22px] text-[#2563EB]" />, iconBg: 'bg-[#EFF6FF]' },
          { title: 'Reception Call Logs', value: callCount, subtitle: 'Inbound & triage calls', icon: <PhoneCall className="h-[22px] w-[22px] text-[#8B5CF6]" />, iconBg: 'bg-[#FAF5FF]' },
          { title: 'Audit Trail Records', value: 'Active', subtitle: 'Tamper-resistant audit store', icon: <ShieldAlert className="h-[22px] w-[22px] text-[#7E22CE]" />, iconBg: 'bg-[#FAF5FF]' },
        ];
    }
  }

  const stats = getStatCards(currentRole);
  const displayName = (currentUser?.fullName || 'Administrator').split('(')[0].trim();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="rounded-2xl p-6 text-white shadow-sm"
        style={{ background: 'linear-gradient(to right, #1D4ED8, #2563EB, #3B82F6)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold leading-tight">Welcome back, {displayName}</h2>
            <p className="text-sm text-white/80 mt-1">
              Advfiction HMS · Unified Module Integration Active · Hospital Timezone: Asia/Kolkata
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium bg-white/20 border border-white/30 rounded-full px-3 py-1">
              {currentRole.replace('_', ' ')}
            </span>
            <PermissionGate permission="patient:create">
              <Link href="/patients">
                <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-1.5">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Patient
                </Button>
              </Link>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subtitle={stat.subtitle}
            icon={stat.icon}
            iconBg={stat.iconBg}
          />
        ))}
      </div>

      {/* Middle Grid: AI Receptionist Live Activity + Hospital Safeguards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-[#111827]">
                    AI Receptionist &amp; Outpatient Bookings
                  </CardTitle>
                  {isLiveConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Connected
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#9CA3AF] border border-dashed border-[#D1D5DB] px-2 py-0.5 rounded-full">
                      Offline Cache
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280]">Live bookings, caller inquiries and verified slot confirmations</p>
              </div>
            </div>
            <Link href="/appointments">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-[#2563EB] hover:text-[#1D4ED8]">
                View all in Appointments <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="AI Receptionist Bookings">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Patient &amp; Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Doctor &amp; Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Slot Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Booking ID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {aiAppointments.length > 0 ? (
                    aiAppointments.slice(0, 5).map((apt, idx) => (
                      <tr key={apt.id || idx} className="hover:bg-[#F9FAFB]/70 transition-colors">
                        <td className="px-4 py-3 text-xs">
                          <div className="font-semibold text-[#111827]">{apt.patientName || 'Rajesh Sharma'}</div>
                          <div className="text-[#6B7280] font-mono text-[11px]">{apt.patientPhone || '+91 98765 43210'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-[#111827]">{apt.doctorName || 'Dr. Rahul Menon'}</div>
                          <div className="text-[11px] text-[#2563EB] font-medium">{apt.department || 'Cardiology'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#374151]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#9CA3AF]" />
                            <span>{apt.time || 'Tomorrow 10:00 AM'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                            {apt.id}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant="success" className="text-[10px]">
                            {apt.status || 'CONFIRMED'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Bot className="h-6 w-6 text-[#9CA3AF]" />
                          <span>No AI appointments booked yet. Open the AI Voice Receptionist to test live booking.</span>
                          <a
                            href="http://localhost:8000/demo"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline mt-1"
                          >
                            Open AI Receptionist Portal <ArrowRight className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Recent AI Receptionist Response / Call Logs Banner */}
            {aiCalls.length > 0 && (
              <div className="p-3 bg-[#F8FAFB] border-t border-[#F3F4F6] text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-[#374151] flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-[#2563EB]" /> Latest Receptionist Call Interaction
                  </span>
                  <span className="text-[11px] text-[#6B7280] font-mono">
                    {aiCalls[0].callerPhone} &bull; {aiCalls[0].intent || 'Appointment Booking'}
                  </span>
                </div>
                <p className="text-[#4B5563] text-[11px] bg-white p-2 rounded-lg border border-[#E5E7EB]">
                  &ldquo;{aiCalls[0].summary}&rdquo;
                </p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Security Safeguards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#111827]">Security & Integration Standards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {[
              { title: 'Argon2id Password Hashing', desc: 'GPU-resistant memory-hard encryption' },
              { title: 'Transactional Slot Locking', desc: 'Atomic PostgreSQL conflict prevention' },
              { title: 'Immutable Audit Trail', desc: 'Append-only write-protected logs' },
              { title: 'Scoped AI Service Token', desc: 'Restricted strictly to availability & booking' },
              { title: 'Asia/Kolkata Timezone Engine', desc: 'Consistent hospital scheduling boundaries' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-[#047857] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[#111827]">{item.title}</p>
                  <p className="text-[#6B7280]">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-[#111827]">Quick Access Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/patients" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#F3F4F6] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors group">
              <Users className="h-6 w-6 text-[#2563EB]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#374151] group-hover:text-[#2563EB]">Patients</span>
            </Link>
            <Link href="/appointments" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#F3F4F6] hover:bg-[#ECFDF5] hover:border-[#A7F3D0] transition-colors group">
              <CalendarCheck className="h-6 w-6 text-[#047857]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#374151] group-hover:text-[#047857]">Appointments</span>
            </Link>
            <Link href="/doctors" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#F3F4F6] hover:bg-[#FAF5FF] hover:border-[#E9D5FF] transition-colors group">
              <Stethoscope className="h-6 w-6 text-[#7E22CE]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#374151] group-hover:text-[#7E22CE]">Schedules</span>
            </Link>
            <Link href="/leads-calls" className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#F3F4F6] hover:bg-[#FFFBEB] hover:border-[#FDE68A] transition-colors group">
              <PhoneCall className="h-6 w-6 text-[#D97706]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#374151] group-hover:text-[#D97706]">Leads & Calls</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
