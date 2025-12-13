import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const PieChart = ({ apiPath, title, options, colors = [] }) => {
    const { chartData, error } = useChartData(apiPath);

    // Default colors if none provided
    const defaultColors = ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];
    const finalColors = colors.length > 0 ? colors : defaultColors;

    // Initial State
    const initialData = {
        labels: [],
        datasets: [{
            data: [],
            backgroundColor: finalColors,
            borderWidth: 1
        }]
    };

    const displayData = chartData ? {
        labels: chartData.map(item => item.labels),
        datasets: [{
            data: chartData.map(item => item.data),
            backgroundColor: finalColors,
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
            <Card.Body>
                <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                    {error && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-body-tertiary bg-opacity-75" style={{ zIndex: 10 }}>
                            <ExclamationTriangle className="text-danger mb-2" size={32} />
                            <span className="text-danger small">{error}</span>
                        </div>
                    )}
                    <Pie data={displayData} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default PieChart;
