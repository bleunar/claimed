import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { Funnel, Plus, Search, Trash, PencilSquare, CheckCircle, CheckCircleFill, ExclamationTriangle, ExclamationTriangleFill, InfoCircle, XCircle, Tools, Hdd, Cpu, Display, Keyboard, Mouse, Webcam, Printer } from 'react-bootstrap-icons';
import KeyValueEditor from '../components/common/KeyValueEditor';

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

    // Bulk Operations State
    const [selectedItems, setSelectedItems] = useState([]); // Array of component objects
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showSelectedModal, setShowSelectedModal] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [assignmentFilter, setAssignmentFilter] = useState('false'); // 'false'=Assigned (default), 'true'=Unassigned, ''=All
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
        component_type: 'other',
        properties: {}
    });

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    // State for Flag Issue Modal
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flaggingComponent, setFlaggingComponent] = useState(null);
    const [flagFormData, setFlagFormData] = useState({
        title: '',
        description: '',
        priority: 'medium'
    });

    const [viewPropsModal, setViewPropsModal] = useState({ show: false, component: null });

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
            if (assignmentFilter) query += `unassigned=${assignmentFilter}&`;
            if (search) query += `search=${search}&`;
            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (setFilter) query += `computer_set_id=${setFilter}&`;

            const res = await api.get(query);
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

    }, [search, statusFilter, assignmentFilter, labFilter, setFilter, typeFilter]);

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
            properties: comp.properties || {},
            isAssigning: false, // Don't allow re-assigning via edit modal usually, or keep as is
            laboratory_id: comp.laboratory_id || '',
            computer_set_id: comp.computer_set_id || ''
        });
        if (comp.laboratory_id) {
            fetchModalComputerSets(comp.laboratory_id);
        }
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

    // Bulk Operations Handlers
    const handleSelect = (comp) => {
        if (selectedItems.some(item => item.id === comp.id)) {
            setSelectedItems(selectedItems.filter(item => item.id !== comp.id));
        } else {
            setSelectedItems([...selectedItems, comp]);
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Add all currently filtered components (avoiding duplicates)
            const newItems = components.filter(c => !selectedItems.some(sel => sel.id === c.id));
            setSelectedItems([...selectedItems, ...newItems]);
        } else {
            // Deselect ONLY the currently filtered components? 
            // Or deselect all? Typically "Select All" checkbox in header toggles *page* selection.
            // But here "components" is the FULL fetched list (unless pagination is server side? No, client side slicing).
            // "components" state comes from API, and pagination slices it.
            // Let's assume user wants to toggle selection for the visible list.
            // Actually `components` is the FULL list from fetchComponents (it fetches ALL matching filters).
            // So this selects ALL items matching current filter. Correct.

            // To deselect, we remove items that are in the current `components` list.
            const currentIds = components.map(c => c.id);
            setSelectedItems(selectedItems.filter(item => !currentIds.includes(item.id)));
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedItems.length === 0 || !bulkStatus) return;
        if (!window.confirm(`Are you sure you want to set status to "${bulkStatus}" for ${selectedItems.length} components?`)) return;

        setIsBulkSubmitting(true);
        try {
            const promises = selectedItems.map(item => {
                return api.put(`/components/${item.id}`, { ...item, status: bulkStatus });
            });
            await Promise.all(promises);
            toast.success(`Updated ${selectedItems.length} components successfully`);
            setSelectedItems([]); // Clear selection
            setBulkStatus('');
            fetchComponents();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update some components");
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.length === 0) return;
        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedItems.length} components?`)) return;

        setIsBulkSubmitting(true);
        try {
            const promises = selectedItems.map(item => api.delete(`/components/${item.id}`));
            await Promise.all(promises);
            toast.success(`Deleted ${selectedItems.length} components successfully`);
            setSelectedItems([]); // Clear selection
            fetchComponents();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete some components");
        } finally {
            setIsBulkSubmitting(false);
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
                    } else if (existing.computer_set_name) {
                        // Case 1: Assigned to another set
                        const locationMsg = `assigned to ${existing.computer_set_name} in ${existing.laboratory_name}`;
                        const confirmMsg = `Serial Number "${formData.serial_number}" is currently ${locationMsg}.\n\nDo you want to MOVE this component to this new configuration?`;

                        if (!window.confirm(confirmMsg)) return;

                        // Switch to PUT on the EXISTING component
                        targetId = existing.id;
                        method = 'put';
                        url = `/components/${targetId}`;

                    } else {
                        // Case 2: Unassigned (Rogue)
                        const confirmMsg = `Serial Number "${formData.serial_number}" exists but is currently UNASSIGNED.\n\nDo you want to LINK this component to this configuration?`;

                        if (!window.confirm(confirmMsg)) return;

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

    const handleFlag = (comp) => {
        setFlaggingComponent(comp);
        setFlagFormData({
            title: `Issue with ${comp.brand_name}`,
            description: '',
            priority: 'medium'
        });
        setShowFlagModal(true);
    };

    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                title: flagFormData.title,
                description: flagFormData.description,
                priority: flagFormData.priority,
                laboratory_id: flaggingComponent.laboratory_id || null,
                computer_set_id: flaggingComponent.computer_set_id || null,
                component_id: flaggingComponent.id
            };

            await api.post('/issues/', payload);
            toast.success("Issue reported successfully");
            setShowFlagModal(false);
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to report issue");
        }
    };

    const handleCreate = () => {
        setEditingComponent(null);
        setFormData({
            brand_name: '',
            serial_number: '',
            status: 'good',
            component_type: 'other',
            properties: {},
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
        setAssignmentFilter('false');
        setCurrentPage(1);
        // fetchComponents will be triggered by useEffect dependency changes
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'good': return 'badge bg-primary';
            case 'bad': return 'badge bg-warning text-dark';
            case 'maintenance': return 'badge bg-info text-dark';
            case 'missing': return 'badge bg-danger';
            default: return 'badge bg-secondary';
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4'>Computer Components</div>
                {canManage && (
                    <button className="btn btn-sm btn-primary" onClick={handleCreate}>
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

                        <div className="col-6 col-md-2">
                            <select
                                className="form-select form-select-sm"
                                value={labFilter}
                                onChange={(e) => {
                                    setLabFilter(e.target.value);
                                    // if (e.target.value) setAssignmentFilter('false'); // Optional: force assignment filter? No, let user decide.
                                }}
                                disabled={assignmentFilter === 'true'}
                            >
                                <option value="">All Laboratory</option>
                                {laboratories.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-6 col-md-2">
                            <select
                                className="form-select form-select-sm"
                                value={setFilter}
                                onChange={(e) => setSetFilter(e.target.value)}
                                disabled={!labFilter || assignmentFilter === 'true'}
                            >
                                <option value="">All Sets</option>
                                {computerSets.map(set => (
                                    <option key={set.id} value={set.id}>{set.set_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-6 col-md-2">
                            <select
                                className="form-select form-select-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="missing">Missing</option>
                            </select>
                        </div>

                        <div className="col-6 col-md-2">
                            <select
                                className="form-select form-select-sm"
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
                            <div className="row row-cols-md-2">
                                <div className="col-12 col-md-4 d-flex justify-content-center justify-content-md-start mb-3 mb-md-0">
                                    <select
                                        className="form-select form-select-sm"
                                        value={assignmentFilter}
                                        onChange={(e) => {
                                            setAssignmentFilter(e.target.value);
                                            if (e.target.value === 'true') { // 'true' is Unassigned
                                                setLabFilter('');
                                                setSetFilter('');
                                            }
                                        }}
                                    >
                                        <option value="false">Active Components</option>
                                        <option value="true" title='Components that are not assigned to computer sets'>Rogue Components</option>
                                        <option value="">Show All</option>
                                    </select>
                                </div>
                                <div className="col-12 col-md-8 d-flex justify-content-end justify-content-md-end gap-2">
                                    <button type="button" className="btn btn-sm btn-link border-0" onClick={handleClearFilters}>Clear Filters</button>
                                    <button type="button" className="btn btn-sm btn-link border-0" onClick={() => fetchComponents()} title="Refresh">Refresh</button>
                                    <button type="submit" className="btn btn-sm btn-primary"><Search /> <span className='d-none d-md-inline'>Search</span></button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedItems.length > 0 && (
                <div className="card mb-4 border-0">
                    <div className="card-body bg-body-tertiary rounded shadow-sm border p-2 d-flex align-items-center justify-content-center flex-wrap gap-2">
                        <div className="row w-100">
                            <div className="col-12 col-md-6 p-1">
                                <span className='mb-3 fw-bold text-primary'>
                                    <CheckCircleFill className="me-2" />
                                    {selectedItems.length} component{selectedItems.length !== 1 ? 's' : ''} selected
                                </span>

                                <div className="d-flex gap-2">
                                    <button className="btn btn-sm btn-link text-nowrap text-decoration-none" onClick={() => setShowSelectedModal(true)}>
                                        View
                                    </button>

                                    <button
                                        className="btn btn-sm btn-link text-nowrap text-decoration-none"
                                        onClick={() => setSelectedItems([])}
                                    >
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                            <div className="col-12 col-md-4 p-1">
                                <div className="d-flex gap-2 align-items-center w-100">
                                    <div className="input-group input-group-sm flex-fill">
                                        <select
                                            className="form-select"
                                            value={bulkStatus}
                                            onChange={(e) => setBulkStatus(e.target.value)}
                                            disabled={isBulkSubmitting}
                                        >
                                            <option value="">Set Status...</option>
                                            <option value="good">Good</option>
                                            <option value="bad">Bad</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="missing">Missing</option>
                                        </select>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleBulkStatusUpdate}
                                            disabled={!bulkStatus || isBulkSubmitting}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-2 p-1">
                                <button
                                    className="btn btn-sm btn-danger d-flex align-items-center text-nowrap w-100"
                                    onClick={handleBulkDelete}
                                    disabled={isBulkSubmitting}
                                >
                                    <Trash className="me-1" /> Delete Items
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card overflow-hidden border-0">
                <div className="table-responsive border-0">
                    <table className="table table-hover table-borderless table-striped align-middle mb-0">
                        <thead>
                            <tr className='text-center'>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        onChange={handleSelectAll}
                                        checked={components.length > 0 && components.every(c => selectedItems.some(item => item.id === c.id))}
                                    />
                                </th>
                                <th>Type</th>
                                <th className='text-start'>Brand</th>
                                <th className='text-start'>Serial</th>
                                <th>Status</th>
                                <th className='text-start'>Assigned at</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={canManage ? 7 : 6} className="text-center py-4">Loading...</td></tr>
                            ) : components.length === 0 ? (
                                <tr><td colSpan={canManage ? 7 : 6} className="text-center py-4">No components found.</td></tr>
                            ) : (
                                currentComponents.map(comp => (
                                    <tr key={comp.id}>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedItems.some(item => item.id === comp.id)}
                                                onChange={() => handleSelect(comp)}
                                            />
                                        </td>
                                        <td className='text-center'>
                                            <span className="fs-5" title={COMPONENT_TYPES.find(t => t.value === comp.component_type)?.label || comp.component_type}>
                                                {getComponentIcon(comp.component_type)}
                                            </span>
                                        </td>
                                        <td className='text-truncate'>{comp.brand_name}</td>
                                        <td className='text-truncate'>{comp.serial_number || '-'}</td>
                                        <td>
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span className={`${getStatusBadgeClass(comp.status)} me-2 text-capitalize`}>{comp.status}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex justify-content-start">
                                                {
                                                    comp.computer_set_name ? (
                                                        <>
                                                            <Link to={`/dashboard/laboratories/${comp.laboratory_id}`} className="badge fw-semibold bg-primary text-decoration-none me-1" title="Go to Laboratory">
                                                                {comp?.laboratory_name}
                                                            </Link>
                                                            <Link to={`/dashboard/laboratories/${comp.laboratory_id}?set=${comp.computer_set_id}&components=true`} className="badge fw-semibold bg-primary text-decoration-none" title="View in Computer Set">
                                                                {comp?.computer_set_name}
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted fst-italic">Unassigned</span>
                                                    )
                                                }
                                            </div>
                                        </td>
                                        {canManage && (
                                            <td>
                                                <div className='d-flex flex-wrap gap-1 justify-content-end'>
                                                    {
                                                        comp.properties && Object.keys(comp.properties).length > 0 && (
                                                            <button className="btn btn-sm border-0 btn-outline-primary" onClick={() => setViewPropsModal({ show: true, component: comp })}>
                                                                <InfoCircle title="View Properties" />
                                                            </button>
                                                        )
                                                    }
                                                    <button className="btn btn-sm border-0 btn-outline-primary" onClick={() => handleFlag(comp)} title="Report Issue"><ExclamationTriangleFill /></button>
                                                    <button className="btn btn-sm border-0 btn-outline-primary" onClick={() => handleEdit(comp)} title="Edit Component"><PencilSquare /></button>
                                                    <button className="btn btn-sm border-0 btn-outline-danger" onClick={() => handleDelete(comp.id)} title="Delete Component"><Trash /></button>
                                                </div>
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
                                maxLength="50"
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Serial Number</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.serial_number}
                                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                maxLength="36"
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

                        <div className="mb-3">
                            <label className="form-label">Properties</label>
                                <KeyValueEditor
                                    properties={formData.properties}
                                    onChange={(newProps) => setFormData({ ...formData, properties: newProps })}
                                />
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

            {/* View Selected Items Modal */}
            <Modal show={showSelectedModal} onHide={() => setShowSelectedModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                </Modal.Header>
                <Modal.Body>
                    <div className="h4 fw-bold">Selected Components ({selectedItems.length})</div>

                    {
                        selectedItems.length > 0 ? (
                            <div className="px-3 overflow-auto" style={{ maxHeight: "50vh" }}>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="sticky-top">
                                            <tr>
                                                <th>Brand</th>
                                                <th>Serial</th>
                                                <th>Type</th>
                                                <th className="text-end">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedItems.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.brand_name}</td>
                                                    <td>{item.serial_number || '-'}</td>
                                                    <td>{item.component_type}</td>
                                                    <td className="text-end">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() => handleSelect(item)}
                                                            title="Remove from selection"
                                                        >
                                                            <Trash />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <span className='text-center'>No Items Selected</span>
                        )
                    }
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSelectedModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Flag Issue Modal */}
            <Modal show={showFlagModal} onHide={() => setShowFlagModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Report Issue</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleFlagSubmit}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Component</label>
                            <input type="text" className="form-control" value={`${flaggingComponent?.brand_name} (${flaggingComponent?.component_type})`} disabled />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Title</label>
                            <input
                                type="text"
                                className="form-control"
                                value={flagFormData.title}
                                onChange={e => setFlagFormData({ ...flagFormData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Priority</label>
                            <select
                                className="form-select"
                                value={flagFormData.priority}
                                onChange={e => setFlagFormData({ ...flagFormData, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={flagFormData.description}
                                onChange={e => setFlagFormData({ ...flagFormData, description: e.target.value })}
                                required
                            ></textarea>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowFlagModal(false)}>Cancel</Button>
                        <Button variant="warning" type="submit">Report Issue</Button>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* View Properties Modal */}
            <Modal show={viewPropsModal.show} onHide={() => setViewPropsModal({ show: false, component: null })} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Component Properties</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <KeyValueEditor
                        properties={viewPropsModal.component?.properties}
                        readOnly={true}
                        onChange={() => { }}
                    />
                </Modal.Body>
                <Modal.Footer className=' justify-content-between align-items-end'>
                    {canManage && (
                        <Button variant="primary" size='sm' onClick={() => {
                            setViewPropsModal({ show: false, component: null });
                            handleEdit(viewPropsModal.component);
                        }}>
                            Edit
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setViewPropsModal({ show: false, component: null })}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ComponentsPage;
