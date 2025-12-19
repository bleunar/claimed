import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const ForgotPasswordModal = ({ show, onHide }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setStep(2);
            setTimer(60);
            toast.success('OTP sent to your email.');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            toast.error("Password must contain at least one uppercase letter");
            return;
        }
        if (!/\d/.test(newPassword)) {
            toast.error("Password must contain at least one digit");
            return;
        }

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

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setTimer(60);
            toast.success('OTP resent successfully.');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to resend OTP.');
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
                <Modal.Title>Account Recovery</Modal.Title>
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
                            <div className="text-end mt-1">
                                <Button
                                    variant="link"
                                    className="p-0 text-decoration-none"
                                    onClick={handleResendOtp}
                                    disabled={timer > 0 || loading}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
                                </Button>
                            </div>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    variant="primary"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlash /> : <Eye />}
                                </Button>
                            </InputGroup>
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Button variant="secondary" onClick={() => setStep(1)} disabled={loading} className='col-6'>
                                Back
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading} className='col-6'>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ForgotPasswordModal;
