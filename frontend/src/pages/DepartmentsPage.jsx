import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Plus, PencilSquare, Trash, People, GeoAlt, Pc, Eye, PcDisplay, DoorClosed, DoorClosedFill, Person } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const DepartmentsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });
    const [stats, setStats] = useState({});

    const canManage = user?.role === 'admin';

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const response = await api.get('/departments/');
            setDepartments(response.data);

            // Fetch stats for each department
            const statsPromises = response.data.map(dept =>
                api.get(`/departments/${dept.id}/stats`).then(res => ({
                    id: dept.id,
                    stats: res.data.stats
                })).catch(() => ({ id: dept.id, stats: null }))
            );
            const statsResults = await Promise.all(statsPromises);
            const statsMap = {};
            statsResults.forEach(s => { statsMap[s.id] = s.stats; });
            setStats(statsMap);
        } catch (err) {
            console.error("Failed to fetch departments", err);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (dept) => {
        setEditingId(dept.id);
        setFormData({
            name: dept.name,
            description: dept.description || ''
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({ name: '', description: '' });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this department?\n\nMembers and locations will be unassigned.")) return;
        try {
            await api.delete(`/departments/${id}`);
            toast.success("Department deleted successfully");
            fetchDepartments();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete department");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/departments/${editingId}`, formData);
                toast.success("Department updated successfully");
            } else {
                await api.post('/departments/', formData);
                toast.success("Department created successfully");
            }
            setShowModal(false);
            fetchDepartments();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} department`);
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <div className='h4 fw-semibold'>Departments</div>
                </div>
                {canManage && (
                    <button className="btn btn-sm btn-claims-primary" onClick={handleCreate}>
                        <span className='d-none d-md-inline'>New Department</span>
                    </button>
                )}
            </div>

            <div className="container-fluid">
                {loading ? (
                    <LoadingSpinner centered />
                ) : departments.length > 0 ? (
                    <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3 p-1">
                        {departments.map(dept => (
                            <Col key={dept.id} className='p-2'>
                                <Card className="h-100 hover-raised shadow bg-body-secondary">
                                    <Card.Header className='bg-transparent border-0 p-3 cursor-pointer' onClick={() => navigate(`/dashboard/departments/${dept.id}`)}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <Card.Title className="mb-0 h5 fw-semibold">{dept.name}</Card.Title>
                                            </div>
                                            {stats[dept.id] && (
                                                <div className="d-flex justify-content-center">
                                                <div className="d-flex gap-4 text-muted small rounded bg-body-tertiary border p-1 px-3">
                                                    <span title="Users"><Person className="me-1" />{stats[dept.id].members}</span>
                                                    <span title="Locations"><DoorClosedFill className="me-1" />{stats[dept.id].locations}</span>
                                                    <span title="Computer Sets"><PcDisplay className="me-1" />{stats[dept.id].computer_sets}</span>
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </Card.Header>
                                    <Card.Body className='py-0 bg-transparent cursor-pointer' onClick={() => navigate(`/dashboard/departments/${dept.id}`)}>
                                        <Card.Text className="text-muted small mb-3">
                                            {dept.description || <span className="fst-italic">No description set</span>}
                                        </Card.Text>
                                    </Card.Body>
                                    <Card.Footer className="bg-transparent border-top-0 p-3 d-flex justify-content-end">
                                        {
                                            canManage && (
                                                <div className="flex-fill">
                                                    <div className="btn-group btn-group-sm rounded">
                                                        <button className="btn btn-outline-danger border-0" onClick={() => handleDelete(dept.id)} title="Delete Department">
                                                            <Trash />
                                                        </button>
                                                        <button className="btn btn-outline-claims-primary border-0" onClick={() => handleEdit(dept)} title="Edit Department">
                                                            <PencilSquare />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        <button
                                            className="btn btn-sm btn-claims-primary"
                                            onClick={() => navigate(`/dashboard/departments/${dept.id}`)}
                                        >
                                            View Details
                                        </button>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <div className="text-center text-muted py-5 w-100">
                        <div className="d-flex justify-content-center">
                        <span className='mb-0'>No departments found</ span>
                        {canManage && (
                            <>
                            <span className='me-1'>, </span>
                            <button className="btn btn-link p-0" onClick={handleCreate}>
                                Add Department
                            </button>
                            </>
                        )}</div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Department' : 'New Department'}</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className="form-control"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="Department Name"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Description</label>
                            <input
                            type='text'
                                className="form-control"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Department Description"
                            />
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="claims-secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="claims-primary" type="submit">{editingId ? 'Update' : 'Create'}</Button>
                    </Modal.Footer>
                </form>
            </Modal>
        </div>
    );
};

export default DepartmentsPage;
