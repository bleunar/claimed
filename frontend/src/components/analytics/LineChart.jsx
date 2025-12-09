import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';

const LineChart = ({ data, options, title }) => {
    const defaultOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: !!title,
                text: title,
            },
        },
        maintainAspectRatio: false,
        ...options
    };

    return (
        <Card className="shadow bg-body-tertiary h-100">
            <Card.Body>
                <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                    <Line data={data} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default LineChart;
