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
