import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { Funnel, Search, Tools, Hdd, Cpu, Display, Keyboard, Mouse, Webcam, Backspace, EnvelopePaper, PencilSquare, Trash, Plus, Printer, ArrowClockwise } from 'react-bootstrap-icons';

const COMPONENT_TYPES = [
    { label: 'System Unit', value: 'system_unit' },
    { label: 'Monitor', value: 'monitor' },
    { label: 'Keyboard', value: 'keyboard' },
    { label: 'Mouse', value: 'mouse' },
    { label: 'AVR', value: 'avr' },
    { label: 'Web Camera', value: 'web_camera' },
    { label: 'Printer', value: 'printer' },
    { label: 'Other', value: 'other' }
];

const ComponentsPage = () => {
    const { user } = useAuth();
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [unassignedFilter, setUnassignedFilter] = useState(false);
    const [labFilter, setLabFilter] = useState('');
    const [setFilter, setSetFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [laboratories, setLaboratories] = useState([]);
    const [computerSets, setComputerSets] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);
    const [formData, setFormData] = useState({
        brand_name: '',
        serial_number: '',
        status: 'good',
        component_type: 'other'
    });

    const canManage = ['admin', 'it_head'].includes(user?.role);

    const fetchLaboratories = async () => {
        try {
            const res = await api.get('/laboratories/');
            const sortedLabs = res.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setLaboratories(sortedLabs);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        }
    };

    const fetchComputerSets = async (labId) => {
        try {
            const res = await api.get(`/computer-sets/?laboratory_id=${labId}`);
            const sortedSets = res.data.sort((a, b) => a.set_name.localeCompare(b.set_name, undefined, { numeric: true }));
            setComputerSets(sortedSets);
        } catch (err) {
            console.error("Failed to fetch computer sets", err);
        }
    };

    const fetchComponents = async () => {
        setLoading(true);
        try {
            let query = `/components/?`;
            if (statusFilter) query += `status=${statusFilter}&`;
            if (typeFilter) query += `component_type=${typeFilter}&`;
            if (unassignedFilter) query += `unassigned=true&`;
            if (search) query += `search=${search}&`;
            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (setFilter) query += `computer_set_id=${setFilter}&`;

            const res = await api.get(query);
            setComponents(res.data);
            setComponents(res.data);
        } catch (err) {
            console.error("Failed to fetch components", err);
            toast.error("Failed to load components");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLaboratories();
    }, []);

    useEffect(() => {
        if (labFilter) {
            fetchComputerSets(labFilter);
        } else {
            setComputerSets([]);
            setSetFilter('');
        }
    }, [labFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchComponents();
        }, 500);

        return () => clearTimeout(timer);
    }, [search, statusFilter, unassignedFilter, labFilter, setFilter, typeFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        // Auto-fetch handles this via useEffect
    };

    const getComponentIcon = (type) => {
        switch (type) {
            case 'system_unit': return <Cpu />;
            case 'monitor': return <Display />;
            case 'keyboard': return <Keyboard />;
            case 'mouse': return <Mouse />;
            case 'web_camera': return <Webcam />;
            case 'printer': return <Printer />;
            case 'avr': return <Hdd />;
            default: return <Tools />;
        }
    };

    const [modalComputerSets, setModalComputerSets] = useState([]);

    const fetchModalComputerSets = async (labId) => {
        try {
            const res = await api.get(`/computer-sets/?laboratory_id=${labId}`);
            setModalComputerSets(res.data.sort((a, b) => a.set_name.localeCompare(b.set_name, undefined, { numeric: true })));
        } catch (err) {
            console.error("Failed to fetch computer sets", err);
        }
    };

    const handleEdit = (comp) => {
        setEditingComponent(comp);
        setFormData({
            brand_name: comp.brand_name,
            serial_number: comp.serial_number || '',
            status: comp.status,
            component_type: comp.component_type,
            laboratory_id: '', // Reset assignment fields on edit for now (or could pre-fill if we want to allow moving via edit)
            computer_set_id: '',
            isAssigning: false
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this component?")) return;
        try {
            await api.delete(`/components/${id}`);
            toast.success("Component deleted successfully");
            fetchComponents();
        } catch (err) {
            toast.error("Failed to delete component");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let targetId = editingComponent?.id;
            let method = editingComponent ? 'put' : 'post';
            let url = editingComponent ? `/components/${targetId}` : '/components/';
            let payload = { ...formData };

            // Check Serial Number if creating or if serial changed
            if (formData.serial_number && (!editingComponent || formData.serial_number !== editingComponent.serial_number)) {
                const checkRes = await api.get(`/components/check-serial?serial_number=${formData.serial_number}`);
                if (checkRes.data.exists) {
                    const existing = checkRes.data.component;

                    // Specific logic: If we are editing, and the serial belongs to ANOTHER component, block or warn?
                    // User requirement: "If the serial number is used on other component -> opt to move"
                    // This implies we essentially "take over" the other component ID.

                    if (editingComponent && existing.id === editingComponent.id) {
                        // Same component, just proceed
                    } else {
                        const locationMsg = existing.computer_set_name
                            ? `assigned to ${existing.computer_set_name} in ${existing.laboratory_name}`
                            : `Unassigned (Rogue)`;

                        const confirmMsg = `Serial Number "${formData.serial_number}" is already currently ${locationMsg}.\n\nDo you want to MOVE/UPDATE that component to this new configuration?`;

                        if (!window.confirm(confirmMsg)) {
                            return; // User cancelled
                        }

                        // Switch to PUT on the EXISTING component
                        targetId = existing.id;
                        method = 'put';
                        url = `/components/${targetId}`;
                    }
                }
            }

            // Prepare payload
            if (formData.isAssigning && formData.computer_set_id) {
                payload.computer_set_id = formData.computer_set_id;
            } else if (!editingComponent) { // creating unassigned
                // ensure computer_set_id is null if not assigning
                if (!formData.isAssigning) payload.computer_set_id = null;
            }

            // Clean up UI-only fields
            delete payload.isAssigning;
            if (!payload.computer_set_id) delete payload.computer_set_id;

            if (method === 'post') {
                // Explicitly set is_core false for manual creation
                payload.is_core = false;
            }

            await api[method](url, payload);

            toast.success(`Component ${method === 'post' ? 'created' : 'updated/moved'} successfully`);
            setShowModal(false);
            fetchComponents();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to save component");
        }
    };

    const handleCreate = () => {
        setEditingComponent(null);
        setFormData({
            brand_name: '',
            serial_number: '',
            status: 'good',
            component_type: 'other',
            isAssigning: false,
            laboratory_id: '',
            computer_set_id: ''
        });
        setShowModal(true);
    };

    // Get current users
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentComponents = components.slice(indexOfFirstItem, indexOfLastItem);

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleClearFilters = () => {
        setSearch('');
        setLabFilter('');
        setSetFilter('');
        setStatusFilter('');
        setTypeFilter('');
        setUnassignedFilter(false);
        setCurrentPage(1);
        // fetchComponents will be triggered by useEffect dependency changes
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4'>Computer Components</div>
                {canManage && (
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <span className='d-none d-md-inline'>New Component</span>
                        <Plus className='d-inline d-md-none' />
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card mb-4 overflow-hidden">
                <div className="card-body bg-body-tertiary">
                    <form onSubmit={handleSearch} className="row g-3 align-items-end">

                        <div className="col-md-4">
                            <label className="form-label">Search</label>
                            <div className="input-group">
                                <span className="input-group-text"><Search /></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Brand or Serial No."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-sm-6 col-md-2">
                            <label className="form-label">Laboratory</label>
                            <select
                                className="form-select"
                                value={labFilter}
                                onChange={(e) => {
                                    setLabFilter(e.target.value);
                                    if (e.target.value) setUnassignedFilter(false);
                                }}
                                disabled={unassignedFilter}
                            >
                                <option value="">All Laboratories</option>
                                {laboratories.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-sm-6 col-md-2">
                            <label className="form-label">Computer Set</label>
                            <select
                                className="form-select"
                                value={setFilter}
                                onChange={(e) => setSetFilter(e.target.value)}
                                disabled={!labFilter || unassignedFilter}
                            >
                                <option value="">All Sets</option>
                                {computerSets.map(set => (
                                    <option key={set.id} value={set.id}>{set.set_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-sm-6 col-md-2">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="missing">Missing</option>
                            </select>
                        </div>

                        <div className="col-sm-6 col-md-2">
                            <label className="form-label">Type</label>
                            <select
                                className="form-select"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="">All Types</option>
                                {COMPONENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-12">
                            <div className="form-check mb-2">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="unassignedCheck"
                                    checked={unassignedFilter}
                                    onChange={(e) => {
                                        setUnassignedFilter(e.target.checked);
                                        if (e.target.checked) {
                                            setLabFilter('');
                                            setSetFilter('');
                                        }
                                    }}
                                />
                                <label className="form-check-label" htmlFor="unassignedCheck" title='Components not assigned to a Computer Set'>
                                    Rogue Components
                                </label>
                            </div>
                        </div>

                        <div className="col-12">
                            <div className="d-flex justify-content-between justify-content-md-end gap-2">
                                <button type="button" className="btn btn-secondary" onClick={handleClearFilters}><Backspace /> Clear Filters</button>
                                <button type="button" className="btn btn-secondary" onClick={() => fetchComponents()} title="Refresh"><ArrowClockwise /></button>
                                <button type="submit" className="btn btn-primary"><Search /> Search</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden border-0">
                <div className="table-responsive border-0">
                    <table className="table table-hover table-striped align-middle mb-0">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Brand</th>
                                <th>Serial</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                            ) : components.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4">No components found.</td></tr>
                            ) : (
                                currentComponents.map(comp => (
                                    <tr key={comp.id}>
                                        <td>
                                            <span className="me-2 fs-5" title={COMPONENT_TYPES.find(t => t.value === comp.component_type)?.label || comp.component_type}>
                                                {getComponentIcon(comp.component_type)}
                                            </span>
                                        </td>
                                        <td>{comp.brand_name}</td>
                                        <td>{comp.serial_number || '-'}</td>
                                        <td>
                                            <span className={`badge ${comp.status === 'good' ? 'bg-success' :
                                                comp.status === 'bad' ? 'bg-warning' :
                                                    comp.status === 'maintenance' ? 'bg-info' : 'bg-danger'
                                                }`}>
                                                {comp.status}
                                            </span>
                                        </td>
                                        <td>
                                            {
                                                comp.computer_set_name ? (
                                                    <div className="d-flex gap-1">
                                                        <Link to={`/dashboard/laboratories/${comp.laboratory_id}`} className="badge fw-normal bg-secondary text-decoration-none" title="Go to Laboratory">
                                                            {comp?.laboratory_name}
                                                        </Link>
                                                        <Link to={`/dashboard/laboratories/${comp.laboratory_id}?set=${comp.computer_set_id}&components=true`} className="badge fw-normal bg-primary text-decoration-none" title="View in Computer Set">
                                                            {comp?.computer_set_name}
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted fst-italic">Unassigned</span>
                                                )
                                            }
                                        </td>
                                        {canManage && (
                                            <td className='d-flex flex-wrap gap-1'>
                                                <button className="btn btn-sm border-0 btn-outline-primary me-2" onClick={() => handleEdit(comp)}><PencilSquare /></button>
                                                <button className="btn btn-sm border-0 btn-outline-danger" onClick={() => handleDelete(comp.id)}><Trash /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                itemsPerPage={itemsPerPage}
                totalItems={components.length}
                paginate={paginate}
                currentPage={currentPage}
            />

            {/* Modal */}
            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingComponent ? 'Edit Component' : 'Add Component'}</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Type</label>
                            <select
                                className="form-select"
                                value={formData.component_type}
                                onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}
                                required
                            >
                                {COMPONENT_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Brand Name</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.brand_name}
                                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Serial Number</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="missing">Missing</option>
                            </select>
                        </div>

                        {!editingComponent && (
                            <>
                                <hr />
                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="assignCheck"
                                        checked={formData.isAssigning}
                                        onChange={(e) => setFormData({ ...formData, isAssigning: e.target.checked })}
                                    />
                                    <label className="form-check-label" htmlFor="assignCheck">Assign to a Computer Set</label>
                                </div>
                                {formData.isAssigning && (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label">Laboratory</label>
                                            <select
                                                className="form-select"
                                                value={formData.laboratory_id}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, laboratory_id: e.target.value });
                                                    fetchModalComputerSets(e.target.value);
                                                }}
                                                required={formData.isAssigning}
                                            >
                                                <option value="">Select Laboratory</option>
                                                {laboratories.map(lab => (
                                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Computer Set</label>
                                            <select
                                                className="form-select"
                                                value={formData.computer_set_id}
                                                onChange={(e) => setFormData({ ...formData, computer_set_id: e.target.value })}
                                                required={formData.isAssigning}
                                                disabled={!formData.laboratory_id}
                                            >
                                                <option value="">Select Computer Set</option>
                                                {modalComputerSets.map(set => (
                                                    <option key={set.id} value={set.id}>{set.set_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Save</Button>
                    </Modal.Footer>
                </form>
            </Modal>
        </div>
    );
};

export default ComponentsPage;
