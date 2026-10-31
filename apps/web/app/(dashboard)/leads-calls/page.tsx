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
    try {
      const [leadsRes, tasksRes, callsRes] = await Promise.all([
        apiClient.getLeads(),
        apiClient.getFollowUpTasks(),
        apiClient.getCallLogs(),
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (callsRes.data) setCalls(callsRes.data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!leadName || !leadPhone) return;

    setSavingLead(true);
    try {
      const res = await apiClient.createLead({
        name: leadName,
        phone: leadPhone,
        notes: leadNotes,
        source: 'PHONE_CALL',
      });

      if (res.data) {
        setShowNewLeadModal(false);
        setLeadName('');
        setLeadPhone('');
        setLeadNotes('');
        loadData();
      }
    } finally {
      setSavingLead(false);
    }
  }

  async function handleUpdateLeadStatus(id: string, status: string) {
    await apiClient.updateLead(id, { status });
    loadData();
  }

  async function handleCompleteTask(id: string) {
    await apiClient.updateFollowUpTask(id, { status: 'COMPLETED' });
    loadData();
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
