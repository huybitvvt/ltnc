import { apiClient } from '../../shared/api/client';

export interface DashboardMetrics {
  buildingId: string | null;
  billingMonth: string | null;
  billedAmount: string;
  cashCollected: string;
  cashRefunded: string;
  netCash: string;
  totalDebt: string;
  totalCredit: string;
  totalDepositHeld: string;
  totalRooms: number;
  occupiedRooms: number;
  vacantBookableRooms: number;
  vacantBlockedRooms: number;
  openIssuesCount: number;
}

export const dashboardApi = {
  getMetrics: async (buildingId?: string, billingMonth?: string, dates?: { cashFrom?: string; cashTo?: string; asOf?: string }): Promise<DashboardMetrics> => {
    const params: Record<string, string> = {};
    if (buildingId) params.buildingId = buildingId;
    if (billingMonth) params.billingMonth = billingMonth;
    if (dates?.cashFrom) params.cashFrom = dates.cashFrom;
    if (dates?.cashTo) params.cashTo = dates.cashTo;
    if (dates?.asOf) params.asOf = dates.asOf;

    const response = await apiClient.get<{ data: DashboardMetrics }>('/reporting/dashboard', {
      params,
    });
    return response.data.data;
  },
};
