import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Form, Button, Card, Row, Col, Image, Modal, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Person, PersonCircle, Eye, EyeSlash, InfoCircle, ChevronRight } from 'react-bootstrap-icons';
import ChangeEmailModal from '../components/modals/ChangeEmailModal';
import ChangePasswordModal from '../components/modals/ChangePasswordModal';
import toast from 'react-hot-toast';
import ProfileImage from '../components/common/ProfileImage';
import ActivityTimeline from '../components/common/ActivityTimeline';

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { theme, toggleTheme, toastPosition, setToastPosition, seasonalEffects, toggleSeasonalEffects, hasActiveSeason, savePreferences, savingPreferences, hasUnsavedChanges, effectiveTheme, effectiveToastPosition, effectiveSeasonalEffects, effectiveEmailOptOut, toggleEmailOptOut } = useTheme();
    const [name, setName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [schoolId, setSchoolId] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [departmentName, setDepartmentName] = useState('');
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [updatingProfile, setUpdatingProfile] = useState(false);

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
                gender: gender || null
                // department_id is managed by admin only, not included here
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

    const originalDate = user?.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '';
    const hasNameChanged = name !== user?.name;
    const hasDateChanged = birthDate !== originalDate;
    const hasGenderChanged = gender !== (user?.gender || '');
    const hasSchoolIdChanged = ['admin', 'it_head', 'lab_head'].includes(user?.role) && schoolId !== (user?.school_id || '');

    const hasProfileChanges = hasNameChanged || hasDateChanged || hasGenderChanged || hasSchoolIdChanged;

    return (
        <div className="container py-3 overflow-hidden">
            <h2 className="h4 mb-3 fw-bold">My Profile</h2>
            <Row className="g-4 mb-4">
                <Col lg={4}>
                    <Card className='h-100 overflow-hidden shadow-sm'>
                        <Card.Header className='text-body-secondary fw-bold'>Profile Picture</Card.Header>
                        <Card.Body className="d-flex flex-column justify-content-center align-items-center bg-body-tertiary">
                            <div className="mb-3 position-relative d-inline-block">
                                <ProfileImage
                                    src={getProfileImageUrl()}
                                    name={user?.name}
                                    size="150px"
                                    shape='circle'
                                />
                            </div>
                            <h4 className="mb-0 text-center">{user?.name}</h4>
                            <div className="text-muted mb-3 text-uppercase" style={{ fontSize: '0.75rem' }}>{user?.role.replace('_', ' ').toLowerCase()}</div>
                        </Card.Body>
                        <Card.Footer>
                            <div className="d-flex justify-content-end gap-2">
                                <Form.Label htmlFor="upload-photo" className={`btn btn-claims-primary mb-0`}>
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
                                        variant="danger"
                                        onClick={handleRemovePhoto}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>

                <Col lg={8}>
                    <Card className='h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>Profile Information</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form onSubmit={handleUpdateName} className='row'>
                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control type="email" value={user?.email || ''} disabled />
                                        </div>
                                    </Form.Group>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Form.Group className="mb-3" title='Contact the administrator for department shifts'>
                                        <Form.Label>Department</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={user?.department_name || 'Not assigned'}
                                            disabled
                                            className="text-muted"
                                        />
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
                            </Form>

                            <div className="d-flex d-lg-none flex-wrap gap-2 align-items-center justify-content-start mt-3">
                                <Button variant="claims-primary" size='sm' className='text-nowrap' onClick={() => setShowPasswordModal(true)}>
                                    Change Password
                                </Button>

                                <Button
                                    variant="claims-primary"
                                    size='sm'
                                    className='text-nowrap'
                                    onClick={() => setShowEmailModal(true)}
                                >
                                    Change Email
                                </Button>
                            </div>
                        </Card.Body>
                        <Card.Footer>
                            <div className="d-flex justify-content-end justify-content-lg-between align-items-center gap-2">
                                <div className="d-none d-lg-flex flex-wrap gap-2 align-items-center justify-content-start">
                                    <Button variant="claims-primary" size='sm' className='text-nowrap' onClick={() => setShowPasswordModal(true)}>
                                        Change Password
                                    </Button>

                                    <Button
                                        variant="claims-primary"
                                        size='sm'
                                        className='text-nowrap'
                                        onClick={() => setShowEmailModal(true)}
                                    >
                                        Change Email
                                    </Button>
                                </div>
                                <Button variant="claims-primary" className='mb-0' onClick={handleUpdateName} disabled={updatingProfile || !hasProfileChanges}>
                                    {updatingProfile ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</>
                                    ) : 'Update'}
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>

            <Row className='g-4 justify-content-end'>
                <Col lg={8}>
                    <Card className='mb-4 mb-md-0 h-100 shadow-sm overflow-hidden'>
                        <Card.Header className='text-body-secondary fw-bold'>General Settings</Card.Header>
                        <Card.Body className='bg-body-tertiary'>
                            <Form.Group className="mb-3 d-flex justify-content-between align-items-center">
                                <Form.Label className="mb-0">Dark Mode</Form.Label>
                                <Form.Check
                                    type="switch"
                                    id="theme-switch"
                                    checked={effectiveTheme === 'dark'}
                                    onChange={toggleTheme}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3 d-flex justify-content-between align-items-center">
                                <Form.Label className="mb-0">Opt-out of System Emails <InfoCircle title='You will not receive email notificatios sent from the system (Wala pa magamit)' className='text-muted small ms-1' /></Form.Label>
                                <Form.Check
                                    type="switch"
                                    id="email-optout-switch"
                                    checked={effectiveEmailOptOut}
                                    onChange={toggleEmailOptOut}
                                />
                            </Form.Group>

                            {/* Seasonal Effects Toggle - Only show in December */}
                            {hasActiveSeason && (
                                <Form.Group className='mb-3 d-flex justify-content-between align-items-center'>
                                    <Form.Label className='mb-0' title='Particles will appear on your screen to match the season'>Seasonal Effects</Form.Label>
                                    <Form.Check
                                        type="switch"
                                        id="seasonal-effects-switch"
                                        checked={effectiveSeasonalEffects}
                                        onChange={toggleSeasonalEffects}
                                    />
                                </Form.Group>
                            )}

                            <Form.Group className='mb-3 d-flex justify-content-between align-items-center'>
                                <Form.Label className='mb-0'>Notification Position</Form.Label>
                                <Form.Select
                                    className='w-auto'
                                    value={effectiveToastPosition}
                                    onChange={(e) => setToastPosition(e.target.value)}
                                >
                                    <option value="top-center">Top Center</option>
                                    <option value="bottom-center">Bottom Center</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-0 d-flex justify-content-between align-items-center">
                                <Form.Label className="mb-0">System Documentation</Form.Label>
                                <Button 
                                    variant="link" 
                                    className="p-0 text-decoration-none" 
                                    onClick={() => window.location.href = '/dashboard/documentations'}
                                >
                                    View Guides <ChevronRight size={12} />
                                </Button>
                            </Form.Group>
                        </Card.Body>
                        <Card.Footer>
                            <div className='text-end'>
                                <Button
                                    variant="claims-primary"
                                    onClick={async () => {
                                        const result = await savePreferences();
                                        if (result.success) {
                                            toast.success("Settings saved successfully");
                                        } else {
                                            toast.error(result.error || "Failed to save settings");
                                        }
                                    }}
                                    disabled={savingPreferences || !hasUnsavedChanges}
                                >
                                    {savingPreferences ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</>
                                    ) : 'Update'}
                                </Button>
                            </div>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>

            {/* Recent Activity Section */}
            <Row className="mt-4 justify-content-end">
                <Col lg={8}>
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

            <ChangePasswordModal
                show={showPasswordModal}
                onHide={() => setShowPasswordModal(false)}
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
                    <Button variant="claims-secondary" onClick={handleClosePreview} disabled={uploading}>
                        Cancel
                    </Button>
                    <Button variant="claims-primary" onClick={handleConfirmUpload} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Confirm Upload'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};


export default ProfilePage;
