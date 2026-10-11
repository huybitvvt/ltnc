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

export interface LedgerEntryResponse {
  id: string;
  invoiceId: string;
  entryType: LedgerEntryType;
  amount: string;
  paymentMethod?: PaymentMethod;
  referenceCode?: string;
  note?: string;
  refEntryId?: string;
  actorId?: string;
  actorName?: string;
  recordedAt: string;
}

export interface InvoiceFinancialStatusResponse {
  invoiceId: string;
  contractId: string;
  billingMonth: string;
  effectiveDue: string;
  netApplied: string;
  debt: string;
  credit: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  entries: LedgerEntryResponse[];
}

export interface RecordPaymentRequest {
  invoiceId: string;
  overpaymentConfirmed?: boolean;
  effectiveDate?: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceCode?: string;
  note?: string;
}

export interface PaymentCorrectionRequest {
  refEntryId: string;
  deltaAmount: string;
  reason: string;
}

export interface RefundRequest {
  invoiceId: string;
  amount: string;
  reason: string;
  paymentMethod?: PaymentMethod;
  referenceCode?: string;
}

export interface TransferCreditRequest {
  sourceInvoiceId: string;
  targetInvoiceId: string;
  amount: string;
  note?: string;
}
