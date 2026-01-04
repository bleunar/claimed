import React, { useMemo, useState, useEffect } from 'react';
import Snowfall from 'react-snowfall';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { isSeasonalEffectsEnabled } from '../utils/effectsConfig';

/**
 * Seasonal Effects Configuration
 * Each effect can specify:
 * - month: 0-11 (Jan-Dec) - required
 * - day: specific day of month (optional)
 * - startDay/endDay: date range within the month (optional)
 * - component: React component to render
 * - props: props to pass to the component
 */
import { getActiveEffects } from '../utils/seasonalEffectsUtils';

const SeasonalEffects = () => {
    const { seasonalEffects } = useTheme();

    // Check if enabled via environment variable
    const configEnabled = isSeasonalEffectsEnabled();

    // Memoize active effects check
    const activeEffects = useMemo(() => getActiveEffects(), []);

    // Use React Router's useLocation for reactive route detection
    const location = useLocation();

    // Check if we're on the login page - effects are always enabled there
    const isLoginPage = location.pathname === '/';

    // Don't render if disabled in environment
    if (!configEnabled) {
        return null;
    }

    // Determine if effects should be shown:
    // - On login page: always show (if there are active effects)
    // - On dashboard: respect the seasonalEffects setting (default: off)
    const shouldShowEffects = isLoginPage || seasonalEffects;

    // Don't render if no active effects or if disabled (on non-login pages)
    if (!shouldShowEffects || activeEffects.length === 0) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9998
            }}
        >
            {activeEffects.map(effect => {
                const EffectComponent = effect.component;
                return <EffectComponent key={effect.id} {...effect.props} />;
            })}
        </div>
    );
};

export default SeasonalEffects;
