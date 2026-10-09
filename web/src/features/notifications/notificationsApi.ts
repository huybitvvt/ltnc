import { apiClient } from '../../shared/api/client';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  resourceType?: string;
  resourceId?: string;
  readAt?: string;
  createdAt: string;
}

export interface BroadcastNotificationRequest {
  buildingId: string;
  title: string;
  message: string;
}

export const notificationsApi = {
  getNotifications: async (unreadOnly = false, page = 0, size = 20) => {
    const response = await apiClient.get<{
      data: {
        content: AppNotification[];
        totalElements: number;
        totalPages: number;
      };
    }>('/notifications', {
      params: { unreadOnly, page, size },
    });
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return response.data.data.count;
  },

  markAsRead: async (id: string): Promise<AppNotification> => {
    const response = await apiClient.put<{ data: AppNotification }>(`/notifications/${id}/read`);
    return response.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/read-all');
  },

  broadcastNotification: async (data: BroadcastNotificationRequest) => {
    const response = await apiClient.post<{ data: { status: string; sentCount: number } }>(
      '/notifications/broadcast',
      data
    );
    return response.data.data;
  },
};
