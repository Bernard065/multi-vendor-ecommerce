'use client';

import { Eye, EyeOff } from 'lucide-react';
import GoogleButton from '../../../shared/components/google-button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

type FormData = {
  name: string;
  email: string;
  password: string;
};

interface ApiErrorResponse {
  message?: string;
}

const Signup = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [timer, setTimer] = useState(60);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [userData, setUserData] = useState<FormData | null>(null);

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
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/user-registration`,
        data
      );
      return response.data;
    },

    onSuccess: (_, formData) => {
      setServerError(null);
      setUserData(formData);
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
      if (!userData) return;

      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-user`, {
        ...userData,
        otp: otp.join(''),
      });
      return response.data;
    },

    onSuccess: () => {
      setServerError(null);
      router.push('/login');
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
    if (!canResend || !userData) return;

    try {
      setServerError(null);

      await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/resend-otp`, {
        email: userData.email,
      });

      setTimer(60);
      setCanResend(false);
      startResendTimer();
    } catch (error) {
      console.error(error);
      setServerError('Failed to resend OTP. Try again.');
    }
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-gray-100">
      <h1 className="text-4xl font-semibold text-center">Signup</h1>

      <div className="flex justify-center mt-6">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <h3 className="text-2xl font-semibold text-center mb-2">Signup to OmniHub</h3>

          <p className="text-center text-gray-500 mb-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500">
              Sign In
            </Link>
          </p>

          <GoogleButton />

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t" />
            <span className="px-3">or Sign Up with Email</span>
            <div className="flex-1 border-t" />
          </div>

          {!showOtp ? (
            <form onSubmit={handleSubmit(onSubmit)}>
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
        </div>
      </div>
    </div>
  );
};

export default Signup;
