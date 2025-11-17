import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, List, Mail, User } from 'lucide-react';
import { useSocket } from '../../../context/SocketContext'; 
import { motion } from 'framer-motion'; //  Import Motion

function LandlordBottomNavBar() {
  const { unreadNotificationCount } = useSocket();

  const navItems = [
    { path: '/landlord/overview', Icon: LayoutDashboard, name: 'Dashboard', count: 0 },
    { path: '/landlord/calendar', Icon: Calendar, name: 'Calendar', count: 0 },
    { path: '/landlord/my-rooms', Icon: List, name: 'Listings', count: 0 },
    { path: '/landlord/inbox', Icon: Mail, name: 'Inbox', count: unreadNotificationCount },
    { path: '/landlord/profile', Icon: User, name: 'Me', count: 0 },
  ];

  return (
    //  Container: Compact (h-14), Glassmorphism, No extra padding at bottom
    <nav className="fixed bottom-0 left-0 right-0 z-50 
                    h-14 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 
                    md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      
      <div className="flex justify-around items-center h-full px-1">
        {navItems.map((item) => (
          <NavLink 
            to={item.path} 
            key={item.name} 
            className="relative flex-1 flex flex-col items-center justify-center h-full"
          >
            {({ isActive }) => (
              <motion.div 
                className="relative flex flex-col items-center justify-center w-full h-full"
                whileTap={{ scale: 0.9 }} // Click Press Effect
              >
                {/* ✨ Teal Water Splash Effect */}
                {isActive && (
                  <motion.div
                    layoutId="landlord-nav-bubble"
                    className="absolute inset-0 m-auto w-10 h-10 bg-teal-50 rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}

                <div className="relative">
                  <item.Icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-colors duration-200 ${isActive ? 'text-teal-600' : 'text-gray-400'}`}
                  />
                  
                  {/* Notification Badge */}
                  {item.count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center 
                                   rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {item.count}
                    </span>
                  )}
                </div>

                <span className={`text-[9px] font-medium mt-0.5 transition-colors duration-200 
                  ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>
                  {item.name}
                </span>

              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default LandlordBottomNavBar;