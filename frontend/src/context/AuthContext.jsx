import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { setAccessToken, clearAccessToken, hasAccessToken } from '../utils/tokenManager';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from './ThemeContext';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const { loadPreferencesFromUser, resetPreferences } = useTheme();

    useEffect(() => {
        const checkAuth = async () => {
            // With in-memory tokens, we always need to try refresh on page load
            // since memory is cleared on refresh. The refresh token cookie persists.
            // Mark this as initial auth check to suppress 401 console noise
            window.__initialAuthCheck = true;

            try {
                // First, try to refresh the token since access token is lost on page refresh
                // Import axios directly to avoid circular interceptor issues
                const axios = (await import('axios')).default;
                const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrf_refresh_token='))?.split('=')[1];
                const headers = csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {};

                const refreshResponse = await axios.post(
                    `${import.meta.env.VITE_API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true, headers }
                );

                if (refreshResponse.data.access_token) {
                    setAccessToken(refreshResponse.data.access_token);
                }
            } catch (refreshError) {
                // Refresh failed - user is not logged in or session expired
                // This is expected for new visitors
                window.__initialAuthCheck = false;
                loadPreferencesFromUser(null);
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/accounts/profile');
                const userData = response.data.user;
                setUser({ ...userData, _picTimestamp: Date.now() });
                // Load user preferences into ThemeContext
                if (userData.preferences) {
                    loadPreferencesFromUser(userData.preferences);
                } else {
                    loadPreferencesFromUser(null);
                }
            } catch (error) {
                // Expected if truly logged out or refresh failed.
                // Don't log this as it's expected behavior
                loadPreferencesFromUser(null);
            }
            window.__initialAuthCheck = false;
            setLoading(false);
        };
        checkAuth();
    }, [loadPreferencesFromUser]);

    // Handle fade-out animation when loading completes
    useEffect(() => {
        if (!loading && showOverlay) {
            setFadeOut(true);
            const timer = setTimeout(() => {
                setShowOverlay(false);
            }, 300); // Match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [loading, showOverlay]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            // Store access token in memory only (not localStorage for XSS protection)
            setAccessToken(response.data.access_token);

            // Fetch user profile (login endpoint only returns token, not user info)
            const profileResponse = await api.get('/accounts/profile');
            const userData = profileResponse.data.user;
            setUser({ ...userData, _picTimestamp: Date.now() });

            // Load user preferences into ThemeContext
            if (userData.preferences) {
                loadPreferencesFromUser(userData.preferences);
            } else {
                loadPreferencesFromUser(null);
            }

            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            // Clear access token in memory
            clearAccessToken();
            setUser(null);
            // Reset preferences state
            resetPreferences();
            // Redirect to login page with full page reload to clear all state
            window.location.href = '/';
        }
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/accounts/profile');
            // Add timestamp for cache busting on profile pictures
            setUser({ ...response.data.user, _picTimestamp: Date.now() });
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {showOverlay && (
                <div
                    className="position-fixed top-0 start-0 w-100 vh-100 d-flex justify-content-center align-items-center"
                    style={{
                        backgroundColor: 'rgba(var(--bs-body-bg-rgb), 0.30)',
                        zIndex: 9999,
                        backdropFilter: 'blur(4px)',
                        opacity: fadeOut ? 0 : 1,
                        transition: 'opacity 300ms ease-out'
                    }}
                >
                    <LoadingSpinner />
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
