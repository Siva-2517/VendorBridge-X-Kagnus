import { z } from 'zod';
import { Role, VendorStatus } from '../types';

// Indian GSTIN: 15-character alphanumeric identifier starting with 2-digit state code
export const GSTIN_REGEX = /^[0-9]{2}[A-Z0-9]{13}$/;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phoneNumber: z.string().trim().optional().nullable(),
  role: z.nativeEnum(Role).optional().default(Role.VENDOR),
  inviteCode: z.string().optional(),
  country: z.string().trim().optional().default('India'),
  additionalInfo: z.string().trim().optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const vendorCreateSchema = z.object({
  name: z.string().trim().min(2, 'Vendor name must be at least 2 characters'),
  category: z.string().trim().min(2, 'Category is required'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => GSTIN_REGEX.test(val), {
      message: 'Invalid GSTIN format. Expected 15-character Indian GST format (e.g. 27AABC1576214B0)',
    }),
  contactPerson: z.string().trim().min(2, 'Contact person name is required'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  phone: z.string().trim().min(7, 'Phone number must be at least 7 digits'),
  address: z.string().trim().min(5, 'Business address is required'),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  pincode: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().default('India'),
  status: z.nativeEnum(VendorStatus).optional().default(VendorStatus.PENDING),
  notes: z.string().trim().optional().nullable(),
});

export const vendorUpdateSchema = vendorCreateSchema.partial();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').optional(),
  lastName: z.string().trim().min(1, 'Last name is required').optional(),
  phoneNumber: z.string().trim().optional().nullable(),
  country: z.string().trim().optional(),
  additionalInfo: z.string().trim().optional().nullable(),
});
