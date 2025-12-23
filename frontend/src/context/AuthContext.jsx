import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await api.get('/accounts/profile');
                    setUser({ ...response.data.user, _picTimestamp: Date.now() });
                } catch (error) {
                    console.error("Auth check failed:", error);
                    localStorage.removeItem('access_token');
                }
            } else {
                // If no token, maybe we have a cookie? Try to refresh.
                try {
                    // We use the 'api' instance here. If it fails 401 (no token),
                    // the interceptor will try to refresh. If refresh succeeds,
                    // the original request (profile) will be retried and succeed.
                    const response = await api.get('/accounts/profile');
                    setUser({ ...response.data.user, _picTimestamp: Date.now() });
                } catch (error) {
                    // Expected if truly logged out. Do nothing.
                    // Interceptor might have redirected to / if refresh failed.
                    // But for initial load, if we stay on /login, that is fine.
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token } = response.data; // refresh_token is in cookie now
            localStorage.setItem('access_token', access_token);

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
            localStorage.removeItem('access_token');
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
