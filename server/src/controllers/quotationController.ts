import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/store';
import { submitQuotationSchema } from '../utils/rfqValidation';
import { Role } from '../types';

export const submitQuotation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.VENDOR) {
      res.status(403).json({ error: 'Forbidden', message: 'Only authorized vendor partners can submit quotations' });
      return;
    }

    const vendorProfile = await db.findVendorByUserId(req.user.id);
    if (!vendorProfile) {
      res.status(403).json({ error: 'Forbidden', message: 'No registered vendor profile found for this account' });
      return;
    }

    const parseResult = submitQuotationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { rfqId, deliveryDays, paymentTerms, taxRate, notes, status, items } = parseResult.data;

    const quotation = await db.submitOrUpdateQuotation({
      rfqId,
      vendorId: vendorProfile.id,
      deliveryDays,
      paymentTerms,
      taxRate,
      notes: notes || null,
      status: status as 'DRAFT' | 'SUBMITTED',
      items,
    });

    res.status(201).json({
      success: true,
      message: status === 'DRAFT' ? 'Quotation draft saved successfully' : `Quotation ${quotation.quotationNumber} submitted successfully`,
      quotation,
    });
  } catch (error: any) {
    console.error('Submit quotation error:', error);
    const message = error.message || 'Failed to submit quotation';
    if (
      message.includes('deadline has passed') ||
      message.includes('not open') ||
      message.includes('Invalid item reference') ||
      message.includes('required RFQ line items')
    ) {
      res.status(400).json({ error: 'Validation Error', message });
      return;
    }
    if (message.includes('Unauthorized') || message.includes('not assigned')) {
      res.status(403).json({ error: 'Forbidden', message });
      return;
    }
    res.status(500).json({ error: 'Server error', message });
  }
};

export const getQuotations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    let vendorId: string | undefined;

    // Strict role scoping for Vendors
    if (req.user.role === Role.VENDOR) {
      const vendorProfile = await db.findVendorByUserId(req.user.id);
      if (!vendorProfile) {
        res.status(200).json({ success: true, count: 0, quotations: [] });
        return;
      }
      vendorId = vendorProfile.id;
    }

    const { rfqId } = req.query;

    const quotations = await db.findQuotations({
      rfqId: typeof rfqId === 'string' ? rfqId : undefined,
      vendorId,
    });

    res.status(200).json({
      success: true,
      count: quotations.length,
      quotations,
    });
  } catch (error: any) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to retrieve quotations' });
  }
};

export const getQuotationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const quotation = await db.findQuotationById(req.params.id as string);
    if (!quotation) {
      res.status(404).json({ error: 'Not found', message: 'Quotation not found' });
      return;
    }

    // Ownership check for Vendors: a vendor can only view their own quote
    if (req.user.role === Role.VENDOR) {
      const vendorProfile = await db.findVendorByUserId(req.user.id);
      if (!vendorProfile || quotation.vendorId !== vendorProfile.id) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied: You can only view your own quotations' });
        return;
      }
    }

    res.status(200).json({
      success: true,
      quotation,
    });
  } catch (error: any) {
    console.error('Get quotation by ID error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to retrieve quotation' });
  }
};

export const updateQuotation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.VENDOR) {
      res.status(403).json({ error: 'Forbidden', message: 'Only the submitting vendor can edit this quotation' });
      return;
    }

    const vendorProfile = await db.findVendorByUserId(req.user.id);
    if (!vendorProfile) {
      res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
      return;
    }

    // Verify existing quotation exists and belongs to this vendor
    const existing = await db.findQuotationById(req.params.id as string);
    if (!existing) {
      res.status(404).json({ error: 'Not found', message: 'Quotation not found' });
      return;
    }

    if (existing.vendorId !== vendorProfile.id) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied: You cannot edit another vendor\'s quotation' });
      return;
    }

    const bodyWithRfq = {
      ...req.body,
      rfqId: req.body.rfqId || existing.rfqId,
    };
    const parseResult = submitQuotationSchema.safeParse(bodyWithRfq);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { rfqId, deliveryDays, paymentTerms, taxRate, notes, status, items } = parseResult.data;

    // Call submitOrUpdateQuotation which enforces deadline and calculates totals
    const updated = await db.submitOrUpdateQuotation({
      rfqId,
      vendorId: vendorProfile.id,
      deliveryDays,
      paymentTerms,
      taxRate,
      notes: notes || null,
      status: status as 'DRAFT' | 'SUBMITTED',
      items,
    });

    res.status(200).json({
      success: true,
      message: `Quotation ${updated.quotationNumber} updated successfully`,
      quotation: updated,
    });
  } catch (error: any) {
    console.error('Update quotation error:', error);
    const message = error.message || 'Failed to update quotation';
    if (
      message.includes('deadline has passed') ||
      message.includes('not open') ||
      message.includes('Invalid item reference') ||
      message.includes('required RFQ line items')
    ) {
      res.status(400).json({ error: 'Validation Error', message });
      return;
    }
    if (message.includes('Unauthorized') || message.includes('not assigned')) {
      res.status(403).json({ error: 'Forbidden', message });
      return;
    }
    res.status(500).json({ error: 'Server error', message });
  }
};
