import React from 'react';
import Snowfall from 'react-snowfall';
import { useTheme } from '../context/ThemeContext';

const SeasonalEffects = () => {
    const { seasonalEffects, isDecember } = useTheme();

    // Only show snowfall in December when seasonal effects are enabled
    if (!isDecember || !seasonalEffects) {
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
                zIndex: 9998 // Just below the auth loading overlay
            }}
        >
            <Snowfall
                snowflakeCount={100}
                speed={[0.5, 1.5]}
                wind={[-0.5, 1]}
                radius={[1, 4]}
            />
        </div>
    );
};

export default SeasonalEffects;
