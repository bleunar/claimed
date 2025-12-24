import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const PieChart = ({ apiPath, title, options, colors = [], colorMap = null }) => {
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
            borderWidth: 1
        }]
    };

    const displayData = chartData ? {
        labels: chartData.map(item => item.labels),
        datasets: [{
            data: chartData.map(item => item.data),
            backgroundColor: getBackgroundColors(chartData.map(item => item.labels)),
            borderWidth: 1
        }]
    } : initialData;

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: !!title, text: title },
        },
        ...options
    };

    return (
        <Card className="shadow bg-body-tertiary h-100">
            <Card.Body className='p-0 relative w-100' style={{ height: '300px' }}>
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
                    <Pie data={displayData} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default PieChart;
