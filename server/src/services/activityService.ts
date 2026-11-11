import { Prisma, PrismaClient } from '@prisma/client';
import { Role } from '../types';
import { prisma as defaultPrisma } from '../db/prisma';
import { inferCategory, inferEntityType } from './auditService';

export type DbClient = Prisma.TransactionClient | PrismaClient;

export interface GetActivityOptions {
  page?: number;
  limit?: number;
  category?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
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

/**
 * Normalizes input category string to internal enum category representation
 */
export function normalizeCategory(cat?: string): string | null {
  if (!cat || cat.trim() === '' || cat.toUpperCase() === 'ALL') {
    return null;
  }
  const clean = cat.trim().toUpperCase();
  if (clean === 'RFQS' || clean === 'RFQ') return 'RFQ';
  if (clean === 'APPROVALS' || clean === 'APPROVAL') return 'APPROVAL';
  if (clean === 'PURCHASE_ORDERS' || clean === 'PURCHASE ORDERS' || clean === 'PURCHASE-ORDERS' || clean === 'PO' || clean === 'POS') return 'PO';
  if (clean === 'INVOICES' || clean === 'INVOICE') return 'INVOICE';
  if (clean === 'VENDORS' || clean === 'VENDOR') return 'VENDOR';
  if (clean === 'AUTHENTICATION' || clean === 'AUTH') return 'AUTH';
  if (clean === 'SYSTEM') return 'SYSTEM';
  return clean;
}

/**
 * Strips sensitive keys (passwords, tokens, secrets) from metadata
 */
export function sanitizeMetadata(metadata: any): Record<string, any> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  const sensitiveKeys = new Set([
    'password',
    'passwordhash',
    'token',
    'jwt',
    'secret',
    'cookie',
    'refreshtoken',
    'accesstoken',
    'authorization',
  ]);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

/**
 * Retrieves activity audit logs strictly adhering to the user's role-based visibility rules.
 */
export async function getActivityLogs(
  currentUser: { id: string; role: Role },
  options: GetActivityOptions = {},
  client: DbClient = defaultPrisma
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const andClauses: Prisma.AuditLogWhereInput[] = [];

  // =========================================================================
  // 1. Enforce Role-Based Visibility
  // =========================================================================
  if (currentUser.role === Role.ADMIN) {
    // ADMIN has full system-wide visibility across all categories and actors
  } else if (currentUser.role === Role.PROCUREMENT_OFFICER) {
    // PROCUREMENT_OFFICER sees procurement operations + their own auth logs
    andClauses.push({
      OR: [
        { category: { in: ['RFQ', 'PO', 'INVOICE', 'VENDOR', 'APPROVAL'] } },
        { userId: currentUser.id },
      ],
    });
  } else if (currentUser.role === Role.MANAGER_APPROVER) {
    // MANAGER_APPROVER sees approval, financial, and spend operations + their own auth logs
    andClauses.push({
      OR: [
        { category: { in: ['APPROVAL', 'PO', 'INVOICE', 'RFQ'] } },
        { userId: currentUser.id },
      ],
    });
  } else if (currentUser.role === Role.VENDOR) {
    // VENDOR is strictly isolated to their own vendor organization records
    const vendor = await client.vendor.findUnique({
      where: { userId: currentUser.id },
      select: { id: true },
    });

    if (!vendor) {
      // Unassigned vendor user only sees their own direct user events
      andClauses.push({ userId: currentUser.id });
    } else {
      // Find all IDs associated with this vendor
      const [pos, invoices, quotations, invitations] = await Promise.all([
        client.purchaseOrder.findMany({ where: { vendorId: vendor.id }, select: { id: true } }),
        client.invoice.findMany({ where: { vendorId: vendor.id }, select: { id: true } }),
        client.quotation.findMany({ where: { vendorId: vendor.id }, select: { id: true } }),
        client.rfqVendorInvitation.findMany({ where: { vendorId: vendor.id }, select: { rfqId: true } }),
      ]);

      const poIds = pos.map((p) => p.id);
      const invoiceIds = invoices.map((i) => i.id);
      const quotationIds = quotations.map((q) => q.id);
      const rfqIds = invitations.map((inv) => inv.rfqId);

      andClauses.push({
        OR: [
          { userId: currentUser.id },
          { entityType: 'VENDOR', entityId: vendor.id },
          { entityType: 'PURCHASE_ORDER', entityId: { in: poIds } },
          { entityType: 'INVOICE', entityId: { in: invoiceIds } },
          { entityType: 'QUOTATION', entityId: { in: quotationIds } },
          { entityType: 'RFQ', entityId: { in: rfqIds } },
        ],
      });
    }
  }

  // =========================================================================
  // 2. Query Filters: Category, Action, Entity, Date, Search
  // =========================================================================
  const categoryFilter = normalizeCategory(options.category);
  if (categoryFilter) {
    andClauses.push({ category: categoryFilter });
  }

  if (options.action?.trim()) {
    andClauses.push({ action: options.action.trim() });
  }

  if (options.entityType?.trim()) {
    andClauses.push({ entityType: options.entityType.trim() });
  }

  if (options.entityId?.trim()) {
    andClauses.push({ entityId: options.entityId.trim() });
  }

  // Date Range Filtering
  if (options.startDate || options.endDate) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        dateRange.gte = start;
      }
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        dateRange.lte = end;
      }
    }
    if (Object.keys(dateRange).length > 0) {
      andClauses.push({ createdAt: dateRange });
    }
  }

  // Case-Insensitive Search
  if (options.search?.trim()) {
    const q = options.search.trim();
    andClauses.push({
      OR: [
        { actorName: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { entityIdentifier: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  const where: Prisma.AuditLogWhereInput = andClauses.length > 0 ? { AND: andClauses } : {};

  // Execute Query & Count concurrently
  const [logs, total] = await Promise.all([
    client.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
          },
        },
      },
    }),
    client.auditLog.count({ where }),
  ]);

  // Format and sanitize output records
  const activities: ActivityLogItem[] = logs.map((log) => {
    let actorName = log.actorName;
    let actorRole = log.actorRole as Role | null;

    // Gracefully handle historical records with missing cached actor details
    if (!actorName && log.user) {
      actorName = `${log.user.firstName} ${log.user.lastName}`.trim();
      actorRole = log.user.role as Role;
    }
    if (!actorName) {
      actorName = 'System';
    }

    const category = log.category || inferCategory(log.action, log.entityType);
    const entityType = log.entityType || inferEntityType(log.action, category);

    return {
      id: log.id,
      userId: log.userId,
      actorName,
      actorRole,
      action: log.action,
      category,
      entityType,
      entityId: log.entityId,
      entityIdentifier: log.entityIdentifier,
      details: log.details,
      metadata: sanitizeMetadata(log.metadata),
      createdAt: log.createdAt.toISOString(),
    };
  });

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
