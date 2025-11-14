import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

function RootLayout() {
    const location = useLocation();
    
    // We only need to determine if padding is needed for the mobile nav bar.
    // We can check if the path belongs to any section that has a bottom nav.
    const path = location.pathname;
    const hasBottomNav = 
        !path.startsWith('/admin') && 
        !path.startsWith('/login') && 
        !path.startsWith('/signup');

    const wrapperClass = hasBottomNav ? 'pb-16 md:pb-0' : '';

    return (
        <div className={wrapperClass}>
            <Outlet />
        </div>
    );
}

export default RootLayout;