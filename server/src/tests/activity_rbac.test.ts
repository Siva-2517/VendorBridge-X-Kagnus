import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';
import { isSafeTestDatabaseConfigured } from './testDbGuard';
import { Role } from '../types';

const isSafeDb = isSafeTestDatabaseConfigured();

describe.skipIf(!isSafeDb)('Week 4 Phase 3: Activity Timeline & Audit RBAC Suite', () => {
  let adminCookie: string;
  let officerCookie: string;
  let managerCookie: string;
  let vendorCookie: string;

  let adminUser: any;
  let officerUser: any;
  let managerUser: any;
  let vendorUser: any;
  let vendorRecord: any;

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(adminLogin.status).toBe(200);
    adminCookie = adminLogin.headers['set-cookie'][0];
    adminUser = await prisma.user.findUnique({ where: { email: 'admin@vendorbridge.com' } });

    // 2. Procurement Officer login
    const officerLogin = await request(app).post('/api/auth/login').send({
      email: 'officer@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(officerLogin.status).toBe(200);
    officerCookie = officerLogin.headers['set-cookie'][0];
    officerUser = await prisma.user.findUnique({ where: { email: 'officer@vendorbridge.com' } });

    // 3. Manager Approver login
    const managerLogin = await request(app).post('/api/auth/login').send({
      email: 'manager@vendorbridge.com',
      password: 'VendorBridge@2025',
    });
    expect(managerLogin.status).toBe(200);
    managerCookie = managerLogin.headers['set-cookie'][0];
    managerUser = await prisma.user.findUnique({ where: { email: 'manager@vendorbridge.com' } });

    // 4. Vendor login
    const vendorLogin = await request(app).post('/api/auth/login').send({
      email: 'vendor@infrasupplies.com',
      password: 'VendorBridge@2025',
    });
    expect(vendorLogin.status).toBe(200);
    vendorCookie = vendorLogin.headers['set-cookie'][0];
    vendorUser = await prisma.user.findUnique({ where: { email: 'vendor@infrasupplies.com' } });
    vendorRecord = await prisma.vendor.findFirst({ where: { userId: vendorUser.id } });
  });

  // =========================================================================
  // 1. Authentication & Immutability Endpoint Tests
  // =========================================================================
  describe('1. Authentication & Immutability Verification', () => {
    it('strictly rejects unauthenticated access to GET /api/activity (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/activity');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('strictly rejects POST requests to /api/activity (404 Not Found / Immutability)', async () => {
      const res = await request(app)
        .post('/api/activity')
        .set('Cookie', [adminCookie])
        .send({ action: 'MALICIOUS_LOG', details: 'Should fail' });
      expect(res.status).toBe(404);
    });

    it('strictly rejects PATCH requests to /api/activity/:id (404 Not Found / Immutability)', async () => {
      const res = await request(app)
        .patch('/api/activity/any-id')
        .set('Cookie', [adminCookie])
        .send({ details: 'Tampered' });
      expect(res.status).toBe(404);
    });

    it('strictly rejects DELETE requests to /api/activity/:id (404 Not Found / Immutability)', async () => {
      const res = await request(app)
        .delete('/api/activity/any-id')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // 2. Role-Based Visibility & RBAC Matrix Verification
  // =========================================================================
  describe('2. Role-Based Visibility (RBAC)', () => {
    it('allows Admin to view all activities across all categories and actors', async () => {
      const res = await request(app)
        .get('/api/activity')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);

      // Verify presence of pagination fields
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('restricts Procurement Officer from viewing other users\' internal AUTH / security logs', async () => {
      // 1. Admin generates an AUTH log
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorName: `${adminUser.firstName} ${adminUser.lastName}`,
          actorRole: Role.ADMIN,
          action: 'USER_LOGIN',
          category: 'AUTH',
          entityType: 'USER',
          entityId: adminUser.id,
          details: 'Admin logged into secure console',
        },
      });

      // 2. Procurement Officer queries activity
      const res = await request(app)
        .get('/api/activity?category=AUTH')
        .set('Cookie', [officerCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Every returned AUTH record must strictly belong to the Officer
      for (const act of res.body.activities) {
        expect(act.userId).toBe(officerUser.id);
      }
    });

    it('restricts Manager Approver from viewing vendor management logs', async () => {
      // 1. Create a VENDOR category log
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorName: `${adminUser.firstName} ${adminUser.lastName}`,
          actorRole: Role.ADMIN,
          action: 'VENDOR_UPDATED',
          category: 'VENDOR',
          entityType: 'VENDOR',
          entityId: vendorRecord.id,
          details: 'Admin updated vendor compliance rating',
        },
      });

      // 2. Manager Approver queries category=VENDOR
      const res = await request(app)
        .get('/api/activity?category=VENDOR')
        .set('Cookie', [managerCookie]);

      expect(res.status).toBe(200);
      // Manager is not permitted VENDOR category, so should receive 0 activities
      expect(res.body.activities.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('strictly isolates Vendor to their own organization\'s records (no competitor or internal deliberations)', async () => {
      // 1. Create an internal RFQ and selection for competitor
      const otherVendorLog = await prisma.auditLog.create({
        data: {
          userId: officerUser.id,
          actorName: `${officerUser.firstName} ${officerUser.lastName}`,
          actorRole: Role.PROCUREMENT_OFFICER,
          action: 'SELECTED_FOR_APPROVAL',
          category: 'APPROVAL',
          entityType: 'APPROVAL',
          entityId: 'secret-approval-id-999',
          entityIdentifier: 'QT-SECRET-COMPETITOR',
          details: 'Selected competitor quotation for secret project',
        },
      });

      // 2. Vendor queries activity
      const res = await request(app)
        .get('/api/activity')
        .set('Cookie', [vendorCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that secret competitor log is NEVER visible to vendor
      const foundCompetitor = res.body.activities.some((a: any) => a.id === otherVendorLog.id);
      expect(foundCompetitor).toBe(false);

      // Verify all returned logs relate to this vendor
      for (const act of res.body.activities) {
        const isOwnUser = act.userId === vendorUser.id;
        const isOwnVendorEntity = act.entityType === 'VENDOR' && act.entityId === vendorRecord.id;
        const isRelated = isOwnUser || isOwnVendorEntity || act.entityType === 'PURCHASE_ORDER' || act.entityType === 'INVOICE' || act.entityType === 'RFQ' || act.entityType === 'QUOTATION';
        expect(isRelated).toBe(true);
      }
    });
  });

  // =========================================================================
  // 3. Filtering, Search & Pagination Capabilities
  // =========================================================================
  describe('3. Filtering, Search & Pagination Capabilities', () => {
    it('accurately filters by category (category=RFQ)', async () => {
      const res = await request(app)
        .get('/api/activity?category=RFQ')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const act of res.body.activities) {
        expect(act.category).toBe('RFQ');
      }
    });

    it('accurately filters by specific action (action=INVOICE_PAID)', async () => {
      const res = await request(app)
        .get('/api/activity?action=INVOICE_PAID')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const act of res.body.activities) {
        expect(act.action).toBe('INVOICE_PAID');
      }
    });

    it('accurately filters by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .get(`/api/activity?startDate=${today}&endDate=${today}`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      for (const act of res.body.activities) {
        expect(act.createdAt.startsWith(today)).toBe(true);
      }
    });

    it('searches across actorName, action, details, and entityIdentifier', async () => {
      // Create a recognizable search target
      const searchTarget = `SRCH_${Date.now()}`;
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorName: 'Searchable Inspector',
          actorRole: Role.ADMIN,
          action: 'INSPECTION_COMPLETED',
          category: 'SYSTEM',
          entityType: 'SYSTEM',
          entityIdentifier: searchTarget,
          details: `Custom inspection log token ${searchTarget}`,
        },
      });

      const res = await request(app)
        .get(`/api/activity?search=${searchTarget}`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.activities.length).toBeGreaterThanOrEqual(1);
      expect(res.body.activities[0].entityIdentifier).toBe(searchTarget);
    });

    it('enforces newest-first chronological ordering and proper pagination bounds', async () => {
      const res = await request(app)
        .get('/api/activity?page=1&limit=5')
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      expect(res.body.activities.length).toBeLessThanOrEqual(5);

      // Verify descending order
      for (let i = 0; i < res.body.activities.length - 1; i++) {
        const cur = new Date(res.body.activities[i].createdAt).getTime();
        const next = new Date(res.body.activities[i + 1].createdAt).getTime();
        expect(cur).toBeGreaterThanOrEqual(next);
      }
    });
  });

  // =========================================================================
  // 4. Data Integrity & Fallbacks
  // =========================================================================
  describe('4. Data Integrity & Graceful Fallbacks', () => {
    it('gracefully handles historical records with missing cached actor details', async () => {
      // Historical log with null actorName and null userId
      const legacyLog = await prisma.auditLog.create({
        data: {
          userId: null,
          actorName: null,
          action: 'LEGACY_SYSTEM_BOOT',
          details: 'System cold boot without logged user',
          category: 'SYSTEM',
          entityType: 'SYSTEM',
        },
      });

      const res = await request(app)
        .get(`/api/activity?search=LEGACY_SYSTEM_BOOT`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      const target = res.body.activities.find((a: any) => a.id === legacyLog.id);
      expect(target).toBeDefined();
      expect(target.actorName).toBe('System');
      expect(target.actorRole).toBeNull();
    });

    it('sanitizes metadata payload to prevent leaking sensitive credentials', async () => {
      const logWithSecret = await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          actorName: 'Security Lead',
          action: 'SECRET_ROTATED',
          category: 'AUTH',
          metadata: {
            safeKey: 'SafePublicValue',
            password: 'SuperSecretPassword123!',
            token: 'jwt_raw_secret_token',
          },
        },
      });

      const res = await request(app)
        .get(`/api/activity?search=SECRET_ROTATED`)
        .set('Cookie', [adminCookie]);

      expect(res.status).toBe(200);
      const target = res.body.activities.find((a: any) => a.id === logWithSecret.id);
      expect(target).toBeDefined();
      expect(target.metadata).toBeDefined();
      expect(target.metadata.safeKey).toBe('SafePublicValue');
      expect(target.metadata.password).toBeUndefined();
      expect(target.metadata.token).toBeUndefined();
    });
  });
});
