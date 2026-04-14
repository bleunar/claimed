import { useState, useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const KPICardNew = ({ title, value, icon, color = 'primary', trend, link }) => {
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
        <div className='col px-1 p-0'>
            <Card
                className={`h-100 border-2 border hover-raised shadow-sm cursor-pointer ${isHovered ? " bg-claims-primary-subtle" : " bg-body-secondary"}`}
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ transition: "150ms ease-in-out" }}
                title={`View ${title}`}
            >
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            {
                                value !== undefined && value !== null ? (
                                    <>
                                        <div className="h3 fw-bold mb-1">{displayValue}</div>
                                        <div className="text-capitalize text-muted small mb-0">{title}</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="placeholder-glow">
                                            <span className="placeholder d-block rounded mb-0" style={{ width: '60px', height: '2rem' }}></span>
                                        </div>
                                        <div className="placeholder-glow mt-1">
                                            <span className="placeholder d-block rounded mb-0" style={{ width: '100px', height: '1rem' }}></span>
                                        </div>
                                    </>
                                )
                            }
                        </div>
                        <div className={`fs-1 opacity-75 d-none d-md-inline`}>
                            {value !== undefined && value !== null ? (
                                <span className={`text-${color}`}>{icon}</span>
                            ) : (
                                <div className="placeholder-glow">
                                    <span className="placeholder rounded" style={{ width: '40px', height: '40px', display: 'inline-block' }}></span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default KPICardNew;
