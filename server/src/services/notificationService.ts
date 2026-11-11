import { Prisma, PrismaClient } from '@prisma/client';
import { NotificationType, Role } from '../types';
import { prisma as defaultPrisma } from '../db/prisma';

export type DbClient = Prisma.TransactionClient | PrismaClient;

export interface CreateNotificationInput {
  userId: string;
  title: string;
  description: string;
  type?: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  entityIdentifier?: string | null;
  linkUrl?: string | null;
  dedupeKey?: string | null;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

/**
 * Resolves active approver users (MANAGER_APPROVER and ADMIN)
 */
export async function getApproverUsers(client: DbClient = defaultPrisma) {
  return await client.user.findMany({
    where: {
      role: { in: [Role.MANAGER_APPROVER, Role.ADMIN] },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });
}

/**
 * Resolves active user account for a specific vendor
 */
export async function getVendorUser(client: DbClient, vendorId: string) {
  const vendor = await client.vendor.findUnique({
    where: { id: vendorId },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!vendor?.user || !vendor.user.isActive) {
    return null;
  }

  return vendor.user;
}

/**
 * Resolves active vendor user accounts invited to a specific RFQ
 */
export async function getInvitedVendorUsersForRfq(client: DbClient, rfqId: string) {
  const invitations = await client.rfqVendorInvitation.findMany({
    where: { rfqId },
    select: {
      vendor: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const users: Array<{ id: string; email: string }> = [];
  for (const inv of invitations) {
    if (inv.vendor?.user && inv.vendor.user.isActive) {
      users.push(inv.vendor.user);
    }
  }

  return users;
}

/**
 * Creates a single notification participating in the given transaction/client.
 * Uses upsert on dedupeKey to safely ignore duplicate operations without failing the transaction.
 */
export async function createNotification(
  client: DbClient,
  input: CreateNotificationInput
) {
  if (!input.userId) {
    return null;
  }

  const notificationType = (input.type as any) || 'SYSTEM_NOTICE';

  if (input.dedupeKey) {
    return await client.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {}, // No-op on duplicate/retry
      create: {
        userId: input.userId,
        title: input.title,
        description: input.description,
        type: notificationType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        entityIdentifier: input.entityIdentifier ?? null,
        linkUrl: input.linkUrl ?? null,
        dedupeKey: input.dedupeKey,
      },
    });
  }

  return await client.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      type: notificationType,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      entityIdentifier: input.entityIdentifier ?? null,
      linkUrl: input.linkUrl ?? null,
    },
  });
}

/**
 * Creates multiple notifications participating in the same transaction
 */
export async function createNotificationsBatch(
  client: DbClient,
  inputs: CreateNotificationInput[]
) {
  const results = [];
  for (const input of inputs) {
    const res = await createNotification(client, input);
    if (res) results.push(res);
  }
  return results;
}

/**
 * Retrieves paginated notifications for the current authenticated user
 */
export async function getUserNotifications(
  userId: string,
  options: GetNotificationsOptions = {},
  client: DbClient = defaultPrisma
) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(options.unreadOnly ? { isRead: false } : {}),
    ...(options.type ? { type: options.type as any } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    client.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    client.notification.count({ where }),
    client.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      ...n,
      type: n.type as NotificationType,
      createdAt: n.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  };
}

/**
 * Returns the count of unread notifications for a user
 */
export async function getUnreadCount(
  userId: string,
  client: DbClient = defaultPrisma
): Promise<number> {
  return await client.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * Marks a single notification as read, enforcing user ownership
 */
export async function markAsRead(
  userId: string,
  notificationId: string,
  client: DbClient = defaultPrisma
) {
  const existing = await client.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    const error: any = new Error('Notification not found');
    error.status = 404;
    throw error;
  }

  const updated = await client.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return {
    ...updated,
    type: updated.type as NotificationType,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Marks all unread notifications of a user as read
 */
export async function markAllAsRead(
  userId: string,
  client: DbClient = defaultPrisma
): Promise<{ markedCount: number }> {
  const result = await client.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return { markedCount: result.count };
}
