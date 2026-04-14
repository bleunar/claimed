/**
 * Effects Configuration
 * Reads effect settings from environment variables
 */

/**
 * Check if seasonal effects are enabled
 * Uses VITE_SEASONAL_EFFECTS env variable (defaults to true)
 */
export const isSeasonalEffectsEnabled = () => {
    const value = import.meta.env.VITE_SEASONAL_EFFECTS;
    // Default to true if not set, otherwise check for 'true' string
    return value === undefined || value === 'true';
};

/**
 * Check if birthday celebration is enabled
 * Uses VITE_BIRTHDAY_EFFECTS env variable (defaults to true)
 */
export const isBirthdayEnabled = () => {
    const value = import.meta.env.VITE_BIRTHDAY_EFFECTS;
    // Default to true if not set, otherwise check for 'true' string
    return value === undefined || value === 'true';
};

export default {
    isSeasonalEffectsEnabled,
    isBirthdayEnabled
};
