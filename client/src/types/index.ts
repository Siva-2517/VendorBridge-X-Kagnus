export type Role = 'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER_APPROVER' | 'VENDOR';
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';
export type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'CANCELLED';
export type RfqStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'AWARDED' | 'CANCELLED';
export type InvitationStatus = 'INVITED' | 'VIEWED' | 'QUOTED' | 'SUBMITTED' | 'DECLINED';
export type QuotationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'APPROVED' | 'ACCEPTED' | 'REJECTED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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

export interface ApprovalHistoryItem {
  id: string;
  approvalRequestId: string;
  action: string;
  actorId: string;
  actor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  remarks?: string | null;
  createdAt: string;
}

export interface ApprovalRequestItem {
  id: string;
  rfqId: string;
  quotationId: string;
  status: ApprovalStatus;
  submittedById: string;
  submittedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  decidedById?: string | null;
  decidedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  } | null;
  decidedAt?: string | null;
  remarks?: string | null;
  rfq?: {
    id: string;
    rfqNumber: string;
    title: string;
    description: string;
    category: string;
    deliveryLocation: string;
    deadline: string;
    status: RfqStatus;
    items?: Array<{
      id: string;
      rfqId: string;
      itemDescription: string;
      quantity: number;
      uom: string;
      targetPrice?: number | null;
      createdAt: string;
    }>;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
    vendorId: string;
    vendor?: {
      id: string;
      name: string;
      gstin: string;
      category: string;
      email: string;
      phone: string;
    };
    subtotalAmount: number;
    taxRate: number;
    taxAmount: number;
    grandTotal: number;
    deliveryDays: number;
    paymentTerms: string;
    validityDate: string;
    notes?: string | null;
    status: QuotationStatus;
    items?: Array<{
      id: string;
      quotationId: string;
      rfqItemId: string;
      itemDescription?: string;
      quantity?: number;
      uom?: string;
      unitPrice: number;
      lineTotal: number;
      remarks?: string | null;
    }>;
  };
  history?: ApprovalHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemDescription: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string;
  vendor?: {
    id: string;
    name: string;
    gstin: string;
    category: string;
    email: string;
    phone: string;
    address?: string;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  amount: number; // legacy Week 1 compatibility
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  grandTotal?: number | null;
  status: POStatus;
  orderDate: string;
  rfqId?: string | null;
  rfq?: {
    id: string;
    rfqNumber: string;
    title: string;
    category: string;
    deliveryLocation: string;
  } | null;
  quotationId?: string | null;
  quotation?: {
    id: string;
    quotationNumber: string;
    taxRate: number;
    subtotalAmount: number;
    taxAmount: number;
    grandTotal: number;
    deliveryDays: number;
    paymentTerms: string;
    approvalRequest?: {
      id: string;
      status: string;
      decidedAt?: string | null;
      decidedBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: Role;
      } | null;
    } | null;
  } | null;
  paymentTerms?: string | null;
  deliveryDays?: number | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  } | null;
  items?: PurchaseOrderItem[];
  isLegacy?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';

export type TaxBreakdownType = 'CGST_SGST' | 'IGST' | 'STANDARD';

export interface TaxBreakdown {
  type: TaxBreakdownType;
  taxRate: number;
  totalTaxAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  isInterState?: boolean;
}

export interface ThreeWayMatchResult {
  isMatched: boolean;
  status: 'MATCHED' | 'DISCREPANCY';
  details: {
    poNumber: string;
    quotationNumber: string;
    itemCountMatch: boolean;
    quantityMatch: boolean;
    unitPriceMatch: boolean;
    subtotalMatch: boolean;
    taxMatch: boolean;
    grandTotalMatch: boolean;
  };
  discrepancies: string[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemDescription: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string;
  purchaseOrder?: PurchaseOrder;
  vendorId: string;
  vendorName?: string;
  vendor?: {
    id: string;
    name: string;
    gstin: string;
    category: string;
    email: string;
    phone: string;
    address?: string;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  subtotalAmount: number;
  taxRate: number;
  taxAmount: number;
  taxBreakdown?: TaxBreakdown | null;
  grandTotal: number;
  status: InvoiceStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  } | null;
  items?: InvoiceItem[];
  matchingResult?: ThreeWayMatchResult;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  id: string;
  userId: string | null;
  actorName: string;
  actorRole: Role | null;
  action: string;
  category: string;
  entityType: string;
  entityId: string | null;
  entityIdentifier: string | null;
  details: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface ActivityPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityListResponse {
  success: boolean;
  activities: ActivityLogItem[];
  pagination: ActivityPagination;
}

// --- Week 4 Reports & Analytics Types ---

export interface ReportKpiMetrics {
  totalSpend: number;
  formattedTotalSpend: string;
  currency: string;
  activeVendors: number;
  poFulfillmentRate: number;
  fulfilledPOsCount: number;
  totalEligiblePOsCount: number;
  pendingInvoices: number;
  overdueInvoices: number;
}

export interface MonthlySpendTrendItem {
  month: string;
  monthLabel: string;
  spend: number;
  poAmount: number;
  invoiceCount: number;
}

export interface CategorySpendItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface TopVendorSpendItem {
  vendorId: string;
  vendorName: string;
  paidAmount: number;
  invoiceCount: number;
  poCount: number;
}

export interface StatusDistributionItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface VendorPerformanceMetrics {
  rfqResponseRate: number;
  quotationAwardRate: number;
  invoiceSettlementRate: number;
  avgDeliveryLeadDays: number;
  limitationNotice: string;
}

export interface ReportsOverviewResponse {
  period: string;
  startDate: string;
  endDate: string;
  currency: string;
  kpis: ReportKpiMetrics;
  monthlySpendTrend: MonthlySpendTrendItem[];
  spendByCategory: CategorySpendItem[];
  topVendors: TopVendorSpendItem[];
  poStatusDistribution: StatusDistributionItem[];
  invoiceStatusDistribution: StatusDistributionItem[];
  vendorPerformance: VendorPerformanceMetrics;
}
