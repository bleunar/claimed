import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { ExclamationTriangleFill, Laptop, HddNetwork, Trash } from 'react-bootstrap-icons';
import { getComponentIcon } from '../../utils/componentIcons';

const ComponentConflictModal = ({ show, onHide, conflictData, onResolve, onCancel, ...props }) => {
    if (!conflictData) return null;

    const { existing, currentInput } = conflictData;
    const isDisposed = !!existing.disposal_info;
    const isAssigned = !!existing.computer_set_name;

    const handleMoveWithNewData = () => {
        onResolve('use_new');
    };

    const handleMoveKeepExisting = () => {
        onResolve('keep_existing');
    };

    // Determine if we have new input data to compare
    const hasNewInput = !!currentInput;

    return (
        <Modal show={show} onHide={onCancel} centered backdrop="static" keyboard={false} {...props}>
            <Modal.Header className="bg-warning-subtle text-warning-emphasis border-bottom border-warning-subtle">
                <Modal.Title className="d-flex align-items-center gap-2 h5 mb-0">
                    <ExclamationTriangleFill />
                    Serial Number Conflict
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">

                <p className="lead fs-6 mb-3">
                    The component is already registered in the system with the following serial number: <strong className='px-2 py-1 rounded fw-bold font-monospace bg-body-tertiary'>{existing.serial_number}</strong>
                </p>

                <div className="card overflow-hidden border mb-4">
                    <div className="card-header bg-body-secondary small fw-bold">Existing Component Details</div>
                    <div className="card-body bg-body-tertiary">
                        <div className="d-flex align-items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                                {getComponentIcon(existing.component_type, '24px')}
                            </div>
                            <div>
                                <div className="fw-bold">{existing.brand_name}</div>
                                <div className="text-muted small text-capitalize">{existing.component_type}</div>
                            </div>
                            <div className="ms-auto">
                                <Badge bg={existing.status === 'good' ? 'success' : existing.status === 'bad' ? 'warning' : 'secondary'} className="text-capitalize">
                                    {existing.status}
                                </Badge>
                            </div>
                        </div>

                        {isDisposed ? (
                            <div className="mt-2 text-danger bg-danger-subtle p-2 rounded">
                                <div className="fw-bold d-flex align-items-center gap-2 mb-0">
                                    <Trash /> DISPOSED
                                </div>
                                <div className="mt-0 small">
                                    This component was marked as disposed.
                                    {existing.disposal_info?.disposal_date && ` Date: ${new Date(existing.disposal_info.disposal_date).toLocaleDateString()}`}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-1 d-flex gap-2">
                                <span className="text-muted" style={{ minWidth: '80px' }}>From:</span>
                                {isAssigned ? (
                                    <div className="d-flex align-items-center gap-1">
                                        <div className="badge bg-primary small mb-0">
                                            {existing.department_name}
                                        </div>
                                        <div className="badge bg-primary small mb-0">
                                            {existing.location_name}
                                        </div>
                                        <div className="badge bg-primary small mb-0">
                                            {existing.computer_set_name}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="fw-medium text-danger">
                                        <HddNetwork className="me-1" size={12} />
                                        Unassigned (In Storage/Rogue)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {isDisposed && (
                    <div className="alert alert-warning small mb-3">
                        <strong>Warning:</strong> Re-using a disposed component's serial number is not recommended, unless the component has been recovered.
                    </div>
                )}

                <p className="fw-medium mb-2">What would you like to do?</p>

                <div className="d-grid gap-2">
                    {/* Option 1: Move and Keep Existing Data */}
                    <Button variant="primary" onClick={handleMoveKeepExisting} className='d-flex flex-column text-start'>
                        <div className="fw-bold">{isAssigned ? 'Move Here' : 'Link Here'} (Keep Existing Data)</div>
                        <div className='small opacity-75'>Use the existing brand, status, and properties shown above</div>
                    </Button>

                    {/* Option 2: Move and Use New Data (only if we have new input) */}
                    {hasNewInput && (
                        <Button variant="outline-primary" onClick={handleMoveWithNewData} className='d-flex flex-column text-start'>
                            <div className="fw-bold">{isAssigned ? 'Move Here' : 'Link Here'} (Use New Data)</div>
                            <div className='small opacity-75'>Overwrite with: {currentInput.brand_name} ({currentInput.status})</div>
                        </Button>
                    )}

                    {/* Cancel */}
                    <Button variant='secondary' onClick={onCancel} className='mt-2'>
                        Cancel Operation
                    </Button>
                </div>

            </Modal.Body>
        </Modal>
    );
};

export default ComponentConflictModal;
