import React, { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

import { Speedometer2, People, DoorClosed, BoxSeam, Keyboard, JournalText, List, ListOl, Grid, Person } from 'react-bootstrap-icons';
import Breadcrumbs from '../components/Breadcrumbs';

const DashboardLayout = () => {
    const { user, loading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const NavigationOptions = [
        { path: '/dashboard', name: 'Dashboard', icon: <Grid />, requiredRoles: ['admin', 'it_head', 'it_technician', 'lab_head', 'lab_assistant'], end: true },
        { path: '/dashboard/laboratories', name: 'Laboratories', icon: <DoorClosed />, requiredRoles: ['admin', 'it_head', 'lab_head', 'it_technician', 'lab_assistant'] },
        { path: '/dashboard/components', name: 'PC Components', icon: <Keyboard />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/accounts', name: 'Accounts', icon: <People />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/profile', name: 'My Profile', icon: <Person />, requiredRoles: ['admin', 'it_head', 'it_technician', 'lab_head', 'lab_assistant'] },

    ];

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            setIsMobile(mobile);

            if (mobile) {
                setIsSidebarOpen(false);
            } else if (width >= 1200) {
                setIsSidebarOpen(true); // XL: Expanded
            } else {
                setIsSidebarOpen(false); // MD/LG: Shrinked
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Redirect to login if not authenticated (after loading completes)
    // This must be AFTER all hooks to follow React's rules of hooks
    if (!loading && !user) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="d-flex" style={{ height: '100dvh', overflow: 'hidden' }}>
            <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} options={NavigationOptions} onClose={() => setIsSidebarOpen(false)} onToggle={toggleSidebar} />

            <div className="d-flex flex-column flex-grow-1" style={{ width: '100%', overflow: 'hidden' }}>
                <main className="flex-grow-1 p-0 m-0 d-flex flex-column" style={{ overflowY: 'auto' }}>
                    <Navbar onToggleSidebar={toggleSidebar} sideBarToggled={isSidebarOpen} />
                    <div className="container-fluid flex-grow-1 p-3 py-1">
                        <Breadcrumbs />
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {isMobile && isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 999
                    }}
                />
            )}
        </div>
    );
};

export default DashboardLayout;
