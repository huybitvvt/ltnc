import React, { createContext, useContext, useEffect, useState, useCallback, PropsWithChildren } from 'react';
import {
  mobileApiClient,
  setMobileAccessToken,
  setOnMobileAuthExpired,
  storageHelper,
} from './mobileClient';
import { ApiResponse, AuthUser, LoginResponseData } from './types';
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

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSession = useCallback(async () => {
    queryClient.clear();
    setMobileAccessToken(null);
    setUser(null);
    await storageHelper.clearRefreshToken();
  }, [queryClient]);

  useEffect(() => {
    setOnMobileAuthExpired(() => {
      clearSession();
    });
  }, [clearSession]);

  // Khôi phục phiên làm việc khi khởi động app
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const storedRefreshToken = await storageHelper.getRefreshToken();
        if (!storedRefreshToken) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const response = await mobileApiClient.post<ApiResponse<LoginResponseData>>('/auth/mobile/refresh', {
          refreshToken: storedRefreshToken,
        });

        if (isMounted && response.data.success) {
          const { accessToken, refreshToken: newRefreshToken, user: loggedInUser } = response.data.data;
          setMobileAccessToken(accessToken);
          setUser(loggedInUser);
          if (newRefreshToken) {
            await storageHelper.setRefreshToken(newRefreshToken);
          }
        }
      } catch {
        if (isMounted) {
          await clearSession();
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
      const response = await mobileApiClient.post<any>('/auth/mobile/login', {
        login: loginId.trim(),
        password,
      });

      const resPayload = response.data;
      if (!resPayload || resPayload.success === false) {
        throw new Error(resPayload?.message || resPayload?.error?.message || 'Đăng nhập không thành công');
      }

      const loginData = resPayload.data;
      if (!loginData || !loginData.accessToken) {
        throw new Error('Dữ liệu xác thực không hợp lệ');
      }

      const { accessToken, refreshToken, user: loggedInUser } = loginData;
      setMobileAccessToken(accessToken);
      setUser(loggedInUser);

      if (refreshToken) {
        await storageHelper.setRefreshToken(refreshToken);
      }

      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = await storageHelper.getRefreshToken();
      if (refreshToken) await mobileApiClient.post('/auth/mobile/logout', { refreshToken });
    } catch {
      // bỏ qua lỗi mạng
    } finally {
      await clearSession();
    }
  };

  const activate = async (inviteCode: string, newPassword: string): Promise<void> => {
    const response = await mobileApiClient.post<ApiResponse<string>>('/auth/activate', {
      inviteCode,
      newPassword,
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Kích hoạt tài khoản không thành công');
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    const response = await mobileApiClient.post<ApiResponse<string>>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Đổi mật khẩu thất bại');
    }
    await clearSession();
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

export const useMobileAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within an AuthProvider');
  }
  return context;
};
