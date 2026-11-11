import { apiRequest } from '../api/client';
import { ActivityListResponse } from '../types';

export interface ActivityFilterParams {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const activityApi = {
  getActivityLogs: async (params?: ActivityFilterParams): Promise<ActivityListResponse> => {
    return apiRequest<ActivityListResponse>('/api/activity', {
      method: 'GET',
      params: params as any,
    });
  },
};
