import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Form, Button, Card, Row, Col, Image, Modal, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Person, PersonCircle, Eye, EyeSlash } from 'react-bootstrap-icons';
import ChangeEmailModal from '../components/modals/ChangeEmailModal';
import toast from 'react-hot-toast';
import ProfileImage from '../components/common/ProfileImage';
import ActivityTimeline from '../components/common/ActivityTimeline';

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { theme, toggleTheme, toastPosition, setToastPosition, seasonalEffects, toggleSeasonalEffects, isDecember } = useTheme();
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
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [departmentName, setDepartmentName] = useState('');
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [updatingProfile, setUpdatingProfile] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setSchoolId(user.school_id || '');
            setBirthDate(user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '');
            setGender(user.gender || '');
            setDepartmentName(user.department_name || '');
            fetchActivities();
        }
    }, [user]);

    const fetchActivities = async () => {
        if (!user) return;
        setActivitiesLoading(true);
        try {
            const response = await api.get(`/accounts/${user.id}/activities`);
            setActivities(response.data.activities || []);
        } catch (err) {
            console.error('Failed to fetch activities', err);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const handleUpdateName = async (e) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const updateData = {
                name,
                birth_date: birthDate || null,
                gender: gender || null,
                department_name: departmentName || null
            };
            // Include school_id for admin/head roles
            if (['admin', 'it_head', 'lab_head'].includes(user?.role)) {
                updateData.school_id = schoolId;
            }
            await api.put('/accounts/profile', updateData);
            toast.success("Profile updated successfully");
            refreshUser();
            fetchActivities();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update profile");
        } finally {
            setUpdatingProfile(false);
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

        setUpdatingPassword(true);
        try {
            await api.put('/accounts/profile', { password });
            toast.success("Password updated successfully");
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update password");
        } finally {
            setUpdatingPassword(false);
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
        setUploadProgress(0);

        try {
            await api.post('/accounts/profile/upload-picture', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                },
            });
            toast.success("Profile picture uploaded successfully");
            setImageTimestamp(Date.now());
            handleClosePreview(); // Close modal and clear selection
            refreshUser();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to upload profile picture");
            setShowPreviewModal(false);
        } finally {
            setUploading(false);
            setUploadProgress(0);
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
            // Use full API URL - img tags need absolute path to backend
            const apiUrl = import.meta.env.VITE_API_URL || '';
            return `${apiUrl}/accounts/${user.id}/picture?t=${imageTimestamp}`;
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
                        <Card.Body className="d-flex flex-column justify-content-center align-items-center bg-body-tertiary">
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
                            <Form.Label htmlFor="upload-photo" className={`btn btn-outline-primary flex-fill rounded-0 mb-0 ${user?.profile_picture ? "border-0 border-end" : "border-0"}`}>
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
                                    variant="outline-danger"
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
                            <Form onSubmit={handleUpdateName} className='row'>


                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control type="email" value={user?.email || ''} disabled />
                                            <Button
                                                variant="primary"
                                                className='text-nowrap'
                                                onClick={() => setShowEmailModal(true)}
                                            >
                                                Update
                                            </Button>
                                        </div>
                                    </Form.Group>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>School ID</Form.Label>
                                        {['admin', 'it_head', 'lab_head'].includes(user?.role) ? (
                                            <Form.Control
                                                type="text"
                                                value={schoolId}
                                                onChange={(e) => setSchoolId(e.target.value)}
                                            />
                                        ) : (
                                            <Form.Control type="text" value={user?.school_id || ''} disabled />
                                        )}
                                    </Form.Group>

                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                    </Form.Group>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Birth Date</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={birthDate}
                                            onChange={(e) => setBirthDate(e.target.value)}
                                        />
                                    </Form.Group>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Gender</Form.Label>
                                        <Form.Select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                        >
                                            <option value="" hidden>Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="others">Others</option>
                                        </Form.Select>
                                    </Form.Group>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="">
                                        <Form.Label>Department</Form.Label>
                                        <Form.Select
                                            value={departmentName}
                                            onChange={(e) => setDepartmentName(e.target.value)}
                                        >
                                            <option value="" hidden>Select department</option>
                                            <option value="ITSD">ITSD</option>
                                            <option value="CITE">CITE</option>
                                            <option value="others">Other</option>
                                        </Form.Select>
                                    </Form.Group>
                                </div>

                                <div className="col-12">
                                    <div className="text-end mt-3">
                                        <Button variant="primary" className='mb-0' type="submit" disabled={updatingProfile}>
                                            {updatingProfile ? (
                                                <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</>
                                            ) : 'Update Profile'}
                                        </Button>
                                    </div>
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

                            <Form.Group className='mb-3 d-flex justify-content-between align-items-center'>
                                <Form.Label className='mb-0'>Notification Position</Form.Label>
                                <Form.Select
                                    className='w-auto'
                                    size='sm'
                                    value={toastPosition}
                                    onChange={(e) => {
                                        setToastPosition(e.target.value);
                                        toast.success("Toast position updated!");
                                    }}
                                >
                                    <option value="top-center">Top Center</option>
                                    <option value="bottom-center">Bottom Center</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </Form.Select>
                            </Form.Group>

                            {/* Seasonal Effects Toggle - Only show in December */}
                            {isDecember && (
                                <Form.Group className='mb-3 d-flex justify-content-between align-items-center'>
                                    <Form.Label className='mb-0'>❄️ Seasonal Effects</Form.Label>
                                    <Form.Check
                                        type="switch"
                                        id="seasonal-effects-switch"
                                        checked={seasonalEffects}
                                        onChange={toggleSeasonalEffects}
                                    />
                                </Form.Group>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={8}>
                    <Card className='h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>Update Password</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form onSubmit={handleUpdatePassword} className='row'>

                                <div className="col-12 col-md-6">
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
                                </div>


                                <div className="col-12 col-md-6">
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
                                </div>


                                <div className="text-end">
                                    <Button type="submit" disabled={updatingPassword}>
                                        {updatingPassword ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</>
                                        ) : 'Update'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Recent Activity Section */}
            <Row className="mt-4">
                <Col>
                    <Card>
                        <Card.Header className="fw-bold text-body-secondary">
                            Recent Activity
                        </Card.Header>
                        <Card.Body className="pt-2 bg-body-tertiary">
                            <ActivityTimeline
                                activities={activities}
                                loading={activitiesLoading}
                                maxItems={10}
                                userRole={user?.role}
                            />
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

                    {uploading && (
                        <div className="mt-3">
                            <ProgressBar
                                now={uploadProgress}
                                label={`${uploadProgress}%`}
                                animated
                                striped
                                variant="success"
                            />
                            <div className="text-muted small mt-2">
                                {uploadProgress < 100 ? 'Uploading...' : 'Processing image...'}
                            </div>
                        </div>
                    )}
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
