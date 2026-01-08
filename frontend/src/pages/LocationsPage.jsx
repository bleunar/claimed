import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Dropdown, Form, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Plus, Funnel, Search, ArrowRepeat, XCircleFill } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { LocationCard } from '../components/laboratory';
import RoleBasedContent from '../components/ComponentProtector';

const LOCATION_TYPES = ['laboratory', 'office', 'kiosk', 'others'];

const CustomToggle = React.forwardRef(({ children, onClick, className, style, disabled }, ref) => (
    <button
        ref={ref}
        onClick={(e) => {
            e.preventDefault();
            onClick(e);
        }}
        className={className.replace("dropdown-toggle", "")}
        style={style}
        disabled={disabled}
        type="button"
    >
        {children}
    </button>
));

const LocationsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [typeFilter, setTypeFilter] = useState(''); // Empty = all types
    const [departmentFilter, setDepartmentFilter] = useState(''); // Empty = all departments
    const [searchTerm, setSearchTerm] = useState('');

    // Refs to always have current values (avoids stale closure in fetchLocations)
    const searchTermRef = useRef(searchTerm);
    const typeFilterRef = useRef(typeFilter);
    const departmentFilterRef = useRef(departmentFilter);

    // Update refs on every render to have current values
    searchTermRef.current = searchTerm;
    typeFilterRef.current = typeFilter;
    departmentFilterRef.current = departmentFilter;

    // Track previous search term to detect when it's cleared
    const prevSearchTermRef = useRef(searchTerm);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'office', // Default for new locations on this page
        department_id: ''
    });

    // RBAC for Locations
    const canAdd = ['admin', 'it_head', 'department_head', 'lab_head'].includes(user?.role);
    const canDelete = ['admin', 'it_head'].includes(user?.role);
    const canEdit = ['admin', 'it_head', 'department_head', 'lab_head'].includes(user?.role);
    const canSelectDepartment = ['admin', 'it_head'].includes(user?.role); // Can choose any department
    const canEditAllFields = ['admin', 'it_head', 'department_head', 'lab_head'].includes(user?.role); // Can edit type and department

    const isGlobalRole = ['admin', 'it_head', 'it_technician'].includes(user?.role);
    // Department-restricted roles that MUST have a department filter set
    const isDepartmentRole = ['department_head', 'department_staff', 'department_assistant'].includes(user?.role);

    const getDepartmentLabel = () => {
        if (!departmentFilter) return "All Departments";
        const dept = departments.find(d => d.id == departmentFilter);
        return dept ? dept.name : "All Departments";
    };

    const getTypeLabel = () => {
        if (!typeFilter) return "All Types";
        return typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1);
    }

    // Set department filter for restricted roles
    useEffect(() => {
        if (isDepartmentRole && user?.department_id) {
            setDepartmentFilter(user.department_id);
        }
    }, [user, isDepartmentRole]);

    // Fetch when filters change (type and department auto-fetch, search requires button)
    useEffect(() => {
        // For department-restricted roles, wait until their department is set
        if (isDepartmentRole && !departmentFilter) return;
        fetchLocations();
    }, [typeFilter, departmentFilter]);

    // Handle search button click
    const handleSearch = () => {
        fetchLocations();
    };

    // Auto-fetch when search is cleared (by typing or clear button)
    useEffect(() => {
        // If search was cleared (had value before, now empty), fetch data
        if (prevSearchTermRef.current !== '' && searchTerm === '') {
            fetchLocations();
        }
        prevSearchTermRef.current = searchTerm;
    }, [searchTerm]);

    // Clear search (just set to empty, useEffect handles the fetch)
    const clearSearch = () => {
        setSearchTerm('');
    };

    // Fetch departments on mount
    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments/');
            setDepartments(response.data);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const fetchLocations = async () => {
        setLoading(true);
        try {
            let params = [];
            // Use refs to get current values (avoids stale closure issues)
            const currentType = typeFilterRef.current;
            const currentDept = departmentFilterRef.current;
            const currentSearch = searchTermRef.current;

            if (currentType) params.push(`type=${currentType}`);
            if (currentDept) params.push(`department_id=${currentDept}`);
            if (currentSearch) params.push(`search=${encodeURIComponent(currentSearch)}`);

            const queryString = params.length > 0 ? `?${params.join('&')}` : '';

            const response = await api.get(`/locations/${queryString}`);
            const sortedLocs = response.data.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
            setLocations(sortedLocs);
        } catch (err) {
            console.error("Failed to fetch locations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (loc) => {
        setEditingId(loc.id);
        setFormData({
            name: loc.name,
            description: loc.description || '',
            type: loc.type || 'office',
            department_id: canSelectDepartment ? (loc.department_id || '') : (user?.department_id || '')
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            type: 'office',
            department_id: canSelectDepartment ? '' : (user?.department_id || '')
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this location?")) return;

        try {
            await api.delete(`/locations/${id}`);
            toast.success("Location deleted successfully");
            fetchLocations();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete location");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await api.put(`/locations/${editingId}`, formData);
                toast.success("Location updated successfully");
            } else {
                await api.post('/locations/', formData);
                toast.success("Location created successfully");
            }
            setShowModal(false);
            fetchLocations();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} location`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className='h4 fw-semibold mb-0'>Locations</div>
            </div>

            <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className='flex-fill'>
                        <InputGroup className='rounded border border-claims-primary border-2 overflow-hidden' style={{ maxWidth: "400px" }}>
                            <div className="position-relative flex-fill">
                                <Form.Control
                                    type="text"
                                    className='border-0 pe-4'
                                    placeholder="Search Locations"
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
                    <div className="d-none d-lg-flex gap-2 align-items-center">
                        {/* Type Filter Dropdown */}
                        <div className="d-flex flex-wrap align-items-center gap-2 border border-primary border-2 py-1 px-2 rounded">
                            <Funnel className="text-muted" />
                            <Dropdown onSelect={(k) => setDepartmentFilter(k)}>
                                <Dropdown.Toggle
                                    as={CustomToggle}
                                    variant="link"
                                    disabled={!isGlobalRole}
                                    style={{ width: '130px' }}
                                    className='bg-transparent border-0 text-nowrap'
                                >
                                    {getDepartmentLabel()}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item eventKey="">All Departments</Dropdown.Item>
                                    {departments.map(dept => (
                                        <Dropdown.Item key={dept.id} eventKey={dept.id}>{dept.name}</Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>

                            <div className="border border-end" style={{ height: '24px' }}></div>

                            <Dropdown onSelect={(k) => setTypeFilter(k)}>
                                <Dropdown.Toggle
                                    as={CustomToggle}
                                    variant="link"
                                    style={{ width: '130px' }}
                                    className='bg-transparent border-0 text-nowrap'
                                >
                                    {getTypeLabel()}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item eventKey="">All Types</Dropdown.Item>
                                    {LOCATION_TYPES.map(type => (
                                        <Dropdown.Item key={type} eventKey={type}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Dropdown.Item>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>
                    {/* Department Filter Dropdown */}
                    {canAdd && (
                        <button className="btn btn-primary" onClick={handleCreate}>
                            <Plus />
                            <span className='d-none d-md-inline'>New Location</span>
                        </button>
                    )}
                </div>
            </div>


            <div className="mb-4 d-flex d-lg-none justify-content-center gap-1 border border-primary border-2 rounded align-items-center py-1 px-2">
                <Funnel className="text-muted" style={{ fontSize: "2rem", width: "2.5rem" }} />
                <Dropdown onSelect={(k) => setDepartmentFilter(k)} className="w-100 d-flex justify-content-center">
                    <Dropdown.Toggle
                        as={CustomToggle}
                        variant="link"
                        disabled={!isGlobalRole}
                        className='bg-transparent border-0 text-nowrap'
                    >
                        {getDepartmentLabel()}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="w-100">
                        <Dropdown.Item eventKey="">All Departments</Dropdown.Item>
                        {departments.map(dept => (
                            <Dropdown.Item key={dept.id} eventKey={dept.id}>{dept.name}</Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>

                <div className="border border-end" style={{ height: '24px' }}></div>

                <Dropdown onSelect={(k) => setTypeFilter(k)} className="w-100 d-flex justify-content-center">
                    <Dropdown.Toggle
                        as={CustomToggle}
                        variant="link"
                        className='bg-transparent border-0 text-nowrap'
                    >
                        {getTypeLabel()}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="w-100">
                        <Dropdown.Item eventKey="">All Types</Dropdown.Item>
                        {LOCATION_TYPES.map(type => (
                            <Dropdown.Item key={type} eventKey={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                </Dropdown>
            </div>

            <div className="container-fluid">
                {
                    loading ? (
                        <LoadingSpinner centered />
                    ) : (
                        (
                            locations.length > 0 ? (
                                <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 p-1">
                                    {locations.map(loc => (
                                        <LocationCard
                                            key={loc.id}
                                            location={loc}
                                            canEdit={canEdit}
                                            canDelete={canDelete}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onNavigate={(id) => navigate(`/dashboard/locations/${id}`)}
                                            showLocationType
                                            showDepartment
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="w-100 text-center">
                                    <span className="text-muted w-100">No Locations Found
                                        <RoleBasedContent allowedRoles={['admin', 'it_head', 'department_head', 'lab_head']}>
                                            , <span className='btn btn-link px-0' onClick={handleCreate}>Add One</span>
                                        </RoleBasedContent>
                                    </span>
                                </div>
                            )
                        )
                    )
                }
            </div>

            {/* Modal */}
            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Location' : 'New Location'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className='p-0'>
                    <form onSubmit={handleSubmit}>
                        <div className="p-3">
                            <div className="row">
                                <div className="col-12 mb-3">
                                    <label className="form-label">Name</label>
                                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder='Location Name' />
                                </div>
                                <div className="col-12 mb-3">
                                    <label className="form-label">Description</label>
                                    <input className="form-control" name="description" value={formData.description} onChange={handleInputChange} placeholder='Description'></input>
                                </div>
                                {canSelectDepartment && (
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Department</label>
                                        <select className="form-select" name="department_id" value={formData.department_id} onChange={handleInputChange}>
                                            <option value="">No Department</option>
                                            {departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {canEditAllFields && (
                                    <div className="col mb-3">
                                        <label className="form-label">Type</label>
                                        <select className="form-select" name="type" value={formData.type} onChange={handleInputChange} required>
                                            {LOCATION_TYPES.map(type => (
                                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer border-0">
                            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>Close</Button>
                            <Button variant="primary" type="submit" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LocationsPage;
