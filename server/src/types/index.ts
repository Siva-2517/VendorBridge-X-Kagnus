export enum Role {
  ADMIN = 'ADMIN',
  PROCUREMENT_OFFICER = 'PROCUREMENT_OFFICER',
  MANAGER_APPROVER = 'MANAGER_APPROVER',
  VENDOR = 'VENDOR'
}

export enum VendorStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED'
}

export enum POStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED'
}

export enum InvoiceStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

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

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string | null;
  role: Role;
  country?: string | null;
  additionalInfo?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
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
  createdById?: string | null;
  userId?: string | null;
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

export interface AuditLog {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  details?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  activeRfqs: number;
  pendingApprovals: number;
  monthlyPoSpend: number;
  overdueInvoices: number;
  recentPurchaseOrders: Array<{
    id: string;
    poNumber: string;
    vendorName: string;
    amount: number;
    status: POStatus;
    orderDate: string;
  }>;
  spendingTrends: Array<{
    month: string;
    spend: number;
  }>;
  vendorCounts: {
    all: number;
    active: number;
    pending: number;
    blocked: number;
  };
}

// --- Week 2 RFQ & Quotation Types ---

export enum RfqStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED',
}

export enum InvitationStatus {
  INVITED = 'INVITED',
  VIEWED = 'VIEWED',
  QUOTED = 'QUOTED',
  DECLINED = 'DECLINED',
}

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SELECTED = 'SELECTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
    items?: RfqItem[];
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
    items?: QuotationItem[];
  };
  history?: ApprovalHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface RfqItem {
  id: string;
  rfqId: string;
  itemDescription: string;
  quantity: number;
  uom: string;
  targetPrice?: number | null;
  createdAt: string;
}

export interface RfqAttachmentMeta {
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
  vendorName?: string;
  vendorCategory?: string;
  vendorEmail?: string;
  status: InvitationStatus;
  invitedAt: string;
  respondedAt?: string | null;
}

export interface Rfq {
  id: string;
  rfqNumber: string;
  title: string;
  description: string;
  category: string;
  deliveryLocation: string;
  deadline: string;
  status: RfqStatus;
  createdById: string;
  creatorName?: string;
  selectedQuotationId?: string | null;
  items?: RfqItem[];
  invitations?: RfqVendorInvitation[];
  quotationCount?: number;
  myQuotation?: Quotation | null; // For vendor-scoped requests
  attachments?: RfqAttachmentMeta[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  rfqItemId: string;
  itemDescription?: string;
  quantity?: number;
  uom?: string;
  unitPrice: number;
  lineTotal: number;
  remarks?: string | null;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  rfqId: string;
  rfqTitle?: string;
  rfqNumber?: string;
  vendorId: string;
  vendorName?: string;
  vendorGstin?: string;
  subtotalAmount: number;
  subtotal?: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  totalAmount?: number;
  deliveryDays: number;
  leadTimeDays?: number;
  paymentTerms: string;
  validityDate: string;
  notes?: string | null;
  status: QuotationStatus;
  isLowest?: boolean; // L1 calculated indicator
  items?: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationComparison {
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    description: string;
    category: string;
    deadline: string;
    status: RfqStatus;
    selectedQuotationId?: string | null;
    items: RfqItem[];
  };
  quotations: Array<{
    id: string;
    quotationNumber: string;
    vendorId: string;
    vendorName: string;
    vendorCategory: string;
    vendorRating: string; // e.g. "4.8/5" or "Not yet rated"
    grandTotal: number;
    subtotalAmount: number;
    taxRate: number;
    taxAmount: number;
    deliveryDays: number;
    paymentTerms: string;
    notes?: string | null;
    status: QuotationStatus;
    isSelected: boolean;
    isLowest: boolean; // L1 flag
    lineItems: Array<{
      rfqItemId: string;
      itemDescription: string;
      unitPrice: number;
      lineTotal: number;
      remarks?: string | null;
    }>;
    submittedAt: string;
  }>;
  totalQuotationsCount: number;
  lowestPrice: number | null;
  lowestBidderVendorName: string | null;
}
