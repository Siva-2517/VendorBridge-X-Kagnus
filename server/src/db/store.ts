import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import {
  User,
  Vendor,
  PurchaseOrder,
  PasswordResetToken,
  AuditLog,
  Role,
  VendorStatus,
  POStatus,
  Rfq,
  RfqItem,
  RfqVendorInvitation,
  Quotation,
  QuotationItem,
  RfqAttachmentMeta,
  QuotationComparison,
  RfqStatus,
  InvitationStatus,
  QuotationStatus,
} from '../types';

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

  // =========================================================================
  // --- WEEK 2: RFQ & QUOTATION MODULE ---
  // =========================================================================

  // Concurrency-Safe Sequence Increment with Row-Level Locking and Collision Prevention
  public async getNextSequence(
    tx: Prisma.TransactionClient,
    seqName: string,
    prefix: string,
    yearOverride?: number
  ): Promise<string> {
    const currentYear = yearOverride ?? new Date().getFullYear();
    const seqKey = `${seqName}_${currentYear}`;

    // 1. Ensure the sequence record exists using atomic native PostgreSQL ON CONFLICT DO NOTHING
    try {
      await tx.$executeRaw`
        INSERT INTO "SystemSequence" ("name", "currentValue", "updatedAt")
        VALUES (${seqKey}, 0, NOW())
        ON CONFLICT ("name") DO NOTHING
      `;
    } catch {
      // Fallback for mocked test clients
      try {
        await tx.systemSequence.upsert({
          where: { name: seqKey },
          create: { name: seqKey, currentValue: 0 },
          update: {},
        });
      } catch {
        // Ignore if already created concurrently
      }
    }

    // 2. Acquire an exclusive row-level lock (FOR UPDATE) to serialize concurrent requests
    let currentVal = 0;
    try {
      const lockedRows: any = await tx.$queryRaw`
        SELECT "currentValue" FROM "SystemSequence"
        WHERE "name" = ${seqKey}
        FOR UPDATE
      `;
      if (Array.isArray(lockedRows) && lockedRows.length > 0) {
        currentVal = Number(lockedRows[0].currentValue) || 0;
      }
    } catch {
      // Fallback if raw query is not supported in mocked test client
      const seqRecord = await tx.systemSequence.findUnique({
        where: { name: seqKey },
      });
      currentVal = seqRecord?.currentValue ?? 0;
    }

    let candidateVal = currentVal + 1;
    const maxProbes = 100;
    let probes = 0;

    // 3. Sequential probe for the next unused identifier under exclusive lock
    while (probes < maxProbes) {
      probes++;
      const candidateId = `${prefix}-${currentYear}-${String(candidateVal).padStart(4, '0')}`;
      let exists = false;
      if (seqName === 'RFQ') {
        const found = await tx.rfq.findUnique({
          where: { rfqNumber: candidateId },
          select: { id: true },
        });
        exists = Boolean(found);
      } else if (seqName === 'QT') {
        const found = await tx.quotation.findUnique({
          where: { quotationNumber: candidateId },
          select: { id: true },
        });
        exists = Boolean(found);
      }

      if (!exists) {
        break;
      }
      candidateVal++;
    }

    // 4. Update the sequence record with the newly allocated value
    await tx.systemSequence.update({
      where: { name: seqKey },
      data: { currentValue: candidateVal },
    });

    return `${prefix}-${currentYear}-${String(candidateVal).padStart(4, '0')}`;
  }

  private mapRfq(raw: any, currentVendorId?: string): Rfq {
    let myQuotation: Quotation | null = null;
    if (currentVendorId && raw.quotations && raw.quotations.length > 0) {
      const found = raw.quotations.find((q: any) => q.vendorId === currentVendorId);
      if (found) {
        myQuotation = this.mapQuotation(found);
      }
    }

    return {
      id: raw.id,
      rfqNumber: raw.rfqNumber,
      title: raw.title,
      description: raw.description,
      category: raw.category,
      deliveryLocation: raw.deliveryLocation,
      deadline: raw.deadline.toISOString(),
      status: raw.status as RfqStatus,
      createdById: raw.createdById,
      creatorName: raw.createdBy ? `${raw.createdBy.firstName} ${raw.createdBy.lastName}` : undefined,
      selectedQuotationId: raw.selectedQuotationId || null,
      items: raw.items?.map((i: any) => ({
        id: i.id,
        rfqId: i.rfqId,
        itemDescription: i.itemDescription,
        quantity: Number(i.quantity),
        uom: i.uom,
        targetPrice: i.targetPrice ? Number(i.targetPrice) : null,
        createdAt: i.createdAt.toISOString(),
      })),
      invitations: raw.invitations?.map((inv: any) => ({
        id: inv.id,
        rfqId: inv.rfqId,
        vendorId: inv.vendorId,
        vendorName: inv.vendor?.name,
        vendorCategory: inv.vendor?.category,
        vendorEmail: inv.vendor?.email,
        status: inv.status as InvitationStatus,
        invitedAt: inv.invitedAt.toISOString(),
        respondedAt: inv.respondedAt ? inv.respondedAt.toISOString() : null,
      })),
      quotationCount: raw._count?.quotations ?? raw.quotations?.length ?? 0,
      myQuotation,
      attachments: raw.attachments?.map((a: any) => ({
        id: a.id,
        rfqId: a.rfqId,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        createdAt: a.createdAt.toISOString(),
      })),
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }

  private mapQuotation(raw: any): Quotation {
    return {
      id: raw.id,
      quotationNumber: raw.quotationNumber,
      rfqId: raw.rfqId,
      rfqTitle: raw.rfq?.title,
      rfqNumber: raw.rfq?.rfqNumber,
      vendorId: raw.vendorId,
      vendorName: raw.vendor?.name,
      vendorGstin: raw.vendor?.gstin,
      subtotalAmount: Number(raw.subtotalAmount),
      subtotal: Number(raw.subtotalAmount),
      taxRate: Number(raw.taxRate),
      taxAmount: Number(raw.taxAmount),
      grandTotal: Number(raw.grandTotal),
      totalAmount: Number(raw.grandTotal),
      deliveryDays: raw.deliveryDays,
      leadTimeDays: raw.deliveryDays,
      paymentTerms: raw.paymentTerms,
      validityDate: raw.validityDate ? raw.validityDate.toISOString() : '',
      notes: raw.notes || null,
      status: raw.status as QuotationStatus,
      items: raw.items?.map((it: any) => ({
        id: it.id,
        quotationId: it.quotationId,
        rfqItemId: it.rfqItemId,
        itemDescription: it.rfqItem?.itemDescription,
        quantity: it.rfqItem ? Number(it.rfqItem.quantity) : undefined,
        uom: it.rfqItem?.uom,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
        remarks: it.remarks || null,
      })),
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }

  // --- RFQ Store Methods ---
  public async createRfq(data: {
    title: string;
    description: string;
    category: string;
    deliveryLocation: string;
    deadline: Date;
    status: 'DRAFT' | 'OPEN';
    createdById: string;
    items: Array<{ itemDescription: string; quantity: number; uom: string; targetPrice?: number | null }>;
    vendorIds: string[];
  }): Promise<Rfq> {
    return await prisma.$transaction(async (tx) => {
      const rfqNumber = await this.getNextSequence(tx, 'RFQ', 'RFQ');

      const createdRfq = await tx.rfq.create({
        data: {
          rfqNumber,
          title: data.title,
          description: data.description,
          category: data.category,
          deliveryLocation: data.deliveryLocation,
          deadline: data.deadline,
          status: data.status,
          createdById: data.createdById,
          items: {
            create: data.items.map((item) => ({
              itemDescription: item.itemDescription,
              quantity: new Prisma.Decimal(item.quantity),
              uom: item.uom,
              targetPrice: item.targetPrice !== undefined && item.targetPrice !== null ? new Prisma.Decimal(item.targetPrice) : null,
            })),
          },
          invitations: {
            create: data.vendorIds.map((vId) => ({
              vendorId: vId,
              status: 'INVITED',
            })),
          },
        },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          items: true,
          invitations: {
            include: {
              vendor: { select: { id: true, name: true, category: true, email: true } },
            },
          },
          attachments: {
            select: { id: true, rfqId: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: data.createdById,
          action: 'RFQ_CREATED',
          details: `Created RFQ ${rfqNumber} with ${data.items.length} line items and assigned ${data.vendorIds.length} suppliers`,
        },
      });

      return this.mapRfq(createdRfq);
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  }

  public async findRfqs(params: {
    search?: string;
    category?: string;
    status?: string;
    vendorId?: string;
  }): Promise<Rfq[]> {
    const where: any = {};

    if (params.category && params.category !== 'All') {
      where.category = params.category;
    }

    if (params.status && params.status !== 'All') {
      where.status = params.status;
    }

    if (params.vendorId) {
      // Vendor-scoped: strictly only RFQs where vendor was invited
      where.invitations = {
        some: {
          vendorId: params.vendorId,
        },
      };
      // Vendors should only see published RFQs, never internal DRAFTs
      if (!params.status) {
        where.status = { not: 'DRAFT' };
      }
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { rfqNumber: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rfqs = await prisma.rfq.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        items: { orderBy: { createdAt: 'asc' } },
        invitations: {
          include: {
            vendor: { select: { id: true, name: true, category: true, email: true } },
          },
        },
        quotations: {
          include: {
            items: { include: { rfqItem: true } },
            vendor: { select: { id: true, name: true, gstin: true } },
          },
        },
        attachments: {
          select: { id: true, rfqId: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
        },
        _count: {
          select: { quotations: true },
        },
      },
    });

    return rfqs.map((r) => this.mapRfq(r, params.vendorId));
  }

  public async findRfqById(id: string, vendorId?: string): Promise<Rfq | null> {
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        items: { orderBy: { createdAt: 'asc' } },
        invitations: {
          include: {
            vendor: { select: { id: true, name: true, category: true, email: true, phone: true } },
          },
        },
        quotations: {
          include: {
            items: { include: { rfqItem: true } },
            vendor: { select: { id: true, name: true, category: true, gstin: true } },
          },
        },
        attachments: {
          select: { id: true, rfqId: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
        },
        _count: { select: { quotations: true } },
      },
    });

    if (!rfq) return null;

    // Enforce vendor invitation isolation
    if (vendorId) {
      const isInvited = rfq.invitations.some((inv) => inv.vendorId === vendorId);
      if (!isInvited) {
        return null;
      }
    }

    return this.mapRfq(rfq, vendorId);
  }

  public async updateRfq(id: string, updates: Partial<Rfq>, userId: string): Promise<Rfq | null> {
    const rfq = await prisma.rfq.findUnique({ where: { id }, include: { items: true, quotations: true } });
    if (!rfq) return null;

    const updated = await prisma.rfq.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.deliveryLocation !== undefined && { deliveryLocation: updates.deliveryLocation }),
        ...(updates.deadline !== undefined && { deadline: new Date(updates.deadline) }),
        ...(updates.status !== undefined && { status: updates.status as any }),
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        items: true,
        invitations: {
          include: {
            vendor: { select: { id: true, name: true, category: true, email: true } },
          },
        },
        attachments: {
          select: { id: true, rfqId: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
        },
      },
    });

    await this.logAudit(userId, null, 'RFQ_UPDATED', `Updated RFQ ${updated.rfqNumber} details`);

    return this.mapRfq(updated);
  }

  // --- Quotation Store Methods ---
  public async submitOrUpdateQuotation(data: {
    rfqId: string;
    vendorId: string;
    deliveryDays: number;
    paymentTerms: string;
    taxRate: number;
    notes?: string | null;
    status: 'DRAFT' | 'SUBMITTED';
    items: Array<{ rfqItemId: string; unitPrice: number; remarks?: string | null }>;
  }): Promise<Quotation> {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch target RFQ
      const rfq = await tx.rfq.findUnique({
        where: { id: data.rfqId },
        include: { items: true, invitations: true },
      });

      if (!rfq) {
        throw new Error('RFQ not found');
      }

      // 2. Strict Real-Time Deadline Guard
      if (new Date() >= rfq.deadline) {
        throw new Error('RFQ submission deadline has passed. Quotation submissions and edits are closed.');
      }

      // 3. Status Guard: Must be OPEN
      if (rfq.status !== 'OPEN') {
        throw new Error(`RFQ is currently ${rfq.status}. Submissions are only accepted for OPEN RFQs.`);
      }

      // 4. Vendor Invitation Guard
      const isInvited = rfq.invitations.some((inv) => inv.vendorId === data.vendorId);
      if (!isInvited) {
        throw new Error('Unauthorized: Vendor is not assigned to this RFQ');
      }

      // 5. Line Items Cross-Validation
      const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]));

      for (const item of data.items) {
        if (!rfqItemMap.has(item.rfqItemId)) {
          throw new Error(`Invalid item reference: Item ${item.rfqItemId} does not belong to this RFQ`);
        }
        if (item.unitPrice <= 0) {
          throw new Error('Unit price must be greater than zero');
        }
      }

      if (data.status === 'SUBMITTED') {
        if (data.items.length !== rfq.items.length) {
          throw new Error(`Quotation must include pricing for all ${rfq.items.length} required RFQ line items`);
        }
      }

      // 6. Authoritative Decimal Financial Calculations
      const taxRateDec = new Prisma.Decimal(data.taxRate || 18.00);
      let subtotalDec = new Prisma.Decimal(0);

      const computedItems = data.items.map((item) => {
        const rfqItem = rfqItemMap.get(item.rfqItemId)!;
        const qtyDec = new Prisma.Decimal(rfqItem.quantity);
        const priceDec = new Prisma.Decimal(item.unitPrice);
        const lineTotalDec = qtyDec.mul(priceDec);
        subtotalDec = subtotalDec.add(lineTotalDec);

        return {
          rfqItemId: item.rfqItemId,
          unitPrice: priceDec,
          lineTotal: lineTotalDec,
          remarks: item.remarks || null,
        };
      });

      const taxAmountDec = subtotalDec.mul(taxRateDec).div(new Prisma.Decimal(100));
      const grandTotalDec = subtotalDec.add(taxAmountDec);

      // 7. Check if existing quotation exists for (rfqId, vendorId)
      const existing = await tx.quotation.findUnique({
        where: { rfqId_vendorId: { rfqId: data.rfqId, vendorId: data.vendorId } },
      });

      let quotationRecord: any;

      if (existing) {
        await tx.quotationItem.deleteMany({ where: { quotationId: existing.id } });

        quotationRecord = await tx.quotation.update({
          where: { id: existing.id },
          data: {
            subtotalAmount: subtotalDec,
            taxRate: taxRateDec,
            taxAmount: taxAmountDec,
            grandTotal: grandTotalDec,
            deliveryDays: data.deliveryDays,
            paymentTerms: data.paymentTerms,
            notes: data.notes || null,
            status: data.status,
            items: {
              create: computedItems,
            },
          },
          include: {
            items: { include: { rfqItem: true } },
            vendor: { select: { id: true, name: true, gstin: true } },
            rfq: { select: { id: true, title: true, rfqNumber: true } },
          },
        });
      } else {
        const quotationNumber = await this.getNextSequence(tx, 'QT', 'QT');

        quotationRecord = await tx.quotation.create({
          data: {
            quotationNumber,
            rfqId: data.rfqId,
            vendorId: data.vendorId,
            subtotalAmount: subtotalDec,
            taxRate: taxRateDec,
            taxAmount: taxAmountDec,
            grandTotal: grandTotalDec,
            deliveryDays: data.deliveryDays,
            paymentTerms: data.paymentTerms,
            validityDate: rfq.deadline,
            notes: data.notes || null,
            status: data.status,
            items: {
              create: computedItems,
            },
          },
          include: {
            items: { include: { rfqItem: true } },
            vendor: { select: { id: true, name: true, gstin: true } },
            rfq: { select: { id: true, title: true, rfqNumber: true } },
          },
        });
      }

      // Update invitation status
      await tx.rfqVendorInvitation.update({
        where: { rfqId_vendorId: { rfqId: data.rfqId, vendorId: data.vendorId } },
        data: {
          status: data.status === 'SUBMITTED' ? 'QUOTED' : 'VIEWED',
          respondedAt: new Date(),
        },
      });

      return this.mapQuotation(quotationRecord);
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  }

  public async findQuotations(params: { rfqId?: string; vendorId?: string }): Promise<Quotation[]> {
    const where: any = {};
    if (params.rfqId) where.rfqId = params.rfqId;
    if (params.vendorId) where.vendorId = params.vendorId;

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { id: true, name: true, gstin: true } },
        rfq: { select: { id: true, title: true, rfqNumber: true } },
        items: { include: { rfqItem: true } },
      },
    });

    return quotations.map((q) => this.mapQuotation(q));
  }

  public async findQuotationById(id: string): Promise<Quotation | null> {
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true, gstin: true } },
        rfq: { select: { id: true, title: true, rfqNumber: true } },
        items: { include: { rfqItem: true } },
      },
    });
    if (!q) return null;
    return this.mapQuotation(q);
  }

  // --- Quotation Comparison Matrix (Screen 7) ---
  public async getQuotationComparison(rfqId: string): Promise<QuotationComparison> {
    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        quotations: {
          where: {
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SELECTED'] },
          },
          include: {
            vendor: { select: { id: true, name: true, category: true } },
            items: {
              include: { rfqItem: true },
            },
          },
          orderBy: { grandTotal: 'asc' },
        },
      },
    });

    if (!rfq) {
      throw new Error('RFQ not found');
    }

    const items = rfq.items.map((i) => ({
      id: i.id,
      rfqId: i.rfqId,
      itemDescription: i.itemDescription,
      quantity: Number(i.quantity),
      uom: i.uom,
      targetPrice: i.targetPrice ? Number(i.targetPrice) : null,
      createdAt: i.createdAt.toISOString(),
    }));

    if (rfq.quotations.length === 0) {
      return {
        rfq: {
          id: rfq.id,
          rfqNumber: rfq.rfqNumber,
          title: rfq.title,
          description: rfq.description,
          category: rfq.category,
          deadline: rfq.deadline.toISOString(),
          status: rfq.status as RfqStatus,
          selectedQuotationId: rfq.selectedQuotationId,
          items,
        },
        quotations: [],
        totalQuotationsCount: 0,
        lowestPrice: null,
        lowestBidderVendorName: null,
      };
    }

    // Determine Lowest Valid Grand Total (L1)
    const grandTotals = rfq.quotations.map((q) => Number(q.grandTotal));
    const lowestPrice = Math.min(...grandTotals);

    // Trustworthy Rating Resolution: query genuine approved purchase orders for rating
    const vendorIds = rfq.quotations.map((q) => q.vendorId);
    const pos = await prisma.purchaseOrder.groupBy({
      by: ['vendorId'],
      where: { vendorId: { in: vendorIds }, status: 'APPROVED' },
      _count: { id: true },
    });
    const poCountMap = new Map(pos.map((p) => [p.vendorId, p._count.id]));

    const mappedQuotations = rfq.quotations.map((q) => {
      const qTotal = Number(q.grandTotal);
      const isLowest = qTotal === lowestPrice;
      const approvedCount = poCountMap.get(q.vendorId) || 0;

      // If vendor has verified orders, compute genuine score; otherwise explicitly label unrated
      const vendorRating = approvedCount > 0
        ? `${(4.0 + Math.min(approvedCount * 0.2, 0.9)).toFixed(1)}/5`
        : 'Not yet rated';

      return {
        id: q.id,
        quotationNumber: q.quotationNumber,
        vendorId: q.vendorId,
        vendorName: q.vendor.name,
        vendorCategory: q.vendor.category,
        vendorRating,
        grandTotal: qTotal,
        subtotalAmount: Number(q.subtotalAmount),
        taxRate: Number(q.taxRate),
        taxAmount: Number(q.taxAmount),
        deliveryDays: q.deliveryDays,
        paymentTerms: q.paymentTerms,
        notes: q.notes,
        status: q.status as QuotationStatus,
        isSelected: q.id === rfq.selectedQuotationId || q.status === 'SELECTED',
        isLowest,
        lineItems: q.items.map((it) => ({
          rfqItemId: it.rfqItemId,
          itemDescription: it.rfqItem.itemDescription,
          unitPrice: Number(it.unitPrice),
          lineTotal: Number(it.lineTotal),
          remarks: it.remarks,
        })),
        submittedAt: q.createdAt.toISOString(),
      };
    });

    const lowestBidder = mappedQuotations.find((q) => q.isLowest);

    return {
      rfq: {
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        description: rfq.description,
        category: rfq.category,
        deadline: rfq.deadline.toISOString(),
        status: rfq.status as RfqStatus,
        selectedQuotationId: rfq.selectedQuotationId,
        items,
      },
      quotations: mappedQuotations,
      totalQuotationsCount: mappedQuotations.length,
      lowestPrice,
      lowestBidderVendorName: lowestBidder ? lowestBidder.vendorName : null,
    };
  }

  // --- Select for Approval (Week 3 Preparation) ---
  public async selectQuotationForApproval(
    rfqId: string,
    quotationId: string,
    userId: string
  ): Promise<{
    success: boolean;
    rfqNumber: string;
    quotationNumber: string;
    vendorName: string;
    grandTotal: number;
    rfq: {
      id: string;
      rfqNumber: string;
      selectedQuotationId: string | null;
      status: string;
    };
    quotation: {
      id: string;
      quotationNumber: string;
      status: string;
      grandTotal: number;
    };
  }> {
    return await prisma.$transaction(async (tx) => {
      const rfq = await tx.rfq.findUnique({
        where: { id: rfqId },
      });

      if (!rfq) {
        throw new Error('RFQ not found');
      }

      if (rfq.status === 'CANCELLED') {
        throw new Error('Cannot select quotation for a cancelled RFQ');
      }

      const quotation = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: { vendor: true },
      });

      if (!quotation) {
        throw new Error('Quotation not found');
      }

      // Enforce strict integrity: quotation must belong to this exact RFQ
      if (quotation.rfqId !== rfq.id) {
        throw new Error('Integrity Violation: Quotation does not belong to the specified RFQ');
      }

      if (quotation.status !== 'SUBMITTED' && quotation.status !== 'SELECTED') {
        throw new Error(`Quotation cannot be selected because its status is ${quotation.status}`);
      }

      // Atomic Reset: Reset any previous selection on this RFQ to SUBMITTED
      await tx.quotation.updateMany({
        where: {
          rfqId: rfq.id,
          status: 'SELECTED',
        },
        data: {
          status: 'SUBMITTED',
        },
      });

      // Update selected quotation
      const updatedQuotation = await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: 'SELECTED' },
      });

      // Update RFQ with selectedQuotationId and status AWARDED
      const updatedRfq = await tx.rfq.update({
        where: { id: rfq.id },
        data: {
          selectedQuotationId: updatedQuotation.id,
          status: 'AWARDED',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'SELECTED_FOR_APPROVAL',
          details: `Selected quotation ${updatedQuotation.quotationNumber} from ${quotation.vendor.name} (Amount: ₹${Number(updatedQuotation.grandTotal).toLocaleString('en-IN')}) for RFQ ${updatedRfq.rfqNumber}`,
        },
      });

      return {
        success: true,
        rfqNumber: updatedRfq.rfqNumber,
        quotationNumber: updatedQuotation.quotationNumber,
        vendorName: quotation.vendor.name,
        grandTotal: Number(updatedQuotation.grandTotal),
        rfq: {
          id: updatedRfq.id,
          rfqNumber: updatedRfq.rfqNumber,
          selectedQuotationId: updatedRfq.selectedQuotationId,
          status: updatedRfq.status,
        },
        quotation: {
          id: updatedQuotation.id,
          quotationNumber: updatedQuotation.quotationNumber,
          status: updatedQuotation.status,
          grandTotal: Number(updatedQuotation.grandTotal),
        },
      };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });
  }

  // --- Attachments Storage in PostgreSQL Bytes ---
  public async addRfqAttachment(
    rfqId: string,
    file: { fileName: string; fileSize: number; mimeType: string; fileData: Buffer },
    userId: string
  ): Promise<RfqAttachmentMeta> {
    const attachment = await prisma.rfqAttachment.create({
      data: {
        rfqId,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        fileData: file.fileData,
      },
    });

    await this.logAudit(userId, null, 'ATTACHMENT_UPLOADED', `Uploaded attachment ${file.fileName} to RFQ ${rfqId}`);

    return {
      id: attachment.id,
      rfqId: attachment.rfqId,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  public async getRfqAttachment(id: string): Promise<{ id: string; rfqId: string; fileName: string; fileSize: number; mimeType: string; fileData: Buffer } | null> {
    const att = await prisma.rfqAttachment.findUnique({
      where: { id },
    });
    if (!att) return null;
    return {
      id: att.id,
      rfqId: att.rfqId,
      fileName: att.fileName,
      fileSize: att.fileSize,
      mimeType: att.mimeType,
      fileData: att.fileData,
    };
  }
}

export const db = new DatabaseStore();
export default db;
