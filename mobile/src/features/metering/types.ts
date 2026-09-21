export type ServiceCalculationType = 'ROOM_MONTHLY' | 'PERSON_MONTHLY' | 'METERED' | 'ONE_OFF';

export interface ServiceDefinition {
  id: string;
  name: string;
  unit: string;
  calculationType: ServiceCalculationType;
  active: boolean;
}

export interface Tariff {
  id: string;
  buildingId: string;
  serviceId: string;
  serviceName: string;
  serviceUnit: string;
  calculationType: ServiceCalculationType;
  effectiveMonth: string;
  unitPrice: number;
}

export interface BuildingBillingSettings {
  buildingId: string;
  dueDays: number;
  waterAbsoluteThreshold: number;
  electricityAbsoluteThreshold: number;
}

export type MeterType = 'ELECTRICITY' | 'WATER';
export type MeterReadingKind = 'HANDOVER' | 'PERIOD_END' | 'CHECKOUT';
export type EvaluationStatus = 'NORMAL' | 'WARNING' | 'INSUFFICIENT_DATA' | 'NOT_COMPARABLE';

export interface MeterReading {
  id: string;
  meterId: string;
  meterType: MeterType;
  roomCode: string;
  readingDate: string;
  value: number;
  kind: MeterReadingKind;
  fileId: string | null;
  createdByName: string;
  createdAt: string;
}

export interface ConsumptionAlert {
  id: string;
  contractId: string;
  meterType: MeterType;
  billingMonth: string;
  readingVersion: number;
  evaluationStatus: EvaluationStatus;
  comparisonSnapshot: string;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  reason: string | null;
  createdAt: string;
}
