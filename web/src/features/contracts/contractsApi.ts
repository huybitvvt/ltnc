import { apiClient } from '../../shared/api/client';
import { ApiResponse } from '../auth/types';
import { BuildingItem, RoomItem } from '../property/types';
import {
  ContractMemberResponse,
  ContractSummary,
  CreateContractRequest,
  CreateTenantRequest,
  ExtendContractRequest,
  HandoverReadingItem,
  RoomMeterResponse,
  TenantInviteResponse,
  TenantSummary,
} from './types';

export const contractsApi = {
  async listContracts(params?: { buildingId?: string; roomId?: string; status?: string }): Promise<ContractSummary[]> {
    const query = new URLSearchParams();
    if (params?.buildingId) query.append('buildingId', params.buildingId);
    if (params?.roomId) query.append('roomId', params.roomId);
    if (params?.status) query.append('status', params.status);

    const res = await apiClient.get<ApiResponse<ContractSummary[]>>(`/contracts?${query.toString()}`);
    return res.data.data;
  },

  async getContract(id: string): Promise<ContractSummary> {
    const res = await apiClient.get<ApiResponse<ContractSummary>>(`/contracts/${id}`);
    return res.data.data;
  },

  async createContractDraft(data: CreateContractRequest): Promise<ContractSummary> {
    const res = await apiClient.post<ApiResponse<ContractSummary>>('/contracts', data);
    return res.data.data;
  },

  async activateContract(id: string, handoverReadings: HandoverReadingItem[]): Promise<ContractSummary> {
    const res = await apiClient.post<ApiResponse<ContractSummary>>(`/contracts/${id}/activate`, { handoverReadings });
    return res.data.data;
  },

  async extendContract(id: string, data: ExtendContractRequest): Promise<ContractSummary> {
    const res = await apiClient.post<ApiResponse<ContractSummary>>(`/contracts/${id}/extend`, data);
    return res.data.data;
  },

  async listContractMembers(contractId: string): Promise<ContractMemberResponse[]> {
    const res = await apiClient.get<ApiResponse<ContractMemberResponse[]>>(`/contracts/${contractId}/members`);
    return res.data.data;
  },

  async addContractMember(contractId: string, data: { tenantId: string; joinedOn: string }): Promise<ContractMemberResponse> {
    const res = await apiClient.post<ApiResponse<ContractMemberResponse>>(`/contracts/${contractId}/members`, data);
    return res.data.data;
  },

  async listTenants(queryStr?: string): Promise<TenantSummary[]> {
    const q = queryStr ? `?query=${encodeURIComponent(queryStr)}` : '';
    const res = await apiClient.get<ApiResponse<TenantSummary[]>>(`/tenants${q}`);
    return res.data.data;
  },

  async createTenant(data: CreateTenantRequest): Promise<TenantSummary> {
    const res = await apiClient.post<ApiResponse<TenantSummary>>('/tenants', data);
    return res.data.data;
  },

  async issueTenantInvite(tenantId: string): Promise<TenantInviteResponse> {
    const res = await apiClient.post<ApiResponse<TenantInviteResponse>>(`/tenants/${tenantId}/invite`);
    return res.data.data;
  },

  async getRoomMeters(roomId: string): Promise<RoomMeterResponse[]> {
    const res = await apiClient.get<ApiResponse<RoomMeterResponse[]>>(`/rooms/${roomId}/meters`);
    return res.data.data;
  },

  async listBuildings(): Promise<BuildingItem[]> {
    const res = await apiClient.get<ApiResponse<BuildingItem[]>>('/buildings');
    return res.data.data;
  },

  async listRooms(buildingId?: string): Promise<RoomItem[]> {
    const q = buildingId ? `?buildingId=${buildingId}` : '';
    const res = await apiClient.get<ApiResponse<RoomItem[]>>(`/rooms${q}`);
    return res.data.data;
  },
};
