import { Request, Response, NextFunction } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';
import redis from '@multi-vendor-ecommerce/redis';
import { validateRegistrationData, RegisterUserData, checkOtpRestrictions, trackOtpRequests, sendOtp, hashPassword, verifyOtp } from '../utils/auth.helper';
import { ValidationError } from '@multi-vendor-ecommerce/error-handler';

// Register a new user - store temp data and send OTP
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
    
    // Store user data temporarily in Redis with OTP
    const tempUserData = JSON.stringify({ name, email, password: hashedPassword });
    await redis.set(`temp_user:${email}`, tempUserData, { ex: 600 }); // 10 minutes expiration
    
    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(email, name, 'user-activation-mail');

    res.status(200).json({ 
      message: 'Registration initiated. Please verify your email with the OTP sent.',
      email: email 
    });
  } catch (error) {
    next(error);
  }
};

// Verify user with OTP and complete registration
export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP are required');
    }

    // Verify OTP first
    await verifyOtp(email, otp, next);
    
    // Get temp user data from Redis
    let tempUserData = await redis.get(`temp_user:${email}`);
    
    // Convert to string if it's an object (Upstash Redis returns object when parsed)
    if (typeof tempUserData === 'object' && tempUserData !== null) {
      tempUserData = JSON.stringify(tempUserData);
    }
    
    if (!tempUserData) {
      throw new ValidationError('Registration session expired. Please register again.');
    }
    
    const parsedData = typeof tempUserData === 'string' ? JSON.parse(tempUserData) : tempUserData;
    const { name, password } = parsedData as { name: string; password: string };
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ValidationError('User already exists');
    }

    // Create the user in database
    await prisma.user.create({
      data: {
        email,
        name,
        password,
      },
    });
    
    // Clear temp user data
    await redis.del(`temp_user:${email}`);
    
    res.status(200).json({ 
      message: 'User registered successfully!',
      email: email 
    });
  } catch (error) {
    return next(error);
  }
};