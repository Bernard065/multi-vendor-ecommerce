'use client';

import Link from 'next/link';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

type FormData = {
  email: string;
  password: string;
};

type ApiErrorResponse = {
  message?: string;
};

const ForgotPassword = () => {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const [serverError, setServerError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  // Timer
  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  // Forgot Password Mutation
  const requestOtpMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/forgot-password-user`,
        { email }
      );

      return response.data;
    },

    onSuccess: (_, { email }) => {
      setUserEmail(email);
      setStep('otp');
      setServerError(null);
      setCanResend(false);
      startResendTimer();
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Something went wrong. Try again.');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!userEmail) return;

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-forgot-password-user`,
        { email: userEmail, otp: otp.join('') }
      );

      return response.data;
    },

    onSuccess: () => {
      setStep('reset');
      setServerError(null);
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Something went wrong. Try again.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      if (!password || !userEmail) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/reset-password-user`,
        { email: userEmail, newPassword: password }
      );

      return response.data;
    },

    onSuccess: () => {
      setUserEmail('email');
      setServerError(null);
      toast.success('Password reset successfully! Please login with new password');

      router.push('/login');
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Failed to reset password. Try again.');
    },
  });

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

  const onSubmitEmail = ({ email }: { email: string }) => {
    requestOtpMutation.mutate({ email });
  };

  const onSubmitPassword = ({ password }: { password: string }) => {
    if (!userEmail) {
      setServerError('Session expired. Please start the process again.');
      return;
    }
    resetPasswordMutation.mutate({ password });
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-gray-100">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">
        Forgot Password
      </h1>

      <p className="text-center text-lg font-medium py-3 text-black/60">
        Enter your email to reset your password
      </p>

      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          {step === 'email' && (
            <>
              <h3 className="text-3xl font-semibold text-center mb-2">Reset Password</h3>

              <p className="text-center text-gray-500 mb-6">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-500">
                  Login
                </Link>
              </p>

              <form onSubmit={handleSubmit(onSubmitEmail)}>
                {/* Email */}
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 mb-1">
                    Email
                  </label>

                  <input
                    type="email"
                    id="email"
                    placeholder="you@example.com"
                    className="w-full p-2 border border-gray-300 !rounded outline-0"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address',
                      },
                    })}
                  />

                  {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={requestOtpMutation.isPending}
                  className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestOtpMutation.isPending ? 'Sending link...' : 'Send Reset Link'}
                </button>

                {/* Error */}
                {serverError && <p className="text-red-500 text-sm mt-3">{serverError}</p>}
              </form>
            </>
          )}

          {step === 'otp' && (
            <>
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
                disabled={verifyOtpMutation.isPending}
                className="w-full bg-blue-500 text-white py-2 mt-4 disabled:opacity-50"
              >
                {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
              </button>

              <p className="text-center mt-3 text-sm">
                {canResend && userEmail ? (
                  <button
                    onClick={() => requestOtpMutation.mutate({ email: userEmail })}
                    className="text-blue-500 text-center"
                  >
                    Resend OTP
                  </button>
                ) : (
                  `Resend in ${timer}s`
                )}
              </p>

              {serverError && <p className="text-red-500 mt-2 text-center">{serverError}</p>}
            </>
          )}

          {step === 'reset' && (
            <>
              <h3 className="text-xl font-semibold text-center mb-4">Reset Password</h3>
              <form onSubmit={handleSubmit(onSubmitPassword)}>
                <div className="mb-2">
                  <label htmlFor="password" className="block text-gray-700 mb-1">
                    New Password
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
                  disabled={resetPasswordMutation.isPending}
                  className="w-full bg-black text-white py-2 mt-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </button>

                {serverError && <p className="text-red-500 text-sm mt-3">{serverError}</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
