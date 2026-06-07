import type {
  User,
  Child,
  AuthorizationWithDetails,
  AuditLog,
  Statistics,
  CreateAuthorizationRequest,
} from '../types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-user-id': token } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data as T;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export const authApi = {
  async login(username: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  async logout(): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getMe(): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export const childrenApi = {
  async getChildren(): Promise<ApiResponse<Child[]>> {
    const response = await fetch(`${API_BASE}/children`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getChild(id: number): Promise<ApiResponse<Child>> {
    const response = await fetch(`${API_BASE}/children/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export const authorizationsApi = {
  async getAuthorizations(params?: { status?: string; childId?: number }): Promise<ApiResponse<AuthorizationWithDetails[]>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.childId) searchParams.set('childId', String(params.childId));

    const response = await fetch(`${API_BASE}/authorizations?${searchParams.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPendingApproval(): Promise<ApiResponse<AuthorizationWithDetails[]>> {
    const response = await fetch(`${API_BASE}/authorizations/pending-approval`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getPendingVerification(): Promise<ApiResponse<AuthorizationWithDetails[]>> {
    const response = await fetch(`${API_BASE}/authorizations/pending-verification`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getAuthorization(id: number): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async createAuthorization(data: CreateAuthorizationRequest): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async approve(id: number): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/approve`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async reject(id: number, reason: string): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  async verify(id: number, idLast4: string): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ idLast4 }),
    });
    return handleResponse(response);
  },

  async complete(id: number): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/complete`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async cancel(id: number): Promise<ApiResponse<AuthorizationWithDetails>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditLogs(id: number): Promise<ApiResponse<AuditLog[]>> {
    const response = await fetch(`${API_BASE}/authorizations/${id}/audit-logs`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export const adminApi = {
  async getStatistics(): Promise<ApiResponse<Statistics>> {
    const response = await fetch(`${API_BASE}/admin/statistics`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  async exportToday(): Promise<void> {
    const response = await fetch(`${API_BASE}/admin/export/today`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || '导出失败');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().split('T')[0];
    a.download = `交接清单_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  async getAllAuditLogs(limit = 100, offset = 0): Promise<ApiResponse<{ logs: AuditLog[]; total: number }>> {
    const response = await fetch(`${API_BASE}/admin/audit-logs?limit=${limit}&offset=${offset}`, {
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};
