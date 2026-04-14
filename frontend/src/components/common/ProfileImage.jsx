import React, { useState, useEffect } from 'react';
import { Person } from 'react-bootstrap-icons';

const ProfileImage = ({ src, name, size = 'md', shape = 'square', className = '' }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Size presets
    const sizes = {
        sm: '32px',
        md: '67px',
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

    // Get initials
    const getInitials = (fullName) => {
        if (!fullName) return '';
        const names = fullName.trim().split(/\s+/);
        if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    };

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

    // Calculate font size roughly based on container size
    const fontSize = parseInt(finalSize) ? `${parseInt(finalSize) * 0.4}px` : '1rem';

    return (
        <div
            className={`${className} ${finalShapeClass} overflow-hidden bg-body-secondary d-flex align-items-center justify-content-center`}
            style={{ width: finalSize, height: finalSize, userSelect: 'none' }}
        >
            {imageLoaded && !hasError ? (
                <img
                    src={src}
                    alt="profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : name ? (
                <span className="fw-bold text-body" style={{ fontSize: fontSize}}>
                    {getInitials(name)}
                </span>
            ) : (
                <Person className="text-claims-primary" style={{ width: '80%', height: '80%' }} />
            )}
        </div>
    );
};

export default ProfileImage;
