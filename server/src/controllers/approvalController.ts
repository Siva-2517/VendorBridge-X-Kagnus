import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db/store';
import { Role } from '../types';

/**
 * GET /api/approvals
 * Retrieves list of approval requests with optional status filtering.
 * RBAC:
 * - ADMIN, MANAGER_APPROVER, PROCUREMENT_OFFICER: full queue view
 * - VENDOR: vendor-isolated view (only approval requests for vendor's own quotations)
 */
export const getApprovals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { status } = req.query;
    let vendorId: string | undefined;

    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(200).json({ success: true, count: 0, approvals: [] });
        return;
      }
      vendorId = vendor.id;
    }

    const validStatus = status ? (status as string).toUpperCase() : undefined;
    const approvals = await db.getApprovalRequests({
      status: validStatus,
      vendorId,
    });

    res.status(200).json({
      success: true,
      count: approvals.length,
      approvals,
    });
  } catch (error: any) {
    console.error('Get approvals error:', error);
    res.status(500).json({ error: 'Failed to retrieve approvals', message: error.message });
  }
};

/**
 * GET /api/approvals/:id
 * Retrieves a single approval request by ID with complete relations and history.
 * Enforces vendor data isolation: vendors can only access approval of their own quotation.
 */
export const getApprovalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: 'Bad Request', message: 'Approval request ID is required' });
      return;
    }

    let vendorId: string | undefined;
    if (req.user.role === Role.VENDOR) {
      const vendor = await db.findVendorByUserId(req.user.id);
      if (!vendor) {
        res.status(403).json({ error: 'Forbidden', message: 'Vendor profile not found' });
        return;
      }
      vendorId = vendor.id;
    }

    const approval = await db.getApprovalRequestById(id, { vendorId });

    if (!approval) {
      res.status(404).json({ error: 'Not Found', message: 'Approval request not found' });
      return;
    }

    res.status(200).json({
      success: true,
      approval,
    });
  } catch (error: any) {
    if (error.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }
    console.error('Get approval by id error:', error);
    res.status(500).json({ error: 'Failed to retrieve approval request', message: error.message });
  }
};

/**
 * POST /api/approvals/:id/decide
 * Authoritatively approves or rejects an approval request with remarks.
 * RBAC:
 * - Only ADMIN and MANAGER_APPROVER may decide.
 * - PROCUREMENT_OFFICER and VENDOR strictly receive 403 Forbidden.
 * Safety:
 * - Only PENDING requests may be decided.
 * - Repeated or conflicting decisions receive 409 Conflict.
 * - Concurrency protected via atomic Prisma transaction.
 */
export const decideApproval = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Strict role check on backend
    if (req.user.role !== Role.ADMIN && req.user.role !== Role.MANAGER_APPROVER) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role '${req.user.role}' is not authorized to decide approval requests. Only Managers and Admins can approve or reject.`,
      });
      return;
    }

    const id = req.params.id as string;
    if (!id) {
      res.status(400).json({ error: 'Bad Request', message: 'Approval request ID is required' });
      return;
    }

    const rawDecision = req.body?.decision || req.body?.action;
    if (!rawDecision) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'A valid decision ("APPROVE" or "REJECT") is required',
      });
      return;
    }

    const decisionStr = String(rawDecision).toUpperCase().trim();
    let normalizedDecision: 'APPROVE' | 'REJECT';

    if (decisionStr === 'APPROVE' || decisionStr === 'APPROVED') {
      normalizedDecision = 'APPROVE';
    } else if (decisionStr === 'REJECT' || decisionStr === 'REJECTED') {
      normalizedDecision = 'REJECT';
    } else {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid decision '${rawDecision}'. Allowed values are 'APPROVE' or 'REJECT'`,
      });
      return;
    }

    const remarks = typeof req.body.remarks === 'string' ? req.body.remarks : undefined;

    const updatedApproval = await db.decideApprovalRequest(
      id,
      normalizedDecision,
      remarks,
      req.user.id
    );

    res.status(200).json({
      success: true,
      message: `Quotation approval request successfully ${updatedApproval.status.toLowerCase()}`,
      approval: updatedApproval,
    });
  } catch (error: any) {
    if (error.statusCode === 404) {
      res.status(404).json({ error: 'Not Found', message: error.message });
      return;
    }
    if (error.statusCode === 409) {
      res.status(409).json({ error: 'Conflict', message: error.message });
      return;
    }
    console.error('Decide approval error:', error);
    res.status(400).json({ error: 'Decision failed', message: error.message });
  }
};
