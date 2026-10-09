export type IssueStatus = 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
export type ParentType = 'METER_READING' | 'MAINTENANCE_ISSUE' | 'INVOICE_FEEDBACK';

export interface IssueStatusHistoryDto {
  id: string;
  oldStatus: IssueStatus;
  newStatus: IssueStatus;
  comment?: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

export interface IssueDto {
  id: string;
  contractId: string;
  roomId: string;
  roomCode: string;
  buildingName: string;
  title: string;
  description: string;
  status: IssueStatus;
  assigneeId?: string;
  assigneeName?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  fileIds?: string[];
  history?: IssueStatusHistoryDto[];
}

export interface CreateIssueRequest {
  contractId: string;
  roomId: string;
  title: string;
  description: string;
  fileIds?: string[];
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
  comment?: string;
}

export interface AssignIssueRequest {
  assigneeId: string;
}

export interface FeedbackReplyDto {
  id: string;
  feedbackId: string;
  actorId: string;
  actorName: string;
  message: string;
  createdAt: string;
}

export interface FeedbackDto {
  id: string;
  invoiceId: string;
  invoiceCode: string;
  createdById: string;
  createdByName: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  replies?: FeedbackReplyDto[];
}

export interface CreateFeedbackRequest {
  message: string;
}

export interface ReplyFeedbackRequest {
  message: string;
}

export interface StoredFileDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  parentType: ParentType;
  parentId: string;
  createdAt: string;
}
