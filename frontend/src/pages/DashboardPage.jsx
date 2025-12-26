import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { People, Building, PcDisplay, ExclamationTriangle, Hdd, DoorClosed, Mouse, Keyboard, JournalText, Tools, PersonCheck, PersonCircle, Person } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import RoleBasedContent from '../components/ComponentProtector';
import api from '../api/axios';
import KPICard from '../components/analytics/KPICard';
import BarChart from '../components/analytics/BarChart';
import StackedBarChart from '../components/analytics/StackedBarChart';
import DonutChart from '../components/analytics/DonutChart';
import LineChart from '../components/analytics/LineChart';
import Ratiolytic from '../components/analytics/Ratiolytic';
import MiniKPI from '../components/analytics/MiniKPI';
import { useState, useEffect } from 'react';
import ForceChangePasswordModal from '../components/modals/ForceChangePasswordModal';
import ViewComputerSetModal from '../components/modals/ViewComputerSetModal';
import {
    COMPUTER_SET_STATUS_COLORS,
    COMPONENT_STATUS_COLORS
} from '../utils/statusColors';

const DashboardPage = () => {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState(null);
    const [error, setError] = useState(null);
    const [showComputerSetModal, setShowComputerSetModal] = useState(false);

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

    // Computer Set Status color maps
    const computerSetColorMap = {
        'operational': COMPUTER_SET_STATUS_COLORS.operational,
        'active': COMPUTER_SET_STATUS_COLORS.operational,
        'maintenance': COMPUTER_SET_STATUS_COLORS.maintenance
    };

    // Component Status color maps
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
        <>
            <div className="container-fluid py-3">
                <ForceChangePasswordModal show={!!user?.password_reset_required} />

                {/* KPI Cards - Top Section */}
                <div className="row row-cols-2 row-cols-lg-4 mb-4">
                    <KPICard title="Users" value={kpiData?.total_users} icon={<People />} color="primary" link="/dashboard/accounts" />
                    <KPICard title="Laboratories" value={kpiData?.total_labs} icon={<DoorClosed />} color="primary" link="/dashboard/laboratories" />
                    <KPICard title="Computers" value={kpiData?.total_computers} icon={<PcDisplay />} color="primary" link="/dashboard/laboratories" />
                    <KPICard title="Components" value={kpiData?.total_components} icon={<Keyboard />} color="primary" link="/dashboard/components" />
                </div>

                {/* ==================== LABORATORIES SECTION ==================== */}
                <div className="mb-4">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase small">
                        Laboratories
                    </h6>
                    <div className="row">
                        {/* Left: Quick Actions */}
                        <div className="col-lg-8 mb-3">
                            <div className="card shadow bg-body-tertiary h-100">
                                <div className="card-header bg-transparent border-0 p-3 px-0">
                                    <div className="d-flex flex-wrap justify-content-center align-items-center gap-5 row-gap-3">
                                        <MiniKPI label="Labs" value={kpiData?.total_labs} icon={<DoorClosed />} color="primary" />
                                        <MiniKPI label="Computer Sets" value={kpiData?.total_computers} icon={<PcDisplay />} color="success" />
                                    </div>
                                </div>
                                <div className="card-body pt-3">
                                    {/* Ratiolytic for Computer Status */}
                                    <Ratiolytic
                                        title="Computer Set Status"
                                        apiPath="/analytics/pie/computers-by-status"
                                        colorMap={computerSetColorMap}
                                        height={32}
                                        showLegend={true}
                                        bare={true}
                                    />
                                </div>
                                <div className="card-footer bg-transparent border-top-0">
                                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                                        {user?.role === 'admin' && (
                                            <Link to="/dashboard/laboratories" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2">
                                                Manage Laboratories
                                            </Link>
                                        )}
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => setShowComputerSetModal(true)}
                                        >
                                            View Computer Set
                                        </Button>
                                        <Link to="/dashboard/laboratories" className="btn btn-sm btn-primary d-flex align-items-center gap-2 shadow-sm">
                                            View Laboratories
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right: Donut Chart */}
                        <div className="col-lg-4 mb-3">
                            <DonutChart
                                title="Computer Status"
                                apiPath="/analytics/pie/computers-by-status"
                                colorMap={computerSetColorMap}
                            />
                        </div>
                    </div>
                    {/* Bottom: Stacked Bar Chart */}
                    <div className="row d-none">
                        <div className="col-12">
                            <StackedBarChart
                                title="Computer Sets per Laboratory"
                                apiPath="/analytics/bar/computers-by-lab"
                                colorMap={computerSetColorMap}
                            />
                        </div>
                    </div>
                </div>

                {/* ==================== COMPONENTS SECTION ==================== */}
                <div className="mb-4">
                    <h6 className="fw-bold mb-3 text-muted text-uppercase small">
                        Computer Set Components
                    </h6>
                    <div className="row flex-row-reverse">
                        {/* Left: Quick Actions */}
                        <div className="col-lg-8 mb-3">
                            <div className="card shadow bg-body-tertiary h-100">
                                <div className="card-header bg-transparent border-0 p-3 px-0">
                                    <div className="d-flex flex-wrap justify-content-center align-items-center gap-5 row-gap-3">
                                        <MiniKPI label="Total" value={kpiData?.total_components} icon={<Keyboard />} color="primary" />
                                        <MiniKPI label="Issues" value={kpiData?.components_with_issues} icon={<ExclamationTriangle />} color="warning" />
                                    </div>
                                </div>
                                <div className="card-body pt-3">
                                    {/* Ratiolytic for Component Status */}
                                    <Ratiolytic
                                        title="Component Status"
                                        apiPath="/analytics/pie/components-by-status"
                                        colorMap={componentColorMap}
                                        height={32}
                                        showLegend={true}
                                        bare={true}
                                    />
                                </div>
                                <div className="card-footer bg-transparent border-top-0">
                                    <div className="d-flex flex-wrap gap-2 justify-content-end">
                                        <Link to="/dashboard/components" className="btn btn-sm btn-primary d-flex align-items-center gap-2 shadow-sm">
                                            View Components
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right: Donut Chart */}
                        <div className="col-lg-4 mb-3">
                            <DonutChart
                                title="Component Status"
                                apiPath="/analytics/pie/components-by-status"
                                colorMap={componentColorMap}
                            />
                        </div>
                    </div>
                </div>

                {/* ==================== ACCOUNTS SECTION (Head Roles Only) ==================== */}
                {['admin', 'it_head', 'lab_head'].includes(user?.role) && (
                    <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-muted text-uppercase small">
                            Accounts
                        </h6>
                        <div className="row">
                            {/* Weekly Activities Chart - Full Width */}
                            <div className="col-12 mb-3">
                                <div className="card shadow bg-body-tertiary h-100">
                                    <div className="card-header bg-transparent border-0 p-3 px-0">
                                        <div className="d-flex flex-wrap justify-content-center align-items-center gap-5 row-gap-3">
                                            <MiniKPI label="Online" value={kpiData?.online_accounts} icon={<Person />} color="info" />
                                            <MiniKPI label="Total" value={kpiData?.total_users} icon={<People />} color="primary" />
                                            <MiniKPI label="Suspended" value={kpiData?.suspended_accounts} icon={<ExclamationTriangle />} color="danger" />
                                        </div>
                                    </div>
                                    <div className="card-body pt-3">
                                        <LineChart
                                            title="Account Activities This Week"
                                            apiPath="/analytics/line/weekly-activities"
                                            label="Activities"
                                            bare={true}
                                        />
                                    </div>
                                    <div className="card-footer bg-transparent border-top-0">
                                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                                            {user?.role === 'admin' && (
                                                <Link to="/dashboard/accounts" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2">
                                                    Manage Accounts
                                                </Link>
                                            )}
                                            {user?.role === 'it_head' && (
                                                <Link to="/dashboard/accounts?role=it_technician" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2">
                                                    Manage Technicians
                                                </Link>
                                            )}
                                            {user?.role === 'lab_head' && (
                                                <Link to="/dashboard/accounts?role=lab_assistant" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2">
                                                    Manage Assistants
                                                </Link>
                                            )}
                                            <Link to="/dashboard/profile" className="btn btn-sm btn-primary d-flex align-items-center gap-2 shadow-sm">
                                                My Profile
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View Computer Set Modal */ }
            < ViewComputerSetModal
    show = { showComputerSetModal }
    onHide = {() => setShowComputerSetModal(false)}
        />
        </>
    );
};

export default DashboardPage;
