import { PrismaClient, Role, VendorStatus, POStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- VendorBridge Cloud Database Idempotent Seed & Migration ---');
  
  const storePath = path.resolve(__dirname, '../data/store.json');
  if (!fs.existsSync(storePath)) {
    console.error('store.json not found at', storePath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(storePath, 'utf-8');
  const store = JSON.parse(rawData);

  // 1. Seed Core Baseline Users
  console.log(`Processing ${store.users.length} users...`);
  for (const user of store.users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber || null,
        country: user.country || 'India',
        additionalInfo: user.additionalInfo || null,
        isActive: user.isActive !== undefined ? user.isActive : true,
      },
      create: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        passwordHash: user.passwordHash,
        phoneNumber: user.phoneNumber || null,
        role: user.role as Role,
        country: user.country || 'India',
        additionalInfo: user.additionalInfo || null,
        isActive: user.isActive !== undefined ? user.isActive : true,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
        updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date(),
      },
    });
  }
  const userCount = await prisma.user.count();
  console.log(`✔ Users synchronized: ${userCount} total in database.`);

  // 2. Seed Baseline Vendors (Screen 4: 28 Total)
  console.log(`Processing ${store.vendors.length} vendors...`);
  for (const v of store.vendors) {
    // Verify referenced creator exists
    let validCreatedById = v.createdById;
    if (validCreatedById) {
      const creatorExists = await prisma.user.findUnique({ where: { id: validCreatedById } });
      if (!creatorExists) validCreatedById = null;
    }

    // Verify referenced vendor user exists
    let validUserId = v.userId;
    if (validUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: validUserId } });
      if (!userExists) validUserId = null;
    }

    await prisma.vendor.upsert({
      where: { gstin: v.gstin },
      update: {
        name: v.name,
        category: v.category,
        contactPerson: v.contactPerson,
        email: v.email,
        phone: v.phone,
        address: v.address,
        city: v.city || null,
        state: v.state || null,
        pincode: v.pincode || null,
        country: v.country || 'India',
        status: v.status as VendorStatus,
        notes: v.notes || null,
        userId: validUserId,
        createdById: validCreatedById,
      },
      create: {
        id: v.id,
        name: v.name,
        category: v.category,
        gstin: v.gstin,
        contactPerson: v.contactPerson,
        email: v.email,
        phone: v.phone,
        address: v.address,
        city: v.city || null,
        state: v.state || null,
        pincode: v.pincode || null,
        country: v.country || 'India',
        status: v.status as VendorStatus,
        notes: v.notes || null,
        userId: validUserId,
        createdById: validCreatedById,
        createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
        updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date(),
      },
    });
  }
  const vendorCount = await prisma.vendor.count();
  console.log(`✔ Vendors synchronized: ${vendorCount} total in database.`);

  // 3. Seed Purchase Orders (Screen 3 Baseline)
  if (store.purchaseOrders && store.purchaseOrders.length > 0) {
    console.log(`Processing ${store.purchaseOrders.length} purchase orders...`);
    for (const po of store.purchaseOrders) {
      // Ensure vendor exists before seeding PO
      const vendorExists = await prisma.vendor.findUnique({ where: { id: po.vendorId } });
      if (vendorExists) {
        await prisma.purchaseOrder.upsert({
          where: { poNumber: po.poNumber },
          update: {
            amount: Number(po.amount),
            status: po.status as POStatus,
          },
          create: {
            id: po.id,
            poNumber: po.poNumber,
            vendorId: po.vendorId,
            amount: Number(po.amount),
            status: po.status as POStatus,
            orderDate: po.orderDate ? new Date(po.orderDate) : new Date(),
            createdAt: po.createdAt ? new Date(po.createdAt) : new Date(),
            updatedAt: po.updatedAt ? new Date(po.updatedAt) : new Date(),
          },
        });
      }
    }
    const poCount = await prisma.purchaseOrder.count();
    console.log(`✔ Purchase orders synchronized: ${poCount} total in database.`);
  }

  console.log('✔ Cloud database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
