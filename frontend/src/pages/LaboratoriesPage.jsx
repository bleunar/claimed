import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { LocationCard } from '../components/laboratory';
import RoleBasedContent from '../components/ComponentProtector';

const LaboratoriesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'laboratory'
    });
    const [error, setError] = useState('');

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            // Only fetch laboratory-type locations for this page
            const response = await api.get('/locations/?type=laboratory');
            const sortedLocs = response.data.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
            setLocations(sortedLocs);
        } catch (err) {
            console.error("Failed to fetch locations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (loc) => {
        setEditingId(loc.id);
        setFormData({
            name: loc.name,
            description: loc.description || '',
            type: loc.type || 'laboratory'
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            type: 'laboratory'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this laboratory?")) return;

        try {
            await api.delete(`/locations/${id}`);
            toast.success("Laboratory deleted successfully");
            fetchLocations();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete laboratory");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/locations/${editingId}`, formData);
                toast.success("Laboratory updated successfully");
            } else {
                await api.post('/locations/', formData);
                toast.success("Laboratory created successfully");
            }
            setShowModal(false);
            fetchLocations();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} laboratory`);
        }
    };

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4 fw-semibold'>Laboratories</div>
                {canManage && (
                    <button className="btn btn-sm btn-primary" onClick={handleCreate}>
                        <span className='d-none d-md-inline'>New Laboratory</span>
                        <Plus className='d-inline d-md-none' />
                    </button>
                )}
            </div>

            <div className="container">
                {
                    loading ? (
                        <LoadingSpinner centered />
                    ) : (
                        (
                            locations.length > 0 ? (
                                <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4">
                                    {locations.map(loc => (
                                        <LocationCard
                                            key={loc.id}
                                            location={loc}
                                            canManage={canManage}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onNavigate={(id) => navigate(`/dashboard/laboratories/${id}`)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="w-100 text-center">
                                    <span className="text-muted w-100">No Laboratories Found
                                        <RoleBasedContent allowedRoles={['admin', 'it_head', 'lab_head']}>
                                            , <span className='btn btn-link px-0' onClick={handleCreate}>Add One</span>
                                        </RoleBasedContent>
                                    </span>
                                </div>
                            )
                        )
                    )
                }
            </div>

            {/* Modal */}
            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Laboratory' : 'New Laboratory'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className='p-0'>
                    <form onSubmit={handleSubmit}>
                        <div className="p-3">
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input type="text" className="form-control" name="name" value={formData.name} onChange={handleInputChange} required placeholder='CL X' />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Description</label>
                                <input className="form-control" name="description" value={formData.description} onChange={handleInputChange} placeholder='Computer Laboratory X'></input>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                            <Button variant="primary" type="submit">{editingId ? 'Update' : 'Create'}</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LaboratoriesPage;
