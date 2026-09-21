export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'ENDED';
export type MeterType = 'ELECTRICITY' | 'WATER';

export interface TenantSummary {
  id: string;
  userId?: string | null;
  fullName: string;
  phone: string;
  citizenIdMasked: string;
  email?: string | null;
  createdAt: string;
}

export interface CreateTenantRequest {
  fullName: string;
  phone: string;
  citizenId: string;
  email?: string;
}

export interface TenantInviteResponse {
  inviteCode: string;
  expiresAt: string;
}

export interface ContractSummary {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  representativeTenantId: string;
  representativeName: string;
  status: ContractStatus;
  actualStartDate: string;
  plannedEndExclusive: string;
  actualCheckoutDate?: string | null;
  rent: string;
  depositRequired: string;
  depositHeld: string;
}

export interface CreateContractRequest {
  roomId: string;
  representativeTenantId: string;
  actualStartDate: string;
  plannedEndExclusive: string;
  rent: string;
  depositRequired: string;
}

export interface HandoverReadingItem {
  meterId?: string;
  meterType?: MeterType;
  readingDate: string;
  value: string;
}

export interface ActivateContractRequest {
  handoverReadings: HandoverReadingItem[];
}

export interface ExtendContractRequest {
  newPlannedEndExclusive: string;
  reason: string;
}

export interface ContractMemberResponse {
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  citizenIdMasked: string;
  joinedOn: string;
  leftOn?: string | null;
  isRepresentative: boolean;
}

export interface AddMemberRequest {
  tenantId: string;
  joinedOn: string;
}

export interface RoomMeterResponse {
  id: string;
  roomId: string;
  type: MeterType;
  serial: string;
  installedOn: string;
  initialReading: string;
  active: boolean;
}
