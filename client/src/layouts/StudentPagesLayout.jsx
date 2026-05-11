import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function StudentPagesLayout() {
    const { switchRole, activeRole } = useAuth();
    const location = useLocation();

    useEffect(() => {
        if (activeRole !== 'student') {
            switchRole('student');
        }
    }, [activeRole, switchRole]);

    const isProfileSection = location.pathname.startsWith('/profile');
    const isHomePage = location.pathname === '/';
    const needsTopPadding = !isHomePage && !isProfileSection;

    return (
        <div className="min-h-screen bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text">
            <div className={needsTopPadding ? 'pt-16 md:pt-0' : ''}>
                <Outlet />
            </div>
        </div>
    );
}

export default StudentPagesLayout;
