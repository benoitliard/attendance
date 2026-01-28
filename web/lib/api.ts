import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class ApiClient {
  private getToken(): string | undefined {
    return Cookies.get('token');
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    Cookies.set('token', data.token, { expires: 7 });
    return data;
  }

  async register(email: string, password: string, name: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
    });
    Cookies.set('token', data.token, { expires: 7 });
    return data;
  }

  logout() {
    Cookies.remove('token');
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Classes
  async getClasses() {
    return this.request<{ classes: any[] }>('/classes');
  }

  async getClass(id: string) {
    return this.request<{ class: any; attendanceStats: any[] }>(`/classes/${id}`);
  }

  async createClass(name: string, code: string) {
    return this.request<{ class: any }>('/classes', {
      method: 'POST',
      body: { name, code },
    });
  }

  async updateClass(id: string, data: { name?: string; code?: string }) {
    return this.request<{ class: any }>(`/classes/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteClass(id: string) {
    return this.request<{ message: string }>(`/classes/${id}`, {
      method: 'DELETE',
    });
  }

  async getClassReport(id: string, startDate?: string, endDate?: string) {
    let url = `/classes/${id}/report`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<any>(url);
  }

  // Students
  async getStudents(classId?: string, search?: string) {
    let url = '/students';
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (search) params.append('search', search);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<{ students: any[] }>(url);
  }

  async getStudent(id: string) {
    return this.request<{ student: any; stats: any[] }>(`/students/${id}`);
  }

  async createStudent(data: any) {
    return this.request<{ student: any }>('/students', {
      method: 'POST',
      body: data,
    });
  }

  async updateStudent(id: string, data: any) {
    return this.request<{ student: any }>(`/students/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteStudent(id: string) {
    return this.request<{ message: string }>(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance
  async getSessions(classId: string, date?: string) {
    let url = `/attendance/sessions?classId=${classId}`;
    if (date) url += `&date=${date}`;
    return this.request<{ sessions: any[] }>(url);
  }

  async getSession(sessionId: string) {
    return this.request<{ session: any; students: any[] }>(`/attendance/sessions/${sessionId}`);
  }

  async createSession(data: any) {
    return this.request<{ session: any }>('/attendance/sessions', {
      method: 'POST',
      body: data,
    });
  }

  async markAttendance(sessionId: string, studentId: string, status: string, notes?: string) {
    return this.request<{ attendance: any }>('/attendance/mark', {
      method: 'POST',
      body: { sessionId, studentId, status, notes },
    });
  }

  async markBulkAttendance(sessionId: string, attendances: any[]) {
    return this.request<{ attendances: any[] }>('/attendance/mark-bulk', {
      method: 'POST',
      body: { sessionId, attendances },
    });
  }

  async quickAttendance(classId: string, attendances: any[], topic?: string) {
    return this.request<{ session: any; attendances: any[] }>('/attendance/quick', {
      method: 'POST',
      body: { classId, attendances, topic },
    });
  }

  async getTodayAttendance() {
    return this.request<{ sessions: any[]; summary: any }>('/attendance/today');
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getUsers() {
    return this.request<{ users: any[] }>('/admin/users');
  }

  async createUser(data: any) {
    return this.request<{ user: any }>('/admin/users', {
      method: 'POST',
      body: data,
    });
  }

  async getAlerts(threshold?: number) {
    const url = threshold ? `/admin/alerts?threshold=${threshold}` : '/admin/alerts';
    return this.request<{ alerts: any[] }>(url);
  }
}

export const api = new ApiClient();
