import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  submitQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
} from '../controllers/quotationController';

const router = Router();

router.post('/', authenticate, submitQuotation);
router.get('/', authenticate, getQuotations);
router.get('/:id', authenticate, getQuotationById);
router.patch('/:id', authenticate, updateQuotation);

export default router;
