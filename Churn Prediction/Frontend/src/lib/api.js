import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'retainedge_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A listener the AuthContext registers so a 401 anywhere can force a logout,
// without this module needing to know about React.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new ApiClientError(message, error.response?.status, error.response?.data));
  }
);

export class ApiClientError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ---------- Auth ----------
export const AuthApi = {
  phoneLogin: (idToken, name) => api.post('/auth/phone', { idToken, name }),
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ---------- Datasets ----------
export const DatasetApi = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/datasets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    });
  },
  list: () => api.get('/datasets'),
  get: (id) => api.get(`/datasets/${id}`),
  remove: (id) => api.delete(`/datasets/${id}`),
};

// ---------- Predictions ----------
export const PredictionApi = {
  start: (datasetId) => api.post('/predictions/run', { datasetId }),
  listRuns: (params) => api.get('/predictions/runs', { params }),
  getRun: (runId) => api.get(`/predictions/runs/${runId}`),
  listCustomers: (runId, params) => api.get(`/predictions/runs/${runId}/customers`, { params }),
  getCustomer: (runId, customerId) => api.get(`/predictions/runs/${runId}/customers/${customerId}`),
  removeRun: (runId) => api.delete(`/predictions/runs/${runId}`),
  // Export requires the auth header, so it can't be a plain <a href>; fetch as a
  // blob and trigger the browser download manually.
  exportCsv: async (runId, filename) => {
    const res = await api.get(`/predictions/runs/${runId}/export`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `retainedge-run-${runId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ---------- Dashboard ----------
export const DashboardApi = {
  summary: (runId) => api.get('/dashboard/summary', { params: runId ? { runId } : {} }),
};

// ---------- Health ----------
export const HealthApi = {
  check: () => api.get('/health'),
};

export { baseURL };
