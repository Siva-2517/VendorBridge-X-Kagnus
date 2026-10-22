import { Response } from 'express';
import { db } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { Role, VendorStatus } from '../types';
import { vendorCreateSchema, vendorUpdateSchema } from '../utils/validation';

export const getVendors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { status, category, search } = req.query as {
      status?: string;
      category?: string;
      search?: string;
    };

    // If user is a VENDOR, restrict visibility to their linked vendor profile
    const userIdFilter = user.role === Role.VENDOR ? user.id : undefined;

    const result = await db.findVendors({
      status,
      category,
      search,
      userId: userIdFilter,
    });

    res.status(200).json({
      success: true,
      vendors: result.vendors,
      counts: result.counts,
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve vendors' });
  }
};

export const getVendorById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const vendor = await db.findVendorById(id);
    if (!vendor) {
      res.status(404).json({ error: 'Not found', message: 'Vendor record not found' });
      return;
    }

    // Role-based record ownership check
    if (user.role === Role.VENDOR && vendor.userId !== user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to view this vendor' });
      return;
    }

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error('Get vendor by id error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve vendor profile' });
  }
};

export const createVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const parseResult = vendorCreateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parseResult.data;

    // Check duplicate GSTIN
    const existingGstin = await db.findVendorByGstin(data.gstin);
    if (existingGstin) {
      res.status(409).json({
        error: 'Conflict',
        message: `Vendor with GSTIN '${data.gstin}' is already registered`,
      });
      return;
    }

    // Check duplicate Email
    const existingEmail = await db.findVendorByEmail(data.email);
    if (existingEmail) {
      res.status(409).json({
        error: 'Conflict',
        message: `Vendor with email address '${data.email}' is already registered`,
      });
      return;
    }

    const newVendor = await db.createVendor({
      ...data,
      createdById: user.id,
      userId: null,
    });

    await db.logAudit(user.id, user.email, 'VENDOR_CREATED', `Vendor '${newVendor.name}' created with GSTIN ${newVendor.gstin}`);

    res.status(201).json({
      success: true,
      vendor: newVendor,
      message: 'Vendor registered successfully',
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to create vendor' });
  }
};

export const updateVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    const existingVendor = await db.findVendorById(id);
    if (!existingVendor) {
      res.status(404).json({ error: 'Not found', message: 'Vendor record not found' });
      return;
    }

    // Role-based authorization for update:
    // Vendor can only update their own contact details / notes
    if (user.role === Role.VENDOR && existingVendor.userId !== user.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied. You cannot modify other vendors.' });
      return;
    }

    const parseResult = vendorUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const data = parseResult.data;

    // If GSTIN is changing, verify no collision
    if (data.gstin && data.gstin !== existingVendor.gstin) {
      const gstinConflict = await db.findVendorByGstin(data.gstin);
      if (gstinConflict && gstinConflict.id !== id) {
        res.status(409).json({
          error: 'Conflict',
          message: `GSTIN '${data.gstin}' is already in use by another vendor`,
        });
        return;
      }
    }

    // Vendors cannot change their own approval status
    if (user.role === Role.VENDOR && data.status !== undefined) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Vendors are not permitted to modify their verification status',
      });
      return;
    }

    // Vendors cannot modify restricted business identifiers such as GSTIN
    if (user.role === Role.VENDOR && data.gstin !== undefined) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Vendors are not permitted to modify their registered GSTIN identifier. Please contact procurement administration.',
      });
      return;
    }

    const updatedVendor = await db.updateVendor(id, data);
    await db.logAudit(user.id, user.email, 'VENDOR_UPDATED', `Vendor '${existingVendor.name}' updated`);

    res.status(200).json({
      success: true,
      vendor: updatedVendor,
      message: 'Vendor details updated successfully',
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to update vendor record' });
  }
};

export const deleteVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const id = req.params.id as string;

    // Strict Admin-only check
    if (user.role !== Role.ADMIN) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only System Administrators have authorization to delete vendor records',
      });
      return;
    }

    const existingVendor = await db.findVendorById(id);
    if (!existingVendor) {
      res.status(404).json({ error: 'Not found', message: 'Vendor record not found' });
      return;
    }

    // Historical record protection: verify vendor has no associated purchase orders
    const poCount = await db.getVendorPurchaseOrderCount(id);
    if (poCount > 0) {
      res.status(400).json({
        error: 'Integrity constraint violation',
        message: `Cannot delete vendor '${existingVendor.name}' because ${poCount} associated purchase order(s) exist in procurement history. Please change vendor status to BLOCKED instead to maintain audit compliance.`,
      });
      return;
    }

    const deleted = await db.deleteVendor(id);
    if (!deleted) {
      res.status(500).json({ error: 'Deletion failed', message: 'Could not remove vendor record' });
      return;
    }

    await db.logAudit(user.id, user.email, 'VENDOR_DELETED', `Vendor '${existingVendor.name}' (ID: ${id}) deleted`);

    res.status(200).json({
      success: true,
      message: `Vendor '${existingVendor.name}' successfully removed from system`,
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to delete vendor record' });
  }
};
