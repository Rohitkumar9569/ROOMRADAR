import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  FileClock,
  Gauge,
  Headphones,
  Home,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const adminNavigation = [
  {
    section: 'Main',
    items: [
      { name: 'Dashboard', icon: Gauge, path: '/admin/dashboard', permission: 'dashboard:view' },
      { name: 'Analytics & Reports', icon: BarChart3, path: '/admin/analytics', permission: 'analytics:view' },
    ],
  },
  {
    section: 'Platform Governance',
    items: [
      { name: 'User Management', icon: Users, path: '/admin/users', permission: 'users:view' },
      { name: 'Landlord Hub', icon: BriefcaseBusiness, path: '/admin/users?role=Landlord', permission: 'users:view' },
      { name: 'KYC & Verifications', icon: ShieldCheck, path: '/admin/verifications', badgeKey: 'pendingKycUsersCount', permission: 'verifications:view' },
    ],
  },
  {
    section: 'Listings & Content',
    items: [
      { name: 'All Rooms', icon: Home, path: '/admin/rooms', permission: 'rooms:view' },
      { name: 'Pending Approvals', icon: FileClock, path: '/admin/rooms?status=Pending', badgeKey: 'pendingRoomsCount', permission: 'rooms:view' },
    ],
  },
  {
    section: 'Financials',
    items: [
      { name: 'Revenue & Commission', icon: CreditCard, path: '/admin/revenue', permission: 'revenue:view' },
    ],
  },
  {
    section: 'Support & System',
    items: [
      { name: 'Support Tickets', icon: Headphones, path: '/admin/tickets', badgeKey: 'supportOpenCount', permission: 'tickets:manage' },
      { name: 'System Logs', icon: Activity, path: '/admin/logs', permission: 'logs:view' },
      { name: 'Settings', icon: Settings, path: '/admin/settings', permission: 'settings:manage' },
    ],
  },
];

export const getAdminNavigationBadge = (item, counts = {}) => {
  const value = Number(counts?.[item?.badgeKey] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const formatAdminBadgeCount = (count = 0) => {
  const value = Number(count || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  return value > 99 ? '99+' : String(value);
};
