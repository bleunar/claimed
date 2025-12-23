import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { setAccessToken, clearAccessToken, hasAccessToken } from '../utils/tokenManager';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token } = response.data;

            // Store in memory (not localStorage for XSS protection)
            setAccessToken(access_token);

            // Fetch user profile immediately after login
            const profileResponse = await api.get('/accounts/profile');
            setUser({ ...profileResponse.data.user, _picTimestamp: Date.now() });
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.error("Logout endpoint failed", e);
        } finally {
            // Clear in-memory token
            clearAccessToken();
            // Clear preferences (these can stay in localStorage as they're not sensitive)
            localStorage.removeItem('theme');
            localStorage.removeItem('toastPosition');
            setUser(null);
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

    if (loading) {
        return (
            <div className="vh-100 d-flex justify-content-center align-items-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

