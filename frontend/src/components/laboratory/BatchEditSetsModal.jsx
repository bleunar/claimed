import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import { Trash, Plus, XLg, ArrowUp, ArrowDown } from 'react-bootstrap-icons';

const BatchEditSetsModal = ({ show, onHide, computerSets, user, onBatchUpdate, onBatchDelete }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [targetStatus, setTargetStatus] = useState('active');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter out available sets (those not selected)
    const availableSets = computerSets.filter(set => !selectedIds.includes(set.id));
    const selectedSets = computerSets.filter(set => selectedIds.includes(set.id));

    const handleSelect = (id) => setSelectedIds([...selectedIds, id]);
    const handleUnselect = (id) => setSelectedIds(selectedIds.filter(sid => sid !== id));

    const handleSelectAll = () => setSelectedIds(computerSets.map(s => s.id));
    const handleUnselectAll = () => setSelectedIds([]);

    const canDelete = ['admin', 'it_head', 'lab_head'].includes(user?.role);
    const canUpdateStatus = ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);

    const executeUpdate = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to update status for ${selectedIds.length} sets ? `)) return;

        setIsSubmitting(true);
        await onBatchUpdate(selectedIds, targetStatus);
        setIsSubmitting(false);
        onHide();
        setSelectedIds([]);
    };

    const executeDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE ${selectedIds.length} sets? This cannot be undone.`)) return;

        setIsSubmitting(true);
        await onBatchDelete(selectedIds);
        setIsSubmitting(false);
        onHide();
        setSelectedIds([]);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static" className='pb-5'>
            <Modal.Header closeButton>
                <Modal.Title>Batch Editor</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="row mb-5">
                    {/* Selected Area */}
                    <div className="col-12 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Selected Sets ({selectedSets.length})</h6>
                            <button className="btn btn-sm btn-link" onClick={handleUnselectAll}>Unselect All</button>
                        </div>
                        <div className="border rounded p-2 bg-body-tertiary" style={{ minHeight: '100px', overflowY: 'auto' }}>
                            {
                                selectedSets.length === 0 ?
                                    (
                                        <p className="text-muted text-center">Nothing selected</p>
                                    ) : (
                                        <div className="d-flex flex-wrap gap-2">
                                            {selectedSets.map(set => (
                                                <span
                                                    key={set.id}
                                                    className={`badge cursor-pointer ${set.status === 'active' ? 'bg-success' : 'bg-info'} border border-primary`}
                                                    onClick={() => handleUnselect(set.id)}
                                                    title="Click to remove"
                                                >
                                                    {set.set_name} <XLg className="ms-1" size={10} />
                                                </span>
                                            ))}
                                        </div>
                                    )}
                        </div>
                    </div>

                    <div className="col-12 d-flex justify-content-center align-items-center gap-1">
                        <ArrowUp title='Hello, world' />
                        <ArrowDown title='Hello, baby' />
                    </div>

                    {/* Available Area */}
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Available Sets ({availableSets.length})</h6>
                            <button className="btn btn-sm btn-link" onClick={handleSelectAll}>Select All</button>
                        </div>
                        <div className="border rounded p-2 bg-body-tertiary" style={{ minHeight: '150px', overflowY: 'auto' }}>
                            {availableSets.length === 0 ? (
                                <p className="text-muted text-center">No computer available</p>
                            ) : (
                                <div className="d-flex flex-wrap gap-2">
                                    {availableSets.map(set => (
                                        <span
                                            key={set.id}
                                            className={`badge cursor-pointer ${set.status === 'active' ? 'bg-success opacity-75' : 'bg-info opacity-75'}`}
                                            onClick={() => handleSelect(set.id)}
                                            title="Click to select"
                                        >
                                            {set.set_name} <Plus className="ms-1" size={10} />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Operations */}
                <div className="h4">Batch Operations</div>

                <div className="container-fluid px-2 mb-4">
                    <div className="row">
                        <div className="col p-1">
                            <div className="input-group">
                                <select className="form-select" value={targetStatus} onChange={(e) => setTargetStatus(e.target.value)} disabled={!canUpdateStatus || selectedIds.length === 0}>
                                    <option value="active">Active</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                                <button className="btn btn-primary" onClick={executeUpdate} disabled={!canUpdateStatus || selectedIds.length === 0 || isSubmitting}>
                                    Apply
                                </button>
                            </div>
                            {!canUpdateStatus && <small className="text-muted">You do not have permission to update status.</small>}
                        </div>

                        {canDelete && (
                            <>
                                <div className='col-12 col-md-1 d-flex justify-content-center align-items-center'>
                                    <span>or</span>
                                </div>

                                <div className='col-12 col-md-3 p-1 d-flex justify-content-center'>
                                    <button className="btn btn-danger text-nowrap flex-fill" onClick={executeDelete} disabled={selectedIds.length === 0 || isSubmitting}>
                                        <Trash className="me-1" /> Delete Items
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </Modal.Body>
        </Modal>
    );
};

export default BatchEditSetsModal;
