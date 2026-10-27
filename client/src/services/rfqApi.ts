import {
  Rfq,
  Quotation,
  RfqComparisonMatrix,
} from '../types';
import { API_BASE_URL } from '../api/client';

const API_BASE = `${API_BASE_URL}/api`;

const getAuthHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vb_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};



export function adaptComparisonResponse(data: any, fallbackRfqId: string = ''): RfqComparisonMatrix {
  const raw = data?.comparison || data || {};

  const rfqItems = (raw.rfq?.items || []).map((it: any, idx: number) => ({
    id: it.id || `item-${idx + 1}`,
    itemCode: it.itemCode || `ITEM-${String(idx + 1).padStart(2, '0')}`,
    description: it.itemDescription || it.description || 'Line Item',
    quantity: Number.isFinite(Number(it.quantity)) ? Number(it.quantity) : 0,
    uom: it.uom || 'Units',
    targetPrice:
      it.targetPrice !== undefined && it.targetPrice !== null && Number.isFinite(Number(it.targetPrice))
        ? Number(it.targetPrice)
        : null,
  }));

  const quotations = (raw.quotations || []).map((q: any) => {
    let numericRating: number | null = null;
    if (typeof q.vendorRating === 'number' && Number.isFinite(q.vendorRating)) {
      numericRating = q.vendorRating;
    } else if (typeof q.vendorRating === 'string') {
      const parsed = parseFloat(q.vendorRating);
      if (!isNaN(parsed) && Number.isFinite(parsed)) {
        numericRating = parsed;
      }
    }

    const itemPrices: Record<string, { unitPrice: number; lineTotal: number; leadDays: number }> = {};
    const itemsList = Array.isArray(q.lineItems) ? q.lineItems : Array.isArray(q.items) ? q.items : [];
    for (const item of itemsList) {
      const itemId = item.rfqItemId || item.id;
      if (itemId) {
        itemPrices[itemId] = {
          unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
          lineTotal: Number.isFinite(Number(item.lineTotal)) ? Number(item.lineTotal) : 0,
          leadDays: Number.isFinite(Number(item.deliveryLeadDays ?? q.deliveryDays ?? q.leadTimeDays))
            ? Number(item.deliveryLeadDays ?? q.deliveryDays ?? q.leadTimeDays)
            : 0,
        };
      }
    }

    const totalAmt = Number.isFinite(Number(q.totalAmount ?? q.grandTotal))
      ? Number(q.totalAmount ?? q.grandTotal)
      : 0;
    const subtotalAmt = Number.isFinite(Number(q.subtotal ?? q.subtotalAmount))
      ? Number(q.subtotal ?? q.subtotalAmount)
      : 0;
    const taxAmt = Number.isFinite(Number(q.taxAmount)) ? Number(q.taxAmount) : 0;
    const taxRateVal = Number.isFinite(Number(q.taxRate)) ? Number(q.taxRate) : 18;
    const leadDaysVal = Number.isFinite(Number(q.leadTimeDays ?? q.deliveryDays))
      ? Number(q.leadTimeDays ?? q.deliveryDays)
      : 0;

    return {
      quotationId: q.quotationId || q.id || '',
      quotationNumber: q.quotationNumber || '',
      vendorId: q.vendorId || q.vendor?.id || '',
      vendorName: q.vendorName || q.vendor?.name || 'Vendor',
      vendorRating: numericRating,
      vendorStatus: q.vendorStatus || q.vendor?.status || 'ACTIVE',
      status: q.status || 'SUBMITTED',
      subtotal: subtotalAmt,
      taxRate: taxRateVal,
      taxAmount: taxAmt,
      totalAmount: totalAmt,
      grandTotal: totalAmt,
      leadTimeDays: leadDaysVal,
      deliveryDays: leadDaysVal,
      paymentTerms: q.paymentTerms || 'Standard Terms',
      notes: q.notes || null,
      isSelected: Boolean(q.isSelected || q.id === raw.rfq?.selectedQuotationId || q.status === 'SELECTED'),
      isLowestPrice: Boolean(
        q.isLowest ??
          (raw.lowestPrice !== null && raw.lowestPrice !== undefined && totalAmt === Number(raw.lowestPrice))
      ),
      submittedAt: q.submittedAt || q.createdAt || null,
      itemPrices,
    };
  });

  const lowestQuote = quotations.find((q: any) => q.isLowestPrice);

  return {
    rfq: {
      id: raw.rfq?.id || fallbackRfqId,
      rfqNumber: raw.rfq?.rfqNumber || '',
      title: raw.rfq?.title || '',
      category: raw.rfq?.category || '',
      deliveryLocation: raw.rfq?.deliveryLocation || 'Central Warehouse',
      deadline: raw.rfq?.deadline || '',
      status: raw.rfq?.status || 'OPEN',
      selectedQuotationId: raw.rfq?.selectedQuotationId || null,
    },
    rfqItems,
    quotations,
    lowestQuotationId: lowestQuote ? lowestQuote.quotationId : null,
    lowestTotalAmount:
      raw.lowestPrice !== undefined && raw.lowestPrice !== null && Number.isFinite(Number(raw.lowestPrice))
        ? Number(raw.lowestPrice)
        : lowestQuote
        ? lowestQuote.totalAmount
        : null,
    totalQuotations: Number.isFinite(Number(raw.totalQuotationsCount))
      ? Number(raw.totalQuotationsCount)
      : quotations.length,
  };
}

