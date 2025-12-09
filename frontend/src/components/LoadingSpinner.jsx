import React from 'react';

const LoadingSpinner = ({ centered = false, size = 'border', variant = 'primary', className = '' }) => {
    const spinner = (
        <div className={`spinner-${size} text-${variant} ${className}`} role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    );

    if (centered) {
        return (
            <div className={`d-flex justify-content-center align-items-center w-100 ${className}`} style={{ minHeight: '100px', height: '100%' }}>
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;
