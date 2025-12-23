import axios from 'axios';
import toast from 'react-hot-toast';
import { getAccessToken, setAccessToken, clearAccessToken, hasAccessToken } from '../utils/tokenManager';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,  // Required for cross-subdomain cookie auth
});

api.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);


let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Don't try to refresh on login endpoint
        if (originalRequest.url.includes('/auth/login')) {
            return Promise.reject(error);
        }

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // Queue the request if already refreshing
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {}, { withCredentials: true });
                const { access_token } = response.data;

                setAccessToken(access_token);
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

                processQueue(null, access_token);
                isRefreshing = false;

                originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;

                // Only log out if we had a token (user was logged in)
                const hadToken = hasAccessToken();
                clearAccessToken();

                if (hadToken && window.location.pathname !== '/') {
                    // Show toast and delay redirect so user can see it
                    toast.error('Session expired. Please log in again.', {
                        duration: 3000,
                    });

                    // Delay redirect to allow toast to be visible
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                }

                return Promise.reject(refreshError);
            }
        }

        // Handle 403 Forbidden - account suspended or deleted
        if (error.response?.status === 403) {
            const message = error.response?.data?.msg || '';
            if (message.includes('suspended') || message.includes('not active')) {
                clearAccessToken();
                toast.error('Your account has been suspended.', { duration: 4000 });
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return Promise.reject(error);
            }
        }

        // Handle 419 Role Mismatch - require password re-authentication
        if (error.response?.status === 419 && error.response?.data?.role_mismatch) {
            const originalRequest = error.config;

            // Prevent infinite loops
            if (originalRequest._reauthRetry) {
                return Promise.reject(error);
            }

            originalRequest._reauthRetry = true;

            // Import the emitter dynamically to avoid circular dependencies
            const { reauthEmitter } = await import('../components/ReauthModal');

            return new Promise((resolve, reject) => {
                // Set up one-time listener for re-auth result
                const unsubscribe = reauthEmitter.subscribe((newToken) => {
                    unsubscribe();

                    if (newToken) {
                        // Retry the original request with new token
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    } else {
                        reject(error);
                    }
                });

                // Emit event to show the modal
                reauthEmitter.emit({
                    message: error.response?.data?.msg || 'Your role has been changed. Please verify your identity.',
                    currentRole: error.response?.data?.current_role
                });
            });
        }

        return Promise.reject(error);
    }
);

export default api;

