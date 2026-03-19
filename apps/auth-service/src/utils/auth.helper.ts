import { ValidationError } from "@multi-vendor-ecommerce/error-handler";
import crypto from 'crypto';
import redis from "@multi-vendor-ecommerce/redis";
import { sendEmail } from "./sendMail";
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone_number?: string;
  country?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegistrationData = (
  data: RegisterUserData,
  userType: 'user' | 'seller'
) => {
  const { name, email, password, phone_number, country } = data;

  if (!name || !email || (userType === 'seller' && (!phone_number || !country))  ) {
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
  const otpRequests = parseInt(await redis.get(otpRequestKey) || '0');

  if (otpRequests >= 2) {
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
}