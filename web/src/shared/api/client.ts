import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse, LoginResponseData } from '../../features/auth/types';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let inMemoryToken: string | null = null;
let onAuthExpiredHandler: (() => void) | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

export const getInMemoryToken = (): string | null => {
  return inMemoryToken;
};

export const setOnAuthExpired = (handler: () => void) => {
  onAuthExpiredHandler = handler;
};

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor gắn Access Token in-memory
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (inMemoryToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// Response interceptor: Single-flight refresh token khi nhận 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Bỏ qua nếu đang gọi chính endpoint login hoặc refresh để tránh vòng lặp vô hạn
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Nếu đang có một lượt refresh diễn ra, xếp hàng đợi token mới
      return new Promise((resolve) => {
        refreshSubscribers.push((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Gọi refresh token endpoint với HTTP-only cookie hoặc session
      const refreshResponse = await axios.post<ApiResponse<LoginResponseData>>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken = refreshResponse.data.data.accessToken;
      setInMemoryToken(newToken);

      // Thông báo cho tất cả các request đang đợi
      refreshSubscribers.forEach((callback) => callback(newToken));
      refreshSubscribers = [];

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
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
