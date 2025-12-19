import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Form, Button, Card, Row, Col, Image, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Person, PersonCircle, Eye, EyeSlash } from 'react-bootstrap-icons';
import ChangeEmailModal from '../components/modals/ChangeEmailModal';
import toast from 'react-hot-toast';
import ProfileImage from '../components/common/ProfileImage';

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { theme, toggleTheme, toastPosition, setToastPosition } = useTheme();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [schoolId, setSchoolId] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setSchoolId(user.school_id || '');
        }
    }, [user]);

    const handleUpdateName = async (e) => {
        e.preventDefault();
        try {
            await api.put('/accounts/profile', { name });
            toast.success("Name updated successfully");
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update name");
        }
    };

    const handleUpdateSchoolId = async () => {
        if (!schoolId.trim()) {
            toast.error("School ID cannot be empty");
            return;
        }
        try {
            await api.put('/accounts/profile', { school_id: schoolId });
            toast.success("School ID updated successfully");
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update School ID");
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        if (!password) {
            toast.error("Password is required");
            return;
        }

        if (password.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }

        if (!/[A-Z]/.test(password)) {
            toast.error("Password must contain at least one uppercase letter");
            return;
        }

        if (!/\d/.test(password)) {
            toast.error("Password must contain at least one digit");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        try {
            await api.put('/accounts/profile', { password });
            toast.success("Password updated successfully");
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update password");
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
                setShowPreviewModal(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClosePreview = () => {
        setShowPreviewModal(false);
        setPreviewImage(null);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('upload-photo');
        if (fileInput) fileInput.value = "";
    };

    const handleConfirmUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        setUploading(true);

        try {
            await api.post('/accounts/profile/upload-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success("Profile picture uploaded successfully");
            setImageTimestamp(Date.now());
            handleClosePreview(); // Close modal and clear selection
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to upload profile picture");
            setShowPreviewModal(false); // Close modal on error too? Or keep open? Let's close for now.
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
        try {
            await api.delete(`/accounts/${user.id}/picture`);
            toast.success("Profile picture removed");
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to remove profile picture");
        }
    };

    const getProfileImageUrl = () => {
        if (user?.profile_picture) {
            return `/api/accounts/${user.id}/picture?t=${imageTimestamp}`;
        }
        return null;
    };

    return (
        <div className="container py-3">
            <h2 className="h4 mb-3">My Account</h2>
            <Row className="g-4 mb-4">
                <Col md={4}>
                    <Card className='h-100 overflow-hidden shadow-sm'>
                        <Card.Header className='text-body-secondary fw-bold'>Profile Picture</Card.Header>
                        <Card.Body className="text-center bg-body-tertiary">
                            <div className="mb-3 position-relative d-inline-block">
                                <ProfileImage
                                    src={getProfileImageUrl()}
                                    size="150px"
                                    shape='circle'
                                />
                            </div>
                            <h4 className="mb-0">{user?.name}</h4>
                            <div className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem' }}>{user?.role.replace('_', ' ').toLowerCase()}</div>
                        </Card.Body>
                        <Card.Footer className='d-flex justify-content-evenly p-0 m-0 border-top'>
                            <Form.Label htmlFor="upload-photo" className="btn btn-outline-primary flex-fill rounded-0 border-0 mb-0">
                                Update Photo
                            </Form.Label>
                            <Form.Control
                                type="file"
                                id="upload-photo"
                                accept="image/*"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            {user?.profile_picture && (
                                <Button
                                    variant="outline-primary"
                                    className="w-50 rounded-0 border-0 mb-0"
                                    onClick={handleRemovePhoto}
                                >
                                    Remove
                                </Button>
                            )}
                        </Card.Footer>
                    </Card>
                </Col>

                <Col md={8}>
                    <Card className='h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>Profile Information</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form onSubmit={handleUpdateName}>
                                <Form.Group className="mb-3">
                                    <Form.Label>School ID</Form.Label>
                                    {['admin', 'it_head', 'lab_head'].includes(user?.role) ? (
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="text"
                                                value={schoolId}
                                                onChange={(e) => setSchoolId(e.target.value)}
                                            />
                                            <Button
                                                variant="link"
                                                className='text-body-primary text-nowrap'
                                                onClick={handleUpdateSchoolId}
                                            >
                                                Update School ID
                                            </Button>
                                        </div>
                                    ) : (
                                        <Form.Control type="text" value={user?.school_id || ''} disabled />
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <div className="d-flex gap-2">
                                        <Form.Control type="email" value={user?.email || ''} disabled />
                                        <Button
                                            variant="link"
                                            className='text-nowrap'
                                            onClick={() => setShowEmailModal(true)}
                                        >
                                            Update Email
                                        </Button>
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </Form.Group>
                                <div className="text-end">
                                    <Button variant="primary" className='mb-0' type="submit">
                                        Update
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className='g-4'>
                <Col md={4}>
                    <Card className='mb-4 mb-md-0 h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>Settings</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form.Group className="mb-3 d-flex justify-content-between align-items-center">
                                <Form.Label className="mb-0">Dark Mode</Form.Label>
                                <Form.Check
                                    type="switch"
                                    id="theme-switch"
                                    checked={theme === 'dark'}
                                    onChange={toggleTheme}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Toast Notification Position</Form.Label>
                                <Form.Select
                                    value={toastPosition}
                                    onChange={(e) => {
                                        setToastPosition(e.target.value);
                                        toast.success("Toast position updated!");
                                    }}
                                >
                                    <option value="top-center">Top Center</option>
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-center">Bottom Center</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </Form.Select>
                            </Form.Group>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <Card className='h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>Update Password</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form onSubmit={handleUpdatePassword}>
                                <Form.Group className="mb-3">
                                    <Form.Label>New Password</Form.Label>
                                    <div className="input-group bg-body rounded border">
                                        <Form.Control
                                            type={showNewPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            className='border-0'
                                            required
                                        />
                                        <div
                                            className="btn"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? <EyeSlash /> : <Eye />}
                                        </div>
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Confirm New Password</Form.Label>
                                    <div className="input-group bg-body rounded border">
                                        <Form.Control
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            className='border-0'
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

                                <div className="text-end">
                                    <Button type="submit">
                                        Update
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            <ChangeEmailModal
                show={showEmailModal}
                onHide={() => setShowEmailModal(false)}
            />

            {/* Profile Picture, upload preview modal */}
            <Modal centered show={showPreviewModal} onHide={handleClosePreview}>
                <Modal.Header closeButton>
                    <Modal.Title>Upload Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {previewImage && (
                        <Image
                            src={previewImage}
                            rounded
                            fluid
                            style={{ maxHeight: '300px', objectFit: 'contain' }}
                        />
                    )}

                    <div className="text-muted small my-4">NOTE: Using images with an aspect ratio of 1:1 (Square) is recommnded</div>
                </Modal.Body>
                <Modal.Footer className='border-0'>
                    <Button variant="secondary" onClick={handleClosePreview} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirmUpload} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Confirm Upload'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};


export default ProfilePage;
