import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { hasActiveSeasonalEffect } from '../components/SeasonalEffects';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [toastPosition, setToastPosition] = useState(localStorage.getItem('toastPosition') || 'top-center');
    const [seasonalEffects, setSeasonalEffects] = useState(() => {
        const saved = localStorage.getItem('seasonalEffects');
        return saved !== null ? saved === 'true' : false; // Default to false (off on dashboard)
    });

    // Check if any seasonal effect is currently active (based on EFFECTS_CONFIG)
    const hasActiveSeason = useMemo(() => hasActiveSeasonalEffect(), []);

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('toastPosition', toastPosition);
    }, [toastPosition]);

    useEffect(() => {
        localStorage.setItem('seasonalEffects', seasonalEffects.toString());
    }, [seasonalEffects]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const toggleSeasonalEffects = () => {
        setSeasonalEffects((prev) => !prev);
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            toggleTheme,
            toastPosition,
            setToastPosition,
            seasonalEffects,
            toggleSeasonalEffects,
            hasActiveSeason
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
