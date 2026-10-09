import { apiClient } from '../../shared/api/client';
import {
  RecordPaymentRequest,
  PaymentCorrectionRequest,
  RefundRequest,
  TransferCreditRequest,
  InvoiceFinancialStatusResponse,
} from './types';

export const paymentsApi = {
  recordPayment: async (
    data: RecordPaymentRequest,
    idempotencyKey?: string
  ): Promise<InvoiceFinancialStatusResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<{ data: InvoiceFinancialStatusResponse }>(
      '/payments/record',
      data,
      { headers }
    );
    return res.data.data;
  },

  correctPayment: async (
    data: PaymentCorrectionRequest,
    idempotencyKey?: string
  ): Promise<InvoiceFinancialStatusResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<{ data: InvoiceFinancialStatusResponse }>(
      '/payments/correct',
      data,
      { headers }
    );
    return res.data.data;
  },

  refundCredit: async (
    data: RefundRequest,
    idempotencyKey?: string
  ): Promise<InvoiceFinancialStatusResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<{ data: InvoiceFinancialStatusResponse }>(
      '/payments/refund',
      data,
      { headers }
    );
    return res.data.data;
  },

  transferCredit: async (
    data: TransferCreditRequest,
    idempotencyKey?: string
  ): Promise<InvoiceFinancialStatusResponse> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }
    const res = await apiClient.post<{ data: InvoiceFinancialStatusResponse }>(
      '/payments/transfer-credit',
      data,
      { headers }
    );
    return res.data.data;
  },

  getFinancialStatus: async (
    invoiceId: string
  ): Promise<InvoiceFinancialStatusResponse> => {
    const res = await apiClient.get<{ data: InvoiceFinancialStatusResponse }>(
      `/invoices/${invoiceId}/financial-status`
    );
    return res.data.data;
  },
};
