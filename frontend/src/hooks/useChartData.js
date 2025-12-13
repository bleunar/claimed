import { useState, useEffect } from 'react';
import api from '../api/axios';

const useChartData = (apiPath) => {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!apiPath) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Determine if we are waiting for an animation delay or not. 
                // For now, fetch immediately.
                const response = await api.get(apiPath);

                // Slight artificial delay to allow "Initial" state to be perceived if needed, 
                // but usually real network is enough. 
                // We will rely on Chart.js native animations for the "0 to value" transition.
                // Here we just provide the data.

                setChartData(response.data);
            } catch (err) {
                console.error(`Error fetching chart data from ${apiPath}:`, err);
                setError(err.response?.data?.error || err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiPath]);

    return { chartData, loading, error };
};

export default useChartData;
