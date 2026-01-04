/**
 * Formats a date string into a relative time (e.g. "5 mins ago") or absolute date
 * relative to Philippine Time (UTC+8) logic as requested.
 * 
 * @param {string} dateString - UTC Date string
 * @returns {string} - Formatted time string
 */
export const formatRelativeTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString); // Local browser time (converted from UTC)
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    // If more than 24 hours (86400 seconds)
    if (diffInSeconds > 86400) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Relative Formatting
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const mins = Math.floor(diffInSeconds / 60);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    } else {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
};
