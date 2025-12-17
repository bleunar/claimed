import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Funnel, Search, Tools, CheckCircle, XCircle, Trash, Plus, ArrowClockwise, Backspace, PersonCircle, PersonCheck, Eye, EyeSlash, PencilSquare, PersonX } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

import { useAuth } from '../context/AuthContext';


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
        password: '',
        role: 'lab_assistant',
        status: 'active',
        birth_date: '',
        gender: '',
        department_name: ''
    });
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [searchParams] = useSearchParams();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState(searchParams.get('role') || '');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [includeDeleted, setIncludeDeleted] = useState(false);



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
            password: '',
            role: account.role,
            status: account.status,
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
            password: '',
            role: defaultRole,
            status: 'active',
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

    const handleSuspend = async (account) => {
        const newStatus = account.status === 'active' ? 'suspended' : 'active';
        const action = newStatus === 'active' ? 'activate' : 'suspend';

        if (!window.confirm(`Are you sure you want to ${action} this account ? `)) return;

        try {
            await api.put(`/accounts/${account.id}`, {
                ...account,
                status: newStatus,
                password: '' // Don't update password
            });
            toast.success(`Account ${action}d successfully`);
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${action} account`);
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

        const isHardDelete = account.status === 'deleted';
        const confirmMsg = isHardDelete
            ? `WARNING: This will PERMANENTLY delete account "${account.name}" and their data.This action cannot be undone.Are you sure ? `
            : `Are you sure you want to delete account "${account.name}" ? `;

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
                <div className='h4'>Account Management</div>
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

            <div className="container">
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
                                                        <div className={`rounded-circle shadow-sm ${account.status === 'active' ? 'bg-success' : account.status === 'suspended' ? 'bg-warning' : 'bg-secondary'}`} title={account?.status.toUpperCase()} style={{ height: '16px', width: '16px' }}></div>
                                                        <span className='text-capitalize ms-2'>{account.status}</span>
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
                                                        <button className="btn btn-outline-primary btn-sm border-0" onClick={() => handleSuspend(account)} title={account.status === 'active' ? "Suspend Account" : "Activate Account"}>
                                                            {account.status === 'active' ? (
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
                                                            <button className="btn btn-outline-danger btn-sm border-0" onClick={() => handleDelete(account)} title={account.status === 'deleted' ? "Permanently Delete" : "Delete Account"}>
                                                                <Trash />
                                                            </button>
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
                                <label className="form-label">Password {editingId && '(Leave blank to keep current)'}</label>
                                <div className="input-group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required={!editingId}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeSlash /> : <Eye />}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select className="form-select" name="role" value={formData.role} onChange={handleInputChange}>
                                    {user?.role === 'admin' && (
                                        <>
                                            <option value="admin">Admin</option>
                                            <option value="it_head">IT Head</option>
                                            <option value="it_technician">IT Technician</option>
                                            <option value="lab_head">Lab Head</option>
                                            <option value="lab_assistant">Lab Assistant</option>
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
                                <div className="mb-3">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
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
                                <input type="text" className="form-control" name="department_name" value={formData.department_name} onChange={handleInputChange} placeholder="e.g. CCS" />
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
                                            className="shadow-sm border"
                                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                                        />
                                        <button
                                            className="btn btn-sm btn-danger position-absolute top-0 start-100 translate-middle rounded-circle shadow-sm"
                                            style={{ width: '24px', height: '24px', padding: 0 }}
                                            onClick={handleDeletePicture}
                                            title="Remove Profile Picture"
                                        >
                                            <Trash size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <PersonCircle className="text-secondary mx-auto shadow-sm" style={{ width: '100px', height: '100px' }} />
                                )}
                            </div>
                            <h4 className="fw-bold">{viewingAccount.name}</h4>
                            <p className="text-muted mb-3">{viewingAccount.email}</p>

                            <div className="d-flex justify-content-center gap-2 mb-2">
                                <span className="badge bg-primary-subtle text-primary border border-primary-subtle text-uppercase">
                                    {viewingAccount.role.replace('_', ' ')}
                                </span>
                                <span className={`badge ${viewingAccount.status === 'active' ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-warning border border-warning-subtle'} text-uppercase`}>
                                    {viewingAccount.status}
                                </span>
                            </div>

                            <div className="text-start mt-3">
                                <div className='row rounded border border-2 overflow-hidden'>
                                    <div className="col-6 p-2 border">
                                        <small className="text-muted d-block">Department</small>
                                        <div>{viewingAccount.department_name || 'N/A'}</div>
                                    </div>
                                    <div className="col-6 p-2 border">
                                        <small className="text-muted d-block">Gender</small>
                                        <div className='text-capitalize'>{viewingAccount.gender || 'N/A'}</div>
                                    </div>
                                    <div className="col-6 p-2 border">
                                        <small className="text-muted d-block">Birth Date</small>
                                        <div>{viewingAccount.birth_date ? new Date(viewingAccount.birth_date).toLocaleDateString() : 'N/A'}</div>
                                    </div>
                                    <div className="col-6 p-2 border">
                                        <small className="text-muted d-block">Created At</small>
                                        <div>{new Date(viewingAccount.created_at).toDateString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

        </div >
    );
};

export default AccountsPage;
