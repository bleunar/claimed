import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

ChartJS.register(ArcElement, Tooltip, Legend);

const Ratiolytics = ({ apiPath, title, colorMap = null, height = "200px", refreshTrigger = 0 }) => {
    const { chartData, error } = useChartData(apiPath, refreshTrigger);

    // Default colors
    const defaultColors = ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];

    const [displayData, setDisplayData] = React.useState(null);
    const [total, setTotal] = React.useState(0);

    // Initial animation effect
    React.useEffect(() => {
        if (!chartData) return;

        const labels = chartData.map(item => item.labels);
        const data = chartData.map(item => item.data);
        const totalCount = data.reduce((a, b) => a + b, 0);

        const backgroundColors = colorMap
            ? labels.map((label, index) =>
                colorMap[label] || colorMap[label?.toLowerCase()] || defaultColors[index % defaultColors.length]
            )
            : defaultColors;

        // 1. Prepare "Zero" state (Animation Start)
        const zeroData = {
            labels: labels,
            datasets: [{
                data: data.map(() => 0), // Set all to 0 initially
                backgroundColor: backgroundColors,
                borderColor: 'transparent',
                borderWidth: 0,
            }]
        };

        // 2. Prepare "Final" state (Animation End)
        const finalData = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'transparent',
                borderWidth: 0,
            }]
        };

        // Set to 0 first (triggers render)
        setDisplayData(zeroData);
        setTotal(totalCount); // We can show the total immediately or animate it too, but typically total is static text

        // Small delay to allow render, then animate to final
        const timer = setTimeout(() => {
            setDisplayData(finalData);
        }, 100);

        return () => clearTimeout(timer);

    }, [chartData, colorMap]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%', // Thinner ring for premium look
        plugins: {
            legend: {
                display: false // We will likely rely on tooltips or external legends, or just keep it simple as requested
            },
            title: {
                display: false,
            },
            tooltip: {
                enabled: true
            }
        }
    };

    return (
        <Card className="h-100 bg-transparent border-0">
            {/* Wrapper to allow arbitrary height control without affecting card if bare */}
            {title && <div className="text-center mb-2 fw-semibold small text-body-secondary">{title}</div>}
            <div className="position-relative w-100" style={{ height: height }}>
                {!chartData && !error && (
                    <div className="position-absolute top-50 start-50 translate-middle w-100 h-100 placeholder-glow z-1 d-flex justify-content-center">
                        <span className="placeholder rounded-circle opacity-25" style={{ height: height, width: height }}></span>
                    </div>
                )}

                {error && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center z-2">
                        <ExclamationTriangle className="text-danger mb-1" />
                        <span className="text-danger small" style={{ fontSize: '0.7rem' }}>Error</span>
                    </div>
                )}

                {displayData && (
                    <>
                        <Doughnut data={displayData} options={options} />
                        {/* Center Text Overlay */}
                        <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
                            <div className="fw-bold fs-4 lh-1 text-body">{total}</div>
                            <div className="text-muted small" style={{ fontSize: '0.7rem' }}>Total</div>
                        </div>
                    </>
                )}
            </div>
        </Card>
    );
};

export default Ratiolytics;
