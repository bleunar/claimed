import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Trash, PencilSquare, InfoCircle, X, ExclamationTriangleFill, Filter, Search, ThreeDotsVertical, Eye } from 'react-bootstrap-icons';
import KeyValueEditor from '../components/common/KeyValueEditor';
import KeyValues from '../components/common/KeyValues';
import BarcodeScanner from '../components/common/BarcodeScanner';
import BulkActionsToolbar from '../components/common/BulkActionsToolbar';
import FilterBadges from '../components/common/FilterBadges';
import SearchBar from '../components/common/SearchBar';
import { COMPONENT_TYPES } from '../utils/componentTypes';
import { getComponentIcon } from '../utils/componentIcons';
import { getComponentStatusVariant } from '../utils/statusColors';
import ComponentConflictModal from '../components/modals/ComponentConflictModal';

const ComponentsPage = () => {
    const { user } = useAuth();
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Bulk Operations State
    const [selectedItems, setSelectedItems] = useState([]); // Array of component objects
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('');
    const [showSelectedModal, setShowSelectedModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);

    // Filters - arrays for multi-select
    const [search, setSearch] = useState('');
    const [statusFilters, setStatusFilters] = useState([]); // Array for multi-select
    const [typeFilters, setTypeFilters] = useState([]); // Array for multi-select
    const [assignmentFilter, setAssignmentFilter] = useState('false'); // 'false'=Assigned (default), 'true'=Unassigned, ''=All
    const [labFilter, setLabFilter] = useState('');
    const [setFilter, setSetFilter] = useState('');

    // Sorting
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    const [departments, setDepartments] = useState([]);
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [locationTypeFilter, setLocationTypeFilter] = useState('');

    // Toggle functions for multi-select filters
    const toggleStatusFilter = (status) => {
        setStatusFilters(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleTypeFilter = (type) => {
        setTypeFilters(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const [locations, setLocations] = useState([]);
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

    const [conflictModal, setConflictModal] = useState({ show: false, data: null, pendingPayload: null });

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    const [viewPropsModal, setViewPropsModal] = useState({ show: false, component: null });

    // Actions Dropdown State
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdownId && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpenDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openDropdownId]);

    const toggleDropdown = (componentId, event) => {
        if (openDropdownId === componentId) {
            setOpenDropdownId(null);
        } else {
            const button = event.currentTarget;
            const rect = button.getBoundingClientRect();
            setDropdownPosition({
                top: rect.top,
                left: rect.left - 10
            });
            setOpenDropdownId(componentId);
        }
    };

    const handleDropdownAction = (action, component) => {
        setOpenDropdownId(null);
        action(component);
    };

    const fetchLocations = async (deptId = '', type = '') => {
        try {
            // Fetch locations based on type (if provided) and department
            let url = '/locations/?';
            if (type) {
                url += `type=${type}&`;
            }
            // If no type is selected, backend returns all types by default (unless we want to restrict?)
            // Previously it was restricted to 'laboratory'. Now we want it dynamic.

            if (deptId) {
                url += `department_id=${deptId}`;
            }
            const res = await api.get(url);
            const sortedLocs = res.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setLocations(sortedLocs);
        } catch (err) {
            console.error("Failed to fetch locations", err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments/');
            setDepartments(res.data);

            // Set initial department filter for non-admins
            if (user?.role !== 'admin' && user?.department_id) {
                setDepartmentFilter(user.department_id);
            }
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    const fetchComputerSets = async (labId) => {
        try {
            const res = await api.get(`/computer-sets/?location_id=${labId}`);
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
            // Multi-select filters - join with comma
            if (statusFilters.length > 0) query += `status=${statusFilters.join(',')}&`;
            if (typeFilters.length > 0) query += `component_type=${typeFilters.join(',')}&`;
            if (assignmentFilter) query += `unassigned=${assignmentFilter}&`;
            if (search) query += `search=${search}&`;
            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (setFilter) query += `computer_set_id=${setFilter}&`;
            if (departmentFilter) query += `department_id=${departmentFilter}&`;
            if (locationTypeFilter) query += `location_type=${locationTypeFilter}&`;

            const res = await api.get(query);
            let data = res.data;

            // Client-side sorting
            data.sort((a, b) => {
                let comparison = 0;
                switch (sortBy) {
                    case 'created_at':
                        comparison = new Date(a.created_at) - new Date(b.created_at);
                        break;
                    case 'brand_name':
                        comparison = (a.brand_name || '').localeCompare(b.brand_name || '');
                        break;
                    case 'serial_number':
                        comparison = (a.serial_number || '').localeCompare(b.serial_number || '');
                        break;
                    default:
                        comparison = new Date(a.created_at) - new Date(b.created_at);
                }
                return sortOrder === 'asc' ? comparison : -comparison;
            });

            setComponents(data);

        } catch (err) {
            console.error("Failed to fetch components", err);
            toast.error("Failed to load components");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
        // fetchLocations called in effect below when departmentFilter is set/defaults
    }, []);

    // Cascade: Department/LocationType -> Location
    useEffect(() => {
        fetchLocations(departmentFilter, locationTypeFilter);
        // Reset lower filters when upper filters change
        setLabFilter('');
        setSetFilter('');
    }, [departmentFilter, locationTypeFilter]);

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

    }, [search, statusFilters, typeFilters, assignmentFilter, labFilter, setFilter, departmentFilter, locationTypeFilter, sortBy, sortOrder]);

    const handleSearch = (e) => {
        e.preventDefault();
        // Auto-fetch handles this via useEffect
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
            setSelectedItems([]);
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

                    if (editingComponent && existing.id === editingComponent.id) {
                        // Same component, proceed
                    } else {
                        // Conflict found - Show Modal
                        setConflictModal({
                            show: true,
                            data: { existing, currentInput: formData },
                            // Store the INTENDED logical operation (though we might change it)
                            // Actually, if we resolve, we switch to Updating the EXISTING component
                            originalPayload: payload
                        });
                        return;
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

    const handleConflictResolve = async () => {
        // User agreed to Move/Link the EXISTING component to current context
        try {
            const existing = conflictModal.data.existing;
            const targetId = existing.id;

            // We are essentially doing a "Take Over"
            // We update the EXISTING component with the values from our Form
            // BUT we keep the ID of the existing one.

            let payload = { ...formData };
            // Ensure we keep the serial (obviously)
            payload.serial_number = existing.serial_number; // same as form

            // Computer Set ID logic matches original form data
            if (formData.isAssigning && formData.computer_set_id) {
                payload.computer_set_id = formData.computer_set_id;
            } else {
                // If we were creating Unassigned, then we make existing unassigned?
                // Logic: "Link this component to this configuration?"
                // If the form says "Unassigned" (no computer_set_id), then we are effectively moving it to Storage
                if (!formData.isAssigning) payload.computer_set_id = null;
            }

            delete payload.isAssigning;
            if (!payload.computer_set_id) delete payload.computer_set_id;

            // We use PUT on existing ID
            await api.put(`/components/${targetId}`, payload);

            toast.success("Component moved/linked successfully");
            setConflictModal({ show: false, data: null, pendingPayload: null });
            setShowModal(false);
            fetchComponents();

        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to resolve conflict");
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
        // Restore department filter default for non-admins
        if (user?.role !== 'admin' && user?.department_id) {
            setDepartmentFilter(user.department_id);
        } else {
            setDepartmentFilter('');
        }
        setLocationTypeFilter('');
        setLabFilter('');
        setSetFilter('');
        setStatusFilters([]);
        setTypeFilters([]);
        setAssignmentFilter('false');
        setSortBy('created_at');
        setSortOrder('desc');
        setCurrentPage(1);
        // fetchComponents will be triggered by useEffect dependency changes
    };

    const getStatusBadgeClass = (status) => {
        return `badge bg-${getComponentStatusVariant(status)}`;
    };

    return (
        <div className="container-fluid py-3">
            <div className="mb-3 d-flex justify-content-between align-items-center">
                <div className='h4 fw-semibold mb-0'>Computer Components</div>
            </div>

            {/* Search and Filter Section */}
            <div className="bg-body-secondary border shadow rounded p-3">
                <div className="row g-2 mb-3">

                    <div className="col-12 d-flex justify-content-between gap-2">
                        <div className="d-flex gap-2 flex-fill align-items-center justify-content-start">
                            <div className="input-group">
                                <span className='btn bg-claims-primary text-white'>
                                    <Search size={"16px"} />
                                </span>
                                <Form.Control
                                    type="text"
                                    className='border-primary'
                                    placeholder="Search brand, name, serial, etc."
                                    value={search}
                                    style={{ maxWidth: '400px' }}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            {canManage && (
                                <Button variant="primary" className='text-nowrap d-flex justify-content-center align-items-center gap-1' onClick={handleCreate}>
                                    <Plus />
                                    <span className='d-none d-md-inline'>New Component</span>
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                title='Filter Results'
                                onClick={() => setShowFilterModal(true)}
                            >
                                <Filter />
                            </Button>
                        </div>
                    </div>
                </div>


                {/* Department, Location, Set Filters */}
                {canManage && (
                    <div className="mb-2 container-fluid px-0">
                        <div className="row g-1 row-cols-1 row-cols-sm-2 row-cols-lg-4" style={{ maxWidth: "700px" }}>
                            {/* Department Filter - Conditional for Admins */}
                            {user?.role === 'admin' && (
                                <div className="col">
                                    <select
                                        className="form-select form-select-sm w-100"
                                        value={departmentFilter}
                                        onChange={(e) => setDepartmentFilter(e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="col">
                                <select
                                    className="form-select form-select-sm w-100"
                                    value={locationTypeFilter}
                                    onChange={(e) => setLocationTypeFilter(e.target.value)}
                                >
                                    <option value="">All Location Types</option>
                                    <option value="laboratory">Laboratory</option>
                                    <option value="office">Office</option>
                                    <option value="kiosk">Kiosk</option>
                                    <option value="others">Others</option>
                                </select>
                            </div>
                            <div className="col">
                                <select
                                    className="form-select form-select-sm w-100"
                                    value={labFilter}
                                    onChange={(e) => {
                                        setLabFilter(e.target.value);
                                        setSetFilter('');
                                    }}
                                >
                                    <option value="">All Locations</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col">
                                <select
                                    className="form-select form-select-sm w-100"
                                    value={setFilter}
                                    onChange={(e) => setSetFilter(e.target.value)}
                                    disabled={!labFilter}
                                >
                                    <option value="">All Sets</option>
                                    {computerSets.map(set => (
                                        <option key={set.id} value={set.id}>{set.set_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                <div className='mb-3'>
                    <FilterBadges
                        filters={[
                            // Status filter badges (each one individually)
                            ...statusFilters.map(status => ({
                                key: `status-${status}`,
                                label: `${status}`,
                                onRemove: () => setStatusFilters(prev => prev.filter(s => s !== status))
                            })),
                            // Type filter badges (each one individually)
                            ...typeFilters.map(type => ({
                                key: `type-${type}`,
                                label: `${COMPONENT_TYPES.find(t => t.value === type)?.label || type}`,
                                onRemove: () => setTypeFilters(prev => prev.filter(t => t !== type))
                            })),
                            // Department filter badge (only for admins as they can filter all)
                            ...(departmentFilter && user?.role === 'admin' ? [{
                                key: 'dept',
                                label: `Dept: ${departments.find(d => d.id == departmentFilter)?.name || 'Unknown'}`,
                                onRemove: () => { setDepartmentFilter(''); setLabFilter(''); setSetFilter(''); }
                            }] : []),
                            // Location Type filter badge
                            ...(locationTypeFilter ? [{
                                key: 'locType',
                                label: `Type: ${locationTypeFilter.charAt(0).toUpperCase() + locationTypeFilter.slice(1)}`,
                                onRemove: () => setLocationTypeFilter('')
                            }] : []),
                            // Lab filter badge
                            ...(labFilter ? [{
                                key: 'lab',
                                label: `Location: ${locations.find(l => l.id == labFilter)?.name || labFilter}`,
                                onRemove: () => { setLabFilter(''); setSetFilter(''); }
                            }] : []),
                            // Set filter badge
                            ...(setFilter ? [{
                                key: 'set',
                                label: `Set: ${computerSets.find(s => s.id == setFilter)?.set_name || setFilter}`,
                                onRemove: () => setSetFilter('')
                            }] : []),
                            // Assignment filter badge (only show if not default)
                            ...(assignmentFilter !== 'false' ? [{
                                key: 'assignment',
                                label: assignmentFilter === 'true' ? 'Rogue Only' : 'All Components',
                                onRemove: () => setAssignmentFilter('false')
                            }] : []),
                            // Sort badge (only show if not default)
                            ...(sortBy !== 'created_at' || sortOrder !== 'desc' ? [{
                                key: 'sort',
                                label: `Sort: ${sortBy === 'brand_name' ? 'Name' : sortBy === 'serial_number' ? 'Serial' : sortBy === 'created_at' ? 'Date' : sortBy} ${sortOrder === 'asc' ? '↑' : '↓'}`,
                                onRemove: () => { setSortBy('created_at'); setSortOrder('desc'); }
                            }] : [])
                        ]}
                        onAddFilter={() => setShowFilterModal(true)}
                        hasFilters={statusFilters.length > 0 || typeFilters.length > 0 || labFilter || setFilter || departmentFilter || locationTypeFilter || assignmentFilter !== 'false' || sortBy !== 'created_at' || sortOrder !== 'desc'}
                    />
                </div>

                {/* Bulk Actions Toolbar */}
                <BulkActionsToolbar
                    selectedCount={selectedItems.length}
                    onClear={() => setSelectedItems([])}
                    onAction={() => setShowSelectedModal(true)}
                    actionLabel="Update Selection"
                    disabled={isBulkSubmitting}
                />

                <div className="table-responsive">
                    <table className="table align-middle mb-0">
                        <thead>
                            <tr className='text-center'>
                                <th style={{ width: '40px' }} className='bg-transparent'>
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        onChange={handleSelectAll}
                                        checked={components.length > 0 && components.every(c => selectedItems.some(item => item.id === c.id))}
                                    />
                                </th>
                                <th className='bg-transparent text-start'>Component</th>
                                <th className='bg-transparent d-none d-md-table-cell'>Status</th>
                                <th className='bg-transparent text-start d-none d-md-table-cell'>Assignment</th>
                                <th className='bg-transparent' style={{ width: '40px' }} >Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={canManage ? 7 : 6} className="bg-transparent text-center py-4">Loading...</td>
                                </tr>
                            ) : components.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? 7 : 6} className="bg-transparent text-center py-4">No components found.</td>
                                </tr>
                            ) : (
                                currentComponents.map(comp => (
                                    <tr key={comp.id}>
                                        <td className="bg-transparent text-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedItems.some(item => item.id === comp.id)}
                                                onChange={() => handleSelect(comp)}
                                            />
                                        </td>
                                        <td className='bg-transparent text-truncate cursor-pointer' onClick={() => setViewPropsModal({ show: true, component: comp })}>
                                            <div className="d-flex align-items-center gap-3">
                                                <span className="rounded bg-body-secondary p-2" title={COMPONENT_TYPES.find(t => t.value === comp.component_type)?.label || comp.component_type}>
                                                    {getComponentIcon(comp.component_type)}
                                                </span>
                                                <div className='d-flex flex-column'>
                                                    <span className='fw-semibold'>{comp.brand_name} <span className='small text-muted d-inline d-md-none text-capitalize small'>({comp.status})</span></span>
                                                    <span className='small text-muted'>{comp.serial_number || "None"}</span>

                                                    <span className='small text-muted d-inline d-md-none'>{comp?.computer_set_name ? `${comp?.location_name} > ${comp?.computer_set_name}` : 'Unassigned'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className='bg-transparent d-none d-md-table-cell cursor-pointer' onClick={() => setViewPropsModal({ show: true, component: comp })}>
                                            <div className="d-flex align-items-center justify-content-center">
                                                <span className={`${getStatusBadgeClass(comp.status)} me-2 text-capitalize`}>{comp.status}</span>
                                            </div>
                                        </td>
                                        <td className='bg-transparent d-none d-md-table-cell'>
                                            <div className="d-flex justify-content-start">
                                                {
                                                    comp.computer_set_name ? (
                                                        <>
                                                            {comp?.department_name && (
                                                                <span className="badge fw-semibold bg-claims-primary text-decoration-none me-1 cursor-pointer" title={comp.department_description}>
                                                                    {comp.department_name}
                                                                </span>
                                                            )}
                                                            <Link to={`/dashboard/locations/${comp.location_id}`} className="badge fw-semibold bg-claims-primary text-decoration-none me-1" title="Go to Location">
                                                                {comp?.location_name}
                                                            </Link>
                                                            <Link to={`/dashboard/locations/${comp.location_id}?set=${comp.computer_set_id}&components=true`} className="badge fw-semibold bg-claims-primary text-decoration-none" title="View in Computer Set">
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
                                            <td className='bg-transparent text-center'>
                                                <div className="d-flex justify-content-center">
                                                    <div
                                                        className={`dropstart ${openDropdownId === comp.id ? 'show' : ''}`}
                                                        ref={openDropdownId === comp.id ? dropdownRef : null}
                                                    >
                                                        <button
                                                            className="btn btn-link btn-sm p-1 text-body border-0"
                                                            type="button"
                                                            onClick={(e) => toggleDropdown(comp.id, e)}
                                                            aria-expanded={openDropdownId === comp.id}
                                                        >
                                                            <ThreeDotsVertical size={18} />
                                                        </button>
                                                        <ul
                                                            className={`dropdown-menu shadow ${openDropdownId === comp.id ? 'show' : ''}`}
                                                            style={{
                                                                position: 'fixed',
                                                                top: `${dropdownPosition.top}px`,
                                                                left: `${dropdownPosition.left}px`,
                                                                transform: 'translateX(-100%)',
                                                                zIndex: 1050
                                                            }}
                                                        >
                                                            <li>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => handleDropdownAction((c) => setViewPropsModal({ show: true, component: c }), comp)}
                                                                >
                                                                    <Eye className="me-2" /> View Details
                                                                </button>
                                                            </li>
                                                            <li>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => handleDropdownAction(handleEdit, comp)}
                                                                >
                                                                    <PencilSquare className="me-2" /> Edit Component
                                                                </button>
                                                            </li>
                                                            <li><hr className="dropdown-divider" /></li>
                                                            <li>
                                                                <button
                                                                    className="dropdown-item text-danger"
                                                                    onClick={() => handleDropdownAction((c) => handleDelete(c.id), comp)}
                                                                >
                                                                    <Trash className="me-2" /> Delete Component
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    itemsPerPage={itemsPerPage}
                    totalItems={components.length}
                    paginate={paginate}
                    currentPage={currentPage}
                />

            </div>


            {/* Modal */}
            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)} size='lg'>
                <Modal.Header closeButton>
                    <Modal.Title>{editingComponent ? 'Edit Component' : 'Add Component'}</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="row g-4">
                            {/* Component Information - Left on desktop, top on mobile */}
                            <div className="col-lg-6">
                                <h6 className="fw-semibold text-muted mb-2">Component Information</h6>
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
                                    <div className="input-group border rounded">
                                        <input
                                            type="text"
                                            className="form-control border-0"
                                            value={formData.serial_number}
                                            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                                            maxLength="36"
                                            placeholder="Enter or scan serial number"
                                        />
                                        <BarcodeScanner
                                            onScan={(value) => setFormData({ ...formData, serial_number: value })}
                                            buttonIconOnly={true}
                                            className="d-lg-none border-0"
                                        />
                                    </div>
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
                            </div>

                            {/* Component Properties - Right on desktop, bottom on mobile */}
                            <div className="col-lg-6">
                                <h6 className="fw-semibold text-muted mb-2">Properties</h6>
                                <KeyValueEditor
                                    properties={formData.properties}
                                    onChange={(newProps) => setFormData({ ...formData, properties: newProps })}
                                />
                            </div>
                        </div>

                        {!editingComponent && (
                            <>
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

                                        <hr />
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
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
                                                    <option value="" hidden>Select Location</option>
                                                    {locations.map(loc => (
                                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label">Computer Set</label>
                                                <select
                                                    className="form-select"
                                                    value={formData.computer_set_id}
                                                    onChange={(e) => setFormData({ ...formData, computer_set_id: e.target.value })}
                                                    required={formData.isAssigning}
                                                    disabled={!formData.laboratory_id}
                                                >
                                                    <option value="" hidden>Select Computer Set</option>
                                                    {modalComputerSets.map(set => (
                                                        <option key={set.id} value={set.id}>{set.set_name}</option>
                                                    ))}
                                                </select>
                                            </div>
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
                    <Modal.Title>Selected Items</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-4">
                        <div className="h6 fw-semibold text-muted">Selected Items:</div>
                        <div className="bg-body-tertiary p-2 rounded" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {selectedItems.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm table-borderless align-middle mb-0">
                                        <tbody>
                                            {selectedItems.map((item, key) => (
                                                <tr key={item.id} className={key !== (selectedItems.length - 1) ? 'border-bottom' : 'border-0'}>
                                                    <td className='bg-transparent'>
                                                        <div className='d-flex flex-column'>
                                                            <span className='text-body fw-bold'>{item.brand_name}</span>
                                                            <span className='small text-muted'>{item.serial_number || 'No serial'}</span>
                                                            <span className='small text-muted text-capitalize'>
                                                                {COMPONENT_TYPES.find(t => t.value === item.component_type)?.label || item.component_type}
                                                                {' • '}
                                                                <span className={`badge bg-${getComponentStatusVariant(item.status)}`}>{item.status}</span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className='bg-transparent text-end'>
                                                        <button
                                                            className='btn btn-sm btn-outline-danger border-0'
                                                            onClick={() => handleSelect(item)}
                                                            title='Remove from selection'
                                                        >
                                                            <X size={"1.2rem"} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <span className='text-center d-block py-4 text-muted'>No Items Selected</span>
                            )}
                        </div>
                    </div>

                    <div className="container-fluid">
                        <div className='row'>
                            <div className="col-lg-6 p-2 h-100">
                                <div className="h6 text-muted">Batch Operations:</div>
                                <div className="border p-3 rounded bg-body-tertiary">
                                    {/* Status Update */}
                                    <div className="mb-2 d-flex align-items-center justify-content-center gap-2">
                                        <span className="text-nowrap">Update status to:</span>
                                        <Form.Select
                                            size="sm"
                                            value={bulkStatus}
                                            onChange={(e) => setBulkStatus(e.target.value)}
                                            disabled={isBulkSubmitting}
                                        >
                                            <option value="">Nothing</option>
                                            <option value="good">Good</option>
                                            <option value="bad">Bad</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="missing">Missing</option>
                                        </Form.Select>
                                    </div>

                                    {/* Status change warning message */}
                                    {bulkStatus && (
                                        <div className="alert alert-info p-2 m-0 mt-3">
                                            <span className='text-center small'>
                                                <strong>{selectedItems.length}</strong>{` component${selectedItems.length !== 1 ? 's' : ''} will be set to ${bulkStatus.toUpperCase()} status`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                            </div>
                            <div className="col-lg-6 p-2 h-100">
                                <div className="h6 text-muted">Danger zone:</div>
                                <div className="mb-3 border border-danger p-3 rounded bg-danger-subtle">
                                    <div className="d-flex align-items-center justify-content-center">
                                        <Button variant="danger" size='sm' onClick={handleBulkDelete} disabled={selectedItems.length === 0 || isBulkSubmitting}>
                                            <Trash className="me-1" /> Delete Selected Items
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={() => { setSelectedItems([]), setShowSelectedModal(false) }} disabled={selectedItems.length === 0 || isBulkSubmitting}>
                        Clear
                    </Button>
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={() => setShowSelectedModal(false)} disabled={isBulkSubmitting}>
                            Close
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleBulkStatusUpdate}
                            disabled={selectedItems.length === 0 || isBulkSubmitting || !bulkStatus}
                        >
                            {isBulkSubmitting ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Filter and Sort Modal */}
            <Modal show={showFilterModal} onHide={() => setShowFilterModal(false)} size='lg' centered>
                <Modal.Header>
                    <div className="h4 mb-0">Sort and Filter</div>
                </Modal.Header>
                <Modal.Body>
                    <div className="row g-4">
                        <div className="col-lg-6">
                            <div className="h4 fw-semibold">Filter</div>
                            <hr />

                            {/* Status Filter - Multi-select */}
                            <div className="mb-4">
                                <div className="small mb-2 fw-semibold text-muted">Status</div>
                                <div className="d-flex flex-wrap gap-1">
                                    {[
                                        { value: 'good', label: 'Good' },
                                        { value: 'bad', label: 'Bad' },
                                        { value: 'maintenance', label: 'Maintenance' },
                                        { value: 'missing', label: 'Missing' }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`badge rounded border small cursor-pointer fw-normal ${statusFilters.includes(opt.value)
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => toggleStatusFilter(opt.value)}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Type Filter - Multi-select */}
                            <div className="mb-4">
                                <div className="small mb-2 fw-semibold text-muted">Type</div>
                                <div className="d-flex flex-wrap gap-1">
                                    {COMPONENT_TYPES.map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`badge rounded border small cursor-pointer fw-normal ${typeFilters.includes(opt.value)
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => toggleTypeFilter(opt.value)}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Assignment Filter */}
                            <div className="mb-4">
                                <div className="small mb-2 fw-semibold text-muted">Assignment</div>
                                <div className="d-flex flex-wrap gap-1">
                                    {[
                                        { value: '', label: 'All' },
                                        { value: 'false', label: 'Active', title: "Components that are LINKED to a Computer Set" },
                                        { value: 'true', label: 'Rogue (Unassigned)', title: "Components that have not beed asigned to a Computer Set" }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`badge rounded border small cursor-pointer fw-normal ${assignmentFilter === opt.value
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            title={opt.title}
                                            onClick={() => {
                                                setAssignmentFilter(opt.value);
                                                if (opt.value === 'true') {
                                                    setLabFilter('');
                                                    setSetFilter('');
                                                }
                                            }}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Computer Set Filter - only when lab is selected */}
                            {labFilter && assignmentFilter !== 'true' && (
                                <div className="mb-4">
                                    <div className="small mb-2 fw-semibold text-muted">Computer Set</div>
                                    <div className="d-flex flex-wrap gap-1">
                                        <div
                                            className={`badge rounded border small cursor-pointer fw-normal ${setFilter === ''
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setSetFilter('')}
                                        >
                                            All Sets
                                        </div>
                                        {computerSets.map(set => (
                                            <div
                                                key={set.id}
                                                className={`badge rounded border small cursor-pointer fw-normal ${setFilter == set.id
                                                    ? 'bg-claims-primary'
                                                    : 'bg-body-tertiary text-muted'
                                                    }`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSetFilter(set.id)}
                                            >
                                                {set.set_name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-lg-6">
                            <div className="h4 fw-semibold">Sort</div>
                            <hr />

                            <div className="mb-4">
                                <div className="small mb-2 fw-semibold text-muted">Sort By Time</div>
                                <div className="d-flex flex-wrap gap-1">
                                    {[
                                        { value: 'created_at_desc', label: 'Latest', sortBy: 'created_at', sortOrder: 'desc' },
                                        { value: 'created_at_asc', label: 'Oldest', sortBy: 'created_at', sortOrder: 'asc' }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`badge rounded border small cursor-pointer fw-normal ${sortBy === opt.sortBy && sortOrder === opt.sortOrder
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setSortBy(opt.sortBy);
                                                setSortOrder(opt.sortOrder);
                                            }}
                                        >
                                            {opt.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="small mb-2 fw-semibold text-muted">Sort By Field</div>
                                <div className="d-flex flex-wrap gap-1">
                                    {[
                                        { value: 'brand_name', label: 'Name' },
                                        { value: 'serial_number', label: 'Serial Number' }
                                    ].map(opt => (
                                        <div
                                            key={opt.value}
                                            className={`badge rounded border small cursor-pointer fw-normal ${sortBy === opt.value
                                                ? 'bg-claims-primary'
                                                : 'bg-body-tertiary text-muted'
                                                }`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => {
                                                setSortBy(opt.value);
                                                // Toggle order if same field, otherwise default to asc
                                                if (sortBy === opt.value) {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setSortOrder('asc');
                                                }
                                            }}
                                        >
                                            {opt.label}
                                            {sortBy === opt.value && (
                                                <span className="ms-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        {(statusFilters.length > 0 || typeFilters.length > 0 || labFilter || setFilter || assignmentFilter !== 'false' || sortBy !== 'created_at' || sortOrder !== 'desc') && (
                            <Button
                                variant="secondary"
                                onClick={handleClearFilters}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                    <Button variant="secondary" onClick={() => setShowFilterModal(false)}>
                        Done
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Component Preview Modal */}
            <Modal show={viewPropsModal.show} onHide={() => setViewPropsModal({ show: false, component: null })} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Component Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {viewPropsModal.component && (
                        <div className="row g-4 p-3">
                            {/* Component Information Section - Left on desktop, top on mobile */}
                            <div className="col-md-6 p-1">
                                <h6 className="fw-semibold text-muted mb-2">Component Information</h6>
                                <div className="d-flex flex-column gap-2">
                                    <div className="bg-body-tertiary rounded p-3">
                                        <small className="text-muted d-block mb-1">Type</small>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fs-2">{getComponentIcon(viewPropsModal.component.component_type)}</span>
                                            <span className="text-capitalize fw-semibold">
                                                {COMPONENT_TYPES.find(t => t.value === viewPropsModal.component.component_type)?.label || viewPropsModal.component.component_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-body-tertiary rounded p-3">
                                        <small className="text-muted d-block mb-1">Status</small>
                                        <span className="fw-semibold text-capitalize">
                                            {viewPropsModal.component.status}
                                        </span>
                                    </div>
                                    <div className="bg-body-tertiary rounded p-3">
                                        <small className="text-muted d-block mb-1">Brand / Model</small>
                                        <span className="fw-semibold">{viewPropsModal.component.brand_name}</span>
                                    </div>
                                    <div className="bg-body-tertiary rounded p-3">
                                        <small className="text-muted d-block mb-1">Serial Number</small>
                                        <span className={viewPropsModal.component.serial_number ? 'fw-semibold' : 'text-muted fst-italic'}>
                                            {viewPropsModal.component.serial_number || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="bg-body-tertiary rounded p-3">
                                        <small className="text-muted d-block mb-1">Assignment</small>
                                        {viewPropsModal.component.computer_set_name ? (
                                            <div className="d-flex flex-wrap gap-1">
                                                {viewPropsModal.component.department_name && (
                                                    <span className="badge bg-claims-primary cursor-pointer" title="Department">
                                                        {viewPropsModal.component.department_name}
                                                    </span>
                                                )}
                                                <span className="badge bg-claims-primary cursor-pointer" title="Location">
                                                    {viewPropsModal.component.location_name}
                                                </span>
                                                <span className="badge bg-claims-primary cursor-pointer" title="Computer Set">
                                                    {viewPropsModal.component.computer_set_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="badge bg-secondary fst-italic">Unassigned (Rogue Component)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Component Properties Section - Right on desktop, bottom on mobile */}
                            <div className="col-md-6 p-1">
                                <h6 className="fw-semibold text-muted mb-2">Properties</h6>
                                <div className="bg-body-tertiary rounded p-3">
                                    <KeyValues
                                        data={viewPropsModal.component?.properties}
                                        emptyMessage="No custom properties defined for this component"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-between">
                    {canManage && (
                        <div className='d-flex gap-2'>
                            <Button variant="primary" onClick={() => {
                                setViewPropsModal({ show: false, component: null });
                                handleEdit(viewPropsModal.component);
                            }}>
                                <PencilSquare className="me-1" /> Edit
                            </Button>
                            <Button variant="danger"
                                onClick={() => handleDropdownAction((c) => handleDelete(viewPropsModal.component.id), viewPropsModal.component)}

                            >
                                <Trash className="me-1" /> Delete
                            </Button>
                        </div>
                    )}
                    <Button variant="secondary" onClick={() => setViewPropsModal({ show: false, component: null })}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Conflict Modal */}
            <ComponentConflictModal
                show={conflictModal.show}
                onHide={() => setConflictModal({ ...conflictModal, show: false })}
                conflictData={conflictModal.data}
                onResolve={handleConflictResolve}
                onCancel={() => setConflictModal({ ...conflictModal, show: false })}
            />
        </div>
    );
};

export default ComponentsPage;
