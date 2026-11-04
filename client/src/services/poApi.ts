import { apiRequest } from '../api/client';
import { PurchaseOrder, POStatus } from '../types';

export interface PurchaseOrdersListResponse {
  success: boolean;
  count: number;
  purchaseOrders: PurchaseOrder[];
}

export interface PurchaseOrderDetailResponse {
  success: boolean;
  purchaseOrder: PurchaseOrder;
}

export interface GeneratePurchaseOrderResponse {
  success: boolean;
  message: string;
  purchaseOrder: PurchaseOrder;
}

export const poApi = {
  getPurchaseOrders: async (filters?: {
    status?: POStatus | 'ALL';
    search?: string;
  }): Promise<PurchaseOrdersListResponse> => {
    return apiRequest<PurchaseOrdersListResponse>('/api/purchase-orders', {
      method: 'GET',
      params: {
        status: filters?.status && filters.status !== 'ALL' ? filters.status : undefined,
        search: filters?.search ? filters.search : undefined,
      },
    });
  },

  getPurchaseOrderById: async (id: string): Promise<PurchaseOrderDetailResponse> => {
    return apiRequest<PurchaseOrderDetailResponse>(`/api/purchase-orders/${id}`, {
      method: 'GET',
    });
  },

  generatePurchaseOrder: async (
    quotationId: string,
    notes?: string
  ): Promise<GeneratePurchaseOrderResponse> => {
    return apiRequest<GeneratePurchaseOrderResponse>('/api/purchase-orders/generate', {
      method: 'POST',
      body: { quotationId, notes },
    });
  },
};
