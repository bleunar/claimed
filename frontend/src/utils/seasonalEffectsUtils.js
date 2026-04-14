import Snowfall from 'react-snowfall';

/**
 * Seasonal Effects Configuration
 * Each effect can specify:
 * - month: 0-11 (Jan-Dec) - required
 * - day: specific day of month (optional)
 * - startDay/endDay: date range within the month (optional)
 * - component: React component to render
 * - props: props to pass to the component
 */
export const EFFECTS_CONFIG = [
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
    //     component: HeartsEffect,
    //     props: { count: 50 }
    // },
];

/**
 * Check if an effect should be active based on current date
 */
const isEffectActive = (effect, currentDate) => {
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    if (effect.month !== currentMonth) {
        return false;
    }

    if (effect.day !== undefined) {
        return effect.day === currentDay;
    }

    if (effect.startDay !== undefined && effect.endDay !== undefined) {
        return currentDay >= effect.startDay && currentDay <= effect.endDay;
    }

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
