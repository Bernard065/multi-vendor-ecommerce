import { Request, Response, NextFunction } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';
import redis from '@multi-vendor-ecommerce/redis';
import {
  validateRegistrationData,
  RegisterUserData,
  checkOtpRestrictions,
  trackOtpRequests,
  sendOtp,
  hashPassword,
  verifyOtp,
  handleForgotPassword,
  verifyForgotPasswordOtp,
} from '../utils/auth.helper';
import {
  AuthenticationError,
  ValidationError,
  InternalServerError,
} from '@multi-vendor-ecommerce/error-handler';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setCookie } from '../utils/cookies/setCookie';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-03-25.dahlia',
});

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
      email: email,
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
      email: email,
    });
  } catch (error) {
    return next(error);
  }
};

// Login user
export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // Check if password exists (shouldn't be null for a valid user)
    if (!user.password) {
      throw new ValidationError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '7d' }
    );

    // Store refresh and access token in  HTTP-only cookie
    setCookie(res, 'refreshToken', refreshToken);
    setCookie(res, 'accessToken', accessToken);

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return next(error);
  }
};

// Refresh token user
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return new ValidationError('Unauthorized! No refresh token.');
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET as string) as {
      userId: string;
      role: string;
    };

    if (!decoded || !decoded.userId || !decoded.role) {
      return new AuthenticationError('Forbidden! Invalid refresh token.');
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return new AuthenticationError('Forbidden! Account not found');
    }

    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
      },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );

    setCookie(res, 'accessToken', newAccessToken);

    return res.status(201).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

// Get logged in user
// Note: The isAuthenticated middleware adds user/seller to the Request object
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

// User forgot password
export const userForgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  await handleForgotPassword(req, res, next, 'user');
};

// Verify forgot password
export const verifyUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  await verifyForgotPasswordOtp(req, res, next);
};

// Resert pasword
export const resetUserPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      throw new ValidationError('Email and new password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new ValidationError('No account found with that email');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password || '');
    if (isSamePassword) {
      throw new ValidationError('New password cannot be the same as the old password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: 'Password reset successfully!' });
  } catch (error) {
    next(error);
  }
};

// Register a new seller
export const registerSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as RegisterUserData | null;

    if (!body) {
      throw new ValidationError('Request body is missing');
    }

    validateRegistrationData(body, 'seller');
    const { name, email, password, phone_number, country } = body;

    const existingSeller = await prisma.seller.findUnique({ where: { email } });
    if (existingSeller) {
      throw new ValidationError('Email is already registered as a seller');
    }

    // Hash password before saving
    const hashedPassword = await hashPassword(password);

    // Store seller data temporarily in Redis with OTP
    const tempSellerData = JSON.stringify({
      name,
      email,
      password: hashedPassword,
      phone_number,
      country,
    });
    await redis.set(`temp_seller:${email}`, tempSellerData, { ex: 600 }); // 10 minutes expiration

    await checkOtpRestrictions(email);
    await trackOtpRequests(email);
    await sendOtp(email, name, 'seller-activation-mail');

    res.status(200).json({
      message: 'Seller registration initiated. Please verify your email with the OTP sent.',
      email: email,
    });
  } catch (error) {
    return next(error);
  }
};

// Verify seller with OTP and complete registration
export const verifySeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP are required');
    }
    await verifyOtp(email, otp, next);

    const tempSellerData = await redis.get(`temp_seller:${email}`);
    if (!tempSellerData) {
      throw new ValidationError('Registration session expired. Please register again.');
    }

    const parsedData =
      typeof tempSellerData === 'string' ? JSON.parse(tempSellerData) : tempSellerData;
    const { name, password, phone_number, country } = parsedData as {
      name: string;
      password: string;
      phone_number: string;
      country: string;
    };

    const existingSeller = await prisma.seller.findUnique({ where: { email } });
    if (existingSeller) {
      throw new ValidationError('Seller already exists');
    }

    const seller = await prisma.seller.create({
      data: {
        email,
        name,
        password,
        phone_number,
        country,
      },
    });

    await redis.del(`temp_seller:${email}`);

    res.status(200).json({
      message: 'Seller registered successfully!',
      seller,
    });
  } catch (error) {
    return next(error);
  }
};

// Shop creation
export const createShop = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, bio, category, address, opening_hours, website, sellerId } = req.body;

    if (!name || !bio || !category || !address || !sellerId) {
      throw new ValidationError('Name, bio, category, address and sellerId are required');
    }

    const shopData: any = {
      name,
      bio,
      category,
      address,
      sellerId,
    };

    if (opening_hours && opening_hours.trim() !== '') {
      shopData.opening_hours = opening_hours;
    }

    if (website && website.trim() !== '') {
      shopData.website = website;
    }

    const shop = await prisma.shop.create({
      data: shopData,
    });

    res.status(201).json({
      message: 'Shop created successfully',
      shop,
    });
  } catch (error) {
    return next(error);
  }
};

// Create stripe account for seller
export const createStripeConnectLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      throw new ValidationError('Seller ID is required');
    }

    const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new ValidationError('Seller not found');
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: seller?.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await prisma.seller.update({
      where: { id: sellerId },
      data: { stripeId: account.id },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `https://localhost:3000/success`,
      return_url: 'https://localhost:3000/success',
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    console.error('[createStripeConnectLink] error:', error);

    if (error instanceof ValidationError) {
      return next(error);
    }

    return next(new InternalServerError((error as Error).message));
  }
};

// Login seller
export const sellerLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const seller = await prisma.seller.findUnique({ where: { email } });
    if (!seller) {
      throw new ValidationError('Invalid email or password');
    }

    if (!seller.password) {
      throw new ValidationError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, seller.password);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }

    const accessToken = jwt.sign(
      { userId: seller.id, role: 'seller' },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: seller.id, role: 'seller' },
      process.env.REFRESH_TOKEN_SECRET as string,
      { expiresIn: '7d' }
    );

    setCookie(res, 'seller-refresh-token', refreshToken);
    setCookie(res, 'seller-access-token', accessToken);

    res.status(200).json({
      message: 'Login successful',
      seller: {
        id: seller.id,
        email: seller.email,
        name: seller.name,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Get logged in seller
// Note: The isAuthenticated middleware adds user/seller to the Request object
export const getSeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seller = req.seller;

    return res.status(201).json({
      success: true,
      seller,
    });
  } catch (error) {
    return next(error);
  }
};
