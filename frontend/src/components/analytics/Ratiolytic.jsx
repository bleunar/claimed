import React, { useState, useEffect } from 'react';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

/**
 * Ratiolytic - A horizontal ratio bar component
 * Displays proportional data segments with colors, optional icons, and hover tooltips
 */
const Ratiolytic = ({
    apiPath,
    title,
    colorMap = {},
    iconMap = {},
    height = 40,
    showLegend = true,
    showPercentages = false,
    bare = false
}) => {
    const { chartData, error } = useChartData(apiPath);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [isAnimated, setIsAnimated] = useState(false);

    // Trigger animation when data is received
    useEffect(() => {
        if (chartData && !error) {
            // Small delay to ensure DOM is ready, then animate
            const timer = setTimeout(() => {
                setIsAnimated(true);
            }, 50);
            return () => clearTimeout(timer);
        } else {
            setIsAnimated(false);
        }
    }, [chartData, error]);

    // Default colors for fallback
    const defaultColors = ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];

    // Calculate total and percentages
    const total = chartData ? chartData.reduce((sum, item) => sum + (item.data || 0), 0) : 0;

    const getColor = (label, index) => {
        if (colorMap[label]) return colorMap[label];
        if (colorMap[label?.toLowerCase()]) return colorMap[label?.toLowerCase()];
        return defaultColors[index % defaultColors.length];
    };

    const getIcon = (label) => {
        if (iconMap[label]) return iconMap[label];
        if (iconMap[label?.toLowerCase()]) return iconMap[label?.toLowerCase()];
        return null;
    };

    const formatLabel = (label) => {
        if (!label) return 'Unknown';
        return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    };

    const getTooltipText = (item, percentage) => {
        return `${formatLabel(item.labels)}\n${percentage.toFixed(1)}%\n${item.data} items`;
    };

    // Ratiolytic content (shared between bare and wrapped modes)
    const ratiolyticContent = (
        <>
            {/* Loading State */}
            {!chartData && !error && (
                <div className="placeholder-glow">
                    {/* Bar placeholder */}
                    <span
                        className="placeholder w-100 rounded"
                        style={{ height: `${height}px` }}
                    ></span>
                    {/* Legend placeholders */}
                    {showLegend && (
                        <div className="d-flex flex-wrap gap-3 mt-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="d-flex align-items-center gap-2">
                                    <span className="placeholder rounded" style={{ width: 16, height: 16 }}></span>
                                    <span className="placeholder rounded" style={{ width: 80, height: 14 }}></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="d-flex align-items-center justify-content-center text-danger" style={{ height: `${height}px` }}>
                    <ExclamationTriangle className="me-2" />
                    <span className="small">{error}</span>
                </div>
            )}

            {/* Ratio Bar */}
            {chartData && !error && total > 0 && (
                <>
                    <div
                        className="d-flex rounded overflow-hidden bg-body"
                        style={{ height: `${height}px`, border: '1px solid #6c757d', }}
                    >
                        {chartData.map((item, index) => {
                            const percentage = (item.data / total) * 100;
                            const color = getColor(item.labels, index);
                            const icon = getIcon(item.labels);
                            const isHovered = hoveredIndex === index;

                            if (percentage === 0) return null;

                            return (
                                <div
                                    key={index}
                                    className="d-flex align-items-center justify-content-center position-relative"
                                    title={getTooltipText(item, percentage)}
                                    style={{
                                        width: isAnimated ? `${percentage}%` : '0%',
                                        backgroundColor: color,
                                        transition: 'width 0.6s ease-out, transform 0.2s ease-in-out',
                                        transform: isHovered ? 'scaleY(1.1)' : 'scaleY(1)',
                                        zIndex: isHovered ? 10 : 1,
                                        cursor: 'pointer',
                                        minWidth: isAnimated ? '8px' : '0px',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    {/* Icon in center (if provided and segment is wide enough) */}
                                    {icon && percentage > 10 && (
                                        <span className="text-white" style={{ fontSize: height * 0.5 }}>
                                            {icon}
                                        </span>
                                    )}
                                    {/* Show percentage if enabled and segment is wide enough */}
                                    {showPercentages && percentage > 15 && !icon && (
                                        <span className="text-white fw-bold small">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    {showLegend && (
                        <div className="d-flex flex-wrap justify-content-evenly gap-4 mt-3">
                            {chartData.map((item, index) => {
                                const percentage = (item.data / total) * 100;
                                const color = getColor(item.labels, index);
                                const icon = getIcon(item.labels);

                                if (percentage === 0) return null;

                                return (
                                    <div
                                        key={index}
                                        className="d-flex align-items-center justify-content-start flex-fill gap-1"
                                        style={{ cursor: 'default' }}
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                    >
                                        <span
                                            className="d-inline-flex align-items-center justify-content-center rounded"
                                            style={{
                                                width: 8,
                                                height: 16,
                                                backgroundColor: color,
                                                minWidth: 8
                                            }}
                                        >
                                            {icon && (
                                                <span className="text-white" style={{ fontSize: 12 }}>
                                                    {icon}
                                                </span>
                                            )}
                                        </span>
                                        <span className="small text-muted">
                                            <strong>{formatLabel(item.labels)}</strong>: {percentage.toFixed(1)}% ({item.data})
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Empty State */}
            {chartData && !error && total === 0 && (
                <div
                    className="d-flex align-items-center justify-content-center text-muted"
                    style={{ height: `${height}px` }}
                >
                    <span className="small">No data available</span>
                </div>
            )}
        </>
    );

    // Bare mode: return content only without Card wrapper
    if (bare) {
        return (
            <div>
                {title && <h6 className="mb-2 fw-bold">{title}</h6>}
                {ratiolyticContent}
            </div>
        );
    }

    // Wrapped mode: return full Card with styling
    return (
        <Card className="shadow bg-body-tertiary h-100">
            {title && (
                <Card.Header className="bg-transparent border-0 pb-0">
                    <h6 className="mb-0 fw-bold">{title}</h6>
                </Card.Header>
            )}
            <Card.Body className="pt-2">
                {ratiolyticContent}
            </Card.Body>
        </Card>
    );
};

export default Ratiolytic;
