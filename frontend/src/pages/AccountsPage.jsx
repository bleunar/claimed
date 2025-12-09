import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Funnel, Search, Tools, CheckCircle, XCircle, Trash, Plus, ArrowClockwise, Backspace, PersonCircle, Eye, PencilSquare, PersonX } from 'react-bootstrap-icons';
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
        status: 'active'
    });
    const [error, setError] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
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
            setAccounts(response.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
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
            status: account.status
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        const defaultRole = user?.role === 'it_head' ? 'it_technician' : 'lab_assistant';
        setFormData({
            name: '',
            email: '',
            password: '',
            role: defaultRole,
            status: 'active'
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

        if (!window.confirm(`Are you sure you want to ${ action } this account ? `)) return;

        try {
            await api.put(`/accounts/${account.id}`, {
                ...account,
                status: newStatus,
                password: '' // Don't update password
            });
            toast.success(`Account ${ action }d successfully`);
            fetchAccounts();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${ action } account`);
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
            const msg = err.response?.data?.msg || `Failed to ${ editingId ? 'update' : 'create' } user`;
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




    // Get current users
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = accounts.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4'>Account Management</div>
                <button className="btn btn-primary" onClick={handleCreate}>
                    <span className='d-none d-md-inline'>New Account</span>
                    <Plus className='d-inline d-md-none' />
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-4 border-0 shadow-sm bg-body-tertiary">
                <div className="card-body p-3">
                    <div className="row g-3">
                        <div className="col-md-6">
                            <InputGroup>
                                <InputGroup.Text className="border-end-0"><Search /></InputGroup.Text>
                                <Form.Control
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="border-start-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </div>
                        <div className="col-md-3">
                            <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                <option value="">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="it_head">IT Head</option>
                                <option value="it_technician">IT Technician</option>
                                <option value="lab_head">Lab Head</option>
                                <option value="lab_assistant">Lab Assistant</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3">
                            <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </Form.Select>
                        </div>
                        {user?.role === 'admin' && (
                            <div className="col-md-3 d-flex align-items-center">
                                <Form.Check
                                    type="checkbox"
                                    id="include-deleted"
                                    label="Include Deleted"
                                    checked={includeDeleted}
                                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                                />
                            </div>
                        )}
                        <div className="col-md-12 d-flex justify-content-between justify-content-md-end gap-2">
                            <Button variant="secondary" className='d-flex align-items-center' onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterStatus(''); setIncludeDeleted(false); fetchAccounts(); }} title="Clear Filters">
                                <Backspace />
                                <span className='ms-2'>Clear Filters</span>
                            </Button>

                            <Button variant="secondary" className='d-flex align-items-center' onClick={() => { fetchAccounts() }} title="Refresh">
                                <ArrowClockwise />
                            </Button>
                            <Button variant="primary" className='d-flex align-items-center' onClick={() => { fetchAccounts() }} title="Search">
                                <Search />
                                <span className='ms-2'>Search</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {
                loading ? (
                    <div className="text-center p-5">
                        <LoadingSpinner />
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="">
                                <tr>
                                    <th className="ps-4">User</th>
                                    <th className='text-center'>Role</th>
                                    <th className='text-center'>Status</th>
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
alt = { account.name }
className = "rounded-circle me-3"
style = {{ width: '40px', height: '40px', objectFit: 'cover' }}
onError = {(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
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
                                            <div className='d-flex justify-content-center'>
                                                {/* 5. Add handling for 'deleted' status in the table (Badge color) */}
                                                <div className={`rounded-circle shadow-sm ${account.status === 'active' ? 'bg-success' : account.status === 'suspended' ? 'bg-warning' : 'bg-secondary'}`} title={account?.status.toUpperCase()} style={{ height: '16px', width: '16px' }}></div>
                                            </div>
                                        </td>
                                        <td>

                                            <div className="d-flex gap-2 justify-content-start justify-content-md-end flex-wrap">
                                                <button className="btn btn-outline-secondary btn-sm border-0" onClick={() => handlePreview(account)} title="View Details">
                                                    <Eye />
                                                </button>
                                                <button className="btn btn-outline-secondary btn-sm border-0" onClick={() => handleEdit(account)} title="Edit Account">
                                                    <PencilSquare />
                                                </button>
                                                <button className="btn btn-outline-secondary btn-sm border-0" onClick={() => handleSuspend(account)} title={account.status === 'active' ? "Suspend Account" : "Activate Account"}>
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
                )
            }

<Pagination
    itemsPerPage={itemsPerPage}
    totalItems={accounts.length}
    paginate={paginate}
    currentPage={currentPage}
/>

{/* Modal */ }
<Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)}>
    <Modal.Header closeButton>
        <Modal.Title>{editingId ? 'Edit Account' : 'Create New Account'}</Modal.Title>
    </Modal.Header>
    <Modal.Body className='p-0 bg-body-tertiary overflow-hidden'>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
            <div className="p-3">
                <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Password {editingId && '(Leave blank to keep current)'}</label>
                    <input
                        type="password"
                        className="form-control"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingId}
                    />
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
            </div>
            <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                <Button variant="primary" type="submit">{editingId ? 'Update Account' : 'Create Account'}</Button>
            </div>
        </form>
    </Modal.Body>
</Modal>

{/* Preview Modal */ }
<Modal className='pb-5' show={showPreviewModal} onHide={() => setShowPreviewModal(false)}>
    <Modal.Header closeButton>
    </Modal.Header>
    <Modal.Body className='text-center p-4'>
        {viewingAccount && (
            <div>
                <div className="mb-3">
                    {viewingAccount.profile_picture ? (
                        <img
                            src={`${api.defaults.baseURL}/accounts/${viewingAccount.id}/picture`}
                            alt={viewingAccount.name}
                            className="rounded-circle shadow-sm border"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                        />
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

                <div className="text-start">
                    <small className="text-muted d-block mb-1">Created At</small>
                    <div>{new Date(viewingAccount.created_at).toDateString()}</div>
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
