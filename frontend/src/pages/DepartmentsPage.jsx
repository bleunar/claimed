import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Plus, PencilSquare, Trash, People, GeoAlt, Pc, Eye, PcDisplay, DoorClosed, DoorClosedFill, Person, Search, ArrowRepeat, XCircleFill } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { DEPARTMENT_TYPES, getDepartmentTypeLabel } from '../utils/departmentUtils';
const DepartmentsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: ''
    });
    const [stats, setStats] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const canManage = user?.role === 'admin' || user?.role === 'it_head';

    // Ref to always have the current search term value (avoids stale closure)
    const searchTermRef = useRef(searchTerm);
    searchTermRef.current = searchTerm;

    // Track previous search term to detect when it's cleared
    const prevSearchTermRef = useRef(searchTerm);

    // Initial fetch on mount
    useEffect(() => {
        fetchDepartments();
    }, []);

    // Handle search button click
    const handleSearch = () => {
        fetchDepartments();
    };

    // Auto-fetch when search is cleared (by typing or clear button)
    useEffect(() => {
        // If search was cleared (had value before, now empty), fetch data
        if (prevSearchTermRef.current !== '' && searchTerm === '') {
            fetchDepartments();
        }
        prevSearchTermRef.current = searchTerm;
    }, [searchTerm]);

    // Clear search (just set to empty, useEffect handles the fetch)
    const clearSearch = () => {
        setSearchTerm('');
    };

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            let url = '/departments/';
            // Use ref to get current search term value (avoids stale closure)
            const currentSearch = searchTermRef.current;
            if (currentSearch) {
                url += `?search=${encodeURIComponent(currentSearch)}`;
            }
            const response = await api.get(url);
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
            description: dept.description || '',
            type: dept.type || ''
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', type: '' });
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
        setSubmitting(true);
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
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div className='h4 fw-semibold mb-0'>Departments</div>
                </div>
            </div>

            <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className='flex-fill'>
                        <InputGroup className='rounded border border-claims-primary border-2 overflow-hidden' style={{ maxWidth: "400px" }}>
                            <div className="position-relative flex-fill">
                                <Form.Control
                                    type="text"
                                    className='border-0 pe-4'
                                    placeholder="Search Departments"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-2 text-muted"
                                        onClick={clearSearch}
                                        title="Clear search"
                                        style={{ zIndex: 10 }}
                                    >
                                        <XCircleFill size={16} />
                                    </button>
                                )}
                            </div>
                            <button
                                className='btn bg-claims-primary text-white px-3 rounded-0'
                                onClick={handleSearch}
                                disabled={loading}
                                title='Search'
                            >
                                {loading ? <ArrowRepeat size={16} className="spinner" /> : <Search size={16} />}
                            </button>
                        </InputGroup>
                    </div>
                    {canManage && (
                        <button className="btn btn btn-claims-primary" onClick={handleCreate}>
                            <Plus />
                            <span className=''>New Department</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="container-fluid">
                {loading ? (
                    <LoadingSpinner centered />
                ) : departments.length > 0 ? (
                    <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3 p-1">
                        {departments.map(dept => (
                            <Col key={dept.id} className='p-2'>
                                <Card className="h-100 hover-raised shadow bg-body-secondary">
                                    <Card.Header className='bg-transparent border-0 p-3 pb-2 cursor-pointer' onClick={() => navigate(`/dashboard/departments/${dept.id}`)}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <Card.Title className="mb-0 h5 fw-semibold">{dept.name}</Card.Title>
                                                <span className="badge bg-primary small text-capitalize">
                                                    {getDepartmentTypeLabel(dept.type)}
                                                </span>
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
                                        <Card.Text className="text-muted text-start mb-3" style={{ fontSize: '0.75em' }}>
                                            {dept.description || <span className="fst-italic">No description set</span>}
                                        </Card.Text>
                                    </Card.Body>
                                    <Card.Footer className="bg-transparent border-top-0 p-3 d-flex justify-content-end">

                                        <div className="btn-group btn-group-sm rounded border overflow-hidden">
                                            {
                                                canManage && (
                                                    <>
                                                        <button className="btn bg-body text-body border-0" onClick={() => handleDelete(dept.id)} title="Delete Department">
                                                            <Trash />
                                                        </button>
                                                        <button className="btn bg-body text-body border-0" onClick={() => handleEdit(dept)} title="Edit Department">
                                                            <PencilSquare />
                                                        </button>
                                                    </>
                                                )
                                            }
                                            <button
                                                className="btn btn-sm btn-claims-primary"
                                                onClick={() => navigate(`/dashboard/departments/${dept.id}`)}
                                            >
                                                View Details
                                            </button>
                                        </div>

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
                        <div className="mb-3">
                            <label className="form-label">Type</label>
                            <select
                                className="form-select"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Type</option>
                                {DEPARTMENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="claims-secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
                        <Button variant="claims-primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}</Button>
                    </Modal.Footer>
                </form>
            </Modal>
        </div>
    );
};

export default DepartmentsPage;
