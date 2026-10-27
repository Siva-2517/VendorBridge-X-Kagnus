import { Response } from 'express';
import path from 'path';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/store';
import { createRfqSchema, updateRfqSchema } from '../utils/rfqValidation';
import { validateFileSignature } from '../middleware/upload';
import { Role } from '../types';

export const createRfq = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== Role.ADMIN && req.user.role !== Role.PROCUREMENT_OFFICER)) {
      res.status(403).json({ error: 'Forbidden', message: 'Only Procurement Officers and Admins can create RFQs' });
      return;
    }

    const parseResult = createRfqSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { title, description, category, deliveryLocation, deadline, status, items, vendorIds } = parseResult.data;

    const rfq = await db.createRfq({
      title,
      description,
      category,
      deliveryLocation,
      deadline: new Date(deadline),
      status: status as 'DRAFT' | 'OPEN',
      createdById: req.user.id,
      items,
      vendorIds,
    });

    res.status(201).json({
      success: true,
      message: `RFQ ${rfq.rfqNumber} created successfully`,
      rfq,
    });
  } catch (error: any) {
    console.error('Create RFQ error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to create RFQ' });
  }
};

export const getRfqs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    let vendorId: string | undefined;

    // Strict Role Scoping for Vendors
    if (req.user.role === Role.VENDOR) {
      const vendorProfile = await db.findVendorByUserId(req.user.id);
      if (!vendorProfile) {
        res.status(200).json({ success: true, count: 0, rfqs: [] });
        return;
      }
      vendorId = vendorProfile.id;
    }

    const { search, category, status } = req.query;

    const rfqs = await db.findRfqs({
      search: typeof search === 'string' ? search : undefined,
      category: typeof category === 'string' ? category : undefined,
      status: typeof status === 'string' ? status : undefined,
      vendorId,
    });

    res.status(200).json({
      success: true,
      count: rfqs.length,
      rfqs,
    });
  } catch (error: any) {
    console.error('Get RFQs error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to retrieve RFQs' });
  }
};

export const getRfqById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    let vendorId: string | undefined;

    if (req.user.role === Role.VENDOR) {
      const vendorProfile = await db.findVendorByUserId(req.user.id);
      if (!vendorProfile) {
        res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
        return;
      }
      vendorId = vendorProfile.id;
    }

    const rfq = await db.findRfqById(req.params.id as string, vendorId);

    if (!rfq) {
      // If vendor was not invited or RFQ does not exist
      if (req.user.role === Role.VENDOR) {
        res.status(403).json({ error: 'Forbidden', message: 'You are not authorized to access this RFQ' });
        return;
      }
      res.status(404).json({ error: 'Not found', message: 'RFQ not found' });
      return;
    }

    res.status(200).json({
      success: true,
      rfq,
    });
  } catch (error: any) {
    console.error('Get RFQ by ID error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to retrieve RFQ' });
  }
};

export const updateRfq = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== Role.ADMIN && req.user.role !== Role.PROCUREMENT_OFFICER)) {
      res.status(403).json({ error: 'Forbidden', message: 'Only Procurement Officers and Admins can update RFQs' });
      return;
    }

    const parseResult = updateRfqSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const updated = await db.updateRfq(req.params.id as string, parseResult.data as any, req.user.id);

    if (!updated) {
      res.status(404).json({ error: 'Not found', message: 'RFQ not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `RFQ ${updated.rfqNumber} updated successfully`,
      rfq: updated,
    });
  } catch (error: any) {
    console.error('Update RFQ error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to update RFQ' });
  }
};

export const uploadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== Role.ADMIN && req.user.role !== Role.PROCUREMENT_OFFICER)) {
      res.status(403).json({ error: 'Forbidden', message: 'Only Procurement Officers and Admins can upload attachments' });
      return;
    }

    const rfqId = req.params.id as string;
    const rfq = await db.findRfqById(rfqId);
    if (!rfq) {
      res.status(404).json({ error: 'Not found', message: 'RFQ not found' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Bad Request', message: 'No file uploaded or file exceeded 5MB limit' });
      return;
    }

    if (!validateFileSignature(req.file.buffer, req.file.mimetype, req.file.originalname)) {
      res.status(400).json({
        error: 'Security Validation Failed',
        message: 'File content signature does not match declared MIME type.',
      });
      return;
    }

    const meta = await db.addRfqAttachment(
      rfqId,
      {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileData: req.file.buffer,
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully',
      attachment: meta,
    });
  } catch (error: any) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to upload attachment' });
  }
};

export const downloadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const rfqId = req.params.id as string;
    const attachmentId = req.params.attachmentId as string;

    // Verify user has access to RFQ
    let vendorId: string | undefined;
    if (req.user.role === Role.VENDOR) {
      const vendorProfile = await db.findVendorByUserId(req.user.id);
      if (!vendorProfile) {
        res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        return;
      }
      vendorId = vendorProfile.id;
    }

    const rfq = await db.findRfqById(rfqId, vendorId);
    if (!rfq) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to RFQ attachments' });
      return;
    }

    const attachment = await db.getRfqAttachment(attachmentId);
    if (!attachment || attachment.rfqId !== rfqId) {
      res.status(404).json({ error: 'Not found', message: 'Attachment not found' });
      return;
    }

    const baseName = path.basename(attachment.fileName);
    const safeAscii = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const encodedUtf8 = encodeURIComponent(baseName);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', attachment.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${safeAscii}"; filename*=UTF-8''${encodedUtf8}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(attachment.fileData);
  } catch (error: any) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to download attachment' });
  }
};

export const getComparison = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // STRICT VENDOR EXCLUSION: Vendors can NEVER access comparison matrix
    if (req.user.role === Role.VENDOR) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access Denied: Vendors are strictly forbidden from viewing quotation comparisons or competitor pricing',
      });
      return;
    }

    const comparison = await db.getQuotationComparison(req.params.id as string);

    res.status(200).json({
      success: true,
      comparison,
      ...comparison,
    });
  } catch (error: any) {
    console.error('Get Quotation Comparison error:', error);
    if (error.message === 'RFQ not found') {
      res.status(404).json({ error: 'Not found', message: 'RFQ not found' });
      return;
    }
    res.status(500).json({ error: 'Server error', message: error.message || 'Failed to generate comparison' });
  }
};

export const selectQuotationForApproval = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== Role.ADMIN && req.user.role !== Role.PROCUREMENT_OFFICER)) {
      res.status(403).json({ error: 'Forbidden', message: 'Only Procurement Officers and Admins can select quotations for approval' });
      return;
    }

    const { quotationId } = req.body;
    if (!quotationId) {
      res.status(400).json({ error: 'Bad Request', message: 'quotationId is required' });
      return;
    }

    const result = await db.selectQuotationForApproval(req.params.id as string, quotationId, req.user.id);

    res.status(200).json({
      success: true,
      message: `Quotation ${result.quotationNumber} from ${result.vendorName} selected for approval workflow`,
      result,
      rfq: result.rfq,
      quotation: result.quotation,
    });
  } catch (error: any) {
    console.error('Select quotation error:', error);
    res.status(400).json({ error: 'Selection failed', message: error.message });
  }
};
