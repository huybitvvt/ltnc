import { mobileApiClient } from '../auth/mobileClient';
import { ApiResponse } from '../auth/types';
import {
  IssueDto,
  CreateIssueRequest,
  UpdateIssueStatusRequest,
  FeedbackDto,
  CreateFeedbackRequest,
  ReplyFeedbackRequest,
  IssueStatus,
  FeedbackStatus,
} from './types';

export const mobileOperationsApi = {
  listIssues: async (params?: { contractId?: string; roomId?: string; status?: IssueStatus }): Promise<IssueDto[]> => {
    const res = await mobileApiClient.get<ApiResponse<IssueDto[]>>('/issues', { params });
    return res.data.data;
  },

  getIssue: async (id: string): Promise<IssueDto> => {
    const res = await mobileApiClient.get<ApiResponse<IssueDto>>(`/issues/${id}`);
    return res.data.data;
  },

  createIssue: async (data: CreateIssueRequest): Promise<IssueDto> => {
    const res = await mobileApiClient.post<ApiResponse<IssueDto>>('/issues', data);
    return res.data.data;
  },

  updateIssueStatus: async (id: string, data: UpdateIssueStatusRequest): Promise<IssueDto> => {
    const res = await mobileApiClient.put<ApiResponse<IssueDto>>(`/issues/${id}/status`, data);
    return res.data.data;
  },

  getInvoiceFeedbacks: async (invoiceId: string): Promise<FeedbackDto[]> => {
    const res = await mobileApiClient.get<ApiResponse<FeedbackDto[]>>(`/invoices/${invoiceId}/feedback`);
    return res.data.data;
  },

  createInvoiceFeedback: async (invoiceId: string, data: CreateFeedbackRequest): Promise<FeedbackDto> => {
    const res = await mobileApiClient.post<ApiResponse<FeedbackDto>>(`/invoices/${invoiceId}/feedback`, data);
    return res.data.data;
  },

  replyFeedback: async (feedbackId: string, data: ReplyFeedbackRequest): Promise<FeedbackDto> => {
    const res = await mobileApiClient.post<ApiResponse<FeedbackDto>>(`/feedback/${feedbackId}/replies`, data);
    return res.data.data;
  },

  updateFeedbackStatus: async (feedbackId: string, status: FeedbackStatus): Promise<FeedbackDto> => {
    const res = await mobileApiClient.put<ApiResponse<FeedbackDto>>(`/feedback/${feedbackId}/status`, { status });
    return res.data.data;
  },
};
