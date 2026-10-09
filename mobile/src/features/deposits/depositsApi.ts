import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';
import {
  ContractDepositFinancialStatusResponse,
  CorrectDepositReceiptRequest,
  DeductDepositRequest,
  DepositLedgerEntryResponse,
  OffsetDepositToInvoiceRequest,
  RecordDepositReceiptRequest,
  RefundDepositRequest,
  SettleDepositRequest,
} from './types';

export const mobileDepositsApi = {
  getContractDepositStatus: async (contractId: string): Promise<ContractDepositFinancialStatusResponse> => {
    const res = await mobileApiClient.get<ApiResponse<ContractDepositFinancialStatusResponse>>(
      `/deposits/contract/${contractId}`
    );
    return res.data.data;
  },

  recordReceipt: async (
    req: RecordDepositReceiptRequest,
    idempotencyKey?: string
  ): Promise<DepositLedgerEntryResponse> => {
    const res = await mobileApiClient.post<ApiResponse<DepositLedgerEntryResponse>>('/deposits/receipt', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },

  correctReceipt: async (
    req: CorrectDepositReceiptRequest,
    idempotencyKey?: string
  ): Promise<DepositLedgerEntryResponse> => {
    const res = await mobileApiClient.post<ApiResponse<DepositLedgerEntryResponse>>('/deposits/correct', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },

  refundDeposit: async (
    req: RefundDepositRequest,
    idempotencyKey?: string
  ): Promise<DepositLedgerEntryResponse> => {
    const res = await mobileApiClient.post<ApiResponse<DepositLedgerEntryResponse>>('/deposits/refund', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },

  deductDeposit: async (
    req: DeductDepositRequest,
    idempotencyKey?: string
  ): Promise<DepositLedgerEntryResponse> => {
    const res = await mobileApiClient.post<ApiResponse<DepositLedgerEntryResponse>>('/deposits/deduct', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },

  offsetToInvoice: async (
    req: OffsetDepositToInvoiceRequest,
    idempotencyKey?: string
  ): Promise<DepositLedgerEntryResponse> => {
    const res = await mobileApiClient.post<ApiResponse<DepositLedgerEntryResponse>>('/deposits/offset-invoice', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },

  settleDeposit: async (
    req: SettleDepositRequest,
    idempotencyKey?: string
  ): Promise<ContractDepositFinancialStatusResponse> => {
    const res = await mobileApiClient.post<ApiResponse<ContractDepositFinancialStatusResponse>>('/deposits/settle', req, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
    return res.data.data;
  },
};
