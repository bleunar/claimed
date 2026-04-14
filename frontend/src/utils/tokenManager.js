/**
 * In-memory token manager for secure JWT storage.
 * 
 * Tokens are stored in JavaScript memory instead of localStorage/sessionStorage
 * to protect against XSS attacks. The trade-off is that tokens are lost on
 * page refresh, but the refresh token (in HTTP-only cookie) can restore the session.
 */

let accessToken = null;

/**
 * Get the current access token
 * @returns {string|null} The access token or null if not set
 */
export const getAccessToken = () => accessToken;

/**
 * Set the access token
 * @param {string|null} token - The access token to store
 */
export const setAccessToken = (token) => {
    accessToken = token;
};

/**
 * Clear the access token (for logout)
 */
export const clearAccessToken = () => {
    accessToken = null;
};

/**
 * Check if an access token exists
 * @returns {boolean}
 */
export const hasAccessToken = () => accessToken !== null;
