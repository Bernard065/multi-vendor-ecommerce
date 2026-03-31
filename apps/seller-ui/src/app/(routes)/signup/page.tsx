'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { COUNTRIES } from '../../../constants/countries';
import CreateShop from '../../../shared/modules/auth/create-shop';

type FormData = {
  name: string;
  email: string;
  phone_number: string;
  country: string;
  password: string;
};

interface ApiErrorResponse {
  message?: string;
}

const Signup = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [sellerData, setSellerData] = useState<FormData | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const startResendTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Signup Mutation
  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/seller-registration`,
        data
      );
      return response.data;
    },

    onSuccess: (_, formData) => {
      setServerError(null);
      setSellerData(formData);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Signup failed. Try again.');
    },
  });

  // Verify OTP Mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!sellerData) return;

      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-seller`, {
        ...sellerData,
        otp: otp.join(''),
      });
      return response.data;
    },

    onSuccess: (data) => {
      setServerError(null);

      setSellerId(data?.seller?.id);
      setActiveStep(2);
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Invalid OTP. Try again.');
    },
  });

  // Submit
  const onSubmit = (data: FormData) => {
    setServerError(null);
    signupMutation.mutate(data);
  };

  // OTP Change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // OTP Backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = () => {
    setServerError(null);

    if (otp.join('').length !== 6) {
      setServerError('Please enter complete OTP');
      return;
    }

    verifyOtpMutation.mutate();
  };

  // Resend OTP
  const resendOtp = async () => {
    if (!canResend || !sellerData) return;

    try {
      setServerError(null);

      await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/resend-otp`, {
        email: sellerData.email,
      });

      setTimer(60);
      setCanResend(false);
      startResendTimer();
    } catch (error) {
      console.error(error);
      setServerError('Failed to resend OTP. Try again.');
    }
  };

  const connectStripe = async () => {
    try {
      if (!sellerId) {
        setServerError(
          'Seller ID is missing. Please verify your account before connecting Stripe.'
        );
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-stripe-link`,
        { sellerId }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        setServerError('Failed to create Stripe link. Try again.');
      }
    } catch (error) {
      console.error('connectStripe error:', error);
      const axiosError = error as AxiosError<ApiErrorResponse>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Unknown error';
      setServerError(`Stripe connection failed: ${message}`);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-10 min-h-screen">
      {/* Stepper */}
      <div className="relative flex items-center justify-between md:w-[50%] mb-8">
        <div className="absolute top-[25%] left-0 w-[80%] md:w-[90%] h-1 bg-gray-300 -z-10" />

        {[1, 2, 3].map((step) => (
          <div key={step}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${step <= activeStep ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              {step}
            </div>
            <span className="ml-[-15px]">
              {step === 1 ? 'Create Account' : step === 2 ? 'Setup Shop' : 'Connect Bank'}
            </span>
          </div>
        ))}
      </div>

      {/* Steps content       */}
      <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
        {activeStep === 1 && (
          <>
            {!showOtp ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="text-2xl font-semibold text-center mb-4">Create Account</h3>
                {/* Name */}
                <div className="mb-2">
                  <label htmlFor="name" className="block text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Bernard"
                    className="w-full p-2 border border-gray-300 outline-0 !rounded"
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="mb-2">
                  <label htmlFor="email" className="block text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="bernardbebeni@gmail.com"
                    className="w-full p-2 border border-gray-300 outline-0 !rounded"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email',
                      },
                    })}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div className="mb-2">
                  <label htmlFor="phone_number" className="block text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone_number"
                    type="tel"
                    placeholder="+254712345678"
                    className="w-full p-2 border border-gray-300 outline-0 !rounded"
                    {...register('phone_number', {
                      required: 'Phone is required',
                      pattern: {
                        value: /^[+]?[0-9\s\-()]{7,}$/,
                        message: 'Invalid phone number',
                      },
                    })}
                  />
                  {errors.phone_number && (
                    <p className="text-red-500 text-sm">{errors.phone_number.message}</p>
                  )}
                </div>

                {/* Country */}
                <div className="mb-2">
                  <label htmlFor="country" className="block text-gray-700 mb-1">
                    Country
                  </label>
                  <select
                    id="country"
                    className="w-full p-2 border border-gray-300 outline-0 !rounded bg-white"
                    {...register('country', { required: 'Country is required' })}
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-red-500 text-sm">{errors.country.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="mb-2">
                  <label htmlFor="password" className="block text-gray-700 mb-1">
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={passwordVisible ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      className="w-full p-2 pr-10 border border-gray-300 outline-0 !rounded"
                      {...register('password', {
                        required: 'Password required',
                        minLength: { value: 6, message: 'Min 6 chars' },
                      })}
                    />

                    <button
                      type="button"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400"
                    >
                      {passwordVisible ? <Eye /> : <EyeOff />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full bg-black text-white py-2 mt-3 !rounded disabled:opacity-50"
                >
                  {signupMutation.isPending ? 'Signing up...' : 'Signup'}
                </button>

                {serverError && <p className="text-red-500 mt-2 text-sm">{serverError}</p>}

                {/* Already have account */}
                <p className="text-center mt-4 text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            ) : (
              <div>
                <h3 className="text-center mb-4">Enter OTP</h3>

                <div className="flex justify-center gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      maxLength={1}
                      value={digit}
                      ref={(el) => {
                        if (el) inputRefs.current[index] = el;
                      }}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-12 text-center border"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending || otp.join('').length !== 6}
                  className="w-full bg-blue-500 text-white py-2 mt-4 disabled:opacity-50"
                >
                  {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                </button>

                <p className="text-center mt-3 text-sm">
                  {canResend ? (
                    <button onClick={resendOtp} className="text-blue-500">
                      Resend OTP
                    </button>
                  ) : (
                    `Resend in ${timer}s`
                  )}
                </p>

                {serverError && <p className="text-red-500 mt-2 text-center">{serverError}</p>}
              </div>
            )}
          </>
        )}

        {activeStep === 2 && <CreateShop sellerId={sellerId} setActiveStep={setActiveStep} />}

        {activeStep === 3 && (
          <div className="text-center">
            <h3 className="text-2xl font-semibold">Connect Bank Account</h3>
            <br />
            <button
              className="w-full m-auto flex items-center justify-center gap-3 text-lg bg-slate-bg text-white py-2 rounded-lg"
              onClick={connectStripe}
            >
              Connect with Stripe
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
