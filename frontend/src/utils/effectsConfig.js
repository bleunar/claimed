import yaml from 'js-yaml';

/**
 * Effects Configuration Loader
 * Loads and caches the config.yml settings for visual effects
 */

let configCache = null;
let configPromise = null;

/**
 * Default configuration values (used if config.yml fails to load)
 */
const DEFAULT_CONFIG = {
    effects: {
        seasonal: {
            enabled: false
        },
        birthday: {
            enabled: false
        }
    }
};

/**
 * Load the effects configuration from config.yml
 * Returns cached config if already loaded
 */
export const loadEffectsConfig = async () => {
    // Return cached config if available
    if (configCache !== null) {
        return configCache;
    }

    // Return existing promise if already loading
    if (configPromise !== null) {
        return configPromise;
    }

    // Start loading
    configPromise = (async () => {
        try {
            const response = await fetch('/config.yml');
            if (!response.ok) {
                console.warn('Failed to load config.yml, using defaults');
                configCache = DEFAULT_CONFIG;
                return configCache;
            }

            const text = await response.text();
            configCache = yaml.load(text) || DEFAULT_CONFIG;
            return configCache;
        } catch (error) {
            console.warn('Error loading config.yml:', error);
            configCache = DEFAULT_CONFIG;
            return configCache;
        }
    })();

    return configPromise;
};

/**
 * Check if seasonal effects are enabled in config
 */
export const isSeasonalEffectsEnabled = async () => {
    const config = await loadEffectsConfig();
    return config?.effects?.seasonal?.enabled ?? true;
};

/**
 * Check if birthday celebration is enabled in config
 */
export const isBirthdayEnabled = async () => {
    const config = await loadEffectsConfig();
    return config?.effects?.birthday?.enabled ?? true;
};

/**
 * Get the full effects config synchronously (only works after initial load)
 * Returns null if not yet loaded
 */
export const getEffectsConfigSync = () => {
    return configCache;
};

export default {
    loadEffectsConfig,
    isSeasonalEffectsEnabled,
    isBirthdayEnabled,
    getEffectsConfigSync
};
