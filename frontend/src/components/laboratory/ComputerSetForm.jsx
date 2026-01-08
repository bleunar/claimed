import React, { useState, useEffect } from 'react';
import { Modal, Button, Nav, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import { Trash, ListUl } from 'react-bootstrap-icons';
import KeyValueEditor from '../common/KeyValueEditor';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { CORE_COMPONENTS, COMPONENT_TYPES, getLabelByValue, getDefaultPropertiesForType } from '../../utils/componentTypes';
import ComponentConflictModal from '../modals/ComponentConflictModal';


// RBAC Helpers
const canEditSetDetails = (user) => ['admin', 'it_head', 'lab_head'].includes(user?.role);
const canEditSetStatus = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);

const ComputerSetForm = ({ mode, editingId, initialData, locationId, locationName, onSubmit, onCancel, existingTopLevelComponents, user, showConfirm }) => {
    const [creationMode, setCreationMode] = useState('single');
    const [formData, setFormData] = useState({
        set_name: initialData?.set_name || '',
        status: initialData?.status || 'active'
    });
    const [batchConfig, setBatchConfig] = useState({
        prefix: 'PC ',
        start_number: 1,
        count: 10
    });
    const [components, setComponents] = useState([]);
    const [propModal, setPropModal] = useState({ show: false, index: null, mode: 'view', valid: true });

    const [conflictModal, setConflictModal] = useState({ show: false, data: null, index: null });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize with Core components if creating new
    useEffect(() => {
        if (!editingId && components.length === 0) {
            const initialComponents = CORE_COMPONENTS.map(comp => ({
                component_type: comp.value,
                is_core: true,
                brand_name: '',
                serial_number: '',
                status: 'good',
                properties: getDefaultPropertiesForType(comp.value)
            }));
            setComponents(initialComponents);
        }
    }, [editingId]);

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleBatchChange = (e) => {
        const { name, value } = e.target;
        setBatchConfig({ ...batchConfig, [name]: value });
    };

    // Calculate if there's a batch range error
    const batchRangeError = (() => {
        const start = parseInt(batchConfig.start_number);
        const end = parseInt(batchConfig.count);
        if (!isNaN(start) && !isNaN(end) && start > end) {
            return "Start Number must be less than End Number";
        }
        return null;
    })();

    const handleComponentChange = (index, field, value) => {
        const newComponents = [...components];
        newComponents[index][field] = value;
        setComponents(newComponents);
    };

    const handleComponentPropertiesChange = (index, newProps) => {
        const newComponents = [...components];
        newComponents[index].properties = newProps;
        setComponents(newComponents);
    };

    const addComponent = (type = 'other', isCore = false) => {
        setComponents([...components, {
            component_type: type,
            is_core: isCore,
            brand_name: '',
            serial_number: '',
            status: 'good',
            properties: getDefaultPropertiesForType(type)
        }]);
    };

    const removeComponent = (index) => {
        const newComponents = [...components];
        newComponents.splice(index, 1);
        setComponents(newComponents);
    };


    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            let payload = { location_id: locationId };
            let componentsToMove = [];
            let finalComponents = [...components];

            // Serial Conflict Check for Single Creation Mode
            if (!editingId && creationMode === 'single') {
                for (let i = 0; i < components.length; i++) {
                    const comp = components[i];

                    // If already resolved (marked as existing), skip check and add to move list
                    if (comp._useExisting) {
                        componentsToMove.push(comp);
                        finalComponents[i] = { ...comp, _skip_opt: true };
                        continue;
                    }

                    if (comp.serial_number && comp.serial_number.trim()) {
                        const checkRes = await api.get(`/components/check-serial?serial_number=${encodeURIComponent(comp.serial_number.trim())}`);
                        if (checkRes.data.exists) {
                            const existing = checkRes.data.component;

                            // Department check for department-specific roles
                            const isDeptRole = ['department_head', 'lab_head'].includes(user?.role);
                            if (isDeptRole && existing.department_id && existing.department_id !== user?.department_id) {
                                toast.error(`Component "${existing.brand_name}" (${existing.serial_number}) belongs to another department (${existing.department_name || 'Unknown'}). You can only use components from your department.`);
                                setIsSubmitting(false);
                                return;
                            }

                            setConflictModal({
                                show: true,
                                data: { existing, currentInput: comp },
                                index: i
                            });
                            setIsSubmitting(false);
                            return;
                        }
                    }
                }
                // Filter out skipped components
                finalComponents = finalComponents.filter(c => !c._skip_opt);
            }

            if (editingId) {
                payload = { ...payload, ...formData };
                await api.put(`/computer-sets/${editingId}`, payload);
            } else {
                if (creationMode === 'batch') {
                    const start = parseInt(batchConfig.start_number);
                    const endNumber = parseInt(batchConfig.count);

                    if (start > endNumber) { setIsSubmitting(false); return; }
                    if (endNumber > 67) { toast.error("End Number cannot be greater than 67"); setIsSubmitting(false); return; }

                    const quantity = endNumber - start + 1;
                    if (quantity <= 0) { setIsSubmitting(false); return; }

                    payload.batch_config = {
                        ...batchConfig,
                        count: quantity,
                        components: components
                    };
                } else {
                    payload = { ...payload, ...formData, components: finalComponents };
                }

                const res = await api.post('/computer-sets/', payload);
                const newSetId = res.data.id;

                // Process Moves if any
                if (componentsToMove.length > 0 && newSetId) {
                    try {
                        await Promise.all(componentsToMove.map(existingComp =>
                            api.put(`/components/${existingComp.id}`, { ...existingComp, computer_set_id: newSetId })
                        ));
                        toast.success(`Successfully moved ${componentsToMove.length} existing component(s) to the new set.`);
                    } catch (moveErr) {
                        console.error("Failed to move components", moveErr);
                        toast.error("Computer set created, but failed to move some existing components.");
                    }
                }
            }
            toast.success(`Computer set ${editingId ? 'updated' : 'created'} successfully`);
            onSubmit();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} computer set`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConflictResolve = () => {
        const { index, data } = conflictModal;
        const existing = data.existing;
        const newComponents = [...components];

        // Mark as existing and use existing ID
        // We preserve properties from the Form if needed, or take existing?
        // Let's assume we maintain what was in the form but attach the ID, 
        // effectively saying "Update this existing component with these new details + new set location"
        // Wait, 'componentsToMove' logic in handleSubmit moves the component.
        // But DOES NOT update its properties (brand, etc.) unless we include them in the PUT payload.
        // The loop at line 160: api.put(`/components/${existingComp.id}`, { ...existingComp, computer_set_id: newSetId })
        // It uses `existingComp` which currently (in my Refactor) comes from `componentsToMove`.
        // In my refactor, `componentsToMove` gets `comp` (which is `newComponents[index]`).

        // So I should ensure `newComponents[index]` has the `id` AND the desired properties.
        newComponents[index] = {
            ...newComponents[index], // Form values
            id: existing.id,
            _useExisting: true,
            // Maybe we should warn user if Brand/Model mismatch?
            // The modal shows "Existing Component Details".
            // If user clicks "Move Here", they probably imply "This IS that component".
            // So we should probably prefer Existing data for core fields to avoid accidental rename?
            // Or maybe they are correcting the Brand name?
            // Let's stick to Form Data taking precedence, but ensuring ID is set.
        };

        setComponents(newComponents);
        setConflictModal({ show: false, data: null, index: null });

        // Auto-retry submit
        setTimeout(() => handleSubmit(), 0);
    };

    const isNameDisabled = editingId && !canEditSetDetails(user);
    const isStatusDisabled = editingId && !canEditSetStatus(user);

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-3">
                <div className="d-flex justify-content-start">
                    {!editingId && (
                        <ToggleButtonGroup
                            type="radio"
                            name="creationModeOptions"
                            className="mb-2"
                            value={creationMode}
                            onChange={(val) => setCreationMode(val)}
                        >
                            <ToggleButton
                                id="tbg-radio-single"
                                value="single"
                                variant="outline-primary"
                            >
                                Single
                            </ToggleButton>
                            <ToggleButton
                                id="tbg-radio-batch"
                                value="batch"
                                variant="outline-primary"
                            >
                                Multiple
                            </ToggleButton>

                        </ToggleButtonGroup>
                    )}
                </div>

                <div className="mb-5 mt-4">
                    <div className="h4 mb-2">Computer Information</div>
                    <hr />
                    <div className="px-2">
                        {creationMode === 'single' ? (
                            <div className="row">
                                <div className="col-sm-6 p-2">
                                    <label className="form-label">Set Name</label>
                                    <input type="text" className="form-control" name="set_name" value={formData.set_name} onChange={handleInputChange} required placeholder="PC X" disabled={isNameDisabled} maxLength={32} />
                                </div>
                                <div className="col-sm-6 p-2">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" name="status" value={formData.status} onChange={handleInputChange} disabled={isStatusDisabled}>
                                        <option value="active">Operational</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="row">
                                <div className="col-12 col-md-4 p-2"><label className="form-label">Prefix Name</label><input type="text" className="form-control" name="prefix" value={batchConfig.prefix} onChange={handleBatchChange} required placeholder="PC " /></div>
                                <div className="col-6 col-md-4 p-2">
                                    <label className="form-label">Start Number</label>
                                    <input type="number" className={`form-control ${batchRangeError ? 'is-invalid' : ''}`} name="start_number" value={batchConfig.start_number} onChange={handleBatchChange} required min="1" />
                                </div>
                                <div className="col-6 col-md-4 p-2"><label className="form-label">End Number</label><input type="number" className="form-control" name="count" value={batchConfig.count} onChange={handleBatchChange} required min="1" max="67" /></div>
                                {batchRangeError ? (
                                    // Added 'd-block' or style to ensure feedback is visible if input doesn't have 'is-invalid' class
                                    <div className="invalid-feedback d-block">
                                        {batchRangeError}
                                    </div>
                                ) : (
                                    (() => {
                                        const prefix = batchConfig.prefix || '';
                                        const start = parseInt(batchConfig.start_number) || 0;
                                        const end = parseInt(batchConfig.count) || 0;

                                        if (start > 0 && end >= start) {
                                            const count = end - start + 1;
                                            let previewText = '';

                                            if (count <= 6) {
                                                // List all
                                                const names = [];
                                                for (let i = start; i <= end; i++) {
                                                    names.push(`${prefix}${i}`);
                                                }
                                                previewText = names.join(', ');
                                            } else {
                                                // Show first 3 ... last 2
                                                const first3 = [];
                                                for (let i = 0; i < 3; i++) {
                                                    first3.push(`${prefix}${start + i}`);
                                                }

                                                const last2 = [];
                                                // Loop to get end-1 and end
                                                for (let i = 1; i >= 0; i--) {
                                                    last2.push(`${prefix}${end - i}`);
                                                }

                                                previewText = `${first3.join(', ')}, ..., ${last2.join(', ')}`;
                                            }

                                            return (
                                                <div className="col-12 p-2">
                                                    <div className="form-text text-muted">
                                                        Computer sets <strong>{previewText}</strong> will be created on <strong>{locationName || 'this location'}</strong>.
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {
                    !editingId && (
                        <>
                            <div className="h4 mb-2">Computer Components</div>
                            <hr />

                            <div className="container-fluid px-0">
                                {components.map((comp, index) => (
                                    <div key={index} className="card mb-3 border-0 bg-body-secondary p-2">
                                        <div className="card-body p-2">
                                            <div className="row g-2 align-items-center">
                                                <div className="col-lg-3">
                                                    <select className="form-select form-select-sm" value={comp.component_type} onChange={(e) => handleComponentChange(index, 'component_type', e.target.value)} disabled={comp.is_core}>
                                                        <option value="" hidden>Select Type</option>
                                                        {COMPONENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                                                    </select>
                                                </div>

                                                <div className={creationMode == "single" ? "col-lg-7" : "col"}>
                                                    <div className="d-flex gap-2">
                                                        <input type="text" className="form-control flex-fill bg-body" placeholder="Brand/Model" value={comp.brand_name} onChange={(e) => handleComponentChange(index, 'brand_name', e.target.value)} required />
                                                        {
                                                            creationMode == "single" && (
                                                                <input type="text" className="form-control flex-fill bg-body" placeholder="Serial No." value={comp.serial_number} onChange={(e) => handleComponentChange(index, 'serial_number', e.target.value)} />
                                                            )
                                                        }
                                                    </div>
                                                </div>

                                                <div className={creationMode == "single" ? "col" : "col-lg-2"}>
                                                    <div className="d-flex justify-content-between gap-2 rounded">
                                                        <button type="button" className={`btn btn-outline-primary bg-body flex-fill text-body border`} title='Component Properties' onClick={() => setPropModal({ show: true, index: index })}>
                                                            <ListUl /> <span className='d-inline d-lg-none small'>Properties</span>
                                                        </button>
                                                        {
                                                            (!comp.is_core) && (
                                                                <button type="button" className="btn btn-outline-danger bg-body flex-fill border" title='Remove Component' onClick={() => removeComponent(index)}><Trash /> <span className='d-inline d-lg-none small'>Delete</span></button>
                                                            )
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>


                            <div className="text-end">
                                <button type="button" className="btn btn-link btn-sm" onClick={() => addComponent()}>Add New Component</button>
                            </div>
                        </>
                    )
                }
            </div>



            {/* Properties Modal for Creation Form */}
            <Modal show={propModal.show} onHide={() => setPropModal({ ...propModal, show: false })} centered style={{ zIndex: 1260 }} backdrop="static" backdropClassName="stacked-modal-backdrop">
                <Modal.Header closeButton>
                    <div>
                        <div className="h5 mb-0">{propModal.mode === 'edit' ? 'Edit Properties' : 'View Properties'}</div>
                        {propModal.index !== null && components[propModal.index] && (
                            <div className="text-muted small">{components[propModal.index].brand_name || getLabelByValue(components[propModal.index].component_type)}</div>
                        )}
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {propModal.index !== null && components[propModal.index] && (
                        <>
                            {creationMode === 'batch' && <div className="alert alert-info small">Properties defined here will be applied on <strong>all</strong> components of this type. <br /><br /> Only fill up values of property that can be applied on all computer sets of this component</div>}
                            <KeyValueEditor
                                properties={components[propModal.index].properties || {}}
                                onChange={(newProps) => handleComponentPropertiesChange(propModal.index, newProps)}
                                readOnly={propModal.mode === 'view'}
                                setPropertiesModal={(key, value) => setPropModal({ ...propModal, [key]: value })}
                                componentType={components[propModal.index].component_type}
                            />
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-end">
                    {propModal.mode === 'edit' ? (
                        <Button
                            variant="primary"
                            onClick={() => setPropModal({ ...propModal, mode: 'view' })}
                            disabled={propModal.valid === false}
                        >
                            Save
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setPropModal({ ...propModal, show: false })}>Close</Button>
                    )}
                </Modal.Footer>
            </Modal>

            <div className="modal-footer mt-3">
                <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Close</Button>
                {(!editingId || !isNameDisabled || !isStatusDisabled) && (
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>{editingId ? 'Updating...' : 'Creating...'}</> : (editingId ? 'Update' : 'Create')}
                    </Button>
                )}
            </div>
            {/* Conflict Modal */}
            <ComponentConflictModal
                show={conflictModal.show}
                onHide={() => setConflictModal({ ...conflictModal, show: false })}
                conflictData={conflictModal.data}
                onResolve={handleConflictResolve}
                onCancel={() => setConflictModal({ ...conflictModal, show: false })}
            />
        </form >
    );
};

export default ComputerSetForm;
