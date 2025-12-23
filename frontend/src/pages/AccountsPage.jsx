import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Funnel, Search, Tools, CheckCircle, XCircle, Trash, Plus, ArrowClockwise, Backspace, PersonCircle, PersonCheck, Eye, EyeSlash, PencilSquare, PersonX, Key, ClockHistory } from 'react-bootstrap-icons';
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

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState(searchParams.get('role') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [includeDeleted, setIncludeDeleted] = useState(false);

    // Activity Modal State
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [activityAccount, setActivityAccount] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);



    // Auto-fetch with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchAccounts();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, filterRole, filterStatus, includeDeleted]);

    // Initial fetch
    // useEffect(() => { fetchAccounts() }, []) // Removed matching line effectively as it's covered by the above effect running on mount

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterRole) params.append('role', filterRole);
            if (filterStatus) params.append('status', filterStatus);
            if (includeDeleted) params.append('include_deleted', 'true');

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



    // ... (rest of code)

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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4 fw-semibold'>Account Management</div>
                <button className="btn btn-sm btn-primary" onClick={handleCreate}>
                    <span className='d-none d-md-inline'>Add New Account</span>
                    <Plus className='d-inline d-md-none' />
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-4 overflow-hidden">
                <div className="card-body bg-body-tertiary">
                    <form onSubmit={(e) => { e.preventDefault(); fetchAccounts(); }} className="row g-3 align-items-end">

                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text"><Search /></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Account name or email ..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select form-select-sm"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                {getFilterRoleOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-6 col-md-3">
                            <select
                                className="form-select form-select-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>

                        <div className="col-12">
                            <div className="row row-cols-md-2">
                                <div className="col d-flex justify-content-center justify-content-md-start">
                                    {user?.role === 'admin' && (
                                        <div className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id="includeDeletedCheck"
                                                checked={includeDeleted}
                                                onChange={(e) => setIncludeDeleted(e.target.checked)}
                                            />
                                            <label className="form-check-label text-nowrap" htmlFor="includeDeletedCheck">
                                                Deleted Accounts
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="col d-flex justify-content-center justify-content-md-end gap-2">
                                    <button type="button" className="btn btn-sm btn-link" onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterStatus(''); setIncludeDeleted(false); fetchAccounts(); }}>Clear Filters</button>
                                    <button type="button" className="btn btn-sm btn-link" onClick={() => fetchAccounts()} title="Refresh">Refresh</button>
                                    <button type="submit" className="btn btn-sm btn-primary"><Search /> <span className='d-none d-md-inline'>Search</span></button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="container-fluid">
                {
                    loading ? (
                        <div className="text-center p-5">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        currentUsers.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table table-hover table-borderless table-striped align-middle mb-0">
                                    <thead className="">
                                        <tr>
                                            <th className="ps-4">User</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th className="text-end pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentUsers.map(account => (
                                            <tr key={account.id}>
                                                <td className="ps-4">
                                                    <div className="d-flex align-items-center">
                                                        {account.profile_picture ? (
                                                            <img
                                                                src={`${api.defaults.baseURL}/accounts/${account.id}/picture`}
                                                                alt={account.name}
                                                                className="rounded-circle me-3"
                                                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <PersonCircle className="me-3 text-secondary" style={{ width: '40px', height: '40px' }} />
                                                        )}
                                                        <div>
                                                            <div className="fw-bold">{account.name}</div>
                                                            <div className="text-muted small">{account.email}</div>
                                                        </div>
                                                    </div >
                                                </td >
                                                <td>
                                                    <span className="text-muted text-uppercase">{account.role.replace('_', ' ').toLowerCase()}</span>
                                                </td>
                                                <td>
                                                    <div className='d-flex justify-content-start align-items-center'>
                                                        <div className={`rounded-circle shadow-sm ${getStatus(account) === 'active' ? 'bg-success' : getStatus(account) === 'suspended' ? 'bg-warning' : 'bg-secondary'}`} title={getStatus(account).toUpperCase()} style={{ height: '16px', width: '16px' }}></div>
                                                        <span className='text-capitalize ms-2'>{getStatus(account)}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2 justify-content-start justify-content-md-end flex-wrap">
                                                        <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handlePreview(account)} title="View Details">
                                                            <Eye />
                                                        </button>
                                                        <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handleEdit(account)} title="Edit Account">
                                                            <PencilSquare />
                                                        </button>
                                                        <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handleOpenPasswordModal(account)} title="Set Password">
                                                            <Key />
                                                        </button>
                                                        <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handleSuspend(account)} title={!account.suspended_at ? "Suspend Account" : "Activate Account"}>
                                                            {!account.suspended_at ? (
                                                                <>
                                                                    <PersonX />
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <PersonCheck className="" />
                                                                </>
                                                            )}
                                                        </button>
                                                        {user?.role === 'admin' && (
                                                            <>
                                                                <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handleOpenActivityModal(account)} title="View Activity">
                                                                    <ClockHistory />
                                                                </button>
                                                                <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleDelete(account)} title={account.deleted_at ? "Permanently Delete" : "Delete Account"}>
                                                                    <Trash />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr >
                                        ))}
                                    </tbody >
                                </table >
                            </div >
                        ) : (
                            <div className='text-center'>
                                <span>No Users, <span className='btn btn-sm btn-link px-0' onClick={handleCreate}>Add One</span></span>
                            </div>
                        )
                    )
                }
            </div>

            <Pagination
                itemsPerPage={itemsPerPage}
                totalItems={accounts.length}
                paginate={paginate}
                currentPage={currentPage}
            />

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
                                    <div className="input-group">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            className="form-control"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <button
                                            className="btn btn-primary"
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
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
                            <div className="mb-3">
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

                            {editingId && (
                                <div className="mb-3 form-check">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        id="suspendedCheck"
                                        checked={formData.suspended}
                                        onChange={(e) => setFormData({ ...formData, suspended: e.target.checked })}
                                    />
                                    <label className="form-check-label" htmlFor="suspendedCheck">
                                        Suspend Account
                                    </label>
                                </div>
                            )}

                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label className="form-label">Birth Date</label>
                                    <input type="date" className="form-control" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Gender</label>
                                    <select className="form-select" name="gender" value={formData.gender} onChange={handleInputChange}>
                                        <option value="">Select...</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="others">Others</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Department</label>
                                <select className="form-select" name="department_name" value={formData.department_name} onChange={handleInputChange}>
                                    <option value="" hidden>Select department</option>
                                    <option value="ITSD">ITSD</option>
                                    <option value="CITE">CITE</option>
                                    <option value="others">Other</option>
                                </select>
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
                                <div className='row row-cols-1'>
                                    <div className="col p-2 border-bottom">
                                        <small className="text-muted d-block">School ID</small>
                                        <div>{viewingAccount.school_id || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col p-2 border-bottom">
                                        <small className="text-muted d-block">Department</small>
                                        <div>{viewingAccount.department_name || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col p-2 border-bottom">
                                        <small className="text-muted d-block">Gender</small>
                                        <div className='text-capitalize'>{viewingAccount.gender || <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col p-2 border-bottom">
                                        <small className="text-muted d-block">Birth Date</small>
                                        <div>{viewingAccount.birth_date ? new Date(viewingAccount.birth_date).toLocaleDateString() : <span className="text-muted fst-italic">Not set</span>}</div>
                                    </div>
                                    <div className="col p-2 border-bottom">
                                        <small className="text-muted d-block">Account Created</small>
                                        <div>{new Date(viewingAccount.created_at).toLocaleString()}</div>
                                    </div>
                                    {viewingAccount.suspended_at && (
                                        <div className="col p-2 border-bottom bg-warning bg-opacity-10">
                                            <small className="text-warning d-block">Suspended Since</small>
                                            <div className="text-warning">{new Date(viewingAccount.suspended_at).toLocaleString()}</div>
                                        </div>
                                    )}
                                    {viewingAccount.deleted_at && (
                                        <div className="col p-2 border-bottom bg-danger bg-opacity-10">
                                            <small className="text-danger d-block">Deleted On</small>
                                            <div className="text-danger">{new Date(viewingAccount.deleted_at).toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button
                        variant="outline-primary"
                        onClick={() => {
                            setShowPreviewModal(false);
                            handleOpenActivityModal(viewingAccount);
                        }}
                    >
                        <ClockHistory className="me-1" /> View History
                    </Button>
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
                            <Form.Text className="text-muted">
                                Min 8 chars, 1 Uppercase, 1 Digit.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                label="Force user to change password on next login"
                                checked={passwordFormData.forceReset}
                                onChange={(e) => setPasswordFormData({ ...passwordFormData, forceReset: e.target.checked })}
                            />
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

        </div >
    );
};

export default AccountsPage;
