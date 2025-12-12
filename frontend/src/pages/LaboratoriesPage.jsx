import React, { useState, useEffect } from 'react';
import { Modal, Button, Collapse } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ThreeDots, PencilSquare, Trash, Plus } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const CollapsibleActions = ({ onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="d-flex align-items-center justify-content-end">
            <div className="mobile-actions">
                <button className="action-btn" onClick={onEdit} title="Edit">
                    <PencilSquare size={18} />
                </button>
                <button className="action-btn" onClick={onDelete} title="Delete">
                    <Trash size={18} />
                </button>
            </div>

            <div className="desktop-actions d-none d-md-flex align-items-center justify-content-end">
                <div className={`d-flex align-items-center text-body rounded-pill ${isExpanded ? "bg-body" : "bg-transparent"}`}>
                    <Collapse in={isExpanded} dimension="width">
                        <div>
                            <div className="d-flex align-items-center text-nowrap">
                                <button className="action-btn text-primary px-2" onClick={(e) => { e.stopPropagation(); onEdit(); setIsExpanded(false); }} title="Edit">
                                    <PencilSquare size={18} />
                                </button>
                                <button className="action-btn text-danger px-2" onClick={(e) => { e.stopPropagation(); onDelete(); setIsExpanded(false); }} title="Delete">
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    </Collapse>

                    <button
                        className="action-btn rounded-circle bg-transparent"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Collapse" : "Show Actions"}
                    >
                        <ThreeDots size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const LaboratoryCard = ({ lab, canManage, onEdit, onDelete, onNavigate }) => {
    return (
        <div className="col p-2">
            <div
                className="card bg-body-secondary h-100 shadow-sm hover-shadow"
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onNavigate(lab.id)}
            >
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title mb-1">{lab.name}</h5>

                        {/* Collapsible Action Bar */}
                        {canManage && (
                            <div className="action-bar-container" onClick={(e) => e.stopPropagation()}>
                                <style>
                                    {`
                                        .action-btn {
                                            background: none;
                                            border: none;
                                            padding: 4px;
                                            cursor: pointer;
                                            transition: color 0.2s;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                        }
                                        .action-btn:hover {
                                            opacity: 0.7;
                                        }
                                        .desktop-actions {
                                            display: none; /* Hidden by default on mobile/desktop until logic applies */
                                        }
                                        
                                        /* Mobile View: Always show icons */
                                        @media (max-width: 767.98px) {
                                            .mobile-actions {
                                                display: flex;
                                                gap: 8px;
                                            }
                                            .desktop-trigger {
                                                display: none;
                                            }
                                        }

                                        /* Desktop View: Show trigger or expanded actions */
                                        @media (min-width: 768px) {
                                            .mobile-actions {
                                                display: none;
                                            }
                                            .desktop-trigger {
                                                display: block;
                                            }
                                        }
                                    `}
                                </style>

                                <CollapsibleActions
                                    onEdit={() => onEdit(lab)}
                                    onDelete={() => onDelete(lab.id)}
                                />
                            </div>
                        )}
                    </div>

                    <h6 className="card-subtitle mb-2 text-muted">{lab.location}</h6>
                    <p className="card-text text-truncate">{lab.description}</p>
                </div>
            </div>
        </div>
    );
};

const LaboratoriesPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [laboratories, setLaboratories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: ''
    });
    const [error, setError] = useState('');

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    useEffect(() => {
        fetchLaboratories();
    }, []);

    const fetchLaboratories = async () => {
        try {
            const response = await api.get('/laboratories/');
            const sortedLabs = response.data.sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
            );
            setLaboratories(sortedLabs);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEdit = (lab) => {
        setEditingId(lab.id);
        setFormData({
            name: lab.name,
            description: lab.description || '',
            location: lab.location || ''
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            description: '',
            location: ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this laboratory?")) return;

        try {
            await api.delete(`/laboratories/${id}`);
            toast.success("Laboratory deleted successfully");
            fetchLaboratories();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete laboratory");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/laboratories/${editingId}`, formData);
                toast.success("Laboratory updated successfully");
            } else {
                await api.post('/laboratories/', formData);
                toast.success("Laboratory created successfully");
            }
            setShowModal(false);
            fetchLaboratories();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} laboratory`);
        }
    };

    return (
        <div className="container py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className='h4'>Laboratories</div>
                {canManage && (
                    <button className="btn btn-sm btn-primary d-flex align-items-center" onClick={handleCreate}>
                        <Plus className='d-block d-md-none' />
                        <span className='d-none d-md-inline'>New Laboratory</span>
                    </button>
                )}
            </div>

            <div className="container-fluid">
                {loading ? (
                    <LoadingSpinner centered />
                ) : (
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4">
                        {laboratories.map(lab => (
                            <LaboratoryCard
                                key={lab.id}
                                lab={lab}
                                canManage={canManage}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onNavigate={(id) => navigate(`/dashboard/laboratories/${id}`)}
                            />
                        ))}
                    </div>
                )}
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
                                <textarea className="form-control" name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder='Computer Laboratory X'></textarea>
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
