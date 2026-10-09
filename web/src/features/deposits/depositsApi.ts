import { apiClient } from '../../shared/api/client';
import {
  ContractDepositFinancialStatusResponse,
  RecordDepositReceiptRequest,
  CorrectDepositReceiptRequest,
  RefundDepositRequest,
  DeductDepositRequest,
  OffsetDepositToInvoiceRequest,
  SettleDepositRequest,
} from './types';

export const depositsApi = {
  getContractDepositStatus: async (contractId: string) => {
    const res = await apiClient.get<{ data: ContractDepositFinancialStatusResponse }>(
      `/deposits/contract/${contractId}`
    );
    return res.data.data;
  },

  recordReceipt: async (data: RecordDepositReceiptRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/receipt',
      data,
      { headers }
    );
    return res.data.data;
  },

  correctReceipt: async (data: CorrectDepositReceiptRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/correct',
      data,
      { headers }
    );
    return res.data.data;
  },

  refundDeposit: async (data: RefundDepositRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/refund',
      data,
      { headers }
    );
    return res.data.data;
  },

  deductDeposit: async (data: DeductDepositRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/deduct',
      data,
      { headers }
    );
    return res.data.data;
  },

  offsetToInvoice: async (data: OffsetDepositToInvoiceRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/offset-invoice',
      data,
      { headers }
    );
    return res.data.data;
  },

  settleDeposit: async (data: SettleDepositRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: ContractDepositFinancialStatusResponse }>(
      '/deposits/settle',
      data,
      { headers }
    );
    return res.data.data;
  },
};
