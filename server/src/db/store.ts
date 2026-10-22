import { prisma } from './prisma';
import { User, Vendor, PurchaseOrder, PasswordResetToken, AuditLog, Role, VendorStatus, POStatus } from '../types';

class DatabaseStore {
  // --- Users API ---
  public async findUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    return {
      ...user,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  public async findUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return {
      ...user,
      role: user.role as Role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<User> {
    const newUser = await prisma.user.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email.toLowerCase(),
        passwordHash: userData.passwordHash,
        phoneNumber: userData.phoneNumber || null,
        role: userData.role as Role,
        country: userData.country || 'India',
        additionalInfo: userData.additionalInfo || null,
        isActive: true,
      },
    });
    return {
      ...newUser,
      role: newUser.role as Role,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    };
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(updates.firstName !== undefined && { firstName: updates.firstName }),
        ...(updates.lastName !== undefined && { lastName: updates.lastName }),
        ...(updates.passwordHash !== undefined && { passwordHash: updates.passwordHash }),
        ...(updates.phoneNumber !== undefined && { phoneNumber: updates.phoneNumber }),
        ...(updates.country !== undefined && { country: updates.country }),
        ...(updates.additionalInfo !== undefined && { additionalInfo: updates.additionalInfo }),
        ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      },
    });
    return {
      ...updated,
      role: updated.role as Role,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // --- Password Reset Tokens ---
  public async createResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const record = await prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
        used: false,
      },
    });
    return {
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt.toISOString(),
      used: record.used,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async findResetToken(token: string): Promise<PasswordResetToken | null> {
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!record || record.used) return null;
    return {
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt.toISOString(),
      used: record.used,
      createdAt: record.createdAt.toISOString(),
    };
  }

  public async markTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { used: true },
    });
  }

  // --- Vendors API ---
  public async findVendors(filters: {
    status?: string;
    category?: string;
    search?: string;
    userId?: string;
  } = {}): Promise<{ vendors: Vendor[]; counts: { all: number; active: number; pending: number; blocked: number } }> {
    const baseWhere: any = {};
    if (filters.userId) {
      baseWhere.userId = filters.userId;
    }

    // Counts across all visible vendors in database
    const [allCount, activeCount, pendingCount, blockedCount] = await Promise.all([
      prisma.vendor.count({ where: baseWhere }),
      prisma.vendor.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.vendor.count({ where: { ...baseWhere, status: 'PENDING' } }),
      prisma.vendor.count({ where: { ...baseWhere, status: 'BLOCKED' } }),
    ]);

    const queryWhere: any = { ...baseWhere };
    if (filters.status && filters.status.toLowerCase() !== 'all') {
      queryWhere.status = filters.status.toUpperCase();
    }
    if (filters.category && filters.category.toLowerCase() !== 'all') {
      queryWhere.category = { equals: filters.category, mode: 'insensitive' };
    }
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      queryWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { gstin: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where: queryWhere,
      orderBy: { createdAt: 'desc' },
    });

    return {
      vendors: vendors.map((v) => ({
        ...v,
        status: v.status as VendorStatus,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      })),
      counts: {
        all: allCount,
        active: activeCount,
        pending: pendingCount,
        blocked: blockedCount,
      },
    };
  }

  public async findVendorById(id: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });
    if (!vendor) return null;
    return {
      ...vendor,
      status: vendor.status as VendorStatus,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  public async findVendorByGstin(gstin: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findUnique({
      where: { gstin: gstin.toUpperCase() },
    });
    if (!vendor) return null;
    return {
      ...vendor,
      status: vendor.status as VendorStatus,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  public async findVendorByEmail(email: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!vendor) return null;
    return {
      ...vendor,
      status: vendor.status as VendorStatus,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  public async findVendorByUserId(userId: string): Promise<Vendor | null> {
    const vendor = await prisma.vendor.findFirst({
      where: { userId },
    });
    if (!vendor) return null;
    return {
      ...vendor,
      status: vendor.status as VendorStatus,
      createdAt: vendor.createdAt.toISOString(),
      updatedAt: vendor.updatedAt.toISOString(),
    };
  }

  public async createVendor(
    vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Vendor> {
    const newVendor = await prisma.vendor.create({
      data: {
        name: vendorData.name,
        category: vendorData.category,
        gstin: vendorData.gstin.toUpperCase(),
        contactPerson: vendorData.contactPerson,
        email: vendorData.email.toLowerCase(),
        phone: vendorData.phone,
        address: vendorData.address,
        city: vendorData.city || null,
        state: vendorData.state || null,
        pincode: vendorData.pincode || null,
        country: vendorData.country || 'India',
        status: (vendorData.status as any) || 'PENDING',
        notes: vendorData.notes || null,
        createdById: vendorData.createdById || null,
        userId: vendorData.userId || null,
      },
    });
    return {
      ...newVendor,
      status: newVendor.status as VendorStatus,
      createdAt: newVendor.createdAt.toISOString(),
      updatedAt: newVendor.updatedAt.toISOString(),
    };
  }

  public async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.gstin !== undefined && { gstin: updates.gstin.toUpperCase() }),
        ...(updates.contactPerson !== undefined && { contactPerson: updates.contactPerson }),
        ...(updates.email !== undefined && { email: updates.email.toLowerCase() }),
        ...(updates.phone !== undefined && { phone: updates.phone }),
        ...(updates.address !== undefined && { address: updates.address }),
        ...(updates.city !== undefined && { city: updates.city }),
        ...(updates.state !== undefined && { state: updates.state }),
        ...(updates.pincode !== undefined && { pincode: updates.pincode }),
        ...(updates.country !== undefined && { country: updates.country }),
        ...(updates.status !== undefined && { status: updates.status as any }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      },
    });
    return {
      ...updated,
      status: updated.status as VendorStatus,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public async getVendorPurchaseOrderCount(vendorId: string): Promise<number> {
    return await prisma.purchaseOrder.count({ where: { vendorId } });
  }

  public async deleteVendor(id: string): Promise<boolean> {
    try {
      await prisma.vendor.delete({ where: { id } });
      return true;
    } catch (err) {
      return false;
    }
  }

  // --- Purchase Orders & Dashboard API ---
  public async getRecentPurchaseOrders(limit = 5, vendorId?: string): Promise<any[]> {
    const where: any = {};
    if (vendorId) {
      where.vendorId = vendorId;
    }
    const pos = await prisma.purchaseOrder.findMany({
      where,
      take: limit,
      orderBy: { orderDate: 'desc' },
      include: {
        vendor: {
          select: { name: true },
        },
      },
    });
    return pos.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      vendorId: po.vendorId,
      vendorName: po.vendor?.name || 'Verified Supplier',
      amount: po.amount,
      status: po.status as POStatus,
      orderDate: po.orderDate.toISOString(),
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
    }));
  }

  public async getMonthlySpend(vendorId?: string): Promise<number> {
    const where: any = { status: 'APPROVED' };
    if (vendorId) {
      where.vendorId = vendorId;
    }
    const result = await prisma.purchaseOrder.aggregate({
      where,
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  public async getPendingApprovalsCount(vendorId?: string): Promise<number> {
    const where: any = { status: 'PENDING' };
    if (vendorId) {
      where.vendorId = vendorId;
    }
    return await prisma.purchaseOrder.count({ where });
  }

  public async getVendorOrdersCount(vendorId: string): Promise<number> {
    return await prisma.purchaseOrder.count({ where: { vendorId } });
  }

  public async getUserCount(): Promise<number> {
    return await prisma.user.count({ where: { isActive: true } });
  }

  public async getSpendingTrends(vendorId?: string): Promise<Array<{ month: string; spend: number }>> {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const latestPOWhere: any = {};
    if (vendorId) {
      latestPOWhere.vendorId = vendorId;
    }
    const latestPO = await prisma.purchaseOrder.findFirst({
      where: latestPOWhere,
      orderBy: { orderDate: 'desc' },
      select: { orderDate: true },
    });

    const anchorDate = latestPO?.orderDate ? new Date(latestPO.orderDate) : new Date();
    const trends: Array<{ month: string; year: number; monthIndex: number; spend: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - i, 1);
      trends.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        spend: 0,
      });
    }

    const startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 5, 1);
    const queryWhere: any = {
      orderDate: { gte: startDate },
    };
    if (vendorId) {
      queryWhere.vendorId = vendorId;
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: queryWhere,
      select: {
        amount: true,
        orderDate: true,
      },
    });

    for (const po of pos) {
      const d = new Date(po.orderDate);
      const match = trends.find((t) => t.monthIndex === d.getMonth() && t.year === d.getFullYear());
      if (match) {
        match.spend += po.amount;
      }
    }

    return trends.map(({ month, spend }) => ({ month, spend }));
  }

  // --- Audit Log ---
  public async logAudit(userId: string | null, userEmail: string | null, action: string, details?: string): Promise<void> {
    try {
      let validUserId = userId;
      if (validUserId) {
        const userExists = await prisma.user.findUnique({ where: { id: validUserId } });
        if (!userExists) validUserId = null;
      }
      await prisma.auditLog.create({
        data: {
          userId: validUserId,
          action,
          details: details ? `${userEmail ? `[${userEmail}] ` : ''}${details}` : userEmail || null,
        },
      });
    } catch (err) {
      console.error('Audit log write error:', err);
    }
  }
}

export const db = new DatabaseStore();
export default db;
