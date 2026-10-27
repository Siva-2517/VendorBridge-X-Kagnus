import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { rfqUpload } from '../middleware/upload';
import {
  createRfq,
  getRfqs,
  getRfqById,
  updateRfq,
  uploadAttachment,
  downloadAttachment,
  getComparison,
  selectQuotationForApproval,
} from '../controllers/rfqController';

const router = Router();

// Standard CRUD
router.post('/', authenticate, createRfq);
router.get('/', authenticate, getRfqs);
router.get('/:id', authenticate, getRfqById);
router.patch('/:id', authenticate, updateRfq);

// Attachment routes
router.post('/:id/attachments', authenticate, rfqUpload.single('file'), uploadAttachment);
router.get('/:id/attachments/:attachmentId', authenticate, downloadAttachment);

// Comparison & Selection
router.get('/:id/comparison', authenticate, getComparison);
router.post('/:id/select-quotation', authenticate, selectQuotationForApproval);

export default router;
