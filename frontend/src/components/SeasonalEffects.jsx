import React, { useMemo } from 'react';
import Snowfall from 'react-snowfall';
import { useTheme } from '../context/ThemeContext';

/**
 * Seasonal Effects Configuration
 * Each effect can specify:
 * - month: 0-11 (Jan-Dec) - required
 * - day: specific day of month (optional)
 * - startDay/endDay: date range within the month (optional)
 * - component: React component to render
 * - props: props to pass to the component
 */
const EFFECTS_CONFIG = [
    {
        id: 'christmas-snow',
        name: 'Christmas Snow',
        month: 11, // December
        startDay: 1,
        endDay: 31,
        component: Snowfall,
        props: {
            snowflakeCount: 20,
            speed: [0.5, 2],
            wind: [-0.5, 3],
            radius: [0.3, 2]
        }
    },
    // Example: Valentine's Day hearts (February 14)
    // {
    //     id: 'valentines-hearts',
    //     name: "Valentine's Hearts",
    //     month: 1, // February
    //     day: 14,
    //     component: HeartsEffect, // Would need to create this
    //     props: { count: 50 }
    // },
    // Example: New Year's confetti (January 1)
    // {
    //     id: 'new-year-confetti',
    //     name: 'New Year Confetti',
    //     month: 0, // January
    //     day: 1,
    //     component: ConfettiEffect,
    //     props: { duration: 5000 }
    // }
];

/**
 * Check if an effect should be active based on current date
 */
const isEffectActive = (effect, currentDate) => {
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    // Must match month
    if (effect.month !== currentMonth) {
        return false;
    }

    // If specific day is set, check it
    if (effect.day !== undefined) {
        return effect.day === currentDay;
    }

    // If date range is set, check if current day is within range
    if (effect.startDay !== undefined && effect.endDay !== undefined) {
        return currentDay >= effect.startDay && currentDay <= effect.endDay;
    }

    // If only month is set (no day/range), active for entire month
    return true;
};

/**
 * Get list of currently active effects
 */
export const getActiveEffects = (date = new Date()) => {
    return EFFECTS_CONFIG.filter(effect => isEffectActive(effect, date));
};

/**
 * Check if any seasonal effect is currently active
 */
export const hasActiveSeasonalEffect = (date = new Date()) => {
    return getActiveEffects(date).length > 0;
};

const SeasonalEffects = () => {
    const { seasonalEffects } = useTheme();

    // Memoize active effects check
    const activeEffects = useMemo(() => getActiveEffects(), []);

    // Check if we're on the login page - effects are always enabled there
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/';

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
