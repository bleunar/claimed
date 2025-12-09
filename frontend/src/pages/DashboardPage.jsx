import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import RoleBasedContent from '../components/ComponentProtector';
import api from '../api/axios';
import KPICard from '../components/analytics/KPICard';
import BarChart from '../components/analytics/BarChart';
import PieChart from '../components/analytics/PieChart';
import { People, Building, PcDisplay, ExclamationTriangle, Hdd } from 'react-bootstrap-icons';

const DashboardPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/analytics/dashboard');
                setData(response.data);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;
    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    // Prepare Chart Data
    const computersByLabData = {
        labels: data?.charts?.computers_by_lab?.map(item => item.name) || [],
        datasets: [{
            label: 'Computer Sets',
            data: data?.charts?.computers_by_lab?.map(item => item.count) || [],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const computersByStatusData = {
        labels: data?.charts?.computers_by_status?.map(item => item.status) || [],
        datasets: [{
            data: data?.charts?.computers_by_status?.map(item => item.count) || [],
            backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d'],
            borderWidth: 1
        }]
    };

    const componentsByStatusData = {
        labels: data?.charts?.components_by_status?.map(item => item.status) || [],
        datasets: [{
            data: data?.charts?.components_by_status?.map(item => item.count) || [],
            backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#dc3545'], // Green, Yellow, Info, Red
            borderWidth: 1
        }]
    };

    return (
        <div className="container-fluid py-3">

            {/* KPI Cards */}
            <div className="row row-cols-2 row-cols-md-4 mb-4">
                <KPICard title="Total Users" value={data?.kpis?.total_users} icon={<People />} color="primary" />
                <KPICard title="Total Labs" value={data?.kpis?.total_labs} icon={<Building />} color="success" />
                <KPICard title="Computer Sets" value={data?.kpis?.total_computers} icon={<PcDisplay />} color="info" />
                <KPICard title="Total Components" value={data?.kpis?.total_components} icon={<Hdd />} color="secondary" />
            </div>

            {/* Charts */}
            <div className="row">
                <div className="col-lg-6 mb-4">
                    <BarChart title="Computer Sets per Laboratory" data={computersByLabData} />
                </div>
                <div className="col-lg-3 mb-4">
                    <PieChart title="Computer Status" data={computersByStatusData} />
                </div>
                <div className="col-lg-3 mb-4">
                    <PieChart title="Component Status" data={componentsByStatusData} />
                </div>
            </div>

            {/* Role Based Content Examples (Preserved) */}
            <RoleBasedContent allowedRoles={['admin']}>
                <div className="alert alert-light border shadow-sm">
                    <strong>Admin Quick Actions:</strong> <a href="/dashboard/accounts" className="alert-link">Manage Accounts</a> | <a href="/dashboard/laboratories" className="alert-link">Manage Labs</a>
                </div>
            </RoleBasedContent>
        </div>
    );
};

export default DashboardPage;
