import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const LineChart = ({ apiPath, title, options, label = 'Data', colors = [], colorMap = null }) => {
    const { chartData, error } = useChartData(apiPath);

    // Default colors
    const defaultBgColor = 'rgba(54, 162, 235, 0.2)';
    const defaultBorderColor = 'rgba(54, 162, 235, 1)';
    const fallbackColors = colors.length > 0 ? colors : ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];

    // Get colors for each point based on labels
    const getPointColors = (labels) => {
        if (colorMap) {
            return labels.map((lbl, index) =>
                colorMap[lbl] || colorMap[lbl?.toLowerCase()] || fallbackColors[index % fallbackColors.length]
            );
        }
        return null; // Return null to use default single color
    };

    // Initial State
    const initialData = {
        labels: [],
        datasets: [{
            label: label,
            data: [],
            backgroundColor: defaultBgColor,
            borderColor: defaultBorderColor,
            borderWidth: 1,
            fill: true
        }]
    };

    const lineLabels = chartData ? chartData.map(item => item.labels) : [];
    const pointColors = getPointColors(lineLabels);

    const displayData = chartData ? {
        labels: lineLabels,
        datasets: [{
            label: label,
            data: chartData.map(item => item.data),
            backgroundColor: pointColors || defaultBgColor,
            borderColor: pointColors || defaultBorderColor,
            pointBackgroundColor: pointColors || defaultBorderColor,
            borderWidth: 1,
            fill: !pointColors // Only fill if using single color
        }]
    } : initialData;

    const defaultOptions = {
        responsive: true,
        performant: true,
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
                    <Line data={displayData} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default LineChart;
