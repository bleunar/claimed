import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const BarChart = ({
    apiPath,
    title,
    options,
    label = 'Data',
    colors = [],
    colorMap = null,
    bare = false,
    showTitle = true,
    showLegend = true,
    legendPosition = 'top',
    height = '300px',
    className = ''
}) => {
    const { chartData, error } = useChartData(apiPath);

    // Default colors
    const defaultColor = 'rgba(54, 162, 235, 0.6)';
    const fallbackColors = colors.length > 0 ? colors : ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];

    // Get colors for each bar based on labels
    const getBarColors = (labels) => {
        if (colorMap) {
            return labels.map((lbl, index) =>
                colorMap[lbl] || colorMap[lbl?.toLowerCase()] || fallbackColors[index % fallbackColors.length]
            );
        }
        // If colors array provided, use per-bar coloring
        if (colors.length > 0) {
            return labels.map((_, index) => fallbackColors[index % fallbackColors.length]);
        }
        // Default single color for all bars
        return defaultColor;
    };

    // Initial State (Zero/Empty)
    const initialData = {
        labels: [],
        datasets: [{
            label: label,
            data: [],
            backgroundColor: defaultColor,
            borderColor: '#6c757d',
            borderWidth: 1,
        }]
    };

    // Prepare data for Chart.js
    const barLabels = chartData ? chartData.map(item => item.labels) : [];
    const barColors = getBarColors(barLabels);

    const displayData = chartData ? {
        labels: barLabels,
        datasets: [{
            label: label,
            data: chartData.map(item => item.data),
            backgroundColor: barColors,
            borderColor: '#6c757d',
            borderWidth: 1,
        }]
    } : initialData;

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        maxBarThickness: 100,
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
                <Bar data={displayData} options={defaultOptions} />
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

export default BarChart;
