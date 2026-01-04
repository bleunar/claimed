import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Row, Col, Table, Badge } from 'react-bootstrap';
import { ArrowLeft, People, GeoAlt, Pc, Cpu, PersonCircle, ChevronLeft } from 'react-bootstrap-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileImage from '../components/common/ProfileImage';
import KPICard from '../components/analytics/KPICard';

const DepartmentOverviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [department, setDepartment] = useState(null);
    const [stats, setStats] = useState(null);
    const [members, setMembers] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const canView = ['admin', 'department_head'].includes(user?.role);

    useEffect(() => {
        fetchDepartmentData();
    }, [id]);

    const fetchDepartmentData = async () => {
        setLoading(true);
        try {
            const [statsRes, membersRes, locationsRes] = await Promise.all([
                api.get(`/departments/${id}/stats`),
                api.get(`/departments/${id}/members`),
                api.get(`/departments/${id}/locations`)
            ]);

            setDepartment(statsRes.data.department);
            setStats(statsRes.data.stats);
            setMembers(membersRes.data.members);
            setLocations(locationsRes.data.locations);
        } catch (err) {
            console.error("Failed to fetch department data", err);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            'admin': 'danger',
            'it_head': 'primary',
            'it_technician': 'info',
            'lab_head': 'success',
            'lab_assistant': 'secondary',
            'department_head': 'warning',
            'department_staff': 'secondary',
            'guest': 'light'
        };
        return colors[role] || 'secondary';
    };

    const getTypeBadgeColor = (type) => {
        const colors = {
            'laboratory': 'primary',
            'office': 'success',
            'kiosk': 'warning',
            'others': 'secondary'
        };
        return colors[type] || 'secondary';
    };

    if (loading) {
        return <div className="container py-5"><LoadingSpinner centered /></div>;
    }

    if (!department) {
        return (
            <div className="container py-5 text-center">
                <h4>Department not found</h4>
                <button className="btn btn-primary mt-3" onClick={() => navigate('/dashboard/departments')}>
                    Back to Departments
                </button>
            </div>
        );
    }

    return (
        <div className="container-fluid py-3">

            <div className="d-flex align-items-center gap-3 mb-4">
                <div>
                    <h4 className="mb-0 fw-semibold">{department.name}</h4>
                    {department.description && (
                        <p className="text-muted mb-0 small">{department.description}</p>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="row row-cols-2 row-cols-lg-4 mb-4">
                    <KPICard title="Members" value={stats.members} icon={<People />} color="primary" />
                    <KPICard title="Locations" value={stats.locations} icon={<GeoAlt />} color="success" />
                    <KPICard title="Computer Sets" value={stats.computer_sets} icon={<Pc />} color="info" />
                    <KPICard title="Components" value={stats.components} icon={<Cpu />} color="warning" />
                </div>
            )}

            <Row className="g-4">
                {/* Members Section */}
                <Col lg={6}>
                    <Card className="shadow-sm h-100 overflow-hidden">
                        <Card.Header className="fw-bold d-flex justify-content-between align-items-center">
                            <span><People className="me-2" />Members ({members.length})</span>
                        </Card.Header>
                        <Card.Body className="p-0 bg-body-tertiary" style={{ maxHeight: '300px', minHeight:'300px', overflowY: 'auto' }}>
                            {members.length > 0 ? (
                                <Table borderless hover className="mb-0">
                                    <tbody>
                                        {members.map(member => (
                                            <tr key={member.id}>
                                                <td style={{ width: '50px' }}>
                                                    <div className="d-flex justify-content-center align-items-center">
                                                    <ProfileImage
                                                        src={`${import.meta.env.VITE_API_URL || ''}/accounts/${member.id}/picture`}
                                                        size="35px"
                                                        shape="circle"
                                                        name={member?.name}
                                                    />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold">{member.name}</div>
                                                    <small className="text-muted">{member.email}</small>
                                                </td>
                                                <td className="text-end">
                                                    <Badge bg={"primary"} className="text-capitalize">
                                                        {member.role?.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="text-center text-muted py-4">No members assigned</div>
                            )}
                        </Card.Body>
                        <Card.Footer>
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="btn btn-sm btn-primary">View More</div>
                                </div>
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>

                {/* Locations Section */}
                <Col lg={6}>
                    <Card className="shadow-sm h-100 overflow-hidden">
                        <Card.Header className="fw-bold d-flex justify-content-between align-items-center">
                            <span><GeoAlt className="me-2" />Locations ({locations.length})</span>
                        </Card.Header>
                        <Card.Body className="p-0 bg-body-tertiary" style={{ maxHeight: '300px', minHeight:'300px', overflowY: 'auto' }}>
                            {locations.length > 0 ? (
                                <Table borderless hover className="mb-0">
                                    <tbody>
                                        {locations.map(loc => (
                                            <tr key={loc.id}>
                                                <td>
                                                    <div>
                                                        <Link to={`/dashboard/locations/${loc.id}`} className="text-decoration-none fw-bold text-body">
                                                            {loc.name}
                                                        </Link>
                                                    </div>
                                                    <small className="text-muted small">{loc.description || 'No description'}</small>
                                                </td>
                                                <td className="text-end align-middle">
                                                    <Badge bg="primary" className="text-capitalize me-2">
                                                        {loc.type}
                                                    </Badge>
                                                    <Badge bg="primary">{loc.computer_set_count} PC Sets</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="text-center text-muted py-4">No locations assigned</div>
                            )}
                        </Card.Body>
                        <Card.Footer>
                            <div className="d-flex justify-content-between">
                                <div>
                                    <div className="btn btn-sm btn-primary">View More</div>
                                </div>
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DepartmentOverviewPage;
