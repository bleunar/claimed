import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { PcDisplay, ExclamationTriangle, Hdd, DoorClosed, Mouse, Keyboard, JournalText, Tools, PersonCheck, PersonCircle, Person, PeopleFill, DoorClosedFill, KeyboardFill, ExclamationTriangleFill, PersonFill, PersonAdd, Mouse2Fill, ArrowClockwise } from 'react-bootstrap-icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Ratiolytics from '../components/analytics/Ratiolytics';
import MiniKPI from '../components/analytics/MiniKPI';
import { useState, useEffect } from 'react';
import ForceChangePasswordModal from '../components/modals/ForceChangePasswordModal';
import ViewComputerSetModal from '../components/modals/ViewComputerSetModal';
import SuspendAccountModal from '../components/modals/SuspendAccountModal';
import ManageAccountModal from '../components/modals/ManageAccountModal';
import {
    COMPUTER_SET_STATUS_COLORS,
    COMPONENT_STATUS_COLORS
} from '../utils/statusColors';
import { formatRelativeTime } from '../utils/formatTime';
import { ACTIVITY_LABELS, formatRole } from '../utils/activityLabels';
import KPICard from '../components/analytics/KPICard';
import ProfileImage from '../components/common/ProfileImage';

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

const DashboardPage = () => {
    const { user } = useAuth();
    const [kpiData, setKpiData] = useState(null);
    const [error, setError] = useState(null);
    const [showComputerSetModal, setShowComputerSetModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showAddAccountModal, setShowAddAccountModal] = useState(false);
    const [recentActivities, setRecentActivities] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const canManageAccounts = ['admin', 'it_head', 'department_head', 'lab_head'].includes(user?.role);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                const kpiPromise = api.get('/analytics/kpi')
                    .then(res => setKpiData(res.data))
                    .catch(err => {
                        console.error("Error fetching KPI data:", err);
                        setError("Failed to load dashboard KPIs.");
                    });

                const activitiesPromise = canManageAccounts
                    ? api.get('/analytics/recent-activities')
                        .then(res => setRecentActivities(res.data))
                        .catch(err => console.error("Error fetching recent activities:", err))
                    : Promise.resolve();

                await Promise.all([kpiPromise, activitiesPromise]);
            } finally {
                setIsRefreshing(false);
            }
        };

        fetchData();
    }, [user, canManageAccounts, refreshTrigger]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setRefreshTrigger(prev => prev + 1);
    };

    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <>
            <div className="container-fluid px-4 position-relative">
                <div className="row row-cols-1 row-cols-lg-2 mb-4">
                    <div className="col-12 col-lg-4 p-1 px-2">
                        <div className="row row-cols-2 row-cols-sm-3 row-cols-lg-2">
                            {/* 1. Users KPI - Hidden for Techs and Lab Staff */}
                            {!['it_technician', 'lab_head', 'lab_assistant'].includes(user?.role) && (
                                <KPICard title="Users" value={kpiData?.total_users} icon={<PeopleFill />} link="/dashboard/accounts" />
                            )}

                            {/* 2. Standard KPIs - Visible to All */}
                            <KPICard title="Locations" value={kpiData?.total_labs} icon={<DoorClosedFill />} link={['lab_assistant'].includes(user?.role) ? "/dashboard/laboratories" : "/dashboard/locations"} />
                            <KPICard title="Computers" value={kpiData?.total_computers} icon={<PcDisplay />} link={['lab_assistant'].includes(user?.role) ? "/dashboard/laboratories" : "/dashboard/locations"} />
                            <KPICard title="Components" value={kpiData?.total_components} icon={<KeyboardFill />} link="/dashboard/components" />

                            {/* 3. Issue KPIs - Visible to All */}
                            <KPICard
                                title="Set Issues"
                                value={kpiData?.maintenance_alerts}
                                icon={<ExclamationTriangleFill />}
                                link={['lab_head', 'lab_assistant'].includes(user?.role) ? "/dashboard/laboratories" : "/dashboard/locations"}
                            />

                            <KPICard
                                title="Component Issues"
                                value={kpiData?.components_with_issues}
                                icon={<Tools />}
                                link="/dashboard/components"
                            />

                            {/* 4. Dummy KPI - Only for Techs and Lab Staff */}
                            {['it_technician', 'lab_head', 'lab_assistant'].includes(user?.role) && (
                                <KPICard
                                    title="Pending Tasks"
                                    value="0"
                                    icon={<JournalText />}
                                    color="info"
                                    link="#"
                                />
                            )}
                        </div>
                    </div>

                    <div className="col-12 col-lg-8 px-0 ps-0 p-2 ps-lg-2">
                        <div className="card h-100 border border-2 rounded bg-body-secondary">
                            <div className="card-body d-flex align-items-center justify-content-center">
                                <div className="row row-cols-1 row-cols-sm-2 w-100 row-gap-4">
                                    <div className="col">
                                        {/* Ratiolytic for Computer Status */}
                                        <Ratiolytics
                                            title="Computer Set Status"
                                            apiPath="/analytics/pie/computers-by-status"
                                            colorMap={computerSetColorMap}
                                            height="180px"
                                            refreshTrigger={refreshTrigger}
                                        />
                                    </div>

                                    <div className="col">
                                        {/* Ratiolytic for Component Status */}
                                        <Ratiolytics
                                            title="Computer Components Status"
                                            apiPath="/analytics/pie/components-by-status"
                                            colorMap={componentColorMap}
                                            height="180px"
                                            refreshTrigger={refreshTrigger}
                                        />
                                    </div>
                                </div>
                            </div>


                            <div className="card-footer bg-transparent border-0 p-2">
                                <div className="d-flex justify-content-evenly gap-2 flex-wrap">
                                    <Link to="/dashboard/locations" className="btn btn-sm btn-claims-primary gap-2 shadow-sm text-nowrap flex-fill">
                                        <DoorClosedFill /> View Locations
                                    </Link>
                                    <Button
                                        variant="claims-primary"
                                        size="sm"
                                        onClick={() => setShowComputerSetModal(true)}
                                        className=' text-nowrap flex-fill'
                                    >
                                        <PcDisplay /> View Computer Set
                                    </Button>
                                    {
                                        ['admin', 'it_head', 'it_technician', 'lab_head'].includes(user?.role) && (
                                            <Link to="/dashboard/components" className="btn btn-sm btn-claims-primary gap-2 shadow-sm text-nowrap flex-fill">
                                                <Keyboard /> View Components
                                            </Link>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="p-0">
                    {/* Accounts Overview Section - Visible to roles that manage accounts */}
                    {canManageAccounts && (
                        <>
                            <div className="h6 mb-3 fw-semibold text-muted">Accounts Overview</div>
                            <div className="card border border-2 rounded bg-body-secondary mb-4">
                                <div className="card-body p-3">
                                    <div className="row g-3">
                                        {/* Left Column: KPIs and Quick Actions */}
                                        <div className="col-12 col-lg-6 col-xl-7 d-flex flex-column gap-2">
                                            <div className="card h-100 bg-transparent border-0">
                                                <div className="card-body bg-transparent">
                                                    <div className="d-flex flex-wrap gap-5 align-items-center justify-content-center p-2 cursor-pointer h-100">
                                                        <MiniKPI
                                                            label="Managed"
                                                            value={kpiData?.active_accounts + kpiData?.suspended_accounts}
                                                            icon={<PeopleFill />}
                                                            color="primary"
                                                        />
                                                        <MiniKPI
                                                            label="Online"
                                                            value={kpiData?.online_accounts}
                                                            icon={<PersonCheck />}
                                                            color="success"
                                                        />
                                                        <MiniKPI
                                                            label="Suspended"
                                                            value={kpiData?.suspended_accounts}
                                                            icon={<PersonFill />}
                                                            color="danger"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="card-footer bg-transparent border-0 p-0">
                                                    <div className="d-flex">
                                                        <div className="d-flex flex-fill flex-wrap gap-2">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                                                onClick={() => setShowAddAccountModal(true)}
                                                            >
                                                                <PersonAdd /> New Account
                                                            </Button>
                                                            <Button
                                                                variant="primary"
                                                                size='sm'
                                                                className="flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                                                                onClick={() => setShowSuspendModal(true)}
                                                            >
                                                                <ExclamationTriangleFill /> Suspend Account
                                                            </Button>

                                                            <Link to="/dashboard/accounts" className="btn btn-primary btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-2">
                                                                <PeopleFill /> Manage Accounts
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Recent Activity */}
                                        <div className="col-12 col-lg-6 col-xl-5">
                                            <div className="bg-body rounded p-2 h-100">
                                                <div className="small text-muted mb-2 px-2 fw-semibold">Recent Account Activity</div>
                                                <div className="d-flex flex-column gap-2 overflow-y-auto scrollbar-hidden" style={{ height: "300px" }}>
                                                    {recentActivities.length > 0 ? (
                                                        recentActivities.map((activity, index) => (
                                                            <div key={index} className="d-flex align-items-start gap-2 px-2 py-1 border-bottom border-light-subtle last-border-0">
                                                                <div className="mt-1">
                                                                    <ProfileImage
                                                                        src={`${import.meta.env.VITE_API_URL}/accounts/${activity.account_id}/picture`}
                                                                        name={activity?.username}
                                                                        size="32px"
                                                                        shape='circle'
                                                                    />
                                                                </div>
                                                                <div className="flex-grow-1 lh-sm">
                                                                    <div className="small fw-semibold">{ACTIVITY_LABELS[activity.action] || activity.action}</div>
                                                                    <div className="d-flex flex-column">
                                                                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                                            {activity.username}
                                                                        </span>
                                                                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                                                                            {formatRole(activity.role)} {activity.department_name ? ` • ${activity.department_name}` : ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>{formatRelativeTime(activity.date)}</small>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-muted text-center py-4 small">No recent activities found.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Floating Refresh Button */}
            <div className="position-fixed bottom-0 end-0 p-4 mb-3 me-3" style={{ zIndex: 1050 }}>
                <Button
                    variant="claims-primary"
                    className="rounded-circle p-3 shadow-lg d-flex align-items-center justify-content-center"
                    style={{ width: '60px', height: '60px' }}
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                >
                    {isRefreshing ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '24px', height: '24px' }}></span>
                    ) : (
                        <ArrowClockwise size={24} />
                    )}
                </Button>
            </div>

            {/* View Computer Set Modal */}
            <ViewComputerSetModal
                show={showComputerSetModal}
                onHide={() => setShowComputerSetModal(false)}
            />

            {/* Suspend Account Modal */}
            <SuspendAccountModal
                show={showSuspendModal}
                onHide={() => setShowSuspendModal(false)}
            />

            <ForceChangePasswordModal show={!!user?.password_reset_required} />

            <ManageAccountModal
                show={showAddAccountModal}
                onHide={() => setShowAddAccountModal(false)}
                onSuccess={() => {
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </>
    );
};

export default DashboardPage;
