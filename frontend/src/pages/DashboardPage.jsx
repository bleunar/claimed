import { Link } from 'react-router-dom';
import { People, Building, PcDisplay, ExclamationTriangle, Hdd, DoorClosed, Mouse, Keyboard, JournalText, Tools, PersonCheck, PersonCircle } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import RoleBasedContent from '../components/ComponentProtector';
import api from '../api/axios';
import KPICard from '../components/analytics/KPICard';
import BarChart from '../components/analytics/BarChart';
import StackedBarChart from '../components/analytics/StackedBarChart';
import PieChart from '../components/analytics/PieChart';
import { useState, useEffect } from 'react';
import ForceChangePasswordModal from '../components/modals/ForceChangePasswordModal';
import {
    COMPUTER_SET_STATUS_COLORS,
    COMPONENT_STATUS_COLORS
} from '../utils/statusColors';

const DashboardPage = () => {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchKpiData = async () => {
            try {
                const response = await api.get('/analytics/kpi');
                setKpiData(response.data);
            } catch (err) {
                console.error("Error fetching KPI data:", err);
                setError("Failed to load dashboard KPIs.");
            }
        };

        fetchKpiData();
    }, []);

    const getQuickActions = () => {
        if (!user) return [];
        const actions = [];

        // Role Specific Actions
        switch (user.role) {
            case 'admin':
                actions.push(
                    { label: 'Manage Accounts', path: '/dashboard/accounts', icon: <People />, variant: 'primary' },
                    { label: 'Manage Laboratories', path: '/dashboard/laboratories', icon: <Building />, variant: 'primary' }
                );
                break;
            case 'it_head':
                actions.push(
                    { label: 'Manage Technicians', path: '/dashboard/accounts?role=it_technician', icon: <Tools />, variant: 'primary' },
                    { label: 'View Laboratories', path: '/dashboard/laboratories', icon: <PcDisplay />, variant: 'primary' }
                );
                break;
            case 'lab_head':
                actions.push(
                    { label: 'Manage Assistants', path: '/dashboard/accounts?role=lab_assistant', icon: <PersonCheck />, variant: 'primary' },
                    { label: 'View Laboratories', path: '/dashboard/laboratories', icon: <PcDisplay />, variant: 'primary' }
                );
                break;
            case 'it_technician':
            case 'lab_assistant':
                actions.push(
                    { label: 'View Laboratories', path: '/dashboard/laboratories', icon: <PcDisplay />, variant: 'primary' }
                );
                break;
            default:
                break;
        }

        // Common Actions
        actions.push({ label: 'My Profile', path: '/dashboard/profile', icon: <PersonCircle />, variant: 'primary' });

        return actions;
    };

    // Computer Set Status color maps - explicit label to color mapping
    const computerSetColorMap = {
        'operational': COMPUTER_SET_STATUS_COLORS.operational,
        'active': COMPUTER_SET_STATUS_COLORS.operational,
        'maintenance': COMPUTER_SET_STATUS_COLORS.maintenance
    };

    // Component Status color maps - explicit label to color mapping
    const componentColorMap = {
        'good': COMPONENT_STATUS_COLORS.good,
        'working': COMPONENT_STATUS_COLORS.good,
        'bad': COMPONENT_STATUS_COLORS.bad,
        'defective': COMPONENT_STATUS_COLORS.bad,
        'maintenance': COMPONENT_STATUS_COLORS.maintenance,
        'missing': COMPONENT_STATUS_COLORS.missing
    };

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container-fluid py-3">
            <ForceChangePasswordModal show={!!user?.password_reset_required} />

            {/* KPI Cards */}
            <div className="row row-cols-2 row-cols-lg-4 mb-4">
                <KPICard title="Users" value={kpiData?.total_users} icon={<People />} color="primary" link="/dashboard/accounts" />
                <KPICard title="Laboratories" value={kpiData?.total_labs} icon={<DoorClosed />} color="primary" link="/dashboard/laboratories" />
                <KPICard title="Computers" value={kpiData?.total_computers} icon={<PcDisplay />} color="primary" link="/dashboard/laboratories" />
                <KPICard title="Components" value={kpiData?.total_components} icon={<Keyboard />} color="primary" link="/dashboard/components" />
            </div>

            <div className="mb-4">
                <div className="h6 fw-bold mb-3">Quick Actions</div>
                <div className="d-flex flex-wrap gap-2">
                    {user ? (
                        getQuickActions().map((action, idx) => (
                            <Link key={idx} to={action.path} className={`btn btn-sm btn-${action.variant} d-flex align-items-center gap-2 shadow-sm`}>
                                {action.icon}
                                {action.label}
                            </Link>
                        ))
                    ) : (
                        [...Array(4)].map((_, idx) => (
                            <div key={idx} className="placeholder-glow">
                                <span className="placeholder rounded" style={{ width: '120px', height: '32px', display: 'inline-block' }}></span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Charts */}
            <div className="row">
                <div className="col-lg-6 mb-4">
                    <StackedBarChart
                        title="Computer Sets per Laboratory"
                        apiPath="/analytics/bar/computers-by-lab"
                        colorMap={computerSetColorMap}
                    />
                </div>
                <div className="col-lg-3 mb-4">
                    <PieChart
                        title="Computer Status"
                        apiPath="/analytics/pie/computers-by-status"
                        colorMap={computerSetColorMap}
                    />
                </div>
                <div className="col-lg-3 mb-4">
                    <PieChart
                        title="Component Status"
                        apiPath="/analytics/pie/components-by-status"
                        colorMap={componentColorMap}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;

