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
      { name: 'Dashboard', icon: Gauge, path: '/admin/dashboard' },
      { name: 'Analytics & Reports', icon: BarChart3, path: '/admin/analytics' },
    ],
  },
  {
    section: 'Platform Governance',
    items: [
      { name: 'User Management', icon: Users, path: '/admin/users' },
      { name: 'Landlord Hub', icon: BriefcaseBusiness, path: '/admin/users?role=Landlord' },
      { name: 'KYC & Verifications', icon: ShieldCheck, path: '/admin/verifications' },
    ],
  },
  {
    section: 'Listings & Content',
    items: [
      { name: 'All Rooms', icon: Home, path: '/admin/rooms' },
      { name: 'Pending Approvals', icon: FileClock, path: '/admin/rooms?status=Pending' },
    ],
  },
  {
    section: 'Financials',
    items: [
      { name: 'Revenue & Commission', icon: CreditCard, path: '/admin/revenue' },
    ],
  },
  {
    section: 'Support & System',
    items: [
      { name: 'Support Tickets', icon: Headphones, path: '/admin/tickets' },
      { name: 'System Logs', icon: Activity, path: '/admin/logs' },
      { name: 'Settings', icon: Settings, path: '/admin/settings' },
    ],
  },
];
