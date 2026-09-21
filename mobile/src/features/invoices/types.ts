export type InvoiceStatus = 'DRAFT' | 'ISSUED';
export type InvoiceItemType = 'RENT' | 'ELECTRICITY' | 'WATER' | 'SERVICE' | 'ONE_OFF';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CREDIT';

export interface InvoiceItem {
  id?: string;
  type: InvoiceItemType;
  label: string;
  quantity: string | number;
  unitPrice: string;
  amount: string;
  calculationSnapshot?: string;
  readingRefs?: string;
  tariffRef?: string;
}

export interface InvoiceAdjustment {
  id: string;
  deltaAmount: string;
  reason: string;
  effectiveDate: string;
  recordedAt: string;
  createdByName: string;
}

export interface InvoiceNote {
  id: string;
  content: string;
  reason: string;
  recordedAt: string;
  createdByName: string;
}

export interface InvoiceDetail {
  id: string;
  contractId: string;
  roomName: string;
  buildingName: string;
  tenantName: string;
  billingMonth: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEndExclusive: string;
  dueDate: string;
  issuedAt?: string;
  originalTotal: string;
  adjustmentsTotal: string;
  effectiveDue: string;
  netApplied: string;
  debt: string;
  credit: string;
  paymentStatus: PaymentStatus;
  items: InvoiceItem[];
  adjustments: InvoiceAdjustment[];
  notes: InvoiceNote[];
}

export interface InvoiceSummary {
  id: string;
  contractId: string;
  roomName: string;
  buildingName: string;
  tenantName: string;
  billingMonth: string;
  status: InvoiceStatus;
  effectiveDue: string;
  debt: string;
  paymentStatus: PaymentStatus;
  dueDate: string;
}

export interface InvoicePreviewRequest {
  contractId: string;
  billingMonth: string;
}

export interface AdjustInvoiceRequest {
  deltaAmount: string;
  reason: string;
  effectiveDate: string;
}

export interface AddInvoiceNoteRequest {
  content: string;
  reason: string;
}
