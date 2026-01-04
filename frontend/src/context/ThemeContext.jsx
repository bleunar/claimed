import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { hasActiveSeasonalEffect } from '../utils/seasonalEffectsUtils';
import api from '../api/axios';

const ThemeContext = createContext();

// Default values when no preferences are set
const DEFAULTS = {
    theme: 'light',
    toastPosition: 'top-center',
    theme: 'light',
    toastPosition: 'top-center',
    seasonalEffects: false,
    emailOptOut: false
};

export const ThemeProvider = ({ children }) => {
    // Active/applied settings (what's currently in effect)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || DEFAULTS.theme);
    const [toastPosition, setToastPositionState] = useState(localStorage.getItem('toastPosition') || DEFAULTS.toastPosition);
    const [seasonalEffects, setSeasonalEffectsState] = useState(() => {
        const saved = localStorage.getItem('seasonalEffects');
        return saved !== null ? saved === 'true' : DEFAULTS.seasonalEffects;
    });
    const [emailOptOut, setEmailOptOutState] = useState(() => {
        const saved = localStorage.getItem('emailOptOut');
        return saved !== null ? saved === 'true' : DEFAULTS.emailOptOut;
    });

    // Pending settings (user's changes before clicking Update)
    const [pendingTheme, setPendingTheme] = useState(null);
    const [pendingToastPosition, setPendingToastPosition] = useState(null);
    const [pendingSeasonalEffects, setPendingSeasonalEffects] = useState(null);
    const [pendingEmailOptOut, setPendingEmailOptOut] = useState(null);

    const [preferencesLoaded, setPreferencesLoaded] = useState(false);
    const [savingPreferences, setSavingPreferences] = useState(false);

    // Check if any seasonal effect is currently active (based on EFFECTS_CONFIG)
    const hasActiveSeason = useMemo(() => hasActiveSeasonalEffect(), []);

    // Apply theme to document (only when active theme changes)
    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Sync toastPosition to localStorage
    useEffect(() => {
        localStorage.setItem('toastPosition', toastPosition);
    }, [toastPosition]);

    // Sync seasonalEffects to localStorage
    useEffect(() => {
        localStorage.setItem('seasonalEffects', seasonalEffects.toString());
    }, [seasonalEffects]);

    // Sync emailOptOut to localStorage
    useEffect(() => {
        localStorage.setItem('emailOptOut', emailOptOut.toString());
    }, [emailOptOut]);

    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        return (
            (pendingTheme !== null && pendingTheme !== theme) ||
            (pendingToastPosition !== null && pendingToastPosition !== toastPosition) ||
            (pendingSeasonalEffects !== null && pendingSeasonalEffects !== seasonalEffects) ||
            (pendingEmailOptOut !== null && pendingEmailOptOut !== emailOptOut)
        );
    }, [pendingTheme, pendingToastPosition, pendingSeasonalEffects, pendingEmailOptOut, theme, toastPosition, seasonalEffects, emailOptOut]);

    // Save preferences to backend and apply changes
    const savePreferences = useCallback(async () => {
        setSavingPreferences(true);
        try {
            // Determine final values (pending if set, otherwise current)
            const finalTheme = pendingTheme !== null ? pendingTheme : theme;
            const finalToastPosition = pendingToastPosition !== null ? pendingToastPosition : toastPosition;
            const finalSeasonalEffects = pendingSeasonalEffects !== null ? pendingSeasonalEffects : seasonalEffects;
            const finalEmailOptOut = pendingEmailOptOut !== null ? pendingEmailOptOut : emailOptOut;

            const preferences = {
                theme: finalTheme,
                toastPosition: finalToastPosition,
                seasonalEffects: finalSeasonalEffects,
                emailOptOut: finalEmailOptOut
            };

            await api.put('/accounts/profile', { preferences });

            // Apply the changes to active state
            setTheme(finalTheme);
            setToastPositionState(finalToastPosition);
            setSeasonalEffectsState(finalSeasonalEffects);
            setEmailOptOutState(finalEmailOptOut);

            // Clear pending state
            setPendingTheme(null);
            setPendingToastPosition(null);
            setPendingSeasonalEffects(null);
            setPendingEmailOptOut(null);

            return { success: true };
        } catch (err) {
            console.error('Failed to save preferences:', err);
            return { success: false, error: err.response?.data?.msg || 'Failed to save preferences' };
        } finally {
            setSavingPreferences(false);
        }
    }, [pendingTheme, pendingToastPosition, pendingSeasonalEffects, pendingEmailOptOut, theme, toastPosition, seasonalEffects, emailOptOut]);

    // Load preferences from user data (called by AuthContext after login)
    const loadPreferencesFromUser = useCallback((userPreferences) => {
        if (userPreferences) {
            // Parse if it's a string (from backend JSON)
            const prefs = typeof userPreferences === 'string'
                ? JSON.parse(userPreferences)
                : userPreferences;

            // Apply directly to active state
            if (prefs.theme) setTheme(prefs.theme);
            if (prefs.toastPosition) setToastPositionState(prefs.toastPosition);
            if (prefs.toastPosition) setToastPositionState(prefs.toastPosition);
            if (prefs.seasonalEffects !== undefined) setSeasonalEffectsState(prefs.seasonalEffects);
            if (prefs.emailOptOut !== undefined) setEmailOptOutState(prefs.emailOptOut);
        }
        // Clear any pending changes
        setPendingTheme(null);
        setPendingToastPosition(null);
        setPendingSeasonalEffects(null);
        setPendingEmailOptOut(null);
        setPreferencesLoaded(true);
    }, []);

    // Reset preferences state (called on logout)
    const resetPreferences = useCallback(() => {
        setPreferencesLoaded(false);
        setPendingTheme(null);
        setPendingToastPosition(null);
        setPendingToastPosition(null);
        setPendingSeasonalEffects(null);
        setPendingEmailOptOut(null);
    }, []);

    // Toggle functions set pending values, not active values
    const toggleTheme = useCallback(() => {
        const currentEffective = pendingTheme !== null ? pendingTheme : theme;
        setPendingTheme(currentEffective === 'light' ? 'dark' : 'light');
    }, [pendingTheme, theme]);

    const setToastPosition = useCallback((position) => {
        setPendingToastPosition(position);
    }, []);

    const toggleSeasonalEffects = useCallback(() => {
        const currentEffective = pendingSeasonalEffects !== null ? pendingSeasonalEffects : seasonalEffects;
        setPendingSeasonalEffects(!currentEffective);
    }, [pendingSeasonalEffects, seasonalEffects]);

    const toggleEmailOptOut = useCallback(() => {
        const currentEffective = pendingEmailOptOut !== null ? pendingEmailOptOut : emailOptOut;
        setPendingEmailOptOut(!currentEffective);
    }, [pendingEmailOptOut, emailOptOut]);

    // Expose both active and pending values for UI display
    // Settings UI should show pending values (if set) to reflect user's choices
    const effectiveTheme = pendingTheme !== null ? pendingTheme : theme;
    const effectiveToastPosition = pendingToastPosition !== null ? pendingToastPosition : toastPosition;
    const effectiveSeasonalEffects = pendingSeasonalEffects !== null ? pendingSeasonalEffects : seasonalEffects;
    const effectiveEmailOptOut = pendingEmailOptOut !== null ? pendingEmailOptOut : emailOptOut;

    return (
        <ThemeContext.Provider value={{
            // Active values (what's currently applied)
            theme,
            toastPosition,
            seasonalEffects,
            // Effective values (for settings UI display)
            effectiveTheme,
            effectiveToastPosition,
            effectiveSeasonalEffects,
            effectiveEmailOptOut,
            // Actions
            toggleTheme,
            setToastPosition,
            toggleSeasonalEffects,
            toggleEmailOptOut,
            // Other
            hasActiveSeason,
            loadPreferencesFromUser,
            resetPreferences,
            preferencesLoaded,
            savePreferences,
            savingPreferences,
            hasUnsavedChanges
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
