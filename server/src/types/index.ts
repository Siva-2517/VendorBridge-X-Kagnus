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
  REJECTED = 'REJECTED'
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

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string;
  amount: number;
  status: POStatus;
  orderDate: string;
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
  REJECTED = 'REJECTED',
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
