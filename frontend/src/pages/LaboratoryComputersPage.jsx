import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PencilSquare, Plus } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
    BatchEditSetsModal,
    ComputerSetForm,
    ComponentsManager,
    ComputerSetCard
} from '../components/laboratory';
import RoleBasedContent from '../components/ComponentProtector';

const LaboratoryComputersPage = () => {
    const { id: laboratoryId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [computerSets, setComputerSets] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI Logic States only
    const [showModal, setShowModal] = useState(false);
    const [showBatchEditModal, setShowBatchEditModal] = useState(false);
    const [showComponentsModal, setShowComponentsModal] = useState(false);
    const [mode, setMode] = useState('create'); // 'create', 'edit', 'view'
    const [selectedSet, setSelectedSet] = useState(null);
    const [allComponents, setAllComponents] = useState([]); // Kept for Card counts
    const [itemsPerRow, setItemsPerRow] = useState(5);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', resolve: null });

    const showConfirm = (title, message) => {
        return new Promise((resolve) => {
            setConfirmModal({ show: true, title, message, resolve });
        });
    };

    const handleConfirmResult = (result) => {
        if (confirmModal.resolve) {
            confirmModal.resolve(result);
        }
        setConfirmModal({ ...confirmModal, show: false, resolve: null });
    };

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    useEffect(() => {
        fetchData();
    }, [laboratoryId]);

    useEffect(() => {
        if (!loading && computerSets.length > 0) {
            const setId = searchParams.get('set');
            if (setId) {
                const targetSet = computerSets.find(s => s.id === setId);
                if (targetSet) {
                    // Prevent re-opening if already open with same set
                    if (showModal && selectedSet?.id === setId) return;

                    if (searchParams.get('edit') === 'true') {
                        handleEdit(targetSet);
                    } else if (searchParams.get('components') === 'true') {
                        handleViewComponents(targetSet);
                    }
                }
            }
        }
    }, [loading, computerSets, searchParams]);

    const fetchData = async () => {
        try {
            const [locRes, setsRes, compsRes] = await Promise.all([
                api.get(`/locations/${laboratoryId}`),
                api.get(`/computer-sets/?location_id=${laboratoryId}`),
                api.get(`/components/?location_id=${laboratoryId}`)
            ]);
            setLocation(locRes.data);
            const sortedSets = setsRes.data.sort((a, b) =>
                a.set_name.localeCompare(b.set_name, undefined, { numeric: true, sensitivity: 'base' })
            );
            setComputerSets(sortedSets);
            setAllComponents(compsRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
            toast.error("Failed to load laboratory data");
        } finally {
            setLoading(false);
        }
    };

    const getSetComponents = (setId) => {
        const priority = ['system_unit', 'monitor', 'mouse', 'keyboard'];
        const comps = allComponents.filter(c => c.computer_set_id === setId);
        return comps.sort((a, b) => {
            const idxA = priority.indexOf(a.component_type);
            const idxB = priority.indexOf(b.component_type);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;

            return a.component_type.localeCompare(b.component_type);
        });
    };

    const handleCreate = () => {
        setMode('create');
        setSelectedSet(null);
        setShowModal(true);
    };

    const handleEdit = (set) => {
        setMode('edit');
        setSelectedSet(set);
        setShowModal(true);
    };

    const handleViewComponents = (set) => {
        setMode('view');
        setSelectedSet(set);
        setShowComponentsModal(true);
    };

    const handleDeleteSet = async (id) => {
        if (!window.confirm("Are you sure you want to delete this computer set?\n\nWARNING! All components will be PERMANENTLY DELETED!")) return;
        try {
            await api.delete(`/computer-sets/${id}`);
            toast.success("Computer set deleted");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete computer set");
        }
    };

    const handleCloseSetModal = () => {
        setShowModal(false);
        searchParams.delete('set');
        searchParams.delete('edit');
        setSearchParams(searchParams);
    };

    const handleCloseComponentsModal = () => {
        setShowComponentsModal(false);
        searchParams.delete('set');
        searchParams.delete('components');
        setSearchParams(searchParams);
    };

    const handleFormSubmit = () => {
        handleCloseSetModal();
        fetchData();
    };

    const handleBatchUpdate = async (ids, status) => {
        try {
            const promises = ids.map(id => {
                const set = computerSets.find(s => s.id === id);
                if (!set) return Promise.resolve();
                return api.put(`/computer-sets/${id}`, {
                    location_id: laboratoryId,
                    set_name: set.set_name,
                    status: status
                });
            });
            await Promise.all(promises);
            toast.success(`Updated ${ids.length} computer sets successfully`);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update some computer sets");
        }
    };

    const handleBatchDelete = async (ids) => {
        try {
            await api.post('/computer-sets/batch-delete', { ids });
            toast.success(`Deleted ${ids.length} computer sets successfully`);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete some computer sets");
        }
    };

    const handleBatchMove = async (ids, locationId) => {
        try {
            const promises = ids.map(id =>
                api.put(`/computer-sets/${id}`, { location_id: locationId })
            );
            await Promise.all(promises);
            toast.success(`Moved ${ids.length} computer sets successfully`);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to move some computer sets");
        }
    };

    if (!loading && !location) return <div className="container py-3">Location not found</div>;

    return (
        <div className="container-fluid py-3">
            <div className="row mb-4">
                <div className='col-12 col-md-6 mb-2 mb-md-0'>
                    {loading ? (
                        <div className="placeholder-glow">
                            <span className="placeholder rounded mb-1" style={{ width: '200px', height: '28px', display: 'block' }}></span>
                            <span className="placeholder rounded" style={{ width: '300px', height: '18px', display: 'block' }}></span>
                        </div>
                    ) : (
                        <>
                            <div className="h4 fw-semibold mb-0">{location?.name}</div>
                            <div className="text-muted mb-0">{location?.description}</div>
                        </>
                    )}
                </div>
                <div className="col-12 col-md-6">
                    <div className="d-flex justify-content-start justify-content-md-end align-items-end h-100 gap-2">
                        {(canManage || user?.role === 'it_technician') && (
                            <button className="btn btn-sm btn-primary text-nowrap" onClick={() => setShowBatchEditModal(true)}>
                                <PencilSquare /> Batch Edit
                            </button>
                        )}
                        {canManage && (
                            <button className="btn btn-sm btn-primary text-nowrap" onClick={handleCreate}>
                                <Plus /> New Computer Set
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="container p-0 pb-5 mb-5">

                <div className="d-lg-flex justify-content-end mb-2 d-none">
                    <select
                        className="form-select form-select-sm w-auto"
                        value={itemsPerRow}
                        onChange={(e) => setItemsPerRow(parseInt(e.target.value))}
                        title="Items per row"
                    >
                        <option value={6} defaultValue>6 PC per row</option>
                        <option value={5} defaultValue>5 PC per row</option>
                        <option value={4}>4 PC per row</option>
                        <option value={3}>3 PC per row</option>
                    </select>
                </div>

                <div className={`row rounded ${computerSets.length == 0 && !loading ? "row-cols-1" : `row-cols-2 row-cols-md-3 row-cols-lg-${itemsPerRow}`}`}>
                    {loading ? (
                        // Placeholder skeleton cards while loading
                        [...Array(25)].map((_, idx) => (
                            <div key={idx} className="col p-0 border">
                                <div className="card h-100 border-0 rounded-0 bg-body-secondary">
                                    <div className="card-body text-center d-flex flex-column justify-content-center align-items-center placeholder-glow" style={{ minHeight: '150px' }}>
                                        <span className="placeholder rounded mb-2" style={{ width: '80px', height: '24px', display: 'inline-block' }}></span>
                                        <span className="placeholder rounded-pill" style={{ width: '100px', height: '16px', display: 'inline-block' }}></span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : computerSets.length > 0 ? (
                        computerSets.map(set => (
                            <ComputerSetCard
                                key={set.id}
                                set={set}
                                components={allComponents ? allComponents.filter(c => c.computer_set_id === set.id) : []}
                                onView={handleViewComponents}
                            />
                        ))
                    ) : (
                        <div className="col-12">
                            <div className="text-center text-muted"><p>No computer sets found in this location
                                <RoleBasedContent allowedRoles={['admin', 'it_head', 'lab_head']}>
                                    . <span className='btn btn-link px-0' onClick={handleCreate}>Add One</span>
                                </RoleBasedContent>
                            </p></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Computer Set Form Modal (Create/Edit) */}
            <Modal className='pb-5' show={showModal} onHide={handleCloseSetModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {mode === 'edit' ? 'Edit Computer Set' : 'New Computer Set'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='p-0'>
                    <ComputerSetForm
                        mode={mode}
                        editingId={selectedSet?.id}
                        initialData={selectedSet}
                        locationId={laboratoryId}
                        locationName={location?.name}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseSetModal}
                        existingTopLevelComponents={allComponents}
                        user={user}
                        showConfirm={showConfirm}
                    />
                </Modal.Body>
            </Modal>

            {/* Batch Edit Modal */}
            <BatchEditSetsModal
                show={showBatchEditModal}
                onHide={() => setShowBatchEditModal(false)}
                computerSets={computerSets}
                user={user}
                onBatchUpdate={handleBatchUpdate}
                onBatchDelete={handleBatchDelete}
                onBatchMove={handleBatchMove}
            />

            {/* Components Manager Modal (View) */}
            {selectedSet && (
                <Modal show={showComponentsModal} onHide={handleCloseComponentsModal} size="lg" backdrop="static" animation={true} className='pb-5'>
                    <Modal.Header closeButton>
                        <Modal.Title>Computer Set</Modal.Title>
                    </Modal.Header>
                    <ComponentsManager
                        key={selectedSet.id}
                        set={selectedSet}
                        initialComponents={allComponents.filter(c => c.computer_set_id === selectedSet.id)}
                        laboratoryId={laboratoryId}
                        onClose={handleCloseComponentsModal}
                        onUpdate={() => { fetchData(); }}
                        user={user}
                        onDelete={handleDeleteSet}
                    />
                </Modal>
            )}

            {/* Confirmation Modal (Generic) */}
            <Modal show={confirmModal.show} onHide={() => handleConfirmResult(false)} centered size="sm" style={{ zIndex: 1060 }}>
                <Modal.Header closeButton>
                    <Modal.Title>{confirmModal.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ whiteSpace: 'pre-line' }}>{confirmModal.message}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => handleConfirmResult(false)}>Cancel</Button>
                    <Button variant="primary" onClick={() => handleConfirmResult(true)}>Confirm</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LaboratoryComputersPage;
