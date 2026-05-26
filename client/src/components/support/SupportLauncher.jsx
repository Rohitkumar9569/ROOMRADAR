import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import SupportTicketModal from './SupportTicketModal';

const getContextFromPath = (path = '') => {
  if (path.startsWith('/landlord/add-room') || path.startsWith('/landlord/edit-room') || path.startsWith('/landlord/my-rooms')) {
    return {
      category: 'listing',
      subject: 'Room listing or approval issue',
      message: 'I need help with my room listing or approval status. Details:\n',
      scope: 'landlord',
    };
  }
  if (path.startsWith('/landlord/applications') || path.startsWith('/landlord/calendar')) {
    return {
      category: 'booking',
      subject: 'Landlord booking or guest issue',
      message: 'I need help with a guest booking, application, or stay schedule. Details:\n',
      scope: 'landlord',
    };
  }
  if (path.includes('/inbox')) {
    return {
      category: 'booking',
      subject: 'Chat or booking conversation issue',
      message: 'I need help with a chat or booking conversation. Details:\n',
      scope: path.startsWith('/landlord') ? 'landlord' : 'travelling',
    };
  }
  if (path.includes('/report-damage')) {
    return {
      category: 'damage',
      subject: 'Damage report or deposit issue',
      message: 'I need help with a damage report or security deposit issue. Details:\n',
      scope: 'travelling',
    };
  }
  if (path.includes('/payment')) {
    return {
      category: 'payment',
      subject: 'Booking payment or confirmation issue',
      message: 'I need help with a booking payment or confirmation issue. Details:\n',
      scope: 'travelling',
    };
  }
  if (path.includes('/agreement')) {
    return {
      category: 'booking',
      subject: 'Agreement or confirmed booking issue',
      message: 'I need help with my rental agreement or confirmed booking. Details:\n',
      scope: 'travelling',
    };
  }
  if (path.includes('/applications') || path.includes('/book')) {
    return {
      category: 'booking',
      subject: 'Booking or payment issue',
      message: 'I need help with a booking/payment issue. Details:\n',
      scope: 'travelling',
    };
  }
  if (path.startsWith('/profile') || path.startsWith('/landlord/profile')) {
    return {
      category: 'account',
      subject: 'Profile or account issue',
      message: 'I need help with my profile/account. Details:\n',
      scope: path.startsWith('/landlord') ? 'landlord' : 'travelling',
    };
  }
  if (path.startsWith('/room/')) {
    return {
      category: 'listing',
      subject: 'Room information issue',
      message: 'I want to report or ask about this room. Details:\n',
      scope: 'travelling',
    };
  }
  return {
    category: 'other',
    subject: 'RoomRadar support request',
    message: 'I need help with RoomRadar. Details:\n',
    scope: 'platform',
  };
};

function SupportLauncher() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const context = useMemo(() => getContextFromPath(location.pathname), [location.pathname]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-[calc(var(--rr-bottom-nav-height,72px)+1rem)] left-3 z-[65] inline-flex h-11 items-center gap-2 rounded-full border border-cyan-200 bg-white/94 px-3 text-xs font-black text-cyan-700 shadow-[0_12px_34px_rgba(8,145,178,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-400/25 dark:bg-slate-950/88 dark:text-cyan-200 dark:hover:bg-slate-900 md:bottom-5 md:left-5"
          aria-label="Message RoomRadar support"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-white">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Support</span>
        </button>
      )}
      <SupportTicketModal
        open={open}
        onClose={() => setOpen(false)}
        defaultCategory={context.category}
        defaultSubject={context.subject}
        defaultMessage={context.message}
        context={{ scope: context.scope, path: location.pathname }}
      />
    </>
  );
}

export default SupportLauncher;
