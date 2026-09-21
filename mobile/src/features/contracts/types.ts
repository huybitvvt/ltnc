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

export interface RoomMeterResponse {
  id: string;
  roomId: string;
  type: MeterType;
  serial: string;
  installedOn: string;
  initialReading: string;
  active: boolean;
}
