import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiResponse, LoginResponseData } from './types';

// Android Emulator thường truy cập localhost của máy host qua 10.0.2.2
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';
const baseURL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

const REFRESH_TOKEN_KEY = 'trohub_mobile_refresh_token';
let browserRefreshToken: string | null = null;

let inMemoryAccessToken: string | null = null;
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
let onAuthExpiredHandler: (() => void) | null = null;

// Hỗ trợ lưu trữ an toàn đa nền tảng
export const storageHelper = {
  async setRefreshToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        browserRefreshToken = token;
      } else {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      }
    } catch (e) {
      console.warn('Lỗi khi lưu refresh token vào SecureStore:', e);
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return browserRefreshToken;
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.warn('Lỗi khi đọc refresh token từ SecureStore:', e);
      return null;
    }
  },

  async clearRefreshToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        browserRefreshToken = null;
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Lỗi khi xóa refresh token từ SecureStore:', e);
    }
  },
};

export const setMobileAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
  if (!token) pendingCommands.clear();
};

export const getMobileAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

export const setOnMobileAuthExpired = (handler: () => void) => {
  onAuthExpiredHandler = handler;
};

export const mobileApiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Gắn Access Token in-memory
mobileApiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryAccessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  const key = commandKey(config);
  if (key) config.headers['X-Idempotency-Key'] = key;
  return config;
});

// Single-flight refresh token khi nhận 401
mobileApiClient.interceptors.response.use(
  (response) => { releaseCommand(response.config); return response; },
  async (error: AxiosError) => {
    if (error.config && error.response && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 401)
      releaseCommand(error.config);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes('/auth/') || originalRequest.url?.includes('/auth/mobile/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      originalRequest._retry = true;
      return new Promise((resolve, reject) => {
        refreshSubscribers.push({ reject, resolve: (token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(mobileApiClient(originalRequest));
        }});
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const storedRefreshToken = await storageHelper.getRefreshToken();
      if (!storedRefreshToken) {
        throw new Error('Không có refresh token');
      }

      const refreshResponse = await axios.post<ApiResponse<LoginResponseData>>(
        `${baseURL}/auth/mobile/refresh`,
        { refreshToken: storedRefreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const { accessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
      setMobileAccessToken(accessToken);

      if (newRefreshToken) {
        await storageHelper.setRefreshToken(newRefreshToken);
      }

      refreshSubscribers.forEach((cb) => cb.resolve(accessToken));
      refreshSubscribers = [];

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return mobileApiClient(originalRequest);
    } catch (refreshErr) {
      refreshSubscribers.forEach((subscriber) => subscriber.reject(refreshErr));
      setMobileAccessToken(null);
      await storageHelper.clearRefreshToken();
      refreshSubscribers = [];
      if (onAuthExpiredHandler) {
        onAuthExpiredHandler();
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);
