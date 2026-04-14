import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form, InputGroup, ToggleButtonGroup, ToggleButton, Offcanvas } from 'react-bootstrap';
import { Funnel, Search, Tools, CheckCircle, CheckCircleFill, XCircle, XCircleFill, Trash, Plus, ArrowClockwise, Backspace, PersonCircle, PersonCheck, Eye, EyeSlash, PencilSquare, PersonX, Key, ClockHistory, Grid, Filter, X, ThreeDotsVertical, ExclamationTriangleFill, ArrowRepeat } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ActivityTimeline from '../components/common/ActivityTimeline';
import FilterBadges from '../components/common/FilterBadges';

import { useAuth } from '../context/AuthContext';
import RoleBasedContent from '../components/ComponentProtector';
import ProfileImage from '../components/common/ProfileImage';
import { getDepartmentTypeLabel } from '../utils/departmentUtils';


const AccountsPage = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [departments, setDepartments] = useState([]);
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
        department_id: '',
        password_reset_required: true
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
    // Default to showing all accounts including deleted ones
    const [includeDeleted, setIncludeDeleted] = useState(
        searchParams.has('include_deleted') ? searchParams.get('include_deleted') === 'true' : true
    );

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
    const [submitting, setSubmitting] = useState(false);
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



    // Fetch when filters change (not search term - that requires button click)
    useEffect(() => {
        setCurrentPage(1);
        fetchAccounts();
    }, [filterRoles, filterStatuses, includeDeleted, sortBy, sortOrder]);

    // Ref to always have the current search term value (avoids stale closure)
    const searchTermRef = useRef(searchTerm);
    searchTermRef.current = searchTerm;

    // Track previous search term to detect when it's cleared
    const prevSearchTermRef = useRef(searchTerm);

    // Handle search button click
    const handleSearch = () => {
        setCurrentPage(1);
        fetchAccounts();
    };

    // Auto-fetch when search is cleared (by typing or clear button)
    useEffect(() => {
        // If search was cleared (had value before, now empty), fetch data
        if (prevSearchTermRef.current !== '' && searchTerm === '') {
            setCurrentPage(1);
            fetchAccounts();
        }
        prevSearchTermRef.current = searchTerm;
    }, [searchTerm]);

    // Clear search (just set to empty, useEffect handles the fetch)
    const clearSearch = () => {
        setSearchTerm('');
    };

    // Initial fetch
    // useEffect(() => { fetchAccounts() }, []) // Removed matching line effectively as it's covered by the above effect running on mount

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            // Use ref to get current search term value (avoids stale closure)
            const currentSearch = searchTermRef.current;
            if (currentSearch) params.append('search', currentSearch);
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

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments/');
            setDepartments(response.data || []);
        } catch (err) {
            console.error("Failed to fetch departments", err);
        }
    };

    // Fetch departments on mount
    useEffect(() => {
        fetchDepartments();
    }, []);

    const roleConstraints = {
        'it_head': ['it'],
        'it_technician': ['it'],
        'department_head': ['education', 'office'],
        'department_staff': ['education', 'office'],
        'lab_head': ['education'],
        'lab_assistant': ['education']
    };

    const handleInputChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const name = e.target.name;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // When role changes from admin to non-admin, clear 'none' department selection
            if (name === 'role' && value !== 'admin' && prev.department_id === 'none') {
                newData.department_id = '';
            }

            // When department changes
            if (name === 'department_id') {
                // If 'No Department' is selected, auto-set role to admin
                if (value === 'none') {
                    newData.role = 'admin';
                } else {
                    // Validate current role against new department type
                    const selectedDept = departments.find(d => d.id === value);
                    const role = newData.role;

                    if (selectedDept && role && role !== 'admin') {
                        const allowedTypes = roleConstraints[role];
                        if (allowedTypes && !allowedTypes.includes(selectedDept.type)) {
                            // Role is invalid for this department, reset it
                            newData.role = '';
                        }
                    }
                }
            }
            return newData;
        });
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
            department_id: account.department_id || ''
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        let defaultRole = 'lab_assistant';
        if (user?.role === 'it_head') defaultRole = 'it_technician';
        if (user?.role === 'lab_head') defaultRole = 'lab_assistant';
        if (user?.role === 'department_head') defaultRole = 'department_staff';

        setFormData({
            name: '',
            email: '',
            school_id: '',
            password: '',
            role: defaultRole,
            suspended: false,
            birth_date: '',
            gender: '',
            department_id: user?.role === 'admin' ? '' : (user?.department_id || ''),
            password_reset_required: false
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

        // Validate role is selected
        if (!formData.role) {
            toast.error('Please select a role');
            return;
        }

        // Validate department is required for non-admin roles (only for new accounts created by admin)
        if (!editingId && user?.role === 'admin' && formData.role !== 'admin') {
            if (!formData.department_id || formData.department_id === 'none') {
                toast.error('Department is required for non-admin roles');
                return;
            }
        }

        if (formData.role === 'admin') {
            if (!window.confirm("This account will have full access to the system. Continue?")) {
                return;
            }
        }

        setSubmitting(true);
        setError('');
        try {
            const payload = { ...formData };
            if (user?.role !== 'admin') {
                delete payload.department_id;
            } else {
                // Convert 'none' to null for database (admin with no department)
                if (payload.department_id === 'none' || payload.department_id === '') {
                    payload.department_id = null;
                }
            }

            if (editingId) {
                await api.put(`/accounts/${editingId}`, payload);
                toast.success("Account updated successfully");
            } else {
                await api.post('/accounts/', payload);
                toast.success("Account created successfully");
            }
            setShowModal(false);
            fetchAccounts();
        } catch (err) {
            const msg = err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} user`;
            setError(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
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
                if (department) updateData.department_id = department;
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
        if (user && !['admin', 'it_head', 'lab_head', 'department_head'].includes(user.role)) {
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
            { value: 'lab_assistant', label: 'Lab Assistant' },
            { value: 'department_head', label: 'Department Head' },
            { value: 'department_staff', label: 'Department Staff' },
            { value: 'department_assistant', label: 'Department Assistant' }
        ];
        if (user.role === 'it_head') return [{ value: 'it_technician', label: 'IT Technician' }];
        if (user.role === 'lab_head') return [{ value: 'lab_assistant', label: 'Lab Assistant' }];
        if (user.role === 'department_head') return [
            { value: 'department_staff', label: 'Department Staff' },
            { value: 'department_assistant', label: 'Department Assistant' },
            { value: 'lab_head', label: 'Lab Head' },
            { value: 'lab_assistant', label: 'Lab Assistant' }
        ];
        return [];
    };

    // Helper to get display label for role filter
    const getRoleLabel = (roleValue) => {
        const roleLabels = {
            admin: 'Administrator',
            it_head: 'IT Head',
            it_technician: 'IT Technician',
            lab_head: 'Lab Head',
            lab_assistant: 'Lab Assistant',
            department_head: 'Department Head',
            department_staff: 'Department Staff',
            department_assistant: 'Department Assistant'
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
    const hasActiveFilters = filterRoles.length > 0 || filterStatuses.length > 0;

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
            </div>

            <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center gap-2">
                    <div className='flex-fill'>
                        <InputGroup className='rounded border border-claims-primary border-2 overflow-hidden' style={{ maxWidth: "400px" }}>
                            <div className="position-relative flex-fill">
                                <Form.Control
                                    type="text"
                                    className='border-0 pe-4'
                                    placeholder="Search Accounts"
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

                    <div className="d-flex gap-2">
                        <InputGroup>
                            <Button variant="claims-primary" className='text-nowrap d-flex justify-content-center align-items-center gap-1' onClick={handleCreate}>
                                <Plus />
                                <span className='d-none d-md-inline'>Create Account</span>
                            </Button>
                        </InputGroup>
                    </div>
                </div>
            </div>

            <div className="bg-body-secondary border shadow rounded p-3">
                <div className="mb-3 d-flex justify-content-between align-items-center">
                    <div className='d-flex flex-fill gap-2 flex-fill align-items-center justify-content-start'>
                        <FilterBadges
                            filters={[
                                // Role filter badges (each one individually)
                                ...filterRoles.map(role => ({
                                    key: `role-${role}`,
                                    label: getRoleLabel(role),
                                    onRemove: () => removeRoleFilter(role)
                                })),
                                // Status filter badges (each one individually)
                                ...filterStatuses.map(status => ({
                                    key: `status-${status}`,
                                    label: getStatusLabel(status),
                                    onRemove: () => removeStatusFilter(status)
                                })),
                                // Include Deleted badge
                                ...(!includeDeleted ? [{
                                    key: 'includeDeleted',
                                    label: 'Managed Accounts',
                                    onRemove: () => setIncludeDeleted(true)
                                }] : []),
                                // Sort badge (only show if not default)
                                ...(isCustomSort ? [{
                                    key: 'sort',
                                    label: `Sort: ${getSortLabel()}`,
                                    onRemove: () => { setSortBy('created_at'); setSortOrder('desc'); }
                                }] : [])
                            ]}
                            onAddFilter={() => setFiltersCollapsed(true)}
                            hasFilters={hasActiveFilters || isCustomSort}
                        />
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <Button
                            variant="claims-primary"
                            title='Filter Results'
                            onClick={() => setFiltersCollapsed(true)}
                        >
                            <Filter />
                        </Button>
                    </div>
                </div>


                {/* Bulk Actions Toolbar */}
                {selectedAccounts.length > 0 && (
                    <div className="card mb-3 border-0 shadow-sm">
                        <div className="card-body bg-body rounded shadow-sm p-2 d-flex align-items-center justify-content-center flex-wrap gap-2">
                            <div className="row w-100 align-items-center">
                                <div className="col-12 col-md-6 p-0 text-center text-md-start mb-2 mb-md-0">
                                    <span className='fw-bold text-body'>
                                        <CheckCircleFill className="me-2 text-claims-primary" />
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
                                        <button className="btn btn-sm btn-claims-primary text-nowrap text-decoration-none" onClick={() => setShowSelectedModal(true)}>
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
                                            <th className="bg-transparent d-none d-sm-table-cell text-nowrap">School ID</th>
                                            <th className="bg-transparent d-none d-lg-table-cell text-nowrap">Department</th>
                                            <th className="bg-transparent d-none d-md-table-cell text-nowrap">Role</th>
                                            <th className="bg-transparent d-none d-lg-table-cell text-nowrap">Status</th>
                                            <th className="bg-transparent text-center text-md-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentUsers.map((account, key) => (
                                            <tr key={account.id} className={key != (currentUsers.length - 1) ? "border-bottom" : ""}>
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
                                                        <ProfileImage
                                                            src={account?.profile_picture ? `${import.meta.env.VITE_API_URL}/accounts/${account.id}/picture?t=${account._picTimestamp || ''}` : null}
                                                            size="36px"
                                                            shape="circle"
                                                            className='border me-2'
                                                            name={account?.name}
                                                        />
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
                                                <td className="bg-transparent d-none d-sm-table-cell text-nowrap cursor-pointer" onClick={() => handleDropdownAction(handlePreview, account)}>
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

                                                                <li>
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => handleDropdownAction(handleOpenActivityModal, account)}
                                                                    >
                                                                        <ClockHistory className="me-2" /> View Activity
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

            {/* Filter Offcanvas */}
            <Offcanvas show={filtersCollapsed} onHide={() => setFiltersCollapsed(false)} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Sort and Filter</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <div className="mb-4">
                        <div className="h4 fw-semibold">Filter</div>
                        <div className="mb-4">
                            <div className="small mb-2 fw-semibold text-muted">Roles</div>
                            <div className="d-flex flex-wrap gap-1">
                                {getFilterRoleOptions().map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`badge rounded border small cursor-pointer fw-normal ${filterRoles.includes(opt.value)
                                            ? 'bg-claims-primary'
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
                                    { value: 'name', label: 'Name' },
                                    { value: 'email', label: 'Email' },
                                    { value: 'school_id', label: 'School ID' }
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

                </Offcanvas.Body>
                <div className="p-3 border-top d-flex justify-content-between bg-body">
                    <div>
                        {
                            !(filterRoles.length === 0 && filterStatuses.length === 0 && !includeDeleted && sortBy === 'created_at' && sortOrder === 'desc') && (
                                <Button
                                    variant="secondary"
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
                            variant="primary"
                            onClick={() => setFiltersCollapsed(false)}
                        >
                            Done
                        </Button>
                    </div>
                </div>
            </Offcanvas>


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
                                        user.role != "admin" && (
                                            <Form.Text className="text-muted small">
                                                Note: Minimum of 8 Characters, At least one number and Capital Letter
                                            </Form.Text>
                                        )
                                    }
                                </div>
                            )}

                            {!editingId && (
                                <div className="mb-3">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            name="password_reset_required"
                                            id="forceResetCreate"
                                            checked={formData.password_reset_required}
                                            onChange={handleInputChange}
                                        />
                                        <label className="form-check-label small text-muted" htmlFor="forceResetCreate">
                                            Change password on login
                                        </label>
                                    </div>
                                </div>
                            )}

                            <hr />

                            <div className="row mb-3">
                                <div className="col-6">
                                    <label className="form-label">
                                        Department
                                        {formData.role !== 'admin' && <span className="text-danger ms-1">*</span>}
                                    </label>
                                    <select
                                        className={`form-select ${formData.role !== 'admin' && !formData.department_id ? 'border-danger' : ''}`}
                                        name="department_id"
                                        value={formData.department_id}
                                        onChange={handleInputChange}
                                        disabled={user?.role !== 'admin'}
                                    >
                                        <option value="" hidden={user?.role === 'admin'}>
                                            {user?.role !== 'admin' ? (departments.find(d => d.id === user.department_id)?.name || 'Using your department') : 'Select department'}
                                        </option>
                                        {/* Show 'No Department' option - only admin role will be available */}
                                        {user?.role === 'admin' && (
                                            <option value="none">No Department</option>
                                        )}
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.role !== 'admin' && !formData.department_id && (
                                        <Form.Text className="text-danger small">
                                            Required
                                        </Form.Text>
                                    )}
                                </div>

                                <div className="col-6">
                                    <label className="form-label">Role</label>
                                    <select
                                        className="form-select"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                    >
                                        {/* Dynamic Role Options based on department selection */}
                                        {(() => {
                                            // Role -> Allowed Department Types
                                            const roleConstraints = {
                                                'it_head': ['it'],
                                                'it_technician': ['it'],
                                                'department_head': ['education', 'office'],
                                                'department_staff': ['education', 'office'],
                                                'lab_head': ['education'],
                                                'lab_assistant': ['education']
                                            };

                                            // If 'No Department' is selected, only admin role is available
                                            if (formData.department_id === 'none') {
                                                return <option value="admin">Administrator</option>;
                                            }

                                            // Determine allowed roles based on selected department
                                            const selectedDept = departments.find(d => d.id === formData.department_id);
                                            const selectedDeptType = selectedDept?.type;

                                            const isRoleValidForDept = (role) => {
                                                if (role === 'admin') return true; // Admin allowed anywhere
                                                if (!selectedDeptType) return true; // No dept selected, show all

                                                const allowedTypes = roleConstraints[role];
                                                if (!allowedTypes) return true; // No specific constraints for this role
                                                return allowedTypes.includes(selectedDeptType);
                                            };

                                            // Define User Permission Roles
                                            let userAllowedRoles = [];
                                            if (user?.role === 'admin') {
                                                userAllowedRoles = [
                                                    { value: 'it_head', label: 'IT Head' },
                                                    { value: 'it_technician', label: 'IT Technician' },
                                                    { value: 'department_head', label: 'Department Head' },
                                                    { value: 'department_staff', label: 'Department Staff' },
                                                    { value: 'lab_head', label: 'Laboratory Head' },
                                                    { value: 'lab_assistant', label: 'Laboratory Assistant' },
                                                    { value: 'admin', label: 'Administrator' },
                                                ];
                                            } else if (user?.role === 'it_head') {
                                                userAllowedRoles = [{ value: 'it_technician', label: 'IT Technician' }];
                                            } else if (user?.role === 'lab_head') {
                                                userAllowedRoles = [{ value: 'lab_assistant', label: 'Laboratory Assistant' }];
                                            } else if (user?.role === 'department_head') {
                                                userAllowedRoles = [
                                                    { value: 'department_staff', label: 'Department Staff' },
                                                    { value: 'department_assistant', label: 'Department Assistant' },
                                                    { value: 'lab_head', label: 'Laboratory Head' },
                                                    { value: 'lab_assistant', label: 'Laboratory Assistant' }
                                                ];
                                            }

                                            // Filter roles by department type constraints
                                            return userAllowedRoles
                                                .filter(r => isRoleValidForDept(r.value))
                                                .map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ));
                                        })()}
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
                                        <option value="" hidden>Select...</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                            <Button variant="claims-primary" type="submit">{editingId ? 'Update Account' : 'Create Account'}</Button>
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
                                <>
                                    <div className="rounded overflow-hidden border">
                                        <ProfileImage
                                            src={viewingAccount?.profile_picture ? `${import.meta.env.VITE_API_URL}/accounts/${viewingAccount.id}/picture?t=${viewingAccount._picTimestamp || ''}` : null}
                                            size="128px"
                                            shape="square"
                                            name={viewingAccount?.name}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-sm rounded-circle btn-danger position-absolute d-flex justify-content-center align-items-center p-2"
                                        style={{ top: '-10px', right: '-5px' }}
                                        onClick={handleDeletePicture}
                                        title="Remove Profile Picture"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </>
                            </div>
                            <h4 className="fw-bold mb-0">{viewingAccount.name}</h4>
                            <p className="text-muted mb-2">{viewingAccount.email}</p>

                            <div className="d-flex justify-content-center gap-2 mb-2">
                                {viewingAccount.department_name && (
                                    <span className="badge bg-claims-primary text-white text-uppercase">
                                        {viewingAccount.department_name.replace('_', ' ')}
                                    </span>
                                )}
                                <span className="badge bg-claims-primary text-white text-uppercase">
                                    {viewingAccount.role.replace('_', ' ')}
                                </span>
                            </div>

                            <div className="text-start mt-3">
                                <div className='row rounded overflow-hidden'>
                                    <div className="col-12 p-1">
                                        <div className="bg-body-secondary p-2 rounded">
                                            <small className="text-muted d-block text-nowrap">School ID</small>
                                            <div className='fw-semibold'>{viewingAccount.school_id || <span className="text-muted fst-italic">Not set</span>}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 p-1">
                                        <div className="bg-body-secondary p-2 rounded">
                                            <small className="text-muted d-block text-nowrap">Status</small>
                                            <div className='fw-semibold'>
                                                <span className='p mb-0 text-capitalize'>{getStatus(viewingAccount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12 p-1">
                                        <div className="bg-body-secondary p-2 rounded">
                                            <small className="text-muted d-block text-nowrap">Gender</small>
                                            <div className='text-capitalize fw-semibold'>{viewingAccount.gender || <span className="text-muted fst-italic">Not set</span>}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 p-1">
                                        <div className="bg-body-secondary p-2 rounded">
                                            <small className="text-muted d-block text-nowrap">Birth Date</small>
                                            <div className={viewingAccount.birth_date ? "fw-semibold" : "fst-italic"}>{viewingAccount.birth_date ? new Date(viewingAccount.birth_date).toLocaleDateString() : <span className="text-muted fst-italic">Not set</span>}</div>
                                        </div>
                                    </div>
                                    <div className="col-12 p-1 p-1">
                                        <div className="bg-body-secondary p-2 rounded">
                                            <small className="text-muted d-block text-nowrap">Created At</small>
                                            <div className='fw-semibold'>{new Date(viewingAccount.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    {viewingAccount.suspended_at && (
                                        <div className="col p-1">
                                            <div className="bg-body-secondary p-2 rounded">
                                                <small className="text-muted d-block">Suspended Since</small>
                                                <div className="fw-semibold">{new Date(viewingAccount.suspended_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    )}
                                    {viewingAccount.deleted_at && (
                                        <div className="col p-1">
                                            <div className="bg-body-secondary p-2 rounded">
                                                <small className="text-muted d-block">Deleted On</small>
                                                <div className="text-danger fw-semibold">{new Date(viewingAccount.deleted_at).toLocaleString()}</div>
                                            </div>
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
                                <Button variant='outline-primary' tabIndex={-1} className='border-0 text-body' onClick={() => setShowNewPassword(!showNewPassword)}>
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
                            <Button variant="claims-primary" type="submit" disabled={passwordLoading}>
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
                                        <option value="department_head">Department Head</option>
                                        <option value="department_staff">Department Staff</option>
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
                            variant="claims-primary"
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
                                            <span className={`badge bg-${getStatus(account) === 'active' ? 'success' : getStatus(account) === 'suspended' ? 'warning' : 'claims-secondary'}`}>
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
                        variant={getOperationDetails(bulkOperation)?.variant || 'claims-primary'}
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
