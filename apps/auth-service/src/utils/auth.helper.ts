import { ValidationError } from '@multi-vendor-ecommerce/error-handler';
import crypto from 'crypto';
import redis from '@multi-vendor-ecommerce/redis';
import { sendEmail } from './sendMail';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  country?: string;
}

interface ForgotPasswordBody {
  email?: string;
}

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (data: RegisterUserData, userType: 'user' | 'seller') => {
  const { name, email, password, phone_number, country } = data;

  if (!name || !email || (userType === 'seller' && (!phone_number || !country))) {
    throw new ValidationError('Missing required fields');
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  if (password && password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  if (userType === 'seller') {
    if (!phone_number) {
      throw new ValidationError('Phone number is required for sellers');
    }
    if (!country) {
      throw new ValidationError('Country is required for sellers');
    }
  }
};

export const checkOtpRestrictions = async (email: string) => {
  if (await redis.get(`otp_lock:${email}`)) {
    throw new ValidationError('Too many OTP requests. Please try again later.');
  }

  if (await redis.get(`otp_spam_lock:${email}`)) {
    throw new ValidationError('Too many OTP requests. Please try again later.');
  }

  if (await redis.get(`otp_cooldown:${email}`)) {
    throw new ValidationError('Please wait before requesting another OTP.');
  }
};

export const trackOtpRequests = async (email: string) => {
  const otpRequestKey = `otp_request_count:${email}`;
  const otpRequests = parseInt((await redis.get(otpRequestKey)) || '0');

  if (otpRequests >= 3) {
    await redis.set(`otp_spam_lock:${email}`, 'locked', { ex: 3600 }); // Lock for 1 hour
    throw new ValidationError('Too many OTP requests. Please try again later.');
  }

  await redis.set(otpRequestKey, (otpRequests + 1).toString(), { ex: 3600 }); // Increment count with 1 hour expiration
};

export const sendOtp = async (email: string, name: string, template: string) => {
  const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP

  await sendEmail(email, 'Your OTP Code', template, { name, otp });

  await redis.set(`otp:${email}`, otp, { ex: 300 }); // Store OTP in Redis with a 5-minute expiration

  await redis.set(`otp_cooldown:${email}`, 'true', { ex: 60 }); // Set cooldown for OTP requests (e.g., 1 minute)
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const verifyOtp = async (email: string, otp: string, next: NextFunction) => {
  const storedOtp = await redis.get(`otp:${email}`);

  if (!storedOtp) {
    throw new ValidationError('OTP has expired or is invalid');
  }

  const failedAttemptsKey = `otp_failed_attempts:${email}`;
  const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || '0');

  // Compare as strings to handle type mismatch (Redis returns number, user sends string)
  if (String(storedOtp).trim() !== String(otp).trim()) {
    if (failedAttempts >= 3) {
      await redis.set(`otp_lock:${email}`, 'locked', { ex: 1800 }); // Lock for 30 minutes
      await redis.del(`otp:${email}`, failedAttemptsKey); // Clear OTP and failed attempts

      throw new ValidationError('Too many failed attempts. Please try again later.');
    }

    await redis.set(failedAttemptsKey, (failedAttempts + 1).toString(), { ex: 300 }); // Increment failed attempts with 5-minute expiration

    throw new ValidationError('Invalid OTP. Please try again.');
  }

  await redis.del(`otp:${email}`, failedAttemptsKey); // Clear OTP and failed attempts on successful verification
};

export const handleForgotPassword = async (
  req: Request<unknown, unknown, ForgotPasswordBody>,
  res: Response,
  next: NextFunction,
  userType: 'user' | 'seller'
) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user based on user type
    const user =
      userType === 'user'
        ? await prisma.user.findUnique({ where: { email } })
        : await prisma.seller.findUnique({ where: { email } });

    if (!user) {
      throw new ValidationError('No account found with that email');
    }
    // Check otp restrictions
    await checkOtpRestrictions(email);
    // Track otp requests
    await trackOtpRequests(email);

    // Generate and send OTP
    await sendOtp(
      email,
      user.name,
      userType === 'user' ? 'forgot-password-user-email' : 'forgot-password-seller-email'
    );

    res.status(200).json({ message: 'OTP sent to email. Please verify your account.' });
  } catch (error) {
    return next(error);
  }
};

export const verifyForgotPasswordOtp = async (req: Request, resp: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP required!');
    }

    await verifyOtp(email, otp, next);

    resp.status(200).json({
      message: 'OTP verified. You can now reset your password!',
    });
  } catch (error) {
    return next(error);
  }
};
