import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, setInMemoryToken, setOnAuthExpired } from '../../shared/api/client';
import { AuthUser } from './types';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  activate: (inviteCode: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'trohub_user_info';
let pendingRestore: ReturnType<typeof apiClient.post<any>> | null = null;
function restoreWebSession() {
  if (!pendingRestore) pendingRestore = apiClient.post<any>('/auth/web/refresh').finally(() => {pendingRestore = null;});
  return pendingRestore;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    queryClient.clear();
    setInMemoryToken(null);
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, [queryClient]);

  useEffect(() => {
    setOnAuthExpired(() => {
      clearSession();
    });
  }, [clearSession]);

  // Thử refresh token khi khởi động để lấy access token in-memory mới
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const response = await restoreWebSession();
        if (isMounted && response.data && response.data.success !== false && response.data.data) {
          const { accessToken, user: loggedInUser } = response.data.data;
          setInMemoryToken(accessToken);
          setUser(loggedInUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
        }
      } catch {
        // Chưa có phiên hoặc hết hạn refresh token
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const login = async (loginId: string, password: string): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<any>('/auth/web/login', {
        login: loginId,
        password,
      });

      const resPayload = response.data;
      if (!resPayload || resPayload.success === false) {
        throw new Error(resPayload?.message || resPayload?.error?.message || 'Đăng nhập thất bại');
      }

      const loginData = resPayload.data;
      if (!loginData || !loginData.accessToken) {
        throw new Error('Dữ liệu xác thực không hợp lệ');
      }

      const { accessToken, user: loggedInUser } = loginData;
      queryClient.clear();
      setInMemoryToken(accessToken);
      setUser(loggedInUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.post('/auth/web/logout');
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      clearSession();
    }
  };

  const activate = async (inviteCode: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post<any>('/auth/activate', {
      inviteCode,
      newPassword,
    });
    const resPayload = response.data;
    if (!resPayload || resPayload.success === false) {
      throw new Error(resPayload?.message || resPayload?.error?.message || 'Kích hoạt tài khoản không thành công');
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post<any>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    const resPayload = response.data;
    if (!resPayload || resPayload.success === false) {
      throw new Error(resPayload?.message || resPayload?.error?.message || 'Đổi mật khẩu không thành công');
    }
    // Đổi mật khẩu thành công sẽ thu hồi toàn bộ session, cần đăng nhập lại
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        activate,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
