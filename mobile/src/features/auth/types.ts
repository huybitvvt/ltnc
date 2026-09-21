export type UserRole = 'OWNER' | 'STAFF' | 'TENANT';

export interface AuthUser {
  id: string;
  login: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  buildingIds?: string[];
}

export interface LoginResponseData {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  refreshToken?: string;
  user: AuthUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
  timestamp?: string;
}
