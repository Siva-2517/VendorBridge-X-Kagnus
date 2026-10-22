import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../db/prisma';

describe('VendorBridge Backend API & Security Suite', () => {
  let adminCookie: string;
  let officerCookie: string;
  let createdVendorId: string;

  beforeAll(async () => {
    // Ensure cloud database connection pool is warm before tests run
    await prisma.$connect();
  });

  // 1. Authentication Tests
  describe('Authentication Endpoints', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@vendorbridge.com',
        password: 'WrongPassword123',
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should successfully log in as Admin and receive secure cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@vendorbridge.com',
        password: 'VendorBridge@2025',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.passwordHash).toBeUndefined(); // Verify password hash is never leaked!

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      if (Array.isArray(cookies)) {
        adminCookie = cookies[0];
      } else {
        adminCookie = cookies as unknown as string;
      }
    });

    it('should successfully log in as Procurement Officer', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'officer@vendorbridge.com',
        password: 'VendorBridge@2025',
      });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('PROCUREMENT_OFFICER');

      const cookies = res.headers['set-cookie'];
      if (Array.isArray(cookies)) {
        officerCookie = cookies[0];
      } else {
        officerCookie = cookies as unknown as string;
      }
    });

    it('should reject privilege escalation when registering as ADMIN without invite code', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Malicious',
        lastName: 'Actor',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'ADMIN',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Privilege escalation rejected');
    });

    it('should reject privilege escalation when registering with invalid invite code', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Imposter',
        lastName: 'Admin',
        email: 'imposter@example.com',
        password: 'Password123!',
        role: 'ADMIN',
        inviteCode: 'WRONG_INVALID_SECRET_CODE',
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Privilege escalation rejected');
    });

    it('should allow valid user registration with default VENDOR role', async () => {
      const uniqueEmail = `testvendor_${Date.now()}@example.com`;
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Test',
        lastName: 'Supplier',
        email: uniqueEmail,
        password: 'Password123!',
        phoneNumber: '+91 9988776655',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('VENDOR');
      expect(res.body.user.email).toBe(uniqueEmail);
    });

    it('should reject duplicate email registration', async () => {
      const res = await request(app).post('/api/auth/register').send({
        firstName: 'Duplicate',
        lastName: 'Admin',
        email: 'admin@vendorbridge.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(409);
    });

    it('should verify current authenticated session with /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin@vendorbridge.com');
    });

    it('should handle password reset request and completion for a user', async () => {
      const resetEmail = `reset_${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        firstName: 'Reset',
        lastName: 'User',
        email: resetEmail,
        password: 'OriginalPassword123!',
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: resetEmail });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.demoResetToken).toBeDefined();

      // Test reset password with the token
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: res.body.demoResetToken,
          newPassword: 'NewSecurePassword2025!',
        });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify user can now log in with the new password
      const loginRes = await request(app).post('/api/auth/login').send({
        email: resetEmail,
        password: 'NewSecurePassword2025!',
      });
      expect(loginRes.status).toBe(200);

      // Verify token cannot be reused
      const reuseRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: res.body.demoResetToken,
          newPassword: 'AnotherPassword2025!',
        });
      expect(reuseRes.status).toBe(400);
      expect(reuseRes.body.error).toBe('Invalid token');
    });

    it('should reject change-password when current password is wrong', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Cookie', [officerCookie])
        .send({
          currentPassword: 'WrongCurrentPassword123',
          newPassword: 'BrandNewSecurePassword123!',
          confirmPassword: 'BrandNewSecurePassword123!',
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Incorrect password');
    });

    it('should successfully update authenticated user profile fields safely', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Cookie', [officerCookie])
        .send({
          firstName: 'Rahul',
          lastName: 'Mehta (Updated)',
          phoneNumber: '+91 99999 88888',
          country: 'India',
          role: 'ADMIN', // Malicious attempt to escalate role
          email: 'hacked@example.com', // Malicious attempt to hijack email
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.lastName).toBe('Mehta (Updated)');
      expect(res.body.user.phoneNumber).toBe('+91 99999 88888');
      // Verify privilege escalation was prevented!
      expect(res.body.user.role).toBe('PROCUREMENT_OFFICER');
      expect(res.body.user.email).toBe('officer@vendorbridge.com');
    });
  });

  // 2. Vendor Management & RBAC Tests
  describe('Vendor CRUD and Role Authorization', () => {
    it('should reject unauthenticated access to /api/vendors', async () => {
      const res = await request(app).get('/api/vendors');
      expect(res.status).toBe(401);
    });

    it('should retrieve vendor list with status counts for Procurement Officer', async () => {
      const res = await request(app)
        .get('/api/vendors')
        .set('Cookie', [officerCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.vendors)).toBe(true);
      expect(res.body.counts).toBeDefined();
      expect(res.body.counts.all).toBeGreaterThan(0);
    });

    it('should reject vendor creation with invalid GSTIN format', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Cookie', [officerCookie])
        .send({
          name: 'Invalid GST Vendor',
          category: 'IT',
          gstin: 'INVALID123', // Not 15-char Indian GSTIN
          contactPerson: 'John Doe',
          email: 'invalid@gstin.com',
          phone: '9876543210',
          address: '123 Fake Street',
        });
      expect(res.status).toBe(400);
      expect(res.body.details.gstin).toBeDefined();
    });

    it('should allow Procurement Officer to create a vendor with valid GSTIN', async () => {
      const uniqueGstin = '27AABC9999Z1Z50';
      const res = await request(app)
        .post('/api/vendors')
        .set('Cookie', [officerCookie])
        .send({
          name: 'Apex Horizon Technologies',
          category: 'IT',
          gstin: uniqueGstin,
          contactPerson: 'Sunita Rao',
          email: 'contact@apexhorizon.com',
          phone: '+91 98765 99999',
          address: 'Plot 45, Tech Zone IV',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411057',
          country: 'India',
          status: 'ACTIVE',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.vendor.name).toBe('Apex Horizon Technologies');
      createdVendorId = res.body.vendor.id;
    });

    it('should reject duplicate GSTIN creation', async () => {
      const res = await request(app)
        .post('/api/vendors')
        .set('Cookie', [officerCookie])
        .send({
          name: 'Duplicate GST Co',
          category: 'Constructions',
          gstin: '27AABC1576214B0', // Existing GSTIN
          contactPerson: 'Jane Doe',
          email: 'jane@duplicate.com',
          phone: '9876543211',
          address: '456 Another Street',
        });
      expect(res.status).toBe(409);
    });

    it('should allow Procurement Officer to update vendor details', async () => {
      const res = await request(app)
        .patch(`/api/vendors/${createdVendorId}`)
        .set('Cookie', [officerCookie])
        .send({
          notes: 'Updated verification notes: ISO certified',
        });
      expect(res.status).toBe(200);
      expect(res.body.vendor.notes).toBe('Updated verification notes: ISO certified');
    });

    it('should FORBID Procurement Officer from deleting vendor (Admin only)', async () => {
      const res = await request(app)
        .delete(`/api/vendors/${createdVendorId}`)
        .set('Cookie', [officerCookie]);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });

    it('should ALLOW Admin to delete vendor', async () => {
      const res = await request(app)
        .delete(`/api/vendors/${createdVendorId}`)
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should REJECT deleting a vendor who has associated purchase order history to preserve audit integrity', async () => {
      // vnd-01 (Infra Supplies Pvt Ltd) has associated Po1 in database
      const res = await request(app)
        .delete('/api/vendors/vnd-01')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Integrity constraint violation');
      expect(res.body.message).toContain('associated purchase order(s) exist');
    });

    it('should enforce vendor record ownership: vendor user can only access their own profile', async () => {
      // Log in as vendor user
      const vendorLoginRes = await request(app).post('/api/auth/login').send({
        email: 'vendor@infrasupplies.com',
        password: 'VendorBridge@2025',
      });
      expect(vendorLoginRes.status).toBe(200);
      const vendorCookie = vendorLoginRes.headers['set-cookie'][0];

      // Access own vendor (vnd-01) -> allowed
      const ownRes = await request(app)
        .get('/api/vendors/vnd-01')
        .set('Cookie', [vendorCookie]);
      expect(ownRes.status).toBe(200);
      expect(ownRes.body.vendor.id).toBe('vnd-01');

      // Access other vendor (vnd-02) -> 403 Forbidden
      const otherRes = await request(app)
        .get('/api/vendors/vnd-02')
        .set('Cookie', [vendorCookie]);
      expect(otherRes.status).toBe(403);
      expect(otherRes.body.error).toBe('Forbidden');

      // Attempt to modify other vendor -> 403 Forbidden
      const patchOtherRes = await request(app)
        .patch('/api/vendors/vnd-02')
        .set('Cookie', [vendorCookie])
        .send({ notes: 'Hacked notes' });
      expect(patchOtherRes.status).toBe(403);
    });

    it('should prevent vendor user from modifying protected fields (GSTIN & status)', async () => {
      const vendorLoginRes = await request(app).post('/api/auth/login').send({
        email: 'vendor@infrasupplies.com',
        password: 'VendorBridge@2025',
      });
      expect(vendorLoginRes.status).toBe(200);
      const vendorCookie = vendorLoginRes.headers['set-cookie'][0];

      // Attempt to change GSTIN on own profile -> 403 Forbidden
      const gstinRes = await request(app)
        .patch('/api/vendors/vnd-01')
        .set('Cookie', [vendorCookie])
        .send({ gstin: '27AABC9999Z1Z51' });
      expect(gstinRes.status).toBe(403);
      expect(gstinRes.body.error).toBe('Forbidden');

      // Attempt to change status on own profile -> 403 Forbidden
      const statusRes = await request(app)
        .patch('/api/vendors/vnd-01')
        .set('Cookie', [vendorCookie])
        .send({ status: 'ACTIVE' });
      expect(statusRes.status).toBe(403);
      expect(statusRes.body.error).toBe('Forbidden');
    });
  });

  // 3. Role-Based Dashboard & Data Isolation Tests
  describe('Dashboard Metrics & Role-Specific Behavior', () => {
    it('should return Admin-specific dashboard summary with user and vendor metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Cookie', [adminCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.user.role).toBe('ADMIN');
      expect(res.body.summary.metrics.totalUsers).toBeGreaterThanOrEqual(4);
      expect(res.body.summary.vendorCounts.all).toBeGreaterThanOrEqual(28);
      expect(res.body.summary.notice).toContain('System Administration Active');
      expect(Array.isArray(res.body.summary.recentPurchaseOrders)).toBe(true);
      expect(res.body.summary.recentPurchaseOrders.length).toBeGreaterThanOrEqual(3);
    });

    it('should return Procurement Officer dashboard summary with supplier pipeline metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Cookie', [officerCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.user.role).toBe('PROCUREMENT_OFFICER');
      expect(res.body.summary.metrics.activeSuppliers).toBeDefined();
      expect(res.body.summary.metrics.pendingVerifications).toBeDefined();
      expect(res.body.summary.notice).toContain('Procurement Operations');
      expect(res.body.summary.metrics.activeRfqs).toBe(12);
    });

    it('should return Manager / Approver dashboard summary with approval and spend metrics', async () => {
      const managerLogin = await request(app).post('/api/auth/login').send({
        email: 'manager@vendorbridge.com',
        password: 'VendorBridge@2025',
      });
      expect(managerLogin.status).toBe(200);
      const managerCookie = managerLogin.headers['set-cookie'][0];

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Cookie', [managerCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.user.role).toBe('MANAGER_APPROVER');
      expect(res.body.summary.metrics.pendingApprovals).toBeDefined();
      expect(res.body.summary.metrics.monthlyPoSpend).toBeDefined();
      expect(res.body.summary.notice).toContain('Approvals & Budget Control');
    });

    it('should isolate Vendor dashboard data: return own company profile and ONLY own purchase orders', async () => {
      const vendorLogin = await request(app).post('/api/auth/login').send({
        email: 'vendor@infrasupplies.com',
        password: 'VendorBridge@2025',
      });
      expect(vendorLogin.status).toBe(200);
      const vendorCookie = vendorLogin.headers['set-cookie'][0];

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Cookie', [vendorCookie]);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.summary.user.role).toBe('VENDOR');

      // Verify vendor company profile is linked
      expect(res.body.summary.vendorProfile).toBeDefined();
      expect(res.body.summary.vendorProfile.id).toBe('vnd-01');
      expect(res.body.summary.vendorProfile.name).toBe('Infra Supplies Pvt Ltd');
      expect(res.body.summary.vendorProfile.gstin).toBe('27AABC1576214B0');
      expect(res.body.summary.notice).toContain('Infra Supplies Pvt Ltd');

      // Verify Strict Data Isolation: ONLY orders for Infra Supplies Pvt Ltd
      const orders = res.body.summary.recentPurchaseOrders;
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBe(1);
      expect(orders[0].poNumber).toBe('Po1');
      expect(orders[0].vendor).toBe('Infra Supplies Pvt Ltd');

      // Confirm competitor orders (Po2 for Tech Core, Po3 for Officelead) are NEVER leaked to vendor
      const hasCompetitorPO = orders.some(
        (po: any) => po.poNumber === 'Po2' || po.poNumber === 'Po3' || po.vendor !== 'Infra Supplies Pvt Ltd'
      );
      expect(hasCompetitorPO).toBe(false);
    });

    it('should isolate Vendor directory access: Vendor GET /api/vendors returns only own profile', async () => {
      const vendorLogin = await request(app).post('/api/auth/login').send({
        email: 'vendor@infrasupplies.com',
        password: 'VendorBridge@2025',
      });
      const vendorCookie = vendorLogin.headers['set-cookie'][0];

      const res = await request(app)
        .get('/api/vendors')
        .set('Cookie', [vendorCookie]);
      expect(res.status).toBe(200);
      expect(res.body.vendors.length).toBe(1);
      expect(res.body.vendors[0].name).toBe('Infra Supplies Pvt Ltd');
      expect(res.body.vendors[0].gstin).toBe('27AABC1576214B0');
    });

    it('should forbid non-officers/non-admins (Vendor & Manager) from creating vendors', async () => {
      const vendorLogin = await request(app).post('/api/auth/login').send({
        email: 'vendor@infrasupplies.com',
        password: 'VendorBridge@2025',
      });
      const vendorCookie = vendorLogin.headers['set-cookie'][0];

      const managerLogin = await request(app).post('/api/auth/login').send({
        email: 'manager@vendorbridge.com',
        password: 'VendorBridge@2025',
      });
      const managerCookie = managerLogin.headers['set-cookie'][0];

      // Vendor cannot create vendor
      const vendorRes = await request(app)
        .post('/api/vendors')
        .set('Cookie', [vendorCookie])
        .send({
          name: 'Unauthorized Supplier',
          category: 'IT',
          gstin: '27AABC1111Z1Z55',
          contactPerson: 'Hack',
          email: 'hack@vendor.com',
          phone: '9876543210',
          address: 'Street 1',
        });
      expect(vendorRes.status).toBe(403);

      // Manager/Approver cannot create vendor
      const managerRes = await request(app)
        .post('/api/vendors')
        .set('Cookie', [managerCookie])
        .send({
          name: 'Unauthorized Supplier',
          category: 'IT',
          gstin: '27AABC1111Z1Z55',
          contactPerson: 'Hack',
          email: 'hack@manager.com',
          phone: '9876543210',
          address: 'Street 1',
        });
      expect(managerRes.status).toBe(403);
    });
  });
});
