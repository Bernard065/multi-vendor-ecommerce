'use client';

import { usePathname } from 'next/navigation';
import useSidebar from '../../../hooks/useSidebar';
import React, { useEffect } from 'react';
import Box from '../box';
import useSeller from '../../../hooks/useSeller';
import Link from 'next/link';
import { Sidebar } from './sidebar.styles';
import SidebarItem from './sidebar.item';
import {
  Home,
  ListOrdered,
  CreditCard,
  SquarePlus,
  PackageSearch,
  CalendarPlus,
  BellPlus,
  Mail,
  Settings,
  BellRing,
  TicketPercent,
  LogOut,
} from 'lucide-react';
import SidebarMenu from './sidebar.menu';

const SideBar = () => {
  const { activeSidebar, setActiveSidebar } = useSidebar();
  const pathName = usePathname();
  const { seller, isLoading } = useSeller();

  useEffect(() => {
    setActiveSidebar(pathName);
  }, [pathName, setActiveSidebar]);

  const getIconColor = (route: string) => (activeSidebar === route ? '#0085ff' : '#969696');

  return (
    <Box
      css={{
        height: '100vh',
        zIndex: 202,
        position: 'sticky',
        padding: '8px',
        top: '0',
        overflowY: 'scroll',
        scrollbarWidth: 'none',
      }}
      className="sidebar-wrapper"
    >
      <Sidebar.Header>
        <Box>
          <Link href={'/'} className="flex justify-center text-center gap-2">
            <Box>
              {isLoading ? (
                <p className="text-gray-400">Loading...</p>
              ) : seller?.shop?.[0]?.name ? (
                <>
                  <h3 className="text-xl font-medium text-[#ecedee]">{seller.shop[0].name}</h3>
                  <h5 className="font-medium text-xs text-[#ecedeecf] whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">
                    {seller.shop[0].address}
                  </h5>
                </>
              ) : (
                <p className="text-gray-400">No shop yet</p>
              )}
            </Box>
          </Link>
        </Box>
      </Sidebar.Header>

      <div className="block my-3 h-full">
        <Sidebar.Body className="body sidebar">
          <SidebarItem
            title="Dashboard"
            icon={<Home color={getIconColor('/')} />}
            isActive={activeSidebar === '/dashboard'}
            href="/dashboard"
          />

          <div className="mt-2 block">
            <SidebarMenu title="Main Menu">
              <SidebarItem
                isActive={activeSidebar === '/orders'}
                title="Orders"
                href="/dashboard/orders"
                icon={<ListOrdered size={22} color={getIconColor('/dashboard/orders')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/payments'}
                title="Payments"
                href="/dashboard/payments"
                icon={<CreditCard size={22} color={getIconColor('/dashboard/payments')} />}
              />
            </SidebarMenu>

            <SidebarMenu title="Products">
              <SidebarItem
                isActive={activeSidebar === '/dashboard/create-product'}
                title="Create product"
                href="/dashboard/create-product"
                icon={<SquarePlus size={22} color={getIconColor('/dashboard/create-product')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/dashboard/all-products'}
                title="All Products"
                href="/dashboard/all-products"
                icon={<PackageSearch size={22} color={getIconColor('/dashboard/all-products')} />}
              />
            </SidebarMenu>
            <SidebarMenu title="Events">
              <SidebarItem
                isActive={activeSidebar === '/dashboard/create-event'}
                title="Create Event"
                href="/dashboard/create-event"
                icon={<CalendarPlus size={22} color={getIconColor('/dashboard/create-event')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/dashboard/all-events'}
                title="All Events"
                href="/dashboard/all-events"
                icon={<BellPlus size={22} color={getIconColor('/dashboard/all-events')} />}
              />
            </SidebarMenu>

            <SidebarMenu title="Controllers">
              <SidebarItem
                isActive={activeSidebar === '/dashboard/inbox'}
                title="Inbox"
                href="/dashboard/inbox"
                icon={<Mail size={22} color={getIconColor('/dashboard/inbox')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/dashboard/settings'}
                title="Settings"
                href="/dashboard/settings"
                icon={<Settings size={22} color={getIconColor('/dashboard/settings')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/dashboard/notifications'}
                title="Notifications"
                href="/dashboard/notifications"
                icon={<BellRing size={22} color={getIconColor('/dashboard/notifications')} />}
              />
            </SidebarMenu>

            <SidebarMenu title="Extras">
              <SidebarItem
                isActive={activeSidebar === '/dashboard/discount-codes'}
                title="Discount Codes"
                href="/dashboard/discount-codes"
                icon={<TicketPercent size={22} color={getIconColor('/dashboard/discount-codes')} />}
              />

              <SidebarItem
                isActive={activeSidebar === '/logout'}
                title="Logout"
                href="/"
                icon={<LogOut size={22} color={getIconColor('/logout')} />}
              />
            </SidebarMenu>
          </div>
        </Sidebar.Body>
      </div>
    </Box>
  );
};

export default SideBar;
