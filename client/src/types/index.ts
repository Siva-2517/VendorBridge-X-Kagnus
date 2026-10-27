export type Role = 'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER_APPROVER' | 'VENDOR';
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';
export type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type RfqStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type InvitationStatus = 'INVITED' | 'SUBMITTED' | 'DECLINED';
export type QuotationStatus = 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  role: Role;
  country?: string | null;
  additionalInfo?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  gstin: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  status: VendorStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorCounts {
  all: number;
  active: number;
  pending: number;
  blocked: number;
}

export interface RecentPO {
  id: string;
  poNumber: string;
  vendor: string;
  amount: number;
  status: POStatus;
}

export interface DashboardData {
  user: {
    firstName: string;
    lastName: string;
    role: Role;
  };
  vendorProfile?: Vendor | null;
  metrics: {
    activeRfqs: number;
    pendingApprovals: number;
    monthlyPoSpend: string;
    monthlyPoSpendRaw?: number;
    overdueInvoices: number;
    totalUsers?: number;
    activeSuppliers?: number;
    pendingVerifications?: number;
    totalOrdersCount?: number;
    verificationStatus?: string;
  };
  vendorCounts: VendorCounts;
  recentPurchaseOrders: RecentPO[];
  spendingTrends: Array<{
    month: string;
    spend: number;
  }>;
  notice?: string;
}

export interface RfqItem {
  id: string;
  rfqId: string;
  itemCode: string;
  description: string;
  quantity: number;
  uom: string;
  targetPrice?: number | null;
  requiredDate?: string | null;
}

export interface RfqAttachment {
  id: string;
  rfqId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface RfqVendorInvitation {
  id: string;
  rfqId: string;
  vendorId: string;
  vendor?: Vendor;
  status: InvitationStatus;
  invitedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  rfqItemId: string;
  rfqItem?: RfqItem;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  deliveryLeadDays: number;
  notes?: string | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  rfqId: string;
  rfq?: Rfq;
  vendorId: string;
  vendor?: Vendor;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string | null;
  status: QuotationStatus;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
  isLowest?: boolean;
  isSelected?: boolean;
}

export interface Rfq {
  id: string;
  rfqNumber: string;
  title: string;
  description?: string | null;
  category: string;
  deliveryLocation: string;
  deadline: string;
  status: RfqStatus;
  createdById: string;
  selectedQuotationId?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: RfqItem[];
  invitations?: RfqVendorInvitation[];
  quotations?: Quotation[];
  attachments?: RfqAttachment[];
  selectedQuotation?: Quotation | null;
  _count?: {
    quotations: number;
    invitations: number;
  };
}

export interface ComparisonVendorColumn {
  quotationId: string;
  quotationNumber: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number | null;
  vendorStatus: string;
  status: QuotationStatus;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  leadTimeDays: number;
  paymentTerms: string;
  isLowestPrice: boolean;
  isSelected: boolean;
  submittedAt: string | null;
  itemPrices: Record<
    string,
    {
      unitPrice: number;
      lineTotal: number;
      leadDays: number;
    }
  >;
}

export interface RfqComparisonMatrix {
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    category: string;
    deliveryLocation: string;
    deadline: string;
    status: RfqStatus;
    selectedQuotationId: string | null;
  };
  rfqItems: Array<{
    id: string;
    itemCode: string;
    description: string;
    quantity: number;
    uom: string;
    targetPrice: number | null;
  }>;
  quotations: ComparisonVendorColumn[];
  lowestQuotationId: string | null;
  lowestTotalAmount: number | null;
  totalQuotations: number;
}
