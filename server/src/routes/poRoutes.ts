import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '../types';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  generatePurchaseOrder,
} from '../controllers/poController';

const router = Router();

// Purchase Orders List (Supports ?status=APPROVED/PENDING/ISSUED/CANCELLED/ALL & ?search=...)
router.get('/', authenticate, getPurchaseOrders);

// Purchase Order Details (Supports legacy POs and Week 3 itemized POs with vendor isolation)
router.get('/:id', authenticate, getPurchaseOrderById);

// Generate Purchase Order from Approved Quotation
// Role-gated to ADMIN, PROCUREMENT_OFFICER, and MANAGER_APPROVER
router.post(
  '/generate',
  authenticate,
  requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.MANAGER_APPROVER]),
  generatePurchaseOrder
);

export default router;
