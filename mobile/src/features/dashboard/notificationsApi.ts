import { mobileApiClient } from '../auth/mobileClient';

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

export const mobileNotificationsApi = {
  getNotifications: async (unreadOnly = false, page = 0, size = 20) => {
    const res = await mobileApiClient.get<{
      data: {
        content: AppNotification[];
        totalElements: number;
        totalPages: number;
      };
    }>('/notifications', {
      params: { unreadOnly, page, size },
    });
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await mobileApiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return res.data.data.count;
  },

  markAsRead: async (id: string): Promise<AppNotification> => {
    const res = await mobileApiClient.put<{ data: AppNotification }>(`/notifications/${id}/read`);
    return res.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await mobileApiClient.put('/notifications/read-all');
  },

  broadcastNotification: async (data: { buildingId: string; title: string; message: string }) => {
    const res = await mobileApiClient.post<{ data: { status: string; sentCount: number } }>(
      '/notifications/broadcast',
      data
    );
    return res.data.data;
  },
};
