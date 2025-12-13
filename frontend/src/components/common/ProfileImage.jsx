import React, { useState, useEffect } from 'react';
import { Person } from 'react-bootstrap-icons';

const ProfileImage = ({ src, size = 'md', shape = 'square', className = '' }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Size presets
    const sizes = {
        sm: '32px',
        md: '48px',
        lg: '96px',
        xl: '128px'
    };

    // Use preset or custom value
    const finalSize = sizes[size] || size;

    // Shape classes
    const shapeClasses = {
        circle: 'rounded-circle',
        rounded: 'rounded',
        square: 'rounded-0'
    };

    // Determine class to apply: prioritize shape prop
    const finalShapeClass = shapeClasses[shape] || 'rounded-0';

    useEffect(() => {
        if (!src) {
            setHasError(true);
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            setImageLoaded(true);
            setHasError(false);
        };
        img.onerror = () => {
            setHasError(true);
            setImageLoaded(false);
        };

        // Reset state when src changes
        return () => {
            setImageLoaded(false);
            setHasError(false);
        };
    }, [src]);

    return (
        <div
            className={`${className} ${finalShapeClass} overflow-hidden bg-dark-subtle d-flex align-items-center justify-content-center`}
            style={{ width: finalSize, height: finalSize }}
        >
            {imageLoaded && !hasError ? (
                <img
                    src={src}
                    alt="profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <Person className="text-primary" style={{ width: '80%', height: '80%' }} />
            )}
        </div>
    );
};

export default ProfileImage;
