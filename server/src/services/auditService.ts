import { Prisma, PrismaClient } from '@prisma/client';
import { Role } from '../types';

export interface AuditLogInput {
  userId?: string | null;
  actorName?: string | null;
  actorRole?: Role | null;
  action: string;
  category?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  entityIdentifier?: string | null;
  details?: string | null;
  metadata?: Record<string, any> | null;
}

export type DbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Derives a normalized category from action name or entity type if not explicitly provided
 */
export function inferCategory(action: string, entityType?: string | null): string {
  if (action.startsWith('RFQ_') || action === 'ATTACHMENT_UPLOADED') return 'RFQ';
  if (action.startsWith('APPROVAL_') || action === 'SELECTED_FOR_APPROVAL') return 'APPROVAL';
  if (action.startsWith('PO_')) return 'PO';
  if (action.startsWith('INVOICE_')) return 'INVOICE';
  if (action.startsWith('VENDOR_')) return 'VENDOR';
  if (action.startsWith('USER_') || action.startsWith('PASSWORD_') || action.startsWith('PROFILE_') || action.startsWith('AUTH_')) return 'AUTH';

  if (entityType) {
    if (entityType === 'RFQ') return 'RFQ';
    if (entityType === 'APPROVAL') return 'APPROVAL';
    if (entityType === 'PURCHASE_ORDER' || entityType === 'PO') return 'PO';
    if (entityType === 'INVOICE') return 'INVOICE';
    if (entityType === 'VENDOR') return 'VENDOR';
    if (entityType === 'USER') return 'AUTH';
  }

  return 'SYSTEM';
}

/**
 * Derives a normalized entityType from action name or category if not explicitly provided
 */
export function inferEntityType(action: string, category?: string | null): string {
  if (action.startsWith('RFQ_') || action === 'ATTACHMENT_UPLOADED') return 'RFQ';
  if (action.startsWith('APPROVAL_') || action === 'SELECTED_FOR_APPROVAL') return 'APPROVAL';
  if (action.startsWith('PO_')) return 'PURCHASE_ORDER';
  if (action.startsWith('INVOICE_')) return 'INVOICE';
  if (action.startsWith('VENDOR_')) return 'VENDOR';
  if (action.startsWith('USER_') || action.startsWith('PASSWORD_') || action.startsWith('PROFILE_') || action.startsWith('AUTH_')) return 'USER';

  if (category) {
    if (category === 'RFQ') return 'RFQ';
    if (category === 'APPROVAL') return 'APPROVAL';
    if (category === 'PO') return 'PURCHASE_ORDER';
    if (category === 'INVOICE') return 'INVOICE';
    if (category === 'VENDOR') return 'VENDOR';
    if (category === 'AUTH') return 'USER';
  }

  return 'SYSTEM';
}

/**
 * Transactional, typed audit recording service.
 * Writes immutable audit records inside the provided transaction client or standard prisma client.
 */
export async function recordAudit(
  client: DbClient,
  input: AuditLogInput
) {
  let finalUserId: string | null = input.userId ?? null;
  let finalActorName: string | null = input.actorName ?? null;
  let finalActorRole: Role | null = input.actorRole ?? null;

  // Resolve actor identity if userId is present and actor info is missing
  if (finalUserId) {
    const user = await client.user.findUnique({
      where: { id: finalUserId },
      select: { firstName: true, lastName: true, role: true },
    });

    if (user) {
      if (!finalActorName) {
        finalActorName = `${user.firstName} ${user.lastName}`.trim();
      }
      if (!finalActorRole) {
        finalActorRole = user.role as Role;
      }
    } else {
      // User ID not found in database; decouple to prevent FK constraint failure
      finalUserId = null;
      if (!finalActorName) finalActorName = 'System';
    }
  } else {
    if (!finalActorName) {
      finalActorName = 'System';
    }
  }

  const category = input.category || inferCategory(input.action, input.entityType);
  const entityType = input.entityType || inferEntityType(input.action, category);

  return await client.auditLog.create({
    data: {
      userId: finalUserId,
      actorName: finalActorName,
      actorRole: finalActorRole as any,
      action: input.action,
      category,
      entityType,
      entityId: input.entityId ?? null,
      entityIdentifier: input.entityIdentifier ?? null,
      details: input.details ?? null,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}
