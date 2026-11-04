import { apiRequest } from '../api/client';
import { ApprovalRequestItem, ApprovalStatus } from '../types';

export interface ApprovalsListResponse {
  success: boolean;
  count: number;
  approvals: ApprovalRequestItem[];
}

export interface ApprovalDetailResponse {
  success: boolean;
  approval: ApprovalRequestItem;
}

export interface DecideApprovalResponse {
  success: boolean;
  message: string;
  approval: ApprovalRequestItem;
}

export const approvalApi = {
  getApprovals: async (status?: ApprovalStatus | 'ALL'): Promise<ApprovalsListResponse> => {
    return apiRequest<ApprovalsListResponse>('/api/approvals', {
      method: 'GET',
      params: status && status !== 'ALL' ? { status } : undefined,
    });
  },

  getApprovalById: async (id: string): Promise<ApprovalDetailResponse> => {
    return apiRequest<ApprovalDetailResponse>(`/api/approvals/${id}`, {
      method: 'GET',
    });
  },

  decideApproval: async (
    id: string,
    decision: 'APPROVE' | 'REJECT',
    remarks?: string
  ): Promise<DecideApprovalResponse> => {
    return apiRequest<DecideApprovalResponse>(`/api/approvals/${id}/decide`, {
      method: 'POST',
      body: { decision, remarks },
    });
  },
};
