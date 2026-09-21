import { apiClient } from '../../shared/api/client';
import {
  InvoiceDetail,
  InvoiceSummary,
  InvoicePreviewRequest,
  AdjustInvoiceRequest,
  AddInvoiceNoteRequest,
} from './types';

export const invoicesApi = {
  listInvoices: async (params?: {
    contractId?: string;
    buildingId?: string;
    billingMonth?: string;
    status?: string;
    page?: number;
    size?: number;
  }) => {
    const res = await apiClient.get<{ data: { content: InvoiceSummary[]; totalElements: number } }>('/invoices', { params });
    return res.data.data;
  },

  previewInvoice: async (data: InvoicePreviewRequest) => {
    const res = await apiClient.post<{ data: InvoiceDetail }>('/invoices/preview', data);
    return res.data.data;
  },

  createOrRecalculateDraft: async (data: InvoicePreviewRequest) => {
    const res = await apiClient.post<{ data: InvoiceDetail }>('/invoices/draft', data);
    return res.data.data;
  },

  getInvoice: async (id: string) => {
    const res = await apiClient.get<{ data: InvoiceDetail }>(`/invoices/${id}`);
    return res.data.data;
  },

  issueInvoice: async (id: string, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: InvoiceDetail }>(`/invoices/${id}/issue`, {}, { headers });
    return res.data.data;
  },

  adjustInvoice: async (id: string, data: AdjustInvoiceRequest, idempotencyKey?: string) => {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    const res = await apiClient.post<{ data: InvoiceDetail }>(`/invoices/${id}/adjust`, data, { headers });
    return res.data.data;
  },

  addNote: async (id: string, data: AddInvoiceNoteRequest) => {
    const res = await apiClient.post<{ data: { message: string } }>(`/invoices/${id}/notes`, data);
    return res.data.data;
  },
};
