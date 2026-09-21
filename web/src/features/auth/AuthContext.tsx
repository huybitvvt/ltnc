import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, setInMemoryToken, setOnAuthExpired } from '../../shared/api/client';
import { ApiResponse, AuthUser, LoginResponseData } from './types';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    setInMemoryToken(null);
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

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
        const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/refresh');
        if (isMounted && response.data.success) {
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
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
        login: loginId,
        password,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Đăng nhập thất bại');
      }

      const { accessToken, user: loggedInUser } = response.data.data;
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
      await apiClient.post('/auth/logout');
    } catch {
      // Bỏ qua lỗi mạng khi logout
    } finally {
      clearSession();
    }
  };

  const activate = async (inviteCode: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post<ApiResponse<string>>('/auth/activate', {
      inviteCode,
      newPassword,
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Kích hoạt tài khoản không thành công');
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    const response = await apiClient.post<ApiResponse<string>>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Đổi mật khẩu không thành công');
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
