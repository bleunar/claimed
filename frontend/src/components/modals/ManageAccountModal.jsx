import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Eye, EyeSlash } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import RoleBasedContent from '../ComponentProtector';

const ManageAccountModal = ({ show, onHide, account = null, onSuccess }) => {
    const { user } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Initial State defaults
    const initialFormState = {
        name: '',
        email: '',
        school_id: '',
        password: '',
        role: 'lab_assistant',
        suspended: false,
        birth_date: '',
        gender: '',
        department_id: '',
        password_reset_required: false
    };

    const [formData, setFormData] = useState(initialFormState);

    // Determines if we are in Edit mode
    const editingId = account?.id;

    // Fetch Departments on Mount
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await api.get('/departments/');
                setDepartments(response.data || []);
            } catch (err) {
                console.error("Failed to fetch departments", err);
            }
        };
        fetchDepartments();
    }, []);

    // Reset/Populate form when modal opens or account changes
    useEffect(() => {
        if (show) {
            setError('');
            setShowNewPassword(false);
            if (account) {
                // Edit Mode
                setFormData({
                    name: account.name,
                    email: account.email,
                    school_id: account.school_id || '',
                    role: account.role,
                    suspended: !!account.suspended_at,
                    birth_date: account.birth_date ? new Date(account.birth_date).toISOString().split('T')[0] : '',
                    gender: account.gender || '',
                    department_id: account.department_id || '',
                    password: '', // Password not filled during edit
                    password_reset_required: false // Default for edit unless we want to read it (but typically handled separately)
                });
            } else {
                // Create Mode
                let defaultRole = 'lab_assistant';
                if (user?.role === 'it_head') defaultRole = 'it_technician';
                if (user?.role === 'lab_head') defaultRole = 'lab_assistant';
                if (user?.role === 'department_head') defaultRole = 'department_staff';

                setFormData({
                    ...initialFormState,
                    role: defaultRole,
                    department_id: user?.role === 'admin' ? '' : (user?.department_id || '')
                });
            }
        }
    }, [show, account, user]);

    const handleInputChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const payload = { ...formData };
            if (user?.role !== 'admin') {
                // Non-admins can't change department freely, usually fixed to their own or valid scope
                // But for create/update, backend often validates permissions.
                // Replicating logic from AccountsPage:
                if (!editingId && user?.role !== 'admin') {
                    // For create, default to user app department if not set? 
                    // Actually logic in AccountsPage was: 
                    // department_id: user?.role === 'admin' ? '' : (user?.department_id || ''),
                    // And in handleSubmit: if (user?.role !== 'admin') { delete payload.department_id; }
                    // Wait, if it deletes it, backend uses current user's department? 
                    // Let's stick to AccountsPage logic:
                    delete payload.department_id;
                }
            }

            // Clean up empty optional fields
            if (payload.school_id === '') delete payload.school_id;

            if (editingId) {
                if (payload.password === '') delete payload.password; // Don't send empty password on edit
                await api.put(`/accounts/${editingId}`, payload);
                toast.success("Account updated successfully");
            } else {
                await api.post('/accounts/', payload);
                toast.success("Account created successfully");
            }
            if (onSuccess) onSuccess();
            onHide();
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} user`;
            setError(msg);
            toast.error(msg);
        }
    };

    return (
        <Modal className='pb-5' show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Edit Account' : 'Create New Account'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className='p-0 bg-body-tertiary overflow-hidden'>
                {error && <div className="alert alert-danger m-3">{error}</div>}
                <Form onSubmit={handleSubmit}>
                    <div className="p-3">
                        <div className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                        </div>
                        <div className="mb-3">
                            <Form.Label>School ID</Form.Label>
                            <Form.Control type="text" name="school_id" value={formData.school_id} onChange={handleInputChange} required />
                        </div>
                        {!editingId && (
                            <div className="mb-3">
                                <Form.Label>Initial Password</Form.Label>
                                <div className="input-group rounded border bg-body">
                                    <Form.Control
                                        type={showNewPassword ? "text" : "password"}
                                        className="bg-transparent border-0"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <button
                                        className="btn bg-transparent"
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? <EyeSlash /> : <Eye />}
                                    </button>
                                </div>
                                {
                                    user?.role != "admin" && (
                                        <Form.Text className="text-muted small">
                                            Note: Minimum of 8 Characters, At least one number and Capital Letter
                                        </Form.Text>
                                    )
                                }
                            </div>
                        )}

                        {!editingId && (
                            <div className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    id="forceResetCreate"
                                    label={<span className="small text-muted">Force user to change password on first login</span>}
                                    name="password_reset_required"
                                    checked={formData.password_reset_required}
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}

                        <hr />

                        <div className="row mb-3">
                            <div className="col-6">
                                <Form.Label>Department</Form.Label>
                                <Form.Select
                                    name="department_id"
                                    value={formData.department_id}
                                    onChange={handleInputChange}
                                    disabled={user?.role !== 'admin'}
                                >
                                    <option value="" hidden={user?.role === 'admin'}>
                                        {user?.role !== 'admin' ? (departments.find(d => d.id === user.department_id)?.name || 'Using your department') : 'Select department'}
                                    </option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </Form.Select>
                            </div>

                            <div className="col-6">
                                <Form.Label>Role</Form.Label>
                                <Form.Select name="role" value={formData.role} onChange={handleInputChange}>
                                    {/* Admin Roles */}
                                    {user?.role === 'admin' && (
                                        <>
                                            <option value="admin">Administrator</option>
                                            <option value="it_head">IT Head</option>
                                            <option value="it_technician">IT Technician</option>
                                            <option value="department_head">Department Head</option>
                                            <option value="department_staff">Department Staff</option>
                                            <option value="lab_head">Laboratory Head</option>
                                            <option value="lab_assistant">Laboratory Assistant</option>
                                        </>
                                    )}

                                    {/* IT Head Roles */}
                                    {user?.role === 'it_head' && (
                                        <option value="it_technician">IT Technician</option>
                                    )}

                                    {/* Lab Head Roles */}
                                    {user?.role === 'lab_head' && (
                                        <option value="lab_assistant">Lab Assistant</option>
                                    )}

                                    {/* Department Head Roles */}
                                    {user?.role === 'department_head' && (
                                        <>
                                            <option value="department_staff">Department Staff</option>
                                            <option value="department_assistant">Department Assistant</option>
                                            <option value="lab_head">Lab Head</option>
                                            <option value="lab_assistant">Lab Assistant</option>
                                        </>
                                    )}
                                </Form.Select>
                            </div>

                        </div>

                        <div className="row mb-3">
                            <div className="col-6">
                                <Form.Label>Birth Date</Form.Label>
                                <Form.Control type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} />
                            </div>
                            <div className="col-6">
                                <Form.Label>Gender</Form.Label>
                                <Form.Select name="gender" value={formData.gender} onChange={handleInputChange}>
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="others">Others</option>
                                </Form.Select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <Button variant="secondary" onClick={onHide}>Close</Button>
                        <Button variant="claims-primary" type="submit">{editingId ? 'Update Account' : 'Create Account'}</Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default ManageAccountModal;
