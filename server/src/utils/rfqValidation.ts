import { z } from 'zod';

export const createRfqSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'RFQ title must be at least 3 characters')
    .max(150, 'RFQ title cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  category: z
    .string()
    .trim()
    .min(2, 'Category is required'),
  deliveryLocation: z
    .string()
    .trim()
    .min(2, 'Delivery location is required')
    .default('Central Warehouse, Mumbai'),
  deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid deadline date format')
    .refine((val) => new Date(val).getTime() > Date.now(), 'Deadline must be a future date and time'),
  status: z
    .enum(['DRAFT', 'OPEN'])
    .default('OPEN'),
  items: z
    .array(
      z.preprocess(
        (val: any) => {
          if (val && typeof val === 'object') {
            const itemDescription = val.itemDescription || val.description;
            return { ...val, itemDescription };
          }
          return val;
        },
        z.object({
          itemDescription: z
            .string()
            .trim()
            .min(2, 'Item description is required')
            .max(200, 'Item description cannot exceed 200 characters'),
          quantity: z
            .number({ invalid_type_error: 'Quantity must be a positive number' })
            .positive('Quantity must be greater than 0'),
          uom: z
            .string()
            .trim()
            .min(1, 'Unit of measure is required')
            .max(20, 'UOM too long'),
          targetPrice: z
            .number()
            .positive('Target price must be positive')
            .optional()
            .nullable(),
        })
      )
    )
    .min(1, 'At least one line item is required in an RFQ'),
  vendorIds: z
    .array(z.string().min(1, 'Invalid vendor ID format'))
    .min(1, 'At least one registered vendor must be assigned to the RFQ'),
});

export const updateRfqSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  category: z.string().trim().min(2).optional(),
  deliveryLocation: z.string().trim().min(2).optional(),
  deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid deadline date format')
    .refine((val) => new Date(val).getTime() > Date.now(), 'Deadline must be a future date and time')
    .optional(),
  status: z
    .enum(['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'])
    .optional(),
  cancellationReason: z.string().trim().max(500).optional(),
});

export const submitQuotationSchema = z.preprocess(
  (raw: any) => {
    if (raw && typeof raw === 'object') {
      const deliveryDays = raw.deliveryDays ?? raw.leadTimeDays;
      return { ...raw, deliveryDays };
    }
    return raw;
  },
  z.object({
    rfqId: z.string().min(1, 'Invalid RFQ ID format'),
    deliveryDays: z
      .number({ invalid_type_error: 'Delivery days must be an integer' })
      .int('Delivery days must be a whole number')
      .positive('Delivery turnaround must be at least 1 day')
      .max(365, 'Delivery days cannot exceed 365 days'),
    paymentTerms: z
      .string()
      .trim()
      .min(2, 'Payment terms are required')
      .max(100, 'Payment terms cannot exceed 100 characters'),
    taxRate: z
      .number({ invalid_type_error: 'Tax rate must be a number' })
      .min(0, 'Tax rate cannot be negative')
      .max(100, 'Tax rate cannot exceed 100%')
      .default(18.00),
    notes: z
      .string()
      .trim()
      .max(1000, 'Notes cannot exceed 1000 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['DRAFT', 'SUBMITTED'])
      .default('SUBMITTED'),
    items: z
      .array(
        z.preprocess(
          (val: any) => {
            if (val && typeof val === 'object') {
              const remarks = val.remarks ?? val.notes;
              return { ...val, remarks };
            }
            return val;
          },
          z.object({
            rfqItemId: z.string().min(1, 'Invalid RFQ item ID format'),
            unitPrice: z
              .number({ invalid_type_error: 'Unit price must be a number' })
              .positive('Unit price must be greater than 0'),
            remarks: z
              .string()
              .trim()
              .max(200, 'Remarks cannot exceed 200 characters')
              .optional()
              .nullable(),
          })
        )
      )
      .min(1, 'Quotation must include price for at least one line item'),
  })
);
