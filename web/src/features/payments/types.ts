export type LedgerEntryType =
  | 'PAYMENT'
  | 'PAYMENT_CORRECTION'
  | 'REFUND'
  | 'CREDIT_APPLIED'
  | 'CREDIT_OUT'
  | 'CREDIT_IN'
  | 'DEPOSIT_OFFSET';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'MOMO'
  | 'VNPAY'
  | 'INTERNAL_TRANSFER';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CREDIT';

export interface RecordPaymentRequest {
  invoiceId: string;
  overpaymentConfirmed?: boolean;
  effectiveDate?: string;
  amount: number | string;
  paymentMethod: PaymentMethod;
  referenceCode?: string;
  note?: string;
}

export interface PaymentCorrectionRequest {
  refEntryId: string;
  deltaAmount: number | string;
  reason: string;
}

export interface RefundRequest {
  invoiceId: string;
  amount: number | string;
  paymentMethod: PaymentMethod;
  referenceCode?: string;
  reason: string;
}

export interface TransferCreditRequest {
  sourceInvoiceId: string;
  targetInvoiceId: string;
  amount: number | string;
  reason: string;
}

export interface LedgerEntryResponse {
  id: string;
  invoiceId: string;
  contractId: string;
  entryType: LedgerEntryType;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceCode?: string;
  note?: string;
  refEntryId?: string;
  actorName: string;
  recordedAt: string;
}

export interface InvoiceFinancialStatusResponse {
  invoiceId: string;
  originalTotal: string;
  adjustmentsTotal: string;
  effectiveDue: string;
  netApplied: string;
  debt: string;
  credit: string;
  paymentStatus: PaymentStatus;
  entries: LedgerEntryResponse[];
}
