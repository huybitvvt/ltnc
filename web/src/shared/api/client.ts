import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, LoginResponseData } from '../../features/auth/types';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let inMemoryToken: string | null = null;
let onAuthExpiredHandler: (() => void) | null = null;
let isRefreshing = false;
let commandCounter = 0;
const pendingCommands = new Map<string, string>();
const commandPattern = /\/(payments|deposits)\/|\/invoices\/[^/]+\/(issue|adjust)$|\/contracts\/[^/]+\/checkout$/;
function commandKey(config: InternalAxiosRequestConfig): string | undefined {
  if (config.method !== 'post' || !commandPattern.test(config.url || '')) return;
  const fingerprint = (config.url || '') + ':' + (typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {}));
  let key = pendingCommands.get(fingerprint);
  if (!key) { key = 'cmd-' + Date.now() + '-' + (++commandCounter) + '-' + Math.random().toString(36).slice(2); pendingCommands.set(fingerprint, key); }
  return key;
}
function releaseCommand(config: InternalAxiosRequestConfig) {
  const fingerprint = (config.url || '') + ':' + (typeof config.data === 'string' ? config.data : JSON.stringify(config.data ?? {}));
  pendingCommands.delete(fingerprint);
}
let refreshSubscribers: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
  if (!token) pendingCommands.clear();
};

export const getInMemoryToken = (): string | null => {
  return inMemoryToken;
};

export const setOnAuthExpired = (handler: () => void) => {
  onAuthExpiredHandler = handler;
};

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  withXSRFToken: true,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfPromise: Promise<string> | null = null;
async function csrfToken(): Promise<string> {
  if (!csrfPromise) csrfPromise = axios.get<ApiResponse<{token: string}>>(
    baseURL + '/auth/csrf', {withCredentials: true}).then(response => response.data.data.token)
    .catch(error => {csrfPromise = null; throw error;});
  return csrfPromise;
}

// Request interceptor gắn Access Token in-memory
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (inMemoryToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  if (config.url?.startsWith('/auth/web/') && config.method !== 'get')
    config.headers['X-XSRF-TOKEN'] = await csrfToken();
  const key = commandKey(config);
  if (key) config.headers['X-Idempotency-Key'] = key;
  return config;
});

// Response interceptor: Single-flight refresh token khi nhận 401
apiClient.interceptors.response.use(
  (response) => { releaseCommand(response.config); return response; },
  async (error: AxiosError) => {
    if (error.config && error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 401)
      releaseCommand(error.config);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Bỏ qua nếu đang gọi chính endpoint login hoặc refresh để tránh vòng lặp vô hạn
    if (originalRequest.url?.includes('/auth/') || originalRequest.url?.includes('/auth/web/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Nếu đang có một lượt refresh diễn ra, xếp hàng đợi token mới
      originalRequest._retry = true;
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({ reject, resolve: (token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        }});
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi refresh token endpoint với HTTP-only cookie hoặc session
      const refreshResponse = await axios.post<ApiResponse<LoginResponseData>>(
        `${baseURL}/auth/web/refresh`,
        {},
        { withCredentials: true, headers: {'X-XSRF-TOKEN': await csrfToken()} }
      );

      const newToken = refreshResponse.data.data.accessToken;
      setInMemoryToken(newToken);

      // Thông báo cho tất cả các request đang đợi
      refreshSubscribers.forEach((callback) => callback.resolve(newToken));
      refreshSubscribers = [];

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      refreshSubscribers.forEach((subscriber) => subscriber.reject(refreshError));
      setInMemoryToken(null);
      refreshSubscribers = [];
      if (onAuthExpiredHandler) {
        onAuthExpiredHandler();
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
