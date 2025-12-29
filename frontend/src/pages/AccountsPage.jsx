import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form, InputGroup, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { Funnel, Search, Tools, CheckCircle, CheckCircleFill, XCircle, Trash, Plus, ArrowClockwise, Backspace, PersonCircle, PersonCheck, Eye, EyeSlash, PencilSquare, PersonX, Key, ClockHistory, Grid, Filter, X, ThreeDotsVertical, ExclamationTriangleFill } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ActivityTimeline from '../components/common/ActivityTimeline';

import { useAuth } from '../context/AuthContext';
import RoleBasedContent from '../components/ComponentProtector';


const AccountsPage = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [viewingAccount, setViewingAccount] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [filtersCollapsed, setFiltersCollapsed] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        school_id: '',
        password: '',
        role: 'lab_assistant',
        suspended: false,
        birth_date: '',
        gender: '',
        department_name: ''
    });
    const [error, setError] = useState('');



    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordFormData, setPasswordFormData] = useState({
        id: null,
        name: '',
        newPassword: '',
        forceReset: false
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [searchParams] = useSearchParams();

    // Filters - now arrays for multi-select
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRoles, setFilterRoles] = useState(
        searchParams.get('role') ? searchParams.get('role').split(',') : []
    );
    const [filterStatuses, setFilterStatuses] = useState(
        searchParams.get('status') ? searchParams.get('status').split(',') : []
    );
    const [includeDeleted, setIncludeDeleted] = useState(false);

    // Sorting options
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Toggle functions for multi-select filters
    const toggleRoleFilter = (role) => {
        setFilterRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    const toggleStatusFilter = (status) => {
        setFilterStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    // Activity Modal State
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [activityAccount, setActivityAccount] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    // Multi-Select / Bulk Operations State
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
    const [showSelectedModal, setShowSelectedModal] = useState(false);
    const [showBulkOperationModal, setShowBulkOperationModal] = useState(false);
    const [bulkOperation, setBulkOperation] = useState(null); // 'suspend', 'activate', 'softDelete', 'hardDelete'
    const [bulkUpdateValues, setBulkUpdateValues] = useState({
        department: '',
        role: '',
        status: '' // 'active', 'suspended', 'deleted', 'hardDelete'
    });

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

    const toggleDropdown = (accountId, event) => {
        if (openDropdownId === accountId) {
            setOpenDropdownId(null);
        } else {
            // Calculate position from button
            const button = event.currentTarget;
            const rect = button.getBoundingClientRect();

            // Position to the left of the button
            setDropdownPosition({
                top: rect.top,
                left: rect.left - 10 // Small gap from button
            });
            setOpenDropdownId(accountId);
        }
    };

    const handleDropdownAction = (action, account) => {
        setOpenDropdownId(null); // Close dropdown after action
        action(account);
    };



    // Auto-fetch with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchAccounts();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, filterRoles, filterStatuses, includeDeleted, sortBy, sortOrder]);

    // Initial fetch
    // useEffect(() => { fetchAccounts() }, []) // Removed matching line effectively as it's covered by the above effect running on mount

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterRoles.length > 0) params.append('role', filterRoles.join(','));
            if (filterStatuses.length > 0) params.append('status', filterStatuses.join(','));
            if (includeDeleted) params.append('include_deleted', 'true');
            params.append('sort_by', sortBy);
            params.append('sort_order', sortOrder);

            const response = await api.get(`/accounts/?${params.toString()}`);
            // Backend now returns { accounts: [...], stats: {...} }
            setAccounts(response.data.accounts || []);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
            toast.error(err.response?.data?.msg || "Failed to fetch accounts");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (account) => {
        setEditingId(account.id);
        setFormData({
            name: account.name,
            email: account.email,
            school_id: account.school_id || '',
            role: account.role,
            suspended: !!account.suspended_at,
            birth_date: account.birth_date ? new Date(account.birth_date).toISOString().split('T')[0] : '',
            gender: account.gender || '',
            department_name: account.department_name || ''
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        let defaultRole = 'lab_assistant';
        if (user?.role === 'it_head') defaultRole = 'it_technician';
        if (user?.role === 'lab_head') defaultRole = 'lab_assistant';

        setFormData({
            name: '',
            email: '',
            school_id: '',
            password: '',
            role: defaultRole,
            suspended: false,
            birth_date: '',
            gender: '',
            department_name: ''
        });
        setShowModal(true);
    };

    const handlePreview = (account) => {
        setViewingAccount(account);
        setShowPreviewModal(true);
    };

    // Helper to derive status from timestamps
    const getStatus = (account) => {
        if (account.deleted_at) return 'deleted';
        if (account.suspended_at) return 'suspended';
        return 'active';
    };

    const handleSuspend = async (account) => {
        const isSuspended = !!account.suspended_at;
        const action = isSuspended ? 'activate' : 'suspend';

        if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;

        try {
            await api.put(`/accounts/${account.id}`, {
                suspended: !isSuspended
            });
            toast.success(`Account ${action}d successfully`);
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${action} account`);
        }
    };

    const handleRestore = async (account) => {
        if (!window.confirm(`Are you sure you want to restore account "${account.name}"?`)) return;

        try {
            await api.post(`/accounts/${account.id}/restore`);
            toast.success(`Account "${account.name}" restored successfully`);
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to restore account');
        }
    };

    // Password Management Handlers
    const handleOpenPasswordModal = (account) => {
        setPasswordFormData({
            id: account.id,
            name: account.name,
            newPassword: '',
            forceReset: false
        });
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (passwordFormData.newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }
        if (!/[A-Z]/.test(passwordFormData.newPassword)) {
            toast.error("Password must contain at least one uppercase letter");
            return;
        }
        if (!/\d/.test(passwordFormData.newPassword)) {
            toast.error("Password must contain at least one digit");
            return;
        }

        setPasswordLoading(true);
        try {
            await api.put(`/accounts/${passwordFormData.id}`, {
                password: passwordFormData.newPassword,
                password_reset_required: passwordFormData.forceReset
            });
            toast.success(`Password set for ${passwordFormData.name}`);
            setShowPasswordModal(false);
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to set password");
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editingId) {
                await api.put(`/accounts/${editingId}`, formData);
                toast.success("Account updated successfully");
            } else {
                // For new accounts, backend skips password validation, so we can send empty/default if needed
                // But wait, user might want to set initial password? 
                // The current flow allowed setting password on create.
                // If we remove password field, how do we set initial password?
                // The requirements said removing password field from account UPDATE form. 
                // Checking task: "Remove password field from account update form".
                // Be careful. If I remove it from Create too, then newly created accounts have no password?
                // Or I can keep it for Create, but remove for Edit.
                // Let's keep it for Create but remove for Edit.
                await api.post('/accounts/', formData);
                toast.success("Account created successfully");
            }
            setShowModal(false);
            fetchAccounts();
        } catch (err) {
            const msg = err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} user`;
            setError(msg);
            toast.error(msg);
        }
    };

    const handleDelete = async (account) => {
        if (!user || user.role !== 'admin') return;

        const isHardDelete = !!account.deleted_at;
        const confirmMsg = isHardDelete
            ? `WARNING: This will PERMANENTLY delete account "${account.name}" and their data. This action cannot be undone. Are you sure?`
            : `Are you sure you want to delete account "${account.name}"?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            const endpoint = isHardDelete ? `/accounts/${account.id}?hard=true` : `/accounts/${account.id}`;
            await api.delete(endpoint);
            toast.success(isHardDelete ? "Account permanently deleted" : "Account deleted successfully");
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete account");
        }
    };

    // Multi-Select Handlers
    const handleSelectAccount = (account) => {
        if (selectedAccounts.some(item => item.id === account.id)) {
            setSelectedAccounts(selectedAccounts.filter(item => item.id !== account.id));
        } else {
            setSelectedAccounts([...selectedAccounts, account]);
        }
    };

    const handleSelectAllAccounts = (e) => {
        if (e.target.checked) {
            // Add all currently visible accounts (avoiding duplicates)
            const newItems = currentUsers.filter(a => !selectedAccounts.some(sel => sel.id === a.id));
            setSelectedAccounts([...selectedAccounts, ...newItems]);
        } else {
            // Deselect only the currently visible accounts
            const currentIds = currentUsers.map(a => a.id);
            setSelectedAccounts(selectedAccounts.filter(item => !currentIds.includes(item.id)));
        }
    };

    // Open the bulk operation staging modal
    const openBulkOperationModal = (operation) => {
        if (selectedAccounts.length === 0) return;
        if (operation === 'hardDelete' && user?.role !== 'admin') return;
        setBulkOperation(operation);
        setShowBulkOperationModal(true);
    };

    // Get operation details for display
    const getOperationDetails = (operation) => {
        const details = {
            suspend: {
                title: 'Suspend Accounts',
                description: 'Selected accounts will be suspended and unable to log in.',
                variant: 'warning',
                btnText: 'Suspend All'
            },
            activate: {
                title: 'Activate Accounts',
                description: 'Selected accounts will be activated and able to log in.',
                variant: 'success',
                btnText: 'Activate All'
            },
            softDelete: {
                title: 'Delete Accounts',
                description: 'Selected accounts will be soft deleted. They can be restored later.',
                variant: 'danger',
                btnText: 'Delete All'
            },
            hardDelete: {
                title: 'Permanently Delete Accounts',
                description: '⚠️ WARNING: Selected accounts and all their data will be PERMANENTLY deleted. This action CANNOT be undone.',
                variant: 'danger',
                btnText: 'Permanently Delete All'
            }
        };
        return details[operation] || {};
    };

    // Execute the bulk operation
    const executeBulkOperation = async () => {
        if (selectedAccounts.length === 0 || !bulkOperation) return;

        setIsBulkSubmitting(true);
        try {
            let promises;
            let successMsg;

            switch (bulkOperation) {
                case 'suspend':
                    promises = selectedAccounts.map(account =>
                        api.put(`/accounts/${account.id}`, { suspended: true })
                    );
                    successMsg = `Suspended ${selectedAccounts.length} account(s) successfully`;
                    break;
                case 'activate':
                    promises = selectedAccounts.map(account =>
                        api.put(`/accounts/${account.id}`, { suspended: false })
                    );
                    successMsg = `Activated ${selectedAccounts.length} account(s) successfully`;
                    break;
                case 'softDelete':
                    promises = selectedAccounts.map(account =>
                        api.delete(`/accounts/${account.id}`)
                    );
                    successMsg = `Deleted ${selectedAccounts.length} account(s) successfully`;
                    break;
                case 'hardDelete':
                    if (user?.role !== 'admin') return;
                    promises = selectedAccounts.map(account =>
                        api.delete(`/accounts/${account.id}?hard=true`)
                    );
                    successMsg = `Permanently deleted ${selectedAccounts.length} account(s)`;
                    break;
                default:
                    return;
            }

            await Promise.all(promises);
            toast.success(successMsg);
            setSelectedAccounts([]);
            setShowBulkOperationModal(false);
            setBulkOperation(null);
            fetchAccounts();
        } catch (err) {
            console.error(err);
            toast.error(`Failed to ${bulkOperation} some accounts`);
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    // Execute bulk update from the selected modal operations section
    const executeBulkUpdate = async () => {
        if (selectedAccounts.length === 0) return;

        const { department, role, status } = bulkUpdateValues;

        // Check if any operation is selected
        if (!department && !role && !status) {
            toast.error('Please select at least one operation');
            return;
        }

        // Handle status operations that require special API calls
        if (status === 'deleted' || status === 'hardDelete') {
            const operation = status === 'deleted' ? 'softDelete' : 'hardDelete';
            openBulkOperationModal(operation);
            return;
        }

        setIsBulkSubmitting(true);
        try {
            const promises = selectedAccounts.map(account => {
                const updateData = {};
                if (department) updateData.department_name = department;
                if (role && user?.role === 'admin') updateData.role = role;
                if (status === 'active') updateData.suspended = false;
                if (status === 'suspended') updateData.suspended = true;

                return api.put(`/accounts/${account.id}`, updateData);
            });

            await Promise.all(promises);

            const updateParts = [];
            if (department) updateParts.push(`department to ${department}`);
            if (role) updateParts.push(`role to ${role.replace('_', ' ')}`);
            if (status === 'active') updateParts.push('status to Active');
            if (status === 'suspended') updateParts.push('status to Suspended');

            toast.success(`Updated ${selectedAccounts.length} account(s): ${updateParts.join(', ')}`);
            setSelectedAccounts([]);
            setBulkUpdateValues({ department: '', role: '', status: '' });
            setShowSelectedModal(false);
            fetchAccounts();
        } catch (err) {
            console.error(err);
            toast.error('Failed to update some accounts');
        } finally {
            setIsBulkSubmitting(false);
        }
    };

    const handleOpenActivityModal = async (account) => {
        setActivityAccount(account);
        setShowActivityModal(true);
        setActivitiesLoading(true);
        try {
            const response = await api.get(`/accounts/${account.id}/activities?limit=20`);
            setActivities(response.data.activities || []);
        } catch (err) {
            console.error('Failed to fetch activities', err);
            toast.error('Failed to load activities');
            setActivities([]);
        } finally {
            setActivitiesLoading(false);
        }
    };


    // Route Protection
    const navigate = useNavigate();
    useEffect(() => {
        if (user && !['admin', 'it_head', 'lab_head'].includes(user.role)) {
            toast.error("Access Denied");
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Update available roles for filtering based on user role
    const getFilterRoleOptions = () => {
        if (!user) return [];
        if (user.role === 'admin') return [
            { value: 'admin', label: 'Admin' },
            { value: 'it_head', label: 'IT Head' },
            { value: 'it_technician', label: 'IT Technician' },
            { value: 'lab_head', label: 'Lab Head' },
            { value: 'lab_assistant', label: 'Lab Assistant' }
        ];
        if (user.role === 'it_head') return [{ value: 'it_technician', label: 'IT Technician' }];
        if (user.role === 'lab_head') return [{ value: 'lab_assistant', label: 'Lab Assistant' }];
        return [];
    };

    // Helper to get display label for role filter
    const getRoleLabel = (roleValue) => {
        const roleLabels = {
            admin: 'Admin',
            it_head: 'IT Head',
            it_technician: 'IT Technician',
            lab_head: 'Lab Head',
            lab_assistant: 'Lab Assistant'
        };
        return roleLabels[roleValue] || roleValue;
    };

    // Helper to get display label for status filter
    const getStatusLabel = (statusValue) => {
        const statusLabels = {
            active: 'Active',
            suspended: 'Suspended'
        };
        return statusLabels[statusValue] || statusValue;
    };

    // Remove a specific role filter
    const removeRoleFilter = (role) => {
        setFilterRoles(prev => prev.filter(r => r !== role));
    };

    // Remove a specific status filter
    const removeStatusFilter = (status) => {
        setFilterStatuses(prev => prev.filter(s => s !== status));
    };

    // Check if any filters are active
    const hasActiveFilters = filterRoles.length > 0 || filterStatuses.length > 0 || includeDeleted;

    // Helper to get display label for current sort
    const getSortLabel = () => {
        const sortLabels = {
            created_at: sortOrder === 'desc' ? 'Latest' : 'Oldest',
            updated_at: sortOrder === 'desc' ? 'Latest Update' : 'Oldest Update',
            name: `Name ${sortOrder === 'asc' ? '↑' : '↓'}`,
            email: `Email ${sortOrder === 'asc' ? '↑' : '↓'}`,
            school_id: `School ID ${sortOrder === 'asc' ? '↑' : '↓'}`
        };
        return sortLabels[sortBy] || 'Latest';
    };

    // Check if sort is not default
    const isCustomSort = sortBy !== 'created_at' || sortOrder !== 'desc';

    // Get current users
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = accounts.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleDeletePicture = async () => {
        if (!viewingAccount || !viewingAccount.profile_picture) return;
        if (!window.confirm("Are you sure you want to remove this profile picture?")) return;

        try {
            await api.delete(`/accounts/${viewingAccount.id}/picture`);
            toast.success("Profile picture removed");

            // Update local state
            setViewingAccount({ ...viewingAccount, profile_picture: null });

            // Update list state
            setAccounts(accounts.map(acc =>
                acc.id === viewingAccount.id ? { ...acc, profile_picture: null } : acc
            ));

        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to remove profile picture");
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="mb-3 d-flex justify-content-between align-items-center">
                <div className='h4 fw-semibold mb-0'>Account Management</div>
                <div>
                </div>
            </div>

            <div className="bg-body-tertiary shadow rounded p-3">
                <div className="mb-3 d-flex justify-content-between gap-2">
                    <div className="d-flex gap-2 flex-fill align-items-center justify-content-start">
                        <InputGroup>
                            <span className='btn bg-primary text-white' title='Hello World'>
                                <Search size={"16px"} />
                            </span>
                            <Form.Control
                                type="text"
                                className='border-primary'
                                placeholder="Search"
                                value={searchTerm}
                                style={{ maxWidth: '400px' }}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </div>

                    <div className="d-flex gap-2">
                        <InputGroup>
                            <Button variant="primary" className='text-nowrap d-flex justify-content-center align-items-center gap-1' onClick={handleCreate}>
                                <Plus />
                                <span className='d-none d-md-inline'>Create Account</span>
                            </Button>
                        </InputGroup>
                        <Button
                            variant="primary"
                            title='Filter Results'
                            onClick={() => setFiltersCollapsed(true)}
                        >
                            <Filter />
                        </Button>
                    </div>
                </div>


                <div className='mb-3'>
                    <div className='d-flex gap-2 flex-wrap'>
                        {/* Role filter badges */}
                        {filterRoles.map(role => (
                            <div
                                key={`role-${role}`}
                                className="badge bg-body d-flex justify-content-center align-items-center rounded border text-body p-2 cursor-pointer"
                                onClick={() => removeRoleFilter(role)}
                                title={`Remove ${getRoleLabel(role)} filter`}
                                style={{ cursor: 'pointer' }}
                            >
                                {getRoleLabel(role)}
                                <X className='ms-1 mb-0' />
                            </div>
                        ))}
                        {/* Status filter badges */}
                        {filterStatuses.map(status => (
                            <div
                                key={`status-${status}`}
                                className="badge bg-body d-flex justify-content-center align-items-center rounded border text-body p-2 cursor-pointer"
                                onClick={() => removeStatusFilter(status)}
                                title={`Remove ${getStatusLabel(status)} filter`}
                                style={{ cursor: 'pointer' }}
                            >
                                {getStatusLabel(status)}
                                <X className='ms-1' />
                            </div>
                        ))}
                        {/* Include Deleted badge */}
                        {includeDeleted && (
                            <div
                                className="badge bg-body rounded border text-body p-2 cursor-pointer"
                                onClick={() => setIncludeDeleted(false)}
                                title="Remove Show Deleted filter"
                                style={{ cursor: 'pointer' }}
                            >
                                Show Deleted
                                <X className='ms-1' />
                            </div>
                        )}
                        {/* Sorting badge - shows current sort, clickable to reset if not default */}
                        {
                            isCustomSort && sortOrder != 'desc' && (
                                <div
                                    className={`badge bg-body d-flex justify-content-center align-items-center rounded border p-1 px-2 ${isCustomSort ? 'cursor-pointer' : ''}`}
                                    onClick={isCustomSort ? () => { setSortBy('created_at'); setSortOrder('desc'); } : undefined}
                                    title={isCustomSort ? 'Reset to default sorting' : 'Current sorting'}
                                    style={{ cursor: isCustomSort ? 'pointer' : 'default' }}
                                >
                                    <span className="text-body">{getSortLabel()}</span>
                                    {isCustomSort && <X className='ms-1 text-body' />}
                                </div>
                            )
                        }
                        {/* Add Filter button - only show if no filters or to add more */}
                        <div
                            className="badge bg-body d-flex justify-content-center align-items-center text-body border p-2 cursor-pointer"
                            onClick={() => setFiltersCollapsed(true)}
                            title='Add Filter'
                            style={{ cursor: 'pointer' }}
                        >
                            {hasActiveFilters || isCustomSort ? 'Edit Filters' : 'Add Filter'}
                            <Plus className='ms-1 mb-0' />
                        </div>
                        {/* Add Filter button - only show if no filters or to add more */}
                    </div>
                </div>


                {/* Bulk Actions Toolbar */}
                {selectedAccounts.length > 0 && (
                    <div className="card mb-3 border-0 shadow-sm">
                        <div className="card-body bg-body rounded shadow-sm p-2 d-flex align-items-center justify-content-center flex-wrap gap-2">
                            <div className="row w-100 align-items-center">
                                <div className="col-12 col-md-6 p-0 text-center text-md-start mb-2 mb-md-0">
                                    <span className='fw-bold text-body'>
                                        <CheckCircleFill className="me-2 text-primary" />
                                        {selectedAccounts.length} Item{selectedAccounts.length !== 1 ? 's' : ''} Selected
                                    </span>
                                </div>
                                <div className="col-12 col-md-6 p-0">
                                    <div className="d-flex justify-content-center justify-content-md-end gap-2">
                                        <button
                                            className="btn btn-sm btn-outline-danger border-0 text-nowrap text-decoration-none"
                                            onClick={() => setSelectedAccounts([])}
                                        >
                                            Clear Selection
                                        </button>
                                        <button className="btn btn-sm btn-primary text-nowrap text-decoration-none" onClick={() => setShowSelectedModal(true)}>
                                            Update Selection
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {
                    loading ? (
                        <div className="text-center p-5">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        currentUsers.length > 0 ? (
                            <div className='table-responsive'>
                                <table className="table table-borderless align-middle mb-0">
                                    <thead>
                                        <tr className='border-bottom'>
                                            <th className="bg-transparent text-center" style={{ width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    onChange={handleSelectAllAccounts}
                                                    checked={currentUsers.length > 0 && currentUsers.every(a => selectedAccounts.some(item => item.id === a.id))}
                                                />
                                            </th>
                                            <th className="bg-transparent text-center text-md-start">Account</th>
                                            <th className="bg-transparent d-none d-md-table-cell text-nowrap">School ID</th>
                                            <th className="bg-transparent d-none d-lg-table-cell text-nowrap">Department</th>
                                            <th className="bg-transparent d-none d-md-table-cell text-nowrap">Role</th>
                                            <th className="bg-transparent d-none d-lg-table-cell text-nowrap">Status</th>
                                            <th className="bg-transparent text-center text-md-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentUsers.map((account, key) => (
                                            <tr key={account.id} className={key != (currentUsers.length-1) ? "border-bottom" : ""}>
                                                <td className="bg-transparent text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedAccounts.some(item => item.id === account.id)}
                                                        onChange={() => handleSelectAccount(account)}
                                                    />
                                                </td>
                                                <td className='bg-transparent cursor-pointer' onClick={() => handleDropdownAction(handlePreview, account)}>
                                                    <div className="d-flex align-items-center">
                                                        <PersonCircle className="me-2 me-md-3 text-secondary" style={{ width: '32px', height: '32px' }} />
                                                        <div className='cursor-pointer'>
                                                            <div className="fw-bold">{account.name}</div>
                                                            <div className="text-muted small">{account.email}</div>
                                                            <div className="text-muted small d-md-none">{account.school_id}</div>
                                                            <div className="d-flex d-md-none gap-2 align-items-center text-muted">
                                                                <span className="text-uppercase text-truncate">{account.role.replace('_', ' ').toLowerCase()}</span>
                                                                {
                                                                    getStatus(account) != "active" && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className='text-capitalize text-truncate'>{getStatus(account)}</span>
                                                                        </>
                                                                    )
                                                                }
                                                            </div>

                                                        </div>
                                                    </div >
                                                </td >
                                                <td className="bg-transparent d-none d-md-table-cell text-nowrap cursor-pointer" onClick={() => handleDropdownAction(handlePreview, account)}>
                                                    <span className="text-muted">{account.school_id}</span>
                                                </td>
                                                <td className="bg-transparent d-none d-lg-table-cell text-nowrap cursor-pointer" onClick={() => handleDropdownAction(handlePreview, account)}>
                                                    <span className="text-muted text-capitalize">{account.department_name ? account.department_name : "Unset"}</span>
                                                </td>
                                                <td className="bg-transparent d-none d-md-table-cell text-nowrap cursor-pointer" onClick={() => handleDropdownAction(handlePreview, account)}>
                                                    <span className="text-muted text-uppercase">{account.role.replace('_', ' ').toLowerCase()}</span>
                                                </td>
                                                <td className="bg-transparent d-none d-lg-table-cell text-nowrap cursor-pointer" onClick={() => handleDropdownAction(handlePreview, account)}>
                                                    <div className='d-flex justify-content-start align-items-center'>
                                                        <div className={`rounded-circle shadow-sm ${getStatus(account) === 'active' ? 'bg-success' : getStatus(account) === 'suspended' ? 'bg-warning' : 'bg-secondary'}`} title={getStatus(account).toUpperCase()} style={{ height: '16px', width: '16px' }}></div>
                                                        <span className='text-capitalize ms-2'>{getStatus(account)}</span>
                                                    </div>
                                                </td>
                                                <td className="bg-transparent">
                                                    <div className="d-flex justify-content-center justify-content-md-end">
                                                        <div
                                                            className={`dropstart ${openDropdownId === account.id ? 'show' : ''}`}
                                                            ref={openDropdownId === account.id ? dropdownRef : null}
                                                        >
                                                            <button
                                                                className="btn btn-link btn-sm p-1 text-body border-0"
                                                                type="button"
                                                                onClick={(e) => toggleDropdown(account.id, e)}
                                                                aria-expanded={openDropdownId === account.id}
                                                            >
                                                                <ThreeDotsVertical size={18} />
                                                            </button>
                                                            <ul
                                                                className={`dropdown-menu shadow ${openDropdownId === account.id ? 'show' : ''}`}
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
                                                                        onClick={() => handleDropdownAction(handlePreview, account)}
                                                                    >
                                                                        <Eye className="me-2" /> View Details
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => handleDropdownAction(handleEdit, account)}
                                                                    >
                                                                        <PencilSquare className="me-2" /> Edit Account
                                                                    </button>
                                                                </li>
                                                                <li>
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => handleDropdownAction(handleOpenPasswordModal, account)}
                                                                    >
                                                                        <Key className="me-2" /> Set Password
                                                                    </button>
                                                                </li>

                                                                <li><hr className="dropdown-divider" /></li>

                                                                <li>
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => handleDropdownAction(handleSuspend, account)}
                                                                    >
                                                                        {!account.suspended_at ? (
                                                                            <>
                                                                                <PersonX className="me-2" /> Suspend Account
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <PersonCheck className="me-2" /> Activate Account
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </li>

                                                                {user?.role === 'admin' && (
                                                                    <>
                                                                        <li>
                                                                            <button
                                                                                className="dropdown-item"
                                                                                onClick={() => handleDropdownAction(handleOpenActivityModal, account)}
                                                                            >
                                                                                <ClockHistory className="me-2" /> View Activity
                                                                            </button>
                                                                        </li>

                                                                        {account.deleted_at && (
                                                                            <li>
                                                                                <button
                                                                                    className="dropdown-item text-success"
                                                                                    onClick={() => handleDropdownAction(handleRestore, account)}
                                                                                >
                                                                                    <ArrowClockwise className="me-2" /> Restore Account
                                                                                </button>
                                                                            </li>
                                                                        )}

                                                                        <li><hr className="dropdown-divider" /></li>

                                                                        <li>
                                                                            <button
                                                                                className="dropdown-item text-danger"
                                                                                onClick={() => handleDropdownAction(handleDelete, account)}
                                                                            >
                                                                                <Trash className="me-2" />
                                                                                {account.deleted_at ? 'Permanently Delete' : 'Delete Account'}
                                                                            </button>
                                                                        </li>
                                                                    </>
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr >
                                        ))}
                                    </tbody >
                                </table >
                            </div>
                        ) : (
                            <div className='text-center py-4'>
                                <span>No result, <span className='btn btn-sm btn-link px-0' onClick={handleCreate}>Add One</span></span>
                            </div>
                        )
                    )
                }

                <Pagination
                    itemsPerPage={itemsPerPage}
                    totalItems={accounts.length}
                    paginate={paginate}
                    currentPage={currentPage}
                    alwaysShow
                />
            </div>

            {/* Filter Modal */}
            <Modal show={filtersCollapsed} onHide={() => setFiltersCollapsed(false)} centered>
                <Modal.Header>
                    <div className="h4 mb-0">Sort and Filter</div>
                </Modal.Header>
                <Modal.Body>

                    <div className="mb-4">
                        <div className="h4 fw-semibold">Filter</div>
                        <div className="mb-4">
                            <div className="small mb-2 fw-semibold text-muted">Roles</div>
                            <div className="d-flex flex-wrap gap-1">
                                {getFilterRoleOptions().map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`badge rounded border small cursor-pointer fw-normal ${filterRoles.includes(opt.value)
                                            ? 'bg-primary'
                                            : 'bg-body-tertiary text-muted'
                                            }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => toggleRoleFilter(opt.value)}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="small mb-2 fw-semibold text-muted">Status</div>
                            <div className="d-flex flex-wrap gap-1">
                                {[
                                    { value: 'active', label: 'Active' },
                                    { value: 'suspended', label: 'Suspended' }
                                ].map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`badge rounded border small cursor-pointer fw-normal ${filterStatuses.includes(opt.value)
                                            ? 'bg-primary'
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

                        {user?.role === 'admin' && (
                            <>
                                <div className="mb-3">
                                    <div className="small mb-2 fw-semibold text-muted">Options</div>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="includeDeletedCheck"
                                            checked={includeDeleted}
                                            onChange={(e) => setIncludeDeleted(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="includeDeletedCheck">
                                            Deleted Accounts
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>


                    <div className="mb-4">
                        <hr />
                        <div className="h4 fw-semibold">Sort</div>

                        <div className="mb-4">
                            <div className="small mb-2 fw-semibold text-muted">Sort By Time</div>
                            <div className="d-flex flex-wrap gap-1">
                                {[
                                    { value: 'created_at_desc', label: 'Latest', sortBy: 'created_at', sortOrder: 'desc' },
                                    { value: 'created_at_asc', label: 'Oldest', sortBy: 'created_at', sortOrder: 'asc' },
                                    { value: 'updated_at_desc', label: 'Latest Update', sortBy: 'updated_at', sortOrder: 'desc' },
                                    { value: 'updated_at_asc', label: 'Oldest Update', sortBy: 'updated_at', sortOrder: 'asc' }
                                ].map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`badge rounded border small cursor-pointer fw-normal ${sortBy === opt.sortBy && sortOrder === opt.sortOrder
                                            ? 'bg-primary'
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
                                    { value: 'name', label: 'Name' },
                                    { value: 'email', label: 'Email' },
                                    { value: 'school_id', label: 'School ID' }
                                ].map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`badge rounded border small cursor-pointer fw-normal ${sortBy === opt.value
                                            ? 'bg-primary'
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

                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        {
                            !(filterRoles.length === 0 && filterStatuses.length === 0 && !includeDeleted && sortBy === 'created_at' && sortOrder === 'desc') && (
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        setFilterRoles([]);
                                        setFilterStatuses([]);
                                        setIncludeDeleted(false);
                                        setSortBy('created_at');
                                        setSortOrder('desc');
                                    }}
                                    disabled={filterRoles.length === 0 && filterStatuses.length === 0 && !includeDeleted && sortBy === 'created_at' && sortOrder === 'desc'}
                                >
                                    Clear
                                </Button>

                            )
                        }
                    </div>
                    <div className="d-flex align-items-center flex-nowrap gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setFiltersCollapsed(false)}
                        >
                            Close
                        </Button>

                        <Button variant="primary" onClick={() => setFiltersCollapsed(false)}>
                            Apply Filters
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>


            {/* Modal */}
            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Account' : 'Create New Account'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className='p-0 bg-body-tertiary overflow-hidden'>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleSubmit}>
                        <div className="p-3">
                            <div className="mb-3">
                                <label className="form-label" required>Name</label>
                                <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">School ID</label>
                                <input type="text" className="form-control" name="school_id" value={formData.school_id} onChange={handleInputChange} required />
                            </div>
                            {!editingId && (
                                <div className="mb-3">
                                    <label className="form-label">Initial Password</label>
                                    <div className="input-group rounded border bg-body">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            className="form-control bg-transparent border-0"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <button
                                            className="btn bg-transparent"
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            tabIndex={-1}
                                        >
                                            {showNewPassword ? <EyeSlash /> : <Eye />}
                                        </button>
                                    </div>
                                    {
                                        user.role == "admin" ? (
                                            <Form.Text className="text-muted small">
                                                Note: Password complexity is NOT enforced for administrators
                                            </Form.Text>
                                        ) : (

                                            <Form.Text className="text-muted small">
                                                Note: Minimum of 8 Characters, At least one number and Capital Letter
                                            </Form.Text>
                                        )
                                    }
                                </div>
                            )}

                            <hr />

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">Role</label>
                                    <select className="form-select" name="role" value={formData.role} onChange={handleInputChange}>
                                        {user?.role === 'admin' && (
                                            <>
                                                <RoleBasedContent allowedRoles={["admin"]}>
                                                    <option value="admin">Administrator</option>
                                                </RoleBasedContent>
                                                <option value="it_head">ITSD Head</option>
                                                <option value="it_technician">ITSD Technician</option>
                                                <option value="lab_head">Laboratory Head</option>
                                                <option value="lab_assistant">Laboratory Assistant</option>
                                            </>
                                        )}
                                        {user?.role === 'it_head' && (
                                            <option value="it_technician">IT Technician</option>
                                        )}
                                        {user?.role === 'lab_head' && (
                                            <option value="lab_assistant">Lab Assistant</option>
                                        )}
                                    </select>
                                </div>

                                <div className="col-6">
                                    <label className="form-label">Department</label>
                                    <select className="form-select" name="department_name" value={formData.department_name} onChange={handleInputChange}>
                                        <option value="" hidden>Select department</option>
                                        <option value="ITSD">ITSD</option>
                                        <option value="CITE">CITE</option>
                                        <option value="others">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">Birth Date</label>
                                    <input type="date" className="form-control" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
                                </div>
                                <div className="col-6">
                                    <label className="form-label">Gender</label>
                                    <select className="form-select" name="gender" value={formData.gender} onChange={handleInputChange}>
                                        <option value="">Select...</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                            <Button variant="primary" type="submit">{editingId ? 'Update Account' : 'Create Account'}</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>

            {/* Preview Modal */}
            <Modal className='pb-5' show={showPreviewModal} onHide={() => setShowPreviewModal(false)}>
                <Modal.Header closeButton>
                </Modal.Header>
                <Modal.Body className='text-center p-4'>
                    {viewingAccount && (
                        <div>
                            <div className="mb-3 position-relative d-inline-block group">
                                {viewingAccount.profile_picture ? (
                                    <>
                                        <img
                                            src={`${api.defaults.baseURL}/accounts/${viewingAccount.id}/picture`}
                                            alt={viewingAccount.name}
                                            className=""
                                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                        />
                                        <button
                                            className="btn btn-sm btn-danger position-absolute top-0 start-100 translate-middle rounded-circle"
                                            style={{ width: '24px', height: '24px', padding: 0 }}
                                            onClick={handleDeletePicture}
                                            title="Remove Profile Picture"
                                        >
                                            <Trash size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <PersonCircle className="text-secondary mx-auto" style={{ width: '100px', height: '100px' }} />
                                )}
                            </div>
                            <h4 className="fw-bold mb-0">{viewingAccount.name}</h4>
                            <p className="text-muted mb-3">{viewingAccount.email}</p>

                            <div className="d-flex justify-content-center gap-2 mb-2">
                                <span className="badge bg-primary text-white text-uppercase">
                                    {viewingAccount.role.replace('_', ' ')}
                                </span>
                                <span className={`badge ${getStatus(viewingAccount) === 'active' ? 'bg-primary text-white' : getStatus(viewingAccount) === 'suspended' ? 'bg-warning text-dark' : ' bg-secondary text-dark'} text-capitalize`}>
                                    <span className='p mb-0'>{getStatus(viewingAccount)}</span>
                                </span>
                            </div>

                            <div className="text-start mt-3">
                                <div className='row row-cols-1 rounded overflow-hidden'>
                                    <div className="col-12 p-3 bg-body-secondary">
                                        <small className="text-muted d-block text-nowrap">School ID</small>
                                        <div className='fw-semibold'>{viewingAccount.school_id || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col-12 p-3 bg-body-secondary">
                                        <small className="text-muted d-block text-nowrap">Department</small>
                                        <div className='fw-semibold'>{viewingAccount.department_name || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col-12 p-3 bg-body-secondary">
                                        <small className="text-muted d-block text-nowrap">Gender</small>
                                        <div className='text-capitalize fw-semibold'>{viewingAccount.gender || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col-12 p-3 bg-body-secondary">
                                        <small className="text-muted d-block text-nowrap">Birth Date</small>
                                        <div className='fw-semibold'>{viewingAccount.birth_date ? new Date(viewingAccount.birth_date).toLocaleDateString() : <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col-12 p-3 bg-body-secondary">
                                        <small className="text-muted d-block text-nowrap">Account Created</small>
                                        <div className='fw-semibold'>{new Date(viewingAccount.created_at).toLocaleString()}</div>
                                    </div>
                                    {viewingAccount.suspended_at && (
                                        <div className="col-12 p-3 bg-body-secondary bg-warning bg-opacity-10">
                                            <small className="text-warning d-block">Suspended Since</small>
                                            <div className="text-warning fw-semibold">{new Date(viewingAccount.suspended_at).toLocaleString()}</div>
                                        </div>
                                    )}
                                    {viewingAccount.deleted_at && (
                                        <div className="col-12 p-3 bg-body-secondary bg-danger bg-opacity-10">
                                            <small className="text-danger d-block">Deleted On</small>
                                            <div className="text-danger fw-semibold">{new Date(viewingAccount.deleted_at).toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-end">
                    <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Set Password Modal */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Set Password for {passwordFormData.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handlePasswordSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <InputGroup className='border shadow-sm rounded overflow-hidden'>
                                <Form.Control
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={passwordFormData.newPassword}
                                    className='border-0'
                                    onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                                    required
                                />
                                <Button variant='outline-primary' tabIndex={-1} className='border-0' onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <EyeSlash /> : <Eye />}
                                </Button>
                            </InputGroup>

                            <div className="text-muted text-end small mt-2">
                                Min 8 chars, 1 Uppercase, 1 Digit.
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-5">
                            <Form.Check type="checkbox" id="custom-switch">
                                <Form.Check.Input
                                    checked={passwordFormData.forceReset}
                                    onChange={(e) => setPasswordFormData({ ...passwordFormData, forceReset: e.target.checked })}
                                />
                                <Form.Check.Label title="Force the user to update their password after successfully logging in">
                                    Change Password on Login
                                </Form.Check.Label>
                            </Form.Check>
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                            <Button variant="primary" type="submit" disabled={passwordLoading}>
                                {passwordLoading ? 'Saving...' : 'Set Password'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Activity Modal */}
            <Modal show={showActivityModal} onHide={() => setShowActivityModal(false)} centered size="md">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <ClockHistory className="me-2" />
                        Activity: {activityAccount?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <ActivityTimeline
                        activities={activities}
                        loading={activitiesLoading}
                        maxItems={20}
                        userRole={user?.role}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowActivityModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Selected Accounts Modal */}
            <Modal show={showSelectedModal} onHide={() => setShowSelectedModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Selected Items</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="bg-body-tertiary p-2 rounded" style={{ maxHeight: '300px', overflowY: 'auto' }}>

                        {selectedAccounts.length > 0 ? (
                            <div className="table-responsive">

                                <table className="table table-hover table-borderless align-middle mb-0">
                                    <thead className="sticky-top">
                                        <tr className='border-bottom'>
                                            <th className='bg-transparent text-start'>Account</th>
                                            <th className="bg-transparent text-end text-md-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedAccounts.map((account, key) => (
                                            <tr key={account.id} className={key != (selectedAccounts.length - 1) ? 'border-bottom' : 'border-0'}>
                                                <td className='bg-transparent'>
                                                    <div className='d-flex flex-column'>
                                                        <span className='text-body fw-bold'>{account.name}</span>
                                                        <span className='small text-muted'>{account.email}</span>
                                                        <span className='small text-muted'>{account.school_id}</span>
                                                        <span className='small text-muted text-capitalize'>
                                                            {account.role.replace('_', ' ').toLowerCase()}
                                                            {
                                                                getStatus(account) != 'active' && (
                                                                    `• ${getStatus(account)}`
                                                                )
                                                            }

                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="bg-transparent text-end text-md-center">
                                                    <button
                                                        className="btn btn-sm btn-danger border-0"
                                                        onClick={() => handleSelectAccount(account)}
                                                        title="Remove from selection"
                                                    >
                                                        <X size={'16px'} className='d-inline d-md-none' /> <span className='d-none d-md-inline'>Remove</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted text-center py-4">No accounts selected</p>
                        )}
                    </div>

                    <div className="my-4">
                        <hr />
                        <p className="text-muted text-center my-3 small">Select operations to apply to all selected accounts</p>

                        <div className="d-flex flex-column gap-3">
                            {/* Department Update */}
                            <div className="mb-2 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-1 flex-wrap">
                                <span className="text-nowrap">Set department to:</span>
                                <Form.Select
                                    size="sm"
                                    style={{ maxWidth: '200px' }}
                                    value={bulkUpdateValues.department}
                                    onChange={(e) => setBulkUpdateValues(prev => ({ ...prev, department: e.target.value }))}
                                >
                                    <option value="">No change</option>
                                    <option value="ITSD">ITSD</option>
                                    <option value="CITE">CITE</option>
                                    <option value="others">Other</option>
                                </Form.Select>
                            </div>

                            {/* Role Update (Admin only) */}
                            {user?.role === 'admin' && (
                                <div className="mb-2 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-1 flex-wrap">
                                    <span className="text-nowrap">Set role to:</span>
                                    <Form.Select
                                        size="sm"
                                        style={{ maxWidth: '200px' }}
                                        value={bulkUpdateValues.role}
                                        onChange={(e) => setBulkUpdateValues(prev => ({ ...prev, role: e.target.value }))}
                                    >
                                        <option value="">No change</option>
                                        <option value="administrator">Administrator</option>
                                        <option value="it_head">IT Head</option>
                                        <option value="lab_head">Laboratory Head</option>
                                        <option value="it_technician">IT Technician</option>
                                        <option value="lab_assistant">Lab Assistant</option>
                                    </Form.Select>
                                </div>
                            )}

                            {/* Status Update (Admin only) */}
                            {user?.role === 'admin' && (
                                <div className="mb-2 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-1 flex-wrap">
                                    <span className="text-nowrap">Set status to:</span>
                                    <Form.Select
                                        size="sm"
                                        style={{ maxWidth: '200px' }}
                                        value={bulkUpdateValues.status}
                                        onChange={(e) => setBulkUpdateValues(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="">No change</option>
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                        <option value="deleted">Delete</option>
                                        {
                                            user?.role === 'admin' && (
                                                <option value="hardDelete">Delete (Permanent)</option>
                                            )
                                        }
                                    </Form.Select>
                                </div>
                            )}

                            {/* Status change warning message */}
                            {bulkUpdateValues.status && bulkUpdateValues.status !== 'active' && (
                                <div className={`alert alert-${bulkUpdateValues.status === 'hardDelete' ? 'danger' : bulkUpdateValues.status === 'deleted' ? 'danger' : 'warning'} py-2 mb-0`}>
                                    <small className='d-flex align-items-center gap-2 text-wrap'>
                                        {bulkUpdateValues.status === 'suspended' && (
                                            <>
                                                <ExclamationTriangleFill />
                                                {`${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''} will be SUSPENDED and unable to log in.`}
                                            </>
                                        )}
                                        {bulkUpdateValues.status === 'deleted' && (
                                            <>
                                                <ExclamationTriangleFill />
                                                {`${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''} will be marked as DELETED`}
                                            </>
                                        )}
                                        {bulkUpdateValues.status === 'hardDelete' && (
                                            <>
                                                <ExclamationTriangleFill />
                                                {`${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''} will be PERMANENTLY DELETED`}
                                            </>
                                        )}
                                    </small>
                                </div>
                            )}
                        </div>
                    </div>


                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="danger" onClick={() => setSelectedAccounts([])} disabled={selectedAccounts.length === 0 || isBulkSubmitting}>
                        Clear
                    </Button>
                    <div className="d-flex gap-2">
                        <Button variant="secondary" onClick={() => setShowSelectedModal(false)} disabled={isBulkSubmitting}>
                            Close
                        </Button>
                        <Button
                            variant="primary"
                            onClick={executeBulkUpdate}
                            disabled={selectedAccounts.length === 0 || isBulkSubmitting || (!bulkUpdateValues.department && !bulkUpdateValues.role && !bulkUpdateValues.status)}
                        >
                            {isBulkSubmitting ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Bulk Operation Staging Modal */}
            <Modal
                show={showBulkOperationModal}
                onHide={() => { setShowBulkOperationModal(false); setBulkOperation(null); }}
                size="lg"
                centered
            >
                <Modal.Header closeButton className={`bg-${getOperationDetails(bulkOperation)?.variant} bg-opacity-10`}>
                    <Modal.Title>{getOperationDetails(bulkOperation)?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className={`alert alert-${getOperationDetails(bulkOperation)?.variant} mb-3`}>
                        {getOperationDetails(bulkOperation)?.description}
                    </div>
                    <p className="fw-semibold mb-2">
                        The following {selectedAccounts.length} account{selectedAccounts.length !== 1 ? 's' : ''} will be affected:
                    </p>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="sticky-top bg-body">
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAccounts.map(account => (
                                    <tr key={account.id}>
                                        <td>{account.name}</td>
                                        <td className="small text-muted">{account.email}</td>
                                        <td className="text-capitalize small">{account.role?.replace('_', ' ')}</td>
                                        <td>
                                            <span className={`badge bg-${getStatus(account) === 'active' ? 'success' : getStatus(account) === 'suspended' ? 'warning' : 'secondary'}`}>
                                                {getStatus(account)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setShowBulkOperationModal(false); setBulkOperation(null); }} disabled={isBulkSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={getOperationDetails(bulkOperation)?.variant || 'primary'}
                        onClick={executeBulkOperation}
                        disabled={isBulkSubmitting}
                    >
                        {isBulkSubmitting ? 'Processing...' : getOperationDetails(bulkOperation)?.btnText}
                    </Button>
                </Modal.Footer>
            </Modal>

        </div >
    );
};

export default AccountsPage;
