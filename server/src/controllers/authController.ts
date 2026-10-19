import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/store';
import { Role } from '../types';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validation';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'vendorbridge_super_secure_jwt_secret_key_at_least_32_chars_long';
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || 'ADMIN_SECURE_SETUP_2025';

const sanitizeUser = (user: any) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

const sendTokenResponse = (res: Response, user: any, statusCode = 200) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.status(statusCode).json({
    success: true,
    user: sanitizeUser(user),
    token, // Also provided in payload for clients/testers where cookies are disabled
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { firstName, lastName, email, password, phoneNumber, role, inviteCode, country, additionalInfo } =
      parseResult.data;

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'Conflict', message: 'A user with this email address already exists' });
      return;
    }

    // Privilege escalation protection
    let assignedRole: Role = Role.VENDOR;
    if (role && role !== Role.VENDOR) {
      if (inviteCode && inviteCode === ADMIN_INVITE_CODE) {
        assignedRole = role;
      } else {
        res.status(403).json({
          error: 'Privilege escalation rejected',
          message: 'Valid organization authorization code required to register for privileged roles',
        });
        return;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.createUser({
      firstName,
      lastName,
      email,
      passwordHash,
      phoneNumber: phoneNumber || null,
      role: assignedRole,
      country: country || 'India',
      additionalInfo: additionalInfo || null,
      avatarUrl: null,
    });

    await db.logAudit(newUser.id, newUser.email, 'USER_REGISTERED', `User registered with role ${newUser.role}`);

    sendTokenResponse(res, newUser, 201);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error', message: 'An unexpected error occurred during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parseResult.data;
    const user = await db.findUserByEmail(email);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    await db.logAudit(user.id, user.email, 'USER_LOGIN', 'User successfully logged in');

    sendTokenResponse(res, user, 200);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error', message: 'An unexpected error occurred during login' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
    return;
  }
  res.status(200).json({ success: true, user: sanitizeUser(req.user) });
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { email } = parseResult.data;
    const user = await db.findUserByEmail(email);

    // Always respond with success to prevent user enumeration
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If that email address is registered, password reset instructions have been generated.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.createResetToken(user.id, resetToken, expiresAt);
    await db.logAudit(user.id, user.email, 'PASSWORD_RESET_REQUESTED');

    res.status(200).json({
      success: true,
      message: 'If that email address is registered, password reset instructions have been generated.',
      // Return resetToken in non-production/demo mode to allow easy testing and evaluation
      demoResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { token, newPassword } = parseResult.data;
    const resetRecord = await db.findResetToken(token);

    if (!resetRecord || new Date(resetRecord.expiresAt) < new Date()) {
      res.status(400).json({ error: 'Invalid token', message: 'Reset token is invalid or has expired' });
      return;
    }

    const user = await db.findUserById(resetRecord.userId);
    if (!user) {
      res.status(400).json({ error: 'User not found', message: 'Account associated with token no longer exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.updateUser(user.id, { passwordHash });
    await db.markTokenUsed(resetRecord.id);
    await db.logAudit(user.id, user.email, 'PASSWORD_RESET_COMPLETED');

    res.status(200).json({ success: true, message: 'Password has been successfully updated. You may now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error', message: 'Failed to reset password' });
  }
};
