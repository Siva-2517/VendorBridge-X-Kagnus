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

  // 4. Seed Week 2 RFQs and Quotations Baseline (Excalidraw Screens 5, 6, 7)
  console.log('Synchronizing Week 2 RFQs and Quotations...');

  // Initialize sequence counters (preserve existing counters if higher)
  const currentYear = new Date().getFullYear();
  await prisma.systemSequence.upsert({
    where: { name: `RFQ_${currentYear}` },
    update: {},
    create: { name: `RFQ_${currentYear}`, currentValue: 3 },
  });
  await prisma.systemSequence.upsert({
    where: { name: `QT_${currentYear}` },
    update: {},
    create: { name: `QT_${currentYear}`, currentValue: 3 },
  });

  // Find creator (Rahul Mehta, Procurement Officer)
  const officer = await prisma.user.findFirst({ where: { role: Role.PROCUREMENT_OFFICER } });
  if (officer) {
    // RFQ 1: Office furniture procurement Q2 (Screen 5 & 7)
    const futureDeadline1 = new Date();
    futureDeadline1.setDate(futureDeadline1.getDate() + 14);

    const rfq1 = await prisma.rfq.upsert({
      where: { rfqNumber: 'RFQ-2026-0001' },
      update: {
        title: 'Office furniture procurement Q2',
        description: 'Ergonomic chairs and standing desks for 3rd floor workspace expansion',
        category: 'Furniture',
        deliveryLocation: 'Central Warehouse, Mumbai',
        deadline: futureDeadline1,
        status: 'OPEN',
      },
      create: {
        id: 'rfq-seed-01',
        rfqNumber: 'RFQ-2026-0001',
        title: 'Office furniture procurement Q2',
        description: 'Ergonomic chairs and standing desks for 3rd floor workspace expansion',
        category: 'Furniture',
        deliveryLocation: 'Central Warehouse, Mumbai',
        deadline: futureDeadline1,
        status: 'OPEN',
        createdById: officer.id,
      },
    });

    // RFQ 1 Line Items
    const rfq1Item1 = await prisma.rfqItem.upsert({
      where: { id: 'rfqi-seed-01' },
      update: { itemDescription: 'Ergonomic chair', quantity: 25, uom: 'NOS', targetPrice: 4000 },
      create: {
        id: 'rfqi-seed-01',
        rfqId: rfq1.id,
        itemDescription: 'Ergonomic chair',
        quantity: 25,
        uom: 'NOS',
        targetPrice: 4000,
      },
    });

    const rfq1Item2 = await prisma.rfqItem.upsert({
      where: { id: 'rfqi-seed-02' },
      update: { itemDescription: 'Standing desks', quantity: 10, uom: 'NOS', targetPrice: 9000 },
      create: {
        id: 'rfqi-seed-02',
        rfqId: rfq1.id,
        itemDescription: 'Standing desks',
        quantity: 10,
        uom: 'NOS',
        targetPrice: 9000,
      },
    });

    // RFQ 1 Invitations (vnd-01 Infra Supplies, vnd-02 Tech Core, vnd-03 FastLog)
    const invitedVendorIds = ['vnd-01', 'vnd-02', 'vnd-03'];
    for (const vId of invitedVendorIds) {
      const vExists = await prisma.vendor.findUnique({ where: { id: vId } });
      if (vExists) {
        await prisma.rfqVendorInvitation.upsert({
          where: { rfqId_vendorId: { rfqId: rfq1.id, vendorId: vId } },
          update: { status: 'QUOTED' },
          create: {
            rfqId: rfq1.id,
            vendorId: vId,
            status: 'QUOTED',
          },
        });
      }
    }

    // RFQ 1 Quotation 1: Infra Supplies Pvt Ltd (L1 - Lowest Total 185,400.00 as in Screen 7)
    const v1 = await prisma.vendor.findUnique({ where: { id: 'vnd-01' } });
    if (v1) {
      const q1 = await prisma.quotation.upsert({
        where: { quotationNumber: 'QT-2026-0001' },
        update: {
          subtotalAmount: 157118.64,
          taxRate: 18.00,
          taxAmount: 28281.36,
          grandTotal: 185400.00,
          deliveryDays: 10,
          paymentTerms: '30 days net',
          status: 'SUBMITTED',
        },
        create: {
          id: 'quote-seed-01',
          quotationNumber: 'QT-2026-0001',
          rfqId: rfq1.id,
          vendorId: v1.id,
          subtotalAmount: 157118.64,
          taxRate: 18.00,
          taxAmount: 28281.36,
          grandTotal: 185400.00,
          deliveryDays: 10,
          paymentTerms: '30 days net',
          validityDate: futureDeadline1,
          notes: 'Special project pricing including on-site assembly and 3-year warranty.',
          status: 'SUBMITTED',
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q1.id, rfqItemId: rfq1Item1.id } },
        update: { unitPrice: 3200.00, lineTotal: 80000.00 },
        create: {
          quotationId: q1.id,
          rfqItemId: rfq1Item1.id,
          unitPrice: 3200.00,
          lineTotal: 80000.00,
          remarks: 'BIFMA certified high-mesh ergonomic task chair',
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q1.id, rfqItemId: rfq1Item2.id } },
        update: { unitPrice: 7711.86, lineTotal: 77118.64 },
        create: {
          quotationId: q1.id,
          rfqItemId: rfq1Item2.id,
          unitPrice: 7711.86,
          lineTotal: 77118.64,
          remarks: 'Dual motor motorized height adjustable desk',
        },
      });
    }

    // RFQ 1 Quotation 2: Tech Core LTD (Screen 6 exact total: 200,010.00)
    const v2 = await prisma.vendor.findUnique({ where: { id: 'vnd-02' } });
    if (v2) {
      const q2 = await prisma.quotation.upsert({
        where: { quotationNumber: 'QT-2026-0002' },
        update: {
          subtotalAmount: 169500.00,
          taxRate: 18.00,
          taxAmount: 30510.00,
          grandTotal: 200010.00,
          deliveryDays: 14,
          paymentTerms: '30 days net',
          status: 'SUBMITTED',
        },
        create: {
          id: 'quote-seed-02',
          quotationNumber: 'QT-2026-0002',
          rfqId: rfq1.id,
          vendorId: v2.id,
          subtotalAmount: 169500.00,
          taxRate: 18.00,
          taxAmount: 30510.00,
          grandTotal: 200010.00,
          deliveryDays: 14,
          paymentTerms: '30 days net',
          validityDate: futureDeadline1,
          notes: 'Standard enterprise furniture package. Pre-tested frames.',
          status: 'SUBMITTED',
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q2.id, rfqItemId: rfq1Item1.id } },
        update: { unitPrice: 3500.00, lineTotal: 87500.00 },
        create: {
          quotationId: q2.id,
          rfqItemId: rfq1Item1.id,
          unitPrice: 3500.00,
          lineTotal: 87500.00,
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q2.id, rfqItemId: rfq1Item2.id } },
        update: { unitPrice: 8200.00, lineTotal: 82000.00 },
        create: {
          quotationId: q2.id,
          rfqItemId: rfq1Item2.id,
          unitPrice: 8200.00,
          lineTotal: 82000.00,
        },
      });
    }

    // RFQ 1 Quotation 3: FastLog Transport (Fastest delivery: 7 days, Grand Total: 219,800.00)
    const v3 = await prisma.vendor.findUnique({ where: { id: 'vnd-03' } });
    if (v3) {
      const q3 = await prisma.quotation.upsert({
        where: { quotationNumber: 'QT-2026-0003' },
        update: {
          subtotalAmount: 186271.19,
          taxRate: 18.00,
          taxAmount: 33528.81,
          grandTotal: 219800.00,
          deliveryDays: 7,
          paymentTerms: '15 days net',
          status: 'SUBMITTED',
        },
        create: {
          id: 'quote-seed-03',
          quotationNumber: 'QT-2026-0003',
          rfqId: rfq1.id,
          vendorId: v3.id,
          subtotalAmount: 186271.19,
          taxRate: 18.00,
          taxAmount: 33528.81,
          grandTotal: 219800.00,
          deliveryDays: 7,
          paymentTerms: '15 days net',
          validityDate: futureDeadline1,
          notes: 'Express priority logistics dispatch from regional warehouse.',
          status: 'SUBMITTED',
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q3.id, rfqItemId: rfq1Item1.id } },
        update: { unitPrice: 3900.00, lineTotal: 97500.00 },
        create: {
          quotationId: q3.id,
          rfqItemId: rfq1Item1.id,
          unitPrice: 3900.00,
          lineTotal: 97500.00,
        },
      });

      await prisma.quotationItem.upsert({
        where: { quotationId_rfqItemId: { quotationId: q3.id, rfqItemId: rfq1Item2.id } },
        update: { unitPrice: 8877.12, lineTotal: 88771.19 },
        create: {
          quotationId: q3.id,
          rfqItemId: rfq1Item2.id,
          unitPrice: 8877.12,
          lineTotal: 88771.19,
        },
      });
    }

    // RFQ 2: Open with 0 quotes (Ready for live demo vendor quote submission)
    const futureDeadline2 = new Date();
    futureDeadline2.setDate(futureDeadline2.getDate() + 21);

    const rfq2 = await prisma.rfq.upsert({
      where: { rfqNumber: 'RFQ-2026-0002' },
      update: {
        title: 'Data Center Rack Servers & Networking Switches',
        description: 'High-compute server nodes and 10GbE managed network switches for cluster upgrade',
        category: 'IT Hardware',
        deliveryLocation: 'Data Center Suite 4, Bangalore',
        deadline: futureDeadline2,
        status: 'OPEN',
      },
      create: {
        id: 'rfq-seed-02',
        rfqNumber: 'RFQ-2026-0002',
        title: 'Data Center Rack Servers & Networking Switches',
        description: 'High-compute server nodes and 10GbE managed network switches for cluster upgrade',
        category: 'IT Hardware',
        deliveryLocation: 'Data Center Suite 4, Bangalore',
        deadline: futureDeadline2,
        status: 'OPEN',
        createdById: officer.id,
      },
    });

    await prisma.rfqItem.upsert({
      where: { id: 'rfqi-seed-03' },
      update: { itemDescription: '1U Rackmount Server Xeon 32-core', quantity: 4, uom: 'Units', targetPrice: 250000 },
      create: {
        id: 'rfqi-seed-03',
        rfqId: rfq2.id,
        itemDescription: '1U Rackmount Server Xeon 32-core',
        quantity: 4,
        uom: 'Units',
        targetPrice: 250000,
      },
    });

    await prisma.rfqItem.upsert({
      where: { id: 'rfqi-seed-04' },
      update: { itemDescription: '48-Port 10GbE SFP+ Managed Switch', quantity: 2, uom: 'Units', targetPrice: 120000 },
      create: {
        id: 'rfqi-seed-04',
        rfqId: rfq2.id,
        itemDescription: '48-Port 10GbE SFP+ Managed Switch',
        quantity: 2,
        uom: 'Units',
        targetPrice: 120000,
      },
    });

    // Assign vnd-01 (Infra Supplies) and vnd-02 (Tech Core)
    for (const vId of ['vnd-01', 'vnd-02']) {
      const vExists = await prisma.vendor.findUnique({ where: { id: vId } });
      if (vExists) {
        await prisma.rfqVendorInvitation.upsert({
          where: { rfqId_vendorId: { rfqId: rfq2.id, vendorId: vId } },
          update: { status: 'INVITED' },
          create: {
            rfqId: rfq2.id,
            vendorId: vId,
            status: 'INVITED',
          },
        });
      }
    }

    // RFQ 3: Closed (Deadline Passed - used to test deadline rejection enforcement)
    const pastDeadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    const rfq3 = await prisma.rfq.upsert({
      where: { rfqNumber: 'RFQ-2026-0003' },
      update: {
        title: 'Inter-State Cold Chain Refrigerated Transport Q1',
        description: 'Dedicated reefer logistics contracts for western distribution hub',
        category: 'Logistics',
        deliveryLocation: 'Distribution Hub, Pune',
        deadline: pastDeadline,
        status: 'CLOSED',
      },
      create: {
        id: 'rfq-seed-03',
        rfqNumber: 'RFQ-2026-0003',
        title: 'Inter-State Cold Chain Refrigerated Transport Q1',
        description: 'Dedicated reefer logistics contracts for western distribution hub',
        category: 'Logistics',
        deliveryLocation: 'Distribution Hub, Pune',
        deadline: pastDeadline,
        status: 'CLOSED',
        createdById: officer.id,
      },
    });

    await prisma.rfqItem.upsert({
      where: { id: 'rfqi-seed-05' },
      update: { itemDescription: 'Temperature-Controlled Reefer Truck (32 Ft)', quantity: 12, uom: 'Trips', targetPrice: 45000 },
      create: {
        id: 'rfqi-seed-05',
        rfqId: rfq3.id,
        itemDescription: 'Temperature-Controlled Reefer Truck (32 Ft)',
        quantity: 12,
        uom: 'Trips',
        targetPrice: 45000,
      },
    });

    for (const vId of ['vnd-01', 'vnd-03']) {
      const vExists = await prisma.vendor.findUnique({ where: { id: vId } });
      if (vExists) {
        await prisma.rfqVendorInvitation.upsert({
          where: { rfqId_vendorId: { rfqId: rfq3.id, vendorId: vId } },
          update: {},
          create: {
            rfqId: rfq3.id,
            vendorId: vId,
            status: 'INVITED',
          },
        });
      }
    }
  }

  const rfqCount = await prisma.rfq.count();
  const quoteCount = await prisma.quotation.count();
  console.log(`✔ RFQs synchronized: ${rfqCount} total, Quotations: ${quoteCount} total.`);

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
