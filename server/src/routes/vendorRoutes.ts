import { Router } from 'express';
import { getVendors, getVendorById, createVendor, updateVendor, deleteVendor } from '../controllers/vendorController';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '../types';

const router = Router();

// All vendor routes require valid authentication
router.use(authenticate);

// View list of vendors (Admin, Procurement Officer, Manager/Approver, Vendor)
router.get('/', getVendors);

// View specific vendor profile
router.get('/:id', getVendorById);

// Create vendor (Admin, Procurement Officer only)
router.post('/', requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER]), createVendor);

// Update vendor (Admin, Procurement Officer, or Vendor editing own profile)
router.patch('/:id', requireRole([Role.ADMIN, Role.PROCUREMENT_OFFICER, Role.VENDOR]), updateVendor);

// Delete vendor (Strictly Admin only)
router.delete('/:id', requireRole([Role.ADMIN]), deleteVendor);

export default router;
