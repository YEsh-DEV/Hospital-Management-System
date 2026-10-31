const getCleanBaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return raw.trim().replace(/\/+$/, '');
};

class ApiClient {
  private getBaseUrl(): string {
    return getCleanBaseUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.getBaseUrl()}${cleanEndpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include', // for HttpOnly cookies
      });

      const status = res.status;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          error: errJson.message || `Request failed with status ${status}`,
          status,
        };
      }

      const data = await res.json().catch(() => ({}));
      return { data, status };
    } catch (err: any) {
      return {
        error: err.message || 'Network connection failed',
        status: 0,
      };
    }
  }

  // ─── Auth Endpoints ────────────────────────────────────────────────────────
  async login(email: string, password: string, rememberMe = false) {
    return this.request<{ message: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
  }

  async logout() {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  async refreshTokens() {
    return this.request<{ message: string; user: any; accessToken: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async switchRole(role: string) {
    return this.request<{ message: string; role: string }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────────
  async getAuditLogs(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request<{ data: any[]; pagination: any }>(
      `/api/audit-logs${query ? `?${query}` : ''}`
    );
  }

  // ─── Organization (Departments, Services, Doctors) ─────────────────────────
  async getDepartments() {
    return this.request<any[]>('/departments');
  }

  async getServices(departmentId?: string) {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return this.request<any[]>(`/services${query}`);
  }

  async getDoctors(departmentId?: string) {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return this.request<any[]>(`/doctors${query}`);
  }

  async getDoctorById(id: string) {
    return this.request<any>(`/doctors/${id}`);
  }

  async getDoctorAvailability(doctorId: string, date: string, durationMinutes?: number) {
    const params = new URLSearchParams({ date });
    if (durationMinutes) params.append('durationMinutes', durationMinutes.toString());
    return this.request<any>(`/doctors/${doctorId}/availability?${params.toString()}`);
  }

  // ─── Patients ──────────────────────────────────────────────────────────────
  async getPatients(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<any[]>(`/api/patients${query}`);
  }

  async getPatientById(id: string) {
    return this.request<any>(`/api/patients/${id}`);
  }

  async createPatient(patientData: any) {
    return this.request<any>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  async updatePatient(id: string, patientData: any) {
    return this.request<any>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patientData),
    });
  }

  // ─── Appointments ──────────────────────────────────────────────────────────
  async getAppointments(filters: Record<string, string> = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request<any[]>(`/api/appointments${query ? `?${query}` : ''}`);
  }

  async getAvailability(date?: string, department?: string, doctorId?: string) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (department) params.append('department', department);
    if (doctorId) params.append('doctorId', doctorId);
    const query = params.toString();
    return this.request<any>(`/api/availability${query ? `?${query}` : ''}`);
  }

  async createBookingRequest(bookingData: any) {
    return this.request<any>('/api/booking-requests', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async createAppointment(appointmentData: any) {
    return this.request<any>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async rescheduleAppointment(id: string, newStart: string, reason?: string) {
    return this.request<any>(`/api/appointments/${id}/reschedule`, {
      method: 'PATCH',
      body: JSON.stringify({ newStart, reason }),
    });
  }

  async cancelAppointment(id: string, reason?: string) {
    return this.request<any>(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async updateAppointmentStatus(id: string, status: string) {
    return this.request<any>(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ─── CRM (Leads & Follow-up Tasks) ─────────────────────────────────────────
  async getLeads(status?: string, source?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (source) params.append('source', source);
    const query = params.toString();
    return this.request<any[]>(`/api/leads${query ? `?${query}` : ''}`);
  }

  async createLead(leadData: any) {
    return this.request<any>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(id: string, leadData: any) {
    return this.request<any>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(leadData),
    });
  }

  async getFollowUpTasks(status?: string, leadId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (leadId) params.append('leadId', leadId);
    const query = params.toString();
    return this.request<any[]>(`/api/follow-up-tasks${query ? `?${query}` : ''}`);
  }

  async createFollowUpTask(taskData: any) {
    return this.request<any>('/api/follow-up-tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateFollowUpTask(id: string, taskData: any) {
    return this.request<any>(`/api/follow-up-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
  }

  // ─── Call Logs ─────────────────────────────────────────────────────────────
  async getCallLogs(filters: Record<string, string> = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request<any[]>(`/api/call-logs${query ? `?${query}` : ''}`);
  }

  async createCallLog(callData: any) {
    return this.request<any>('/api/call-logs', {
      method: 'POST',
      body: JSON.stringify(callData),
    });
  }

  // ─── Operational Reports ───────────────────────────────────────────────────
  async getReportsSummary(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const query = params.toString();
    return this.request<any>(`/api/reports/summary${query ? `?${query}` : ''}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
