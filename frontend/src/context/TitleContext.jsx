import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TitleContext = createContext();

// Route-based title mapping
const routeTitles = {
    '/': 'Login',
    '/dashboard': 'Dashboard',
    '/dashboard/accounts': 'Accounts',
    '/dashboard/locations': 'Locations',
    '/dashboard/laboratories': 'Laboratories',
    '/dashboard/departments': 'Departments',
    '/dashboard/components': 'Components',
    '/dashboard/profile': 'My Profile',
    '/dashboard/lab-resources': 'Lab Resources',
};

// App name suffix
const APP_NAME = 'CLAIMS';

export const TitleProvider = ({ children }) => {
    const [overrideTitle, setOverrideTitle] = useState(null);
    const location = useLocation();

    // Get title based on current route
    const getRouteTitle = () => {
        // Check for exact match first
        if (routeTitles[location.pathname]) {
            return routeTitles[location.pathname];
        }

        // Check for partial matches (for dynamic routes like /dashboard/laboratories/:id)
        const pathParts = location.pathname.split('/');
        for (let i = pathParts.length; i > 0; i--) {
            const partialPath = pathParts.slice(0, i).join('/');
            if (routeTitles[partialPath]) {
                return routeTitles[partialPath];
            }
        }

        return 'Page';
    };

    // Current title (override takes priority)
    const currentTitle = overrideTitle || getRouteTitle();
    const fullTitle = `${APP_NAME} | ${currentTitle}`;

    // Update document.title when title changes
    useEffect(() => {
        document.title = fullTitle;
    }, [fullTitle]);

    // Clear override when route changes
    useEffect(() => {
        setOverrideTitle(null);
    }, [location.pathname]);

    // Set a temporary override title (for modals, etc.)
    const setTitle = (title) => {
        setOverrideTitle(title);
    };

    // Reset to route-based title
    const resetTitle = () => {
        setOverrideTitle(null);
    };

    return (
        <TitleContext.Provider value={{ currentTitle, setTitle, resetTitle }}>
            {children}
        </TitleContext.Provider>
    );
};

// Hook to use title context
export const useTitle = () => {
    const context = useContext(TitleContext);
    if (!context) {
        throw new Error('useTitle must be used within a TitleProvider');
    }
    return context;
};

export default TitleContext;
