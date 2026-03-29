'use client';

import { Eye, EyeOff } from 'lucide-react';
import GoogleButton from '../../../shared/components/google-button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

type FormData = {
  email: string;
  password: string;
};

type ApiErrorResponse = {
  message?: string;
};

const Login = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  // Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/login-user`,
        data,
        {
          withCredentials: true,
        }
      );

      return response.data;
    },

    onSuccess: () => {
      setServerError(null);
      // Invalidate user query to force refetch with new session
      queryClient.invalidateQueries({ queryKey: ['user'] });
      router.push('/');
    },

    onError: (error: AxiosError<ApiErrorResponse>) => {
      setServerError(error.response?.data?.message || 'Login failed. Try again.');
    },
  });

  // Submit
  const onSubmit = (data: FormData) => {
    setServerError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="w-full py-10 min-h-[85vh] bg-gray-100">
      <h1 className="text-4xl font-Poppins font-semibold text-black text-center">Login</h1>
      <p className="text-center text-lg font-medium py-3 text-black/60">Home . Login</p>

      <div className="w-full flex justify-center">
        <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
          <h3 className="text-3xl font-semibold text-center mb-2">Login to OmniHub</h3>

          <p className="text-center text-gray-500 mb-4">
            Don't have an account?{' '}
            <Link href="/signup" className="text-blue-500">
              Sign Up
            </Link>
          </p>

          <GoogleButton />

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3">or Sign In with Email</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div className="mb-3">
              <label htmlFor="email" className="block text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="bernardbebeni@gmail.com"
                className="w-full p-2 border border-gray-300 outline-0 !rounded"
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

            {/* Password */}
            <div className="mb-3">
              <label htmlFor="password" className="block text-gray-700 mb-1">
                Password
              </label>

              <div className="relative">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  id="password"
                  placeholder="Min. 6 characters"
                  className="w-full p-2 pr-10 border border-gray-300 outline-0 !rounded"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
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

              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            {/* Remember + Forgot */}
            <div className="flex justify-between items-center my-4">
              <label className="flex items-center text-gray-600">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                />
                Remember Me
              </label>

              <Link href="/forgot-password" className="text-blue-500 text-sm">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full text-lg bg-black text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </button>

            {/* Error */}
            {serverError && <p className="text-red-500 text-sm mt-2">{serverError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
