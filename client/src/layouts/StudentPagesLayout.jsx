import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNavBar from '../components/layout/student/BottomNavBar'; 

function StudentPagesLayout() {
    const { switchRole, activeRole } = useAuth();

    useEffect(() => {
        if (activeRole !== 'student') {
            switchRole('student');
        }
    }, [activeRole, switchRole]);

    return (
        <>
            <Outlet />
            <BottomNavBar />
        </>
    );
}

export default StudentPagesLayout;