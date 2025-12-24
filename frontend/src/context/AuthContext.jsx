import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { setAccessToken, clearAccessToken, hasAccessToken } from '../utils/tokenManager';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOverlay, setShowOverlay] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            // With in-memory tokens, we always need to try refresh on page load
            // since memory is cleared on refresh. The refresh token cookie persists.
            // Mark this as initial auth check to suppress 401 console noise
            window.__initialAuthCheck = true;
            try {
                const response = await api.get('/accounts/profile');
                setUser({ ...response.data.user, _picTimestamp: Date.now() });
            } catch (error) {
                // Expected if truly logged out or refresh failed.
                // Don't log this as it's expected behavior
            }
            window.__initialAuthCheck = false;
            setLoading(false);
        };
        checkAuth();
    }, []);

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
            setUser({ ...profileResponse.data.user, _picTimestamp: Date.now() });

            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
            setLoading(true)
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            // Clear access token in memory
            clearAccessToken();
            setUser(null);
            setLoading(false)
            // Redirect to login page with full page reload to clear all state
            useNavigate("/")
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
                        backgroundColor: 'rgba(var(--bs-body-bg-rgb), 0.85)',
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

