// src/components/layout/landlord/LandlordBottomNavBar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, List, Mail, User } from 'lucide-react';
import { useSocket } from '../../../context/SocketContext'; 

function LandlordBottomNavBar() {
  
  const { unreadNotificationCount } = useSocket();

  const navItems = [
    { path: '/landlord/overview', Icon: LayoutDashboard, name: 'Dashboard', count: 0 },
    { path: '/landlord/calendar', Icon: Calendar, name: 'Calendar', count: 0 },
    { path: '/landlord/my-rooms', Icon: List, name: 'Listings', count: 0 },
    { path: '/landlord/inbox', Icon: Mail, name: 'Inbox', count: unreadNotificationCount },
    { path: '/landlord/profile', Icon: User, name: 'Me', count: 0 },
  ];

  // --- [THE CHANGE IS HERE] ---
  // Updated the active color to a professional "teal" (like WhatsApp)
  // and set the hover color to match.
  const navLinkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 group ${
      isActive ? 'text-teal-600' : 'text-gray-500 hover:text-teal-600'
    }`;
  // --- [END OF CHANGE] ---

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg md:hidden z-30">
      <div className="flex justify-around items-center h-full">
        {navItems.map((item) => (
          <NavLink to={item.path} key={item.name} className={navLinkClass}>
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 1.5} // Active = Bold, Inactive = Thin
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                  {/* Notification Badge */}
                  {item.count > 0 && (
                    <span className="absolute -top-1 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {item.count}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default LandlordBottomNavBar;