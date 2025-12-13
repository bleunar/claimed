import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const LineChart = ({ apiPath, title, options, label = 'Data' }) => {
    const { chartData, error } = useChartData(apiPath);

    // Initial State
    const initialData = {
        labels: [],
        datasets: [{
            label: label,
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: true
        }]
    };

    const displayData = chartData ? {
        labels: chartData.map(item => item.labels),
        datasets: [{
            label: label,
            data: chartData.map(item => item.data),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            fill: true
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
            <Card.Body>
                <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                    {error && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-body-tertiary bg-opacity-75" style={{ zIndex: 10 }}>
                            <ExclamationTriangle className="text-danger mb-2" size={32} />
                            <span className="text-danger small">{error}</span>
                        </div>
                    )}
                    <Line data={displayData} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default LineChart;
