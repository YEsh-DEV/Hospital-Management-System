'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import {
  PhoneCall,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const CANONICAL_LEADS = [
  {
    id: 'lead-canon-01',
    name: 'Rajesh Sharma',
    phone: '+91 98201 23456',
    notes: 'Inquiry regarding cardiology consultation and echo test availability.',
    status: 'NEW',
    source: 'AI_VOICE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lead-canon-02',
    name: 'Pooja Verma',
    phone: '+91 98112 34567',
    notes: 'Wants second opinion for orthopedic knee replacement surgery.',
    status: 'CONTACTED',
    source: 'PHONE_CALL',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'lead-canon-03',
    name: 'Amit Patel',
    phone: '+91 98450 98765',
    notes: 'Enquiring about cashless Star Health insurance admission process.',
    status: 'QUALIFIED',
    source: 'PHONE_CALL',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

const CANONICAL_TASKS = [
  {
    id: 'task-canon-01',
    title: 'Call back Rajesh Sharma regarding cardiology appointment options',
    description: 'Discuss Dr. Rahul Menon morning slots and echo lab prep.',
    priority: 'HIGH',
    status: 'PENDING',
    dueDate: new Date(Date.now() + 3600000 * 2).toISOString(),
  },
  {
    id: 'task-canon-02',
    title: 'Verify cashless TPA documentation for Amit Patel',
    description: 'Confirm Star Health policy card and doctor admission letter.',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: new Date(Date.now() + 3600000 * 24).toISOString(),
  },
  {
    id: 'task-canon-03',
    title: 'Follow up on discharge billing summary for Sunita Rao',
    description: 'Patient requested digital copy sent to WhatsApp.',
    priority: 'NORMAL',
    status: 'COMPLETED',
    dueDate: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const CANONICAL_CALLS = [
  {
    id: 'call-canon-01',
    callerName: 'Rajesh Sharma',
    callerPhone: '+91 98201 23456',
    intent: 'Outpatient Booking',
    durationSeconds: 84,
    outcome: 'COMPLETED',
    summary: 'Caller inquired about Dr. Rahul Menon. Available slot offered and confirmed for 10:00 AM. Confirmation SMS dispatched.',
  },
  {
    id: 'call-canon-02',
    callerName: 'Pooja Verma',
    callerPhone: '+91 98112 34567',
    intent: 'Doctor Availability',
    durationSeconds: 45,
    outcome: 'COMPLETED',
    summary: 'Caller checked Dr. Arthur Vance orthopedic consultation schedule. Transferred details to receptionist.',
  },
  {
    id: 'call-canon-03',
    callerName: 'Amit Patel',
    callerPhone: '+91 98450 98765',
    intent: 'Insurance / TPA',
    durationSeconds: 62,
    outcome: 'ESCALATED',
    summary: 'Caller requested human staff assistance regarding Star Health cashless pre-authorization.',
  },
];

export default function LeadsCallsPage() {
  const [activeTab, setActiveTab] = useState<'leads' | 'tasks' | 'calls'>('leads');
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // New lead form
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    let loadedLeads: any[] = [];
    let loadedTasks: any[] = [];
    let loadedCalls: any[] = [];

    try {
      const [leadsRes, tasksRes, callsRes] = await Promise.all([
        apiClient.getLeads().catch(() => ({ data: null })),
        apiClient.getFollowUpTasks().catch(() => ({ data: null })),
        apiClient.getCallLogs().catch(() => ({ data: null })),
      ]);

      if (leadsRes && Array.isArray(leadsRes.data) && leadsRes.data.length > 0) {
        loadedLeads = leadsRes.data;
      }
      if (tasksRes && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
        loadedTasks = tasksRes.data;
      }
      if (callsRes && Array.isArray(callsRes.data) && callsRes.data.length > 0) {
        loadedCalls = callsRes.data;
      }
    } catch {
      // Backend offline handled below
    }

    if (typeof window !== 'undefined') {
      try {
        const storedLeads = JSON.parse(localStorage.getItem('advfiction_demo_leads') || '[]');
        if (Array.isArray(storedLeads)) {
          const ids = new Set(loadedLeads.map((l) => l.id));
          const custom = storedLeads.filter((l) => !ids.has(l.id));
          loadedLeads = [...custom, ...loadedLeads];
        }

        const storedTasks = JSON.parse(localStorage.getItem('advfiction_demo_tasks') || '[]');
        if (Array.isArray(storedTasks)) {
          const ids = new Set(loadedTasks.map((t) => t.id));
          const custom = storedTasks.filter((t) => !ids.has(t.id));
          loadedTasks = [...custom, ...loadedTasks];
        }

        const storedCalls = JSON.parse(localStorage.getItem('advfiction_demo_calls') || '[]');
        if (Array.isArray(storedCalls)) {
          const ids = new Set(loadedCalls.map((c) => c.id));
          const custom = storedCalls.filter((c) => !ids.has(c.id));
          loadedCalls = [...custom, ...loadedCalls];
        }
      } catch {}
    }

    if (loadedLeads.length === 0) loadedLeads = CANONICAL_LEADS;
    if (loadedTasks.length === 0) loadedTasks = CANONICAL_TASKS;
    if (loadedCalls.length === 0) loadedCalls = CANONICAL_CALLS;

    setLeads(loadedLeads);
    setTasks(loadedTasks);
    setCalls(loadedCalls);
    setLoading(false);
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName || !leadPhone) return;

    setSavingLead(true);
    const newLead = {
      id: 'lead-' + Date.now(),
      name: leadName.trim(),
      phone: leadPhone.trim(),
      notes: leadNotes.trim(),
      source: 'PHONE_CALL',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    const newTask = {
      id: 'task-' + Date.now(),
      title: `Follow up with ${leadName.trim()} (${leadPhone.trim()})`,
      description: leadNotes.trim() || 'New caller enquiry callback requested',
      priority: 'HIGH',
      status: 'PENDING',
      dueDate: new Date(Date.now() + 3600000 * 24).toISOString(),
    };

    try {
      await apiClient.createLead({
        name: leadName.trim(),
        phone: leadPhone.trim(),
        notes: leadNotes.trim(),
        source: 'PHONE_CALL',
      }).catch(() => null);
    } catch {
      // Backend offline handled by local storage fallback
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('advfiction_demo_leads') || '[]');
        localStorage.setItem('advfiction_demo_leads', JSON.stringify([newLead, ...stored]));

        const storedTasks = JSON.parse(localStorage.getItem('advfiction_demo_tasks') || '[]');
        localStorage.setItem('advfiction_demo_tasks', JSON.stringify([newTask, ...storedTasks]));
      } catch {}
    }

    setLeads((prev) => [newLead, ...prev]);
    setTasks((prev) => [newTask, ...prev]);

    setShowNewLeadModal(false);
    setLeadName('');
    setLeadPhone('');
    setLeadNotes('');
    setSavingLead(false);
  }

  async function handleUpdateLeadStatus(id: string, status: string) {
    try {
      await apiClient.updateLead(id, { status }).catch(() => null);
    } catch {}
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, status } : l));
      if (typeof window !== 'undefined') {
        localStorage.setItem('advfiction_demo_leads', JSON.stringify(updated));
      }
      return updated;
    });
  }

  async function handleCompleteTask(id: string) {
    try {
      await apiClient.updateFollowUpTask(id, { status: 'COMPLETED' }).catch(() => null);
    } catch {}
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, status: 'COMPLETED' } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('advfiction_demo_tasks', JSON.stringify(updated));
      }
      return updated;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Reception Enquiries & Call Operations</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manage caller enquiries, lead conversions, follow-up callback tasks, and AI call outcomes.
          </p>
        </div>
        <Button
          onClick={() => setShowNewLeadModal(true)}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Capture Enquiry / Lead
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] gap-4">
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'leads'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Enquiry Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Callback Tasks ({tasks.filter((t) => t.status === 'PENDING').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'calls'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Reception Call Logs ({calls.length})
        </button>
      </div>

      {/* Leads Tab Content */}
      {activeTab === 'leads' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Active Hospital Enquiries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Name & Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Enquiry Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {leads.length > 0 ? (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#F9FAFB]/70">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#111827]">{lead.name}</p>
                          <p className="text-xs text-[#6B7280]">{lead.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#374151]">{lead.source.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-xs text-[#4B5563] max-w-xs truncate">{lead.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              lead.status === 'CONVERTED'
                                ? 'success'
                                : lead.status === 'CONTACTED'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {lead.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          {lead.status !== 'CONVERTED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateLeadStatus(lead.id, 'CONVERTED')}
                              className="text-xs h-7 text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                            >
                              Convert
                            </Button>
                          )}
                          {lead.status === 'NEW' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateLeadStatus(lead.id, 'CONTACTED')}
                              className="text-xs h-7 text-[#2563EB] border-[#BFDBFE] hover:bg-[#EFF6FF]"
                            >
                              Contacted
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No active enquiries. New caller inquiries will populate here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Callback & Follow-up Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Task Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Lead Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-[#F9FAFB]/70">
                        <td className="px-4 py-3 font-medium text-[#111827]">{task.title}</td>
                        <td className="px-4 py-3 text-xs text-[#374151]">
                          {task.lead ? `${task.lead.name} (${task.lead.phone})` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7280]">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <span className={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'text-[#DC2626]' : 'text-[#4B5563]'}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={task.status === 'COMPLETED' ? 'success' : 'warning'}>
                            {task.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {task.status !== 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteTask(task.id)}
                              className="text-xs h-7 text-[#047857] border-[#A7F3D0] hover:bg-[#ECFDF5]"
                            >
                              Done
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        All callback tasks completed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Tab Content */}
      {activeTab === 'calls' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Call History & Receptionist Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Time & Caller</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Intent</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280]">Summary</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#6B7280]">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {calls.length > 0 ? (
                    calls.map((call) => (
                      <tr key={call.id} className="hover:bg-[#F9FAFB]/70">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#111827]">{call.callerName || 'Anonymous'}</p>
                          <p className="text-xs font-mono text-[#6B7280]">{call.callerPhone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#374151]">{call.intent || 'General Inbound'}</td>
                        <td className="px-4 py-3 text-xs text-[#6B7280]">{call.durationSeconds}s</td>
                        <td className="px-4 py-3 text-xs text-[#4B5563] max-w-sm">{call.summary || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant={
                              call.outcome === 'COMPLETED'
                                ? 'success'
                                : call.outcome === 'ESCALATED'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {call.outcome}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#6B7280]">
                        No call logs recorded. Inbound telephony and AI receptionist interactions will log here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: New Enquiry */}
      {showNewLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#111827]">New Enquiry / Callback Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#374151]">Full Name *</label>
                <Input
                  required
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#374151]">Phone Number *</label>
                <Input
                  required
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#374151]">Enquiry Notes</label>
                <textarea
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Details of inquiry, desired doctor or specialty..."
                  className="w-full mt-1 border border-[#D1D5DB] rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewLeadModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingLead}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  {savingLead ? 'Saving...' : 'Save Enquiry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
