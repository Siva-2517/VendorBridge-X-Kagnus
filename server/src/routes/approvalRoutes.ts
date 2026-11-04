import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '../types';
import {
  getApprovals,
  getApprovalById,
  decideApproval,
} from '../controllers/approvalController';

const router = Router();

// Approvals Queue Listing (Supports ?status=PENDING/APPROVED/REJECTED/ALL)
router.get('/', authenticate, getApprovals);

// Approval Details with RFQ, Quotation, Vendor, Items, and Audit History
router.get('/:id', authenticate, getApprovalById);

// Approve or Reject Decision (Role-gated to ADMIN and MANAGER_APPROVER)
router.post(
  '/:id/decide',
  authenticate,
  requireRole([Role.ADMIN, Role.MANAGER_APPROVER]),
  decideApproval
);

export default router;