export const rfqApi = {
  // RFQ CRUD
  async getRfqs(params?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<{ rfqs: Rfq[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/rfqs?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch RFQs');
    }
    const data = await res.json();
    return { rfqs: data.rfqs || [], total: data.total || 0 };
  },

  async getRfqById(id: string): Promise<Rfq> {
    const res = await fetch(`${API_BASE}/rfqs/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch RFQ details');
    }
    const data = await res.json();
    return data.rfq;
  },

  async createRfq(data: {
    title: string;
    description?: string;
    category: string;
    deliveryLocation: string;
    deadline: string;
    status?: 'DRAFT' | 'OPEN';
    items: Array<{
      itemCode: string;
      description: string;
      quantity: number;
      uom: string;
      targetPrice?: number | null;
      requiredDate?: string | null;
    }>;
    vendorIds: string[];
  }): Promise<Rfq> {
    const res = await fetch(`${API_BASE}/rfqs`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create RFQ');
    }
    const result = await res.json();
    return result.rfq;
  },

  async updateRfq(
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      deliveryLocation?: string;
      deadline?: string;
      status?: 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED';
    }
  ): Promise<Rfq> {
    const res = await fetch(`${API_BASE}/rfqs/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update RFQ');
    }
    const result = await res.json();
    return result.rfq;
  },

  // Attachments
  async uploadAttachment(rfqId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/attachments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload attachment');
    }
    return res.json();
  },

  getAttachmentDownloadUrl(rfqId: string, attachmentId: string): string {
    return `${API_BASE}/rfqs/${rfqId}/attachments/${attachmentId}`;
  },

  // Comparison Matrix & Selection
  async getComparison(rfqId: string): Promise<RfqComparisonMatrix> {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/comparison`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch quotation comparison');
    }
    const data = await res.json();
    return adaptComparisonResponse(data, rfqId);
  },

  async selectQuotationForApproval(
    rfqId: string,
    quotationId: string
  ): Promise<{ rfq: Rfq; quotation: Quotation }> {
    const res = await fetch(`${API_BASE}/rfqs/${rfqId}/select-quotation`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ quotationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to select quotation for approval');
    }
    const result = await res.json();
    return { rfq: result.rfq, quotation: result.quotation };
  },

  // Quotation Submission & Listing
  async getQuotations(params?: {
    rfqId?: string;
    vendorId?: string;
    status?: string;
  }): Promise<{ quotations: Quotation[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.rfqId) query.append('rfqId', params.rfqId);
    if (params?.vendorId) query.append('vendorId', params.vendorId);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE}/quotations?${query.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch quotations');
    }
    return res.json();
  },

  async getQuotationById(id: string): Promise<Quotation> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch quotation');
    }
    const data = await res.json();
    return data.quotation;
  },

  async submitQuotation(data: {
    rfqId: string;
    vendorId?: string;
    taxRate: number;
    paymentTerms: string;
    leadTimeDays: number;
    notes?: string;
    status?: 'DRAFT' | 'SUBMITTED';
    items: Array<{
      rfqItemId: string;
      unitPrice: number;
      deliveryLeadDays: number;
      notes?: string;
    }>;
  }): Promise<Quotation> {
    const res = await fetch(`${API_BASE}/quotations`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit quotation');
    }
    const result = await res.json();
    return result.quotation;
  },

  async updateQuotation(
    id: string,
    data: {
      taxRate?: number;
      paymentTerms?: string;
      leadTimeDays?: number;
      notes?: string;
      status?: 'DRAFT' | 'SUBMITTED';
      items?: Array<{
        rfqItemId: string;
        unitPrice: number;
        deliveryLeadDays: number;
        notes?: string;
      }>;
    }
  ): Promise<Quotation> {
    const res = await fetch(`${API_BASE}/quotations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update quotation');
    }
    const result = await res.json();
    return result.quotation;
  },
};
