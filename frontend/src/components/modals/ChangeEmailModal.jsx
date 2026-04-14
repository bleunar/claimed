import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/TitleContext';

const ChangeEmailModal = ({ show, onHide, onSuccess }) => {
    const { refreshUser } = useAuth();
    const [step, setStep] = useState(1); // 1: New Email ---> 2: OTP + Password
    const [newEmail, setNewEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setTitle, resetTitle } = useTitle()

    useEffect(() => {
        if(show) {
            setTitle("Update Email")
        } else {
            resetTitle()
        }
    }, [show])

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/accounts/profile/email/request',
                { new_email: newEmail }
            );
            setStep(2);
            toast.success(`OTP sent to ${newEmail}`);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmChange = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/accounts/profile/email/confirm',
                { otp, password }
            );
            toast.success('Email updated successfully!');
            await refreshUser(); // Refresh global user state
            if (onSuccess) onSuccess();
            handleClose();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to verify OTP or Password.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setNewEmail('');
        setOtp('');
        setPassword('');
        onHide();
    };

    return (
        <Modal centered show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Change Email</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {step === 1 ? (
                    <Form onSubmit={handleSendOtp}>
                        <Form.Group className="mb-3">
                            <Form.Label>New Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Enter new email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                required
                            />
                            <Form.Text className="text-muted">
                                We'll send an OTP to this new email to verify it.
                            </Form.Text>
                        </Form.Group>
                        <div className="d-grid">
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Sending...' : 'Send OTP'}
                            </Button>
                        </div>
                    </Form>
                ) : (
                    <Form onSubmit={handleConfirmChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>OTP Code</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter 6-digit OTP sent to new email"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <div className="input-group bg-body rounded border">
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm changes by entering your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border-0"
                                    required
                                />
                                <div
                                    className="btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlash /> : <Eye />}
                                </div>
                            </div>
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Verifying...' : 'Confirm Change'}
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ChangeEmailModal;
