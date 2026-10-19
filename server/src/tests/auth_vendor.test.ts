import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('VendorBridge Backend API & Security Suite', () => {
  let adminCookie: string;
  let officerCookie: string;
  let createdVendorId: string;

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
  });

  // 3. Dashboard Summary Tests
  describe('Dashboard Metrics Endpoint', () => {
    it('should return valid dashboard overview metrics and recent POs', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Cookie', [officerCookie]);
      expect(res.status).toBe(200);
      expect(res.body.summary.metrics).toBeDefined();
      expect(res.body.summary.metrics.activeRfqs).toBe(12);
      expect(res.body.summary.metrics.pendingApprovals).toBe(5);
      expect(Array.isArray(res.body.summary.recentPurchaseOrders)).toBe(true);
      expect(res.body.summary.recentPurchaseOrders.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.summary.spendingTrends)).toBe(true);
    });
  });
});
