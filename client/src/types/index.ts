export type Role = 'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER_APPROVER' | 'VENDOR';
export type VendorStatus = 'ACTIVE' | 'PENDING' | 'BLOCKED';
export type POStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

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
  metrics: {
    activeRfqs: number;
    pendingApprovals: number;
    monthlyPoSpend: string;
    overdueInvoices: number;
  };
  vendorCounts: VendorCounts;
  recentPurchaseOrders: RecentPO[];
  spendingTrends: Array<{
    month: string;
    spend: number;
  }>;
  notice?: string;
}
