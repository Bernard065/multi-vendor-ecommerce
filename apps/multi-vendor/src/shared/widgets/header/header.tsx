'use client';

import Link from 'next/link';
import React from 'react';
import { HeartIcon, Search, ShoppingCartIcon, User } from 'lucide-react';
import HeaderBottom from './header-bottom';
import useUser from '../../../hooks/useUser';

const Header = () => {
  const { user, isLoading, isError } = useUser();

  return (
    <div className="w-full bg-white">
      <div className="m-auto flex w-[80%] items-center justify-between py-5">
        <div>
          <Link href={'/'}>
            <span className="text-2xl font-semibold">OmniHub</span>
          </Link>
        </div>
        <div className="relative w-[50%]">
          <input
            type="text"
            placeholder="Search for products..."
            className="h-[55px] w-full border-[2.5px] border-primary px-4 font-Poppins font-medium outline-none"
          />
          <div className="absolute right-0 top-0 flex h-[55px] w-[60px] cursor-pointer items-center justify-center bg-primary">
            <Search color="white" />
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Link
              href={'/login'}
              className="border-2 w-[50px] flex items-center justify-center rounded-full border-border"
            >
              <User />
            </Link>

            <Link href={'/login'}>
              <span className="block font-medium">Hello,</span>
              <span className="font-semibold">
                {isLoading ? 'Loading...' : user ? user.name.split(' ')[0] : 'Sign In'}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-5">
            <Link href={'/wishlist'} className="relative">
              <HeartIcon />
              <div className="w-6 h-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px]">
                <span className="text-white font-medium text-sm">0</span>
              </div>
            </Link>

            <Link href={'/cart'} className="relative">
              <ShoppingCartIcon />
              <div className="w-6 h-6 border-2 border-white bg-red-500 rounded-full flex items-center justify-center absolute top-[-10px] right-[-10px]">
                <span className="text-white font-medium text-sm">0</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-300" />
      <HeaderBottom />
    </div>
  );
};

export default Header;
