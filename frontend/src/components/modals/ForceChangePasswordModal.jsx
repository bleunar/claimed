import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/TitleContext';

const ForceChangePasswordModal = ({ show }) => {
    const { refreshUser } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { setTitle, resetTitle } = useTitle()

    useEffect(() => {
        if (show) {
            setTitle("Update Password")
        } else {
            resetTitle()
        }
    }, [show])

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return "Password must be at least 8 characters long";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
        if (!/\d/.test(pwd)) return "Password must contain at least one digit";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const pwdError = validatePassword(password);
        if (pwdError) {
            toast.error(pwdError);
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            // We use the profile update endpoint which clears the flag automatically upon password change
            await api.put('/accounts/profile', { password });
            toast.success("Password updated successfully");

            // Refresh user to clear the flag in context
            await refreshUser();

            // Reset form
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error("Failed to update password", err);
            toast.error(err.response?.data?.msg || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} backdrop="static" keyboard={false} centered>
            <Modal.Header>
                <Modal.Title>Password Change Required</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-muted mb-4">
                    Please set a new secure password to continue accessing the system.
                </p>

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <div className="input-group bg-body rounded border">
                            <Form.Control
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="border-0"
                                required
                                minLength={8}
                            />
                            <div
                                className="btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeSlash /> : <Eye />}
                            </div>
                        </div>
                        <Form.Text className="text-muted d-block mt-1">
                            <small>
                                At least 8 characters, 1 uppercase letter, 1 digit.
                            </small>
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label>Confirm New Password</Form.Label>
                        <div className="input-group bg-body rounded border">
                            <Form.Control
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="border-0"
                                required
                            />
                            <div
                                className="btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeSlash /> : <Eye />}
                            </div>
                        </div>
                    </Form.Group>

                    <div className="d-grid">
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : 'Update Password'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default ForceChangePasswordModal;
