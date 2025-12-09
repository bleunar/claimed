import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ForgotPasswordModal = ({ show, onHide }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setStep(2);
            toast.success('OTP sent to your email.');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/auth/reset-password', {
                email,
                otp,
                new_password: newPassword
            });
            toast.success('Password reset successfully! You can now login.');
            handleClose();
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setEmail('');
        setOtp('');
        setNewPassword('');
        onHide();
    };

    return (
        <Modal centered show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Forgot Password</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {step === 1 ? (
                    <Form onSubmit={handleSendOtp}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Form.Text className="text-muted">
                                We'll send an OTP to this email if it exists.
                            </Form.Text>
                        </Form.Group>
                        <div className="d-grid">
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Sending...' : 'Send OTP'}
                            </Button>
                        </div>
                    </Form>
                ) : (
                    <Form onSubmit={handleResetPassword}>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" value={email} disabled />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>OTP Code</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </Form.Group>
                        <div className="d-grid gap-2">
                            <Button variant="primary" type="submit" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                            <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                                Back
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ForgotPasswordModal;
