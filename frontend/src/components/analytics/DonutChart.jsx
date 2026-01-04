import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const DonutChart = ({
    apiPath,
    title,
    options,
    colors = [],
    colorMap = null,
    cutout = '60%',
    bare = false,
    showTitle = true,
    showLegend = true,
    legendPosition = 'top',
    height = '300px',
    className = ''
}) => {
    const { chartData, error } = useChartData(apiPath);

    // Default colors if none provided
    const defaultColors = ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];
    const fallbackColors = colors.length > 0 ? colors : defaultColors;

    // Generate colors based on colorMap (label-based) or fall back to index-based
    const getBackgroundColors = (labels) => {
        if (colorMap) {
            // Map each label to its specific color, with fallback
            return labels.map((label, index) =>
                colorMap[label] || colorMap[label?.toLowerCase()] || fallbackColors[index % fallbackColors.length]
            );
        }
        return fallbackColors;
    };

    // Initial State
    const initialData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: fallbackColors,
            borderColor: '#6c757d',
            borderWidth: 1,
        }]
    };

    const displayData = chartData ? {
        labels: chartData.map(item => item.labels),
        datasets: [{
            data: chartData.map(item => item.data),
            backgroundColor: getBackgroundColors(chartData.map(item => item.labels)),
            borderColor: '#6c757d',
            borderWidth: 1,
        }]
    } : initialData;

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: cutout,
        plugins: {
            legend: { display: showLegend, position: legendPosition },
            title: { display: showTitle && !!title, text: title },
        },
        ...options
    };

    // Chart content (shared between bare and wrapped modes)
    const chartContent = (
        <>
            {!chartData && !error && (
                <div className="position-absolute top-0 start-0 w-100 h-100 placeholder-glow" style={{ zIndex: 10 }}>
                    <span className="placeholder w-100 h-100 rounded"></span>
                </div>
            )}
            {error && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-body-tertiary bg-opacity-75" style={{ zIndex: 10 }}>
                    <ExclamationTriangle className="text-danger mb-2" size={32} />
                    <span className="text-danger small">{error}</span>
                </div>
            )}
            <div className={`p-3 w-100 h-100 ${chartData && !error ? "opacity-100" : 'opacity-0'}`}>
                <Doughnut data={displayData} options={defaultOptions} />
            </div>
        </>
    );

    // Bare mode: return chart only without Card wrapper
    if (bare) {
        return (
            <div className={`position-relative w-100 ${className}`} style={{ height: height }}>
                {chartContent}
            </div>
        );
    }

    // Wrapped mode: return full Card with styling
    return (
        <Card className={`shadow bg-body-tertiary h-100 ${className}`}>
            <Card.Body className='p-0 relative w-100' style={{ height: height }}>
                {chartContent}
            </Card.Body>
        </Card>
    );
};

export default DonutChart;
