import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '@/src/types';

const SESSION_KEY = 'session';

// ─── Axios instance ────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Request interceptor — attach JWT ─────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      let raw: string | null = null;
      try {
        raw = await SecureStore.getItemAsync(SESSION_KEY);
      } catch {
        raw = localStorage.getItem(SESSION_KEY);
      }
      if (raw) {
        const session: AuthSession = JSON.parse(raw);
        if (session?.access_token) {
          config.headers.set('Authorization', `Bearer ${session.access_token}`);
        }
      }
    } catch {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — handle 401 ───────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    return Promise.reject(error);
  },
);

// ─── Upload helper (multipart/form-data) ──────────────────────────────────────

async function upload<T = unknown>(
  url: string,
  formData: FormData,
  config?: AxiosRequestConfig,
): Promise<T> {
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    raw = localStorage.getItem(SESSION_KEY);
  }
  const token = raw ? (JSON.parse(raw) as AuthSession).access_token : null;

  const response = await apiClient.post<{ data: T }>(url, formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config?.headers as Record<string, string> | undefined),
    },
  });

  // Backend wraps everything in { data: <payload> }
  return (response.data as { data: T }).data;
}

// ─── Typed GET / POST / PATCH / DELETE helpers ───────────────────────────────
// These unwrap the backend's { data: <payload> } envelope automatically.

async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.get<{ data: T }>(url, config);
  return response.data.data;
}

async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.post<{ data: T }>(url, body, config);
  return response.data.data;
}

async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await apiClient.patch<{ data: T }>(url, body, config);
  return response.data.data;
}

async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.delete<{ data: T }>(url, config);
  return response.data.data;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const api = {
  /** Raw Axios instance — use when you need full response control */
  instance: apiClient,
  get,
  post,
  patch,
  delete: del,
  upload,
};

export { SESSION_KEY };

export default apiClient;
