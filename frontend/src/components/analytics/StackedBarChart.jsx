import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import { Card } from 'react-bootstrap';
import useChartData from '../../hooks/useChartData';
import { ExclamationTriangle } from 'react-bootstrap-icons';

const StackedBarChart = ({
    apiPath,
    title,
    options,
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
            borderColor: '#6c757d',
            borderWidth: 1
        }))
    } : initialData;

    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: showLegend, position: legendPosition },
            title: { display: showTitle && !!title, text: title },
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
            <div className="w-100 h-100 d-flex justify-content-center">
                <div className={`p-3 w-100 h-100 ${chartData && !error ? "opacity-100" : 'opacity-0'}`} style={{ maxWidth: "800px" }}>
                    <Bar data={displayData} options={defaultOptions} />
                </div>
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

export default StackedBarChart;
