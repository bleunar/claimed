import { useState, useEffect } from 'react';
import api from '../api/axios';

const useChartData = (apiPath, refreshTrigger = 0) => {
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
                const response = await api.get(apiPath);
                setChartData(response.data);
            } catch (err) {
                console.error(`Error fetching chart data from ${apiPath}:`, err);
                setError(err.response?.data?.error || err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiPath, refreshTrigger]);

    return { chartData, loading, error };
};

export default useChartData;
