import React from 'react';

/**
 * MiniKPI - A compact KPI display component for dashboard sections
 * Displays a small value with optional icon and label, designed to be placed inline
 */
const MiniKPI = ({
    label,
    value,
    icon,
    color = 'primary',
    loading = false
}) => {
    if (loading || value === undefined || value === null) {
        return (
            <div className="d-flex align-items-center gap-2 placeholder-glow">
                <span className="placeholder rounded" style={{ width: 24, height: 24 }}></span>
                <div>
                    <span className="placeholder rounded d-block" style={{ width: 40, height: 20 }}></span>
                    <span className="placeholder rounded d-block mt-1" style={{ width: 60, height: 12 }}></span>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center gap-2">
            {icon && (
                <div className={`text-${color} opacity-75`} style={{ fontSize: '1.8rem' }}>
                    {icon}
                </div>
            )}
            <div>
                <div className="fw-bold lh-1" style={{ fontSize: '1.1rem' }}>
                    {value}
                </div>
                {label && (
                    <div className="text-muted small lh-1 mt-1">
                        {label}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniKPI;
