import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

import { Speedometer2, People, Building, BoxSeam, Tools, JournalText, List, ListOl, Grid, Person, ExclamationTriangleFill } from 'react-bootstrap-icons';
import Breadcrumbs from '../components/Breadcrumbs';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const NavigationOptions = [
        { path: '/dashboard', name: 'Dashboard', icon: <Grid />, requiredRoles: ['admin', 'it_head', 'it_technician', 'lab_head', 'lab_assistant'], end: true },
        { path: '/dashboard/accounts', name: 'Accounts', icon: <People />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/laboratories', name: 'Laboratories', icon: <Building />, requiredRoles: ['admin', 'it_head', 'lab_head', 'it_technician', 'lab_assistant'] },
        { path: '/dashboard/components', name: 'Components', icon: <Tools />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/activities', name: 'Activity Logs', icon: <ListOl />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/issues', name: 'Lab Issues', icon: <ExclamationTriangleFill />, requiredRoles: ['admin', 'it_head', 'lab_head'] },
        { path: '/dashboard/profile', name: 'My Account', icon: <Person />, requiredRoles: ['admin', 'it_head', 'it_technician', 'lab_head', 'lab_assistant'] },

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

    return (
        <div className="d-flex" style={{ height: '100dvh', overflow: 'hidden' }}>
            <Sidebar isOpen={isSidebarOpen} isMobile={isMobile} options={NavigationOptions} onClose={() => setIsSidebarOpen(false)} onToggle={toggleSidebar} />

            <div className="d-flex flex-column flex-grow-1" style={{ width: '100%', overflow: 'hidden' }}>
                <main className="flex-grow-1 p-0 m-0 d-flex flex-column" style={{ overflowY: 'auto' }}>
                    <Navbar onToggleSidebar={toggleSidebar} sideBarToggled={isSidebarOpen} />
                    <div className="container-fluid flex-grow-1 p-3">
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
