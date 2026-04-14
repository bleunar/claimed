import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, ListGroup, Alert, Spinner } from 'react-bootstrap';
import { Search, ExclamationTriangleFill, PersonX, PersonCheck, Trash, ArrowCounterclockwise, XCircle } from 'react-bootstrap-icons';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatRole } from '../../utils/activityLabels';
import ProfileImage from '../common/ProfileImage';

const SuspendAccountModal = ({ show, onHide }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null); // ID of account being acted on
    const [successMessage, setSuccessMessage] = useState('');

    // Debounce search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length >= 2) {
                searchAccounts();
            } else {
                setAccounts([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const searchAccounts = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all accounts (active, suspended, deleted)
            const response = await api.get(`/accounts/?search=${searchTerm}&include_deleted=true`);
            setAccounts(response.data.accounts);
        } catch (err) {
            console.error(err);
            setError("Failed to search accounts.");
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (accountId) => {
        setActionLoading(accountId);
        setError(null);
        setSuccessMessage('');
        try {
            await api.put(`/accounts/${accountId}`, { suspended: true });

            // Update local list state to reflect change
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, suspended_at: new Date().toISOString() } : acc
            ));

            setSuccessMessage("Account suspended successfully.");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || "Failed to suspend account.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnsuspend = async (accountId) => {
        setActionLoading(accountId);
        setError(null);
        setSuccessMessage('');
        try {
            await api.put(`/accounts/${accountId}`, { suspended: false });

            // Update local list state
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, suspended_at: null } : acc
            ));

            setSuccessMessage("Account unsuspended successfully.");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || "Failed to unsuspend account.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSoftDelete = async (accountId) => {
        if (!window.confirm("Are you sure you want to move this account to trash? They will not be able to login.")) return;
        setActionLoading(accountId);
        setError(null);
        try {
            await api.delete(`/accounts/${accountId}`);
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, deleted_at: new Date().toISOString() } : acc
            ));
            setSuccessMessage("Account moved to trash.");
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to delete account.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async (accountId) => {
        setActionLoading(accountId);
        setError(null);
        try {
            await api.post(`/accounts/${accountId}/restore`);
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, deleted_at: null } : acc
            ));
            setSuccessMessage("Account restored.");
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to restore account.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleHardDelete = async (accountId) => {
        if (!window.confirm("WARNING: This will PERMANENTLY delete this account and cannot be undone. Are you absolutely sure?")) return;
        setActionLoading(accountId);
        setError(null);
        try {
            await api.delete(`/accounts/${accountId}?force=true`);
            setAccounts(prev => prev.filter(acc => acc.id !== accountId));
            setSuccessMessage("Account permanently deleted.");
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to permanently delete account.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleClose = () => {
        setSearchTerm('');
        setAccounts([]);
        setError(null);
        setSuccessMessage('');
        onHide();
    }

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="border-0 pe-4">
                <div>
                    <div className="h4 mb-0">Quick Account Suspension</div>
                </div>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted text-center small mb-3">
                    Search for an account by Name, Email, or School ID to change their suspension status.
                </p>
                <div className="mb-4 d-flex justify-content-center">
                    <InputGroup className='' style={{ maxWidth: "500px" }}>
                        <InputGroup.Text className="bg-body-secondary border-end-0">
                            <Search />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="Search accounts..."
                            className="border-start-0 bg-body-secondary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </InputGroup>
                </div>

                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                {successMessage && <Alert variant="success" className="py-2 small">{successMessage}</Alert>}

                <div style={{ minHeight: '0px', maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="text-center py-4 text-muted">
                            <Spinner animation="border" size="sm" className="me-2" /> Searching...
                        </div>
                    ) : searchTerm.length < 2 ? (
                        <div className="text-center py-4 text-muted opacity-50">
                            Type at least 2 characters to search...
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            No accounts found matching "{searchTerm}"
                        </div>
                    ) : (
                        <>
                            <hr />
                            <ListGroup variant="flush">
                                {accounts.map(account => {
                                    const isSuspended = !!account.suspended_at;
                                    const isDeleted = !!account.deleted_at;
                                    const isMe = user?.id === account.id;

                                    return (
                                        <ListGroup.Item key={account.id} className="d-flex align-items-center justify-content-between px-0 py-3">
                                            <div className="d-flex align-items-center gap-3">
                                                <ProfileImage
                                                    src={account.profile_picture_url}
                                                    name={account.name}
                                                    size="42px"
                                                    shape="circle"
                                                    className={`border border-2 ${isDeleted ? 'border-secondary opacity-50' : isSuspended ? 'border-danger' : 'border-success'}`}
                                                />
                                                <div className={isDeleted ? 'opacity-50' : ''}>
                                                    <div className="fw-semibold lh-1 mb-1">
                                                        {account.name}
                                                        {isDeleted && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}>DELETED</span>}
                                                        {isSuspended && !isDeleted && <span className="badge bg-danger ms-2" style={{ fontSize: '0.6rem' }}>SUSPENDED</span>}
                                                    </div>
                                                    <div className="d-flex flex-column text-muted small">
                                                        <span>{account.email}</span>
                                                        <span>{account.school_id}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center gap-1 text-muted small">
                                                        <span>{formatRole(account.role)}</span>
                                                        {account.department_name && (
                                                            <>
                                                                <span>•</span>
                                                                <span>{account.department_name}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                {!isMe && (
                                                    <div className="d-flex gap-2">
                                                        {isDeleted ? (
                                                            <>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    title="Restore Account"
                                                                    disabled={actionLoading === account.id}
                                                                    onClick={() => handleRestore(account.id)}
                                                                >
                                                                    {actionLoading === account.id ? <Spinner animation="border" size="sm" /> : "Restore"}
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    title="Permanently Delete"
                                                                    disabled={actionLoading === account.id}
                                                                    onClick={() => handleHardDelete(account.id)}
                                                                    hidden={!['admin', 'it_head', 'department_head'].includes(user?.role)}
                                                                >
                                                                    <XCircle />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant={isSuspended ? "success" : "warning"}
                                                                    size="sm"
                                                                    title={isSuspended ? "Activate" : "Suspend"}
                                                                    disabled={actionLoading === account.id}
                                                                    onClick={() => isSuspended ? handleUnsuspend(account.id) : handleSuspend(account.id)}
                                                                    className="d-flex align-items-center gap-2"
                                                                >
                                                                    {actionLoading === account.id && <Spinner animation="border" size="sm" />}
                                                                    {isSuspended ? 'Activate' : 'Suspend'}
                                                                </Button>
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    title="Move to Trash"
                                                                    disabled={actionLoading === account.id}
                                                                    onClick={() => handleSoftDelete(account.id)}
                                                                >
                                                                    <Trash />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </ListGroup.Item>
                                    );
                                })}

                            </ListGroup>
                        </>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default SuspendAccountModal;
