import { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const KPICard = ({ title, value, icon, color = 'body', trend, link }) => {
    const navigate = useNavigate();
    const [isHovered, setHovered] = useState(false);
    const [displayValue, setDisplayValue] = useState(0);
    const animationRef = useRef(null);

    // Animate value from 0 to target
    useEffect(() => {
        if (value === undefined || value === null) {
            setDisplayValue(0);
            return;
        }

        const targetValue = typeof value === 'number' ? value : parseInt(value, 10);
        if (isNaN(targetValue)) {
            setDisplayValue(value); // Non-numeric, show as-is
            return;
        }

        const duration = 1000; // Animation duration in ms
        const startTime = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out curve for smooth deceleration (stronger effect)
            const easeOut = 1 - Math.pow(1 - progress, 5);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value]);

    const handleClick = () => {
        if (link) {
            navigate(link);
        }
    };

    return (
        <div className='col p-1'>
            <Card
                className={`h-100 border-2 border hover-raised shadow-sm ${link ? 'cursor-pointer' : ''} ${isHovered ? " bg-primary-subtle" : " bg-body-secondary"}`}
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ transition: "150ms ease-in-out" }}
                title={`View ${title}`}
            >
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-center text-center">
                        <div>
                            {
                                value !== undefined && value !== null ? (
                                    <>
                                        <div className="h3 mb-1 fw-bold text-gray-800">{displayValue}</div>
                                        <div className="text-capitalize text-muted small mb-0 text-truncate">{title}</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="placeholder-glow mb-1">
                                            <span className="placeholder d-block rounded" style={{ width: '60px', height: '28px' }}></span>
                                        </div>
                                        <div className="placeholder-glow">
                                            <span className="placeholder d-block rounded" style={{ width: '100px', height: '14px' }}></span>
                                        </div>
                                    </>
                                )
                            }
                            {trend && (
                                <div className={`mt-2 mb-0 text-xs font-weight-bold text-${trend.direction === 'up' ? 'success' : 'danger'}`}>
                                    <span className="me-1">
                                        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
                                    </span>
                                    <span className="text-muted">{trend.label}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default KPICard;
