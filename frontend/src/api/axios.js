import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,  // Required for cross-subdomain cookie auth
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
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
                // Refresh request - use withCredentials to send cookies
                const response = await axios.post('/auth/refresh', {}, { withCredentials: true });
                const { access_token } = response.data;

                localStorage.setItem('access_token', access_token);
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

                processQueue(null, access_token);
                isRefreshing = false;

                originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;

                // Only log out if we had a token (user was logged in)
                const hadToken = localStorage.getItem('access_token');
                localStorage.removeItem('access_token');

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
                localStorage.removeItem('access_token');
                toast.error('Your account has been suspended.', { duration: 4000 });
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default api;

