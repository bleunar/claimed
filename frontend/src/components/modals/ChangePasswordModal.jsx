import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useTitle } from '../../context/TitleContext';

const ChangePasswordModal = ({ show, onHide }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validations
        if (!currentPassword) {
            toast.error("Current password is required");
            return;
        }

        if (!newPassword) {
            toast.error("New password is required");
            return;
        }

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

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (currentPassword === newPassword) {
            toast.error("New password must be different from current password");
            return;
        }

        setLoading(true);
        try {
            await api.put('/accounts/profile/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            toast.success("Password updated successfully");
            handleClose();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        onHide();
    };

    return (
        <Modal centered show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Update Password</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Current Password</Form.Label>
                        <div className="input-group bg-body rounded border">
                            <Form.Control
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="border-0"
                                required
                            />
                            <div
                                className="btn"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                                {showCurrentPassword ? <EyeSlash /> : <Eye />}
                            </div>
                        </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <div className="input-group bg-body rounded border">
                            <Form.Control
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="border-0"
                                required
                            />
                            <div
                                className="btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <EyeSlash /> : <Eye />}
                            </div>
                        </div>
                        <Form.Text className="text-muted">
                            Min 8 characters, 1 uppercase, 1 digit
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Confirm New Password</Form.Label>
                        <div className="input-group bg-body rounded border">
                            <Form.Control
                                type={showConfirmPassword ? "text" : "password"}
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
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</>
                        ) : 'Update Password'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ChangePasswordModal;
