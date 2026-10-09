export type DepositEntryType =
  | 'RECEIPT'
  | 'RECEIPT_CORRECTION'
  | 'REFUND'
  | 'DEDUCTION'
  | 'OFFSET_OUT';

export type DepositStatus = 'NOT_RECEIVED' | 'HOLDING' | 'SETTLING' | 'SETTLED';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'MOMO'
  | 'VNPAY'
  | 'INTERNAL_TRANSFER';

export interface DepositLedgerEntryResponse {
  id: string;
  contractId: string;
  entryType: DepositEntryType;
  amount: string;
  paymentMethod?: PaymentMethod;
  referenceCode?: string;
  note?: string;
  reason?: string;
  refEntryId?: string;
  invoiceId?: string;
  actorId?: string;
  actorName?: string;
  recordedAt: string;
}

export interface ContractDepositFinancialStatusResponse {
  contractId: string;
  roomName: string;
  buildingName: string;
  tenantName: string;
  depositRequired: string;
  depositHeld: string;
  totalReceipt: string;
  totalRefund: string;
  totalDeduction: string;
  totalOffset: string;
  depositStatus: DepositStatus;
  settledAt?: string;
  entries: DepositLedgerEntryResponse[];
}

export interface RecordDepositReceiptRequest {
  contractId: string;
  amount: string;
  paymentMethod?: PaymentMethod;
  referenceCode?: string;
  note?: string;
}

export interface CorrectDepositReceiptRequest {
  refEntryId: string;
  deltaAmount: string;
  reason: string;
}

export interface RefundDepositRequest {
  contractId: string;
  amount: string;
  reason: string;
  paymentMethod?: PaymentMethod;
  referenceCode?: string;
}

export interface DeductDepositRequest {
  contractId: string;
  amount: string;
  reason: string;
  expenseRef?: string;
}

export interface OffsetDepositToInvoiceRequest {
  contractId: string;
  invoiceId: string;
  amount: string;
  note?: string;
}

export interface SettleDepositRequest {
  contractId: string;
  note?: string;
}
