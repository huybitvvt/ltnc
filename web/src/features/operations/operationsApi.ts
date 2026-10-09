import { apiClient } from '../../shared/api/client';
import {
  IssueDto,
  CreateIssueRequest,
  UpdateIssueStatusRequest,
  AssignIssueRequest,
  FeedbackDto,
  CreateFeedbackRequest,
  ReplyFeedbackRequest,
  StoredFileDto,
  IssueStatus,
  FeedbackStatus,
  ParentType,
} from './types';

export const operationsApi = {
  // ISSUES
  listIssues: async (params?: { contractId?: string; roomId?: string; status?: IssueStatus }): Promise<IssueDto[]> => {
    const res = await apiClient.get<{ data: IssueDto[] }>('/issues', { params });
    return res.data.data;
  },

  getIssue: async (id: string): Promise<IssueDto> => {
    const res = await apiClient.get<{ data: IssueDto }>(`/issues/${id}`);
    return res.data.data;
  },

  createIssue: async (data: CreateIssueRequest): Promise<IssueDto> => {
    const res = await apiClient.post<{ data: IssueDto }>('/issues', data);
    return res.data.data;
  },

  updateIssueStatus: async (id: string, data: UpdateIssueStatusRequest): Promise<IssueDto> => {
    const res = await apiClient.put<{ data: IssueDto }>(`/issues/${id}/status`, data);
    return res.data.data;
  },

  assignIssue: async (id: string, data: AssignIssueRequest): Promise<IssueDto> => {
    const res = await apiClient.put<{ data: IssueDto }>(`/issues/${id}/assign`, data);
    return res.data.data;
  },

  // FEEDBACK
  getInvoiceFeedbacks: async (invoiceId: string): Promise<FeedbackDto[]> => {
    const res = await apiClient.get<{ data: FeedbackDto[] }>(`/invoices/${invoiceId}/feedback`);
    return res.data.data;
  },

  createInvoiceFeedback: async (invoiceId: string, data: CreateFeedbackRequest): Promise<FeedbackDto> => {
    const res = await apiClient.post<{ data: FeedbackDto }>(`/invoices/${invoiceId}/feedback`, data);
    return res.data.data;
  },

  getAllFeedbacks: async (): Promise<FeedbackDto[]> => {
    const res = await apiClient.get<{ data: FeedbackDto[] }>('/feedback');
    return res.data.data;
  },

  replyFeedback: async (feedbackId: string, data: ReplyFeedbackRequest): Promise<FeedbackDto> => {
    const res = await apiClient.post<{ data: FeedbackDto }>(`/feedback/${feedbackId}/replies`, data);
    return res.data.data;
  },

  updateFeedbackStatus: async (feedbackId: string, status: FeedbackStatus): Promise<FeedbackDto> => {
    const res = await apiClient.put<{ data: FeedbackDto }>(`/feedback/${feedbackId}/status`, { status });
    return res.data.data;
  },

  // FILES
  uploadFile: async (file: File, parentType: ParentType, parentId: string): Promise<StoredFileDto> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parentType', parentType);
    formData.append('parentId', parentId);

    const res = await apiClient.post<{ data: StoredFileDto }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  getFileUrl: (fileId: string): string => {
    return `/api/v1/files/${fileId}`;
  },
};
