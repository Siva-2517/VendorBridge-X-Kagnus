import { apiRequest, API_BASE_URL } from '../api/client';
import { Invoice, InvoiceStatus } from '../types';

export interface InvoicesListResponse {
  success: boolean;
  count: number;
  invoices: Invoice[];
}

export interface InvoiceDetailResponse {
  success: boolean;
  invoice: Invoice;
}

export interface CreateInvoiceResponse {
  success: boolean;
  message: string;
  invoice: Invoice;
}

export interface MarkPaidResponse {
  success: boolean;
  message: string;
  invoice: Invoice;
}

export interface EmailInvoiceResponse {
  success: boolean;
  code: 'EMAIL_SENT' | 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED';
  message: string;
  recipient: string;
  details?: string;
}

export const invoiceApi = {
  getInvoices: async (filters?: {
    status?: InvoiceStatus | 'ALL';
    search?: string;
  }): Promise<InvoicesListResponse> => {
    return apiRequest<InvoicesListResponse>('/api/invoices', {
      method: 'GET',
      params: {
        status: filters?.status && filters.status !== 'ALL' ? filters.status : undefined,
        search: filters?.search ? filters.search : undefined,
      },
    });
  },

  getInvoiceById: async (id: string): Promise<InvoiceDetailResponse> => {
    return apiRequest<InvoiceDetailResponse>(`/api/invoices/${id}`, {
      method: 'GET',
    });
  },

  createInvoice: async (
    purchaseOrderId: string,
    notes?: string
  ): Promise<CreateInvoiceResponse> => {
    return apiRequest<CreateInvoiceResponse>('/api/invoices', {
      method: 'POST',
      body: { purchaseOrderId, notes },
    });
  },

  markInvoicePaid: async (id: string, notes?: string): Promise<MarkPaidResponse> => {
    return apiRequest<MarkPaidResponse>(`/api/invoices/${id}/mark-paid`, {
      method: 'POST',
      body: { notes },
    });
  },

  downloadPdf: async (id: string, invoiceNumber: string): Promise<void> => {
    const url = `${API_BASE_URL}/api/invoices/${id}/pdf`;
    const storedToken =
      typeof window !== 'undefined' ? localStorage.getItem('vb_token') : null;
    const headers: Record<string, string> = {};
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

    const res = await fetch(url, { headers, credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Download failed' }));
      throw new Error(err.message || 'Failed to download invoice PDF');
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  emailInvoice: async (
    id: string,
    recipientEmail?: string,
    notes?: string
  ): Promise<EmailInvoiceResponse> => {
    return apiRequest<EmailInvoiceResponse>(`/api/invoices/${id}/email`, {
      method: 'POST',
      body: { recipientEmail, notes },
    });
  },
};
