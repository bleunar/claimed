import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const StackedBarChart = ({ apiPath, title, options, colors = [], colorMap = null }) => {
    const { chartData, error } = useChartData(apiPath);

    // Default colors if none provided (matching PieChart defaults)
    const defaultColors = ['#28a745', '#ffc107', '#dc3545', '#6c757d', '#17a2b8', '#6610f2'];
    const fallbackColors = colors.length > 0 ? colors : defaultColors;

    // Get color for a dataset based on its label
    const getDatasetColor = (dataset, index) => {
        if (colorMap && dataset.label) {
            // Try exact match, then lowercase match
            return colorMap[dataset.label] || colorMap[dataset.label.toLowerCase()] || fallbackColors[index % fallbackColors.length];
        }
        return fallbackColors[index % fallbackColors.length];
    };

    // Initial State (Empty)
    const initialData = {
        labels: [],
        datasets: []
    };

    // The API returns data already formatted for Chart.js stacked bar
    // Apply colors from props to override API-provided colors
    const displayData = chartData ? {
        labels: chartData.labels || [],
        datasets: (chartData.datasets || []).map((dataset, index) => ({
            ...dataset,
            backgroundColor: getDatasetColor(dataset, index),
            borderColor: getDatasetColor(dataset, index),
            borderWidth: 1
        }))
    } : initialData;

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            title: { display: !!title, text: title },
            tooltip: {
                callbacks: {
                    footer: (tooltipItems) => {
                        let total = 0;
                        tooltipItems.forEach((tooltipItem) => {
                            // Sum all datasets for this index
                            displayData.datasets.forEach(dataset => {
                                total += dataset.data[tooltipItem.dataIndex] || 0;
                            });
                        });
                        return `Total: ${total}`;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    stepSize: 1
                }
            }
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
                    <Bar data={displayData} options={defaultOptions} />
                </div>
            </Card.Body>
        </Card>
    );
};

export default StackedBarChart;
