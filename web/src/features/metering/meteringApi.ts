import { apiClient } from '@/shared/api/client';
import { BuildingItem, RoomItem } from '@/features/property/types';
import {
  ServiceDefinition,
  Tariff,
  BuildingBillingSettings,
  ContractServiceSubscription,
  MeterReading,
  ConsumptionAlert,
  OneOffCharge,
} from './types';

export const meteringApi = {
  // Buildings & Rooms
  listBuildings: async (): Promise<BuildingItem[]> => {
    const res = await apiClient.get<{ data: BuildingItem[] }>('/buildings');
    return res.data.data;
  },

  listRooms: async (buildingId: string): Promise<RoomItem[]> => {
    const res = await apiClient.get<{ data: RoomItem[] }>(`/buildings/${buildingId}/rooms`);
    return res.data.data;
  },

  // Service definitions
  listServices: async (): Promise<ServiceDefinition[]> => {
    const res = await apiClient.get<{ data: ServiceDefinition[] }>('/services');
    return res.data.data;
  },

  createService: async (payload: { name: string; unit: string; calculationType: string }): Promise<ServiceDefinition> => {
    const res = await apiClient.post<{ data: ServiceDefinition }>('/services', payload);
    return res.data.data;
  },

  // Tariffs
  listTariffs: async (buildingId: string): Promise<Tariff[]> => {
    const res = await apiClient.get<{ data: Tariff[] }>(`/buildings/${buildingId}/tariffs`);
    return res.data.data;
  },

  createTariff: async (
    buildingId: string,
    payload: { serviceId: string; effectiveMonth: string; unitPrice: string }
  ): Promise<Tariff> => {
    const res = await apiClient.post<{ data: Tariff }>(`/buildings/${buildingId}/tariffs`, payload);
    return res.data.data;
  },

  // Building settings
  getBillingSettings: async (buildingId: string): Promise<BuildingBillingSettings> => {
    const res = await apiClient.get<{ data: BuildingBillingSettings }>(`/buildings/${buildingId}/billing-settings`);
    return res.data.data;
  },

  updateBillingSettings: async (
    buildingId: string,
    payload: { dueDays: number; waterAbsoluteThreshold: number; electricityAbsoluteThreshold: number }
  ): Promise<BuildingBillingSettings> => {
    const res = await apiClient.put<{ data: BuildingBillingSettings }>(`/buildings/${buildingId}/billing-settings`, payload);
    return res.data.data;
  },

  // Meter readings
  recordReading: async (payload: {
    meterId: string;
    readingDate: string;
    value: number;
    fileId?: string;
  }): Promise<MeterReading> => {
    const res = await apiClient.post<{ data: MeterReading }>('/meters/readings', payload);
    return res.data.data;
  },

  recordBulkReadings: async (payload: {
    readingDate: string;
    readings: Array<{ meterId: string; value: number }>;
  }): Promise<MeterReading[]> => {
    const res = await apiClient.post<{ data: MeterReading[] }>('/meters/readings/bulk', payload);
    return res.data.data;
  },

  listReadingsByRoom: async (roomId: string): Promise<MeterReading[]> => {
    const res = await apiClient.get<{ data: MeterReading[] }>(`/rooms/${roomId}/meter-readings`);
    return res.data.data;
  },

  // Alerts
  listAlerts: async (contractId: string, billingMonth?: string): Promise<ConsumptionAlert[]> => {
    const res = await apiClient.get<{ data: ConsumptionAlert[] }>(`/contracts/${contractId}/consumption-alerts`, {
      params: billingMonth ? { billingMonth } : undefined,
    });
    return res.data.data;
  },

  acknowledgeAlert: async (alertId: string, reason: string): Promise<ConsumptionAlert> => {
    const res = await apiClient.put<{ data: ConsumptionAlert }>(`/consumption-alerts/${alertId}/acknowledge`, { reason });
    return res.data.data;
  },

  // Subscriptions
  listSubscriptions: async (contractId: string): Promise<ContractServiceSubscription[]> => {
    const res = await apiClient.get<{ data: ContractServiceSubscription[] }>(`/contracts/${contractId}/services`);
    return res.data.data;
  },

  subscribeService: async (
    contractId: string,
    payload: { serviceId: string; startMonth: string; endMonthExclusive?: string }
  ): Promise<ContractServiceSubscription> => {
    const res = await apiClient.post<{ data: ContractServiceSubscription }>(`/contracts/${contractId}/services`, payload);
    return res.data.data;
  },

  // One-off charges
  listOneOffCharges: async (contractId: string, billingMonth?: string): Promise<OneOffCharge[]> => {
    const res = await apiClient.get<{ data: OneOffCharge[] }>(`/contracts/${contractId}/one-off-charges`, {
      params: billingMonth ? { billingMonth } : undefined,
    });
    return res.data.data;
  },

  createOneOffCharge: async (
    contractId: string,
    payload: { billingMonth: string; label: string; amount: string; reason: string; sourceRef?: string }
  ): Promise<OneOffCharge> => {
    const res = await apiClient.post<{ data: OneOffCharge }>(`/contracts/${contractId}/one-off-charges`, payload);
    return res.data.data;
  },
};
