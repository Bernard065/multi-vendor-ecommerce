import { Request, Response, NextFunction } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';
import { validateRegistrationData, RegisterUserData, checkOtpRestrictions, trackOtpRequests, sendOtp, hashPassword } from '../utils/auth.helper';
import { ValidationError } from '@multi-vendor-ecommerce/error-handler';

// Register a new user
export const userRegistration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as RegisterUserData | null;
    
    if (!body) {
      throw new ValidationError('Request body is missing');
    }

    validateRegistrationData(body, 'user');
    const { name, email, password } = body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ValidationError('Email is already registered');
    }

    // Hash password before saving
    const hashedPassword = await hashPassword(password);
    
    // Create user with pending status
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });
    
    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(email, name, 'user-activation-mail');

    res.status(200).json({ message: 'OTP sent to email for verification' });
  } catch (error) {
    next(error);
  }
};