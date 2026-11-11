import { api } from '../api/client';
import { ReportsOverviewResponse } from '../types';

export const reportsApi = {
  /**
   * Retrieves reports overview analytics dataset
   */
  getReportsOverview: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportsOverviewResponse> => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = `/api/reports/overview${queryString ? `?${queryString}` : ''}`;

    const res = await api.get<{ success: boolean; data: ReportsOverviewResponse }>(endpoint);
    return res.data;
  },

  /**
   * Downloads RFC 4180 compliant CSV export
   */
  downloadCsv: async (params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const query = new URLSearchParams();
    if (params?.period) query.append('period', params.period);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const endpoint = `/api/reports/export${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to download report CSV: ${response.statusText}`);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = `vendorbridge_report_${params?.period || '12m'}.csv`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
