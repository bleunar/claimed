import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { ShieldLock, ExclamationTriangle } from 'react-bootstrap-icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { setAccessToken } from '../utils/tokenManager';

// Create context for re-authentication
const ReauthContext = createContext(null);

export const useReauth = () => useContext(ReauthContext);

import { reauthEmitter } from '../utils/reauthEmitter';

/**
 * ReauthModal Provider - Wrap your app with this to enable re-authentication modals
 */
export const ReauthProvider = ({ children }) => {
    const [show, setShow] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [newRole, setNewRole] = useState('');

    const { refreshUser } = useAuth();

    // Store the promise resolver for the pending request
    const pendingResolve = useRef(null);
    const pendingReject = useRef(null);

    useEffect(() => {
        // Subscribe to re-auth events from axios interceptor
        const unsubscribe = reauthEmitter.subscribe((data) => {
            setMessage(data.message || 'Your role has been changed. Please verify your identity to continue.');
            setNewRole(data.currentRole || '');
            setShow(true);

            // Return a promise that will be resolved when user completes re-auth
            return new Promise((resolve, reject) => {
                pendingResolve.current = resolve;
                pendingReject.current = reject;
            });
        });

        return () => unsubscribe();
    }, []);

    const handleClose = () => {
        setShow(false);
        setPassword('');
        setError('');
        setNewRole('');

        // Reject the pending request if modal is closed without success
        if (pendingReject.current) {
            pendingReject.current(new Error('Re-authentication cancelled'));
            pendingReject.current = null;
            pendingResolve.current = null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/verify-password', { password });
            const { access_token, role } = response.data;

            // Update token in memory (not localStorage for XSS protection)
            setAccessToken(access_token);

            // Refresh user context to get updated role
            if (refreshUser) {
                await refreshUser();
            }

            setShow(false);
            setPassword('');

            // Resolve the pending promise with the new token
            if (pendingResolve.current) {
                pendingResolve.current(access_token);
                pendingResolve.current = null;
                pendingReject.current = null;
            }
        } catch (err) {
            const msg = err.response?.data?.msg || 'Failed to verify password. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const formatRole = (role) => {
        if (!role) return '';
        return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <ReauthContext.Provider value={{ show, setShow }}>
            {children}

            <Modal show={show} onHide={handleClose} centered keyboard={false} style={{ zIndex: 1260 }} backdrop="static" backdropClassName="stacked-modal-backdrop">
                <Modal.Header className="border-0 pb-0">
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <ShieldLock className="text-warning" size={32} />
                        Identity Verification Required
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="warning" className="d-flex align-items-start gap-2">
                        <ExclamationTriangle className="flex-shrink-0 mt-1" />
                        <div>
                            <strong>Role Change Detected</strong>
                            <p className="mb-0 small">
                                {message}
                            </p>
                        </div>
                    </Alert>

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Enter your password to continue</Form.Label>
                            <div className="input-group bg-body rounded border">
                                <Form.Control
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-0"
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>
                            {error && (
                                <div className="text-danger small mt-1">
                                    {error}
                                </div>
                            )}
                        </Form.Group>

                        <div className="d-flex gap-2 justify-content-end">
                            <Button variant="secondary" onClick={handleClose} disabled={loading}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading || !password}>
                                {loading ? (
                                    <>
                                        <Spinner size="sm" className="me-2" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Continue'
                                )}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </ReauthContext.Provider>
    );
};

export default ReauthProvider;
