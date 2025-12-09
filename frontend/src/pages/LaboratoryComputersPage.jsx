import React, { useState, useEffect } from 'react';
import { Modal, Button, Collapse, Alert } from 'react-bootstrap';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Cpu, Mouse, Keyboard, Display, Webcam, Hdd, Tools, ThreeDots, PencilSquare, Trash, Plus, Info, Exclamation, ExclamationTriangleFill, ChevronLeft, ArrowReturnLeft, BoxArrowUpRight, Printer } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';

const CORE_COMPONENTS = [
    { label: 'System Unit', value: 'system_unit' },
    { label: 'Monitor', value: 'monitor' },
    { label: 'Keyboard', value: 'keyboard' },
    { label: 'Mouse', value: 'mouse' }
];

const COMPONENT_TYPES = [
    { label: 'CPU Unit', value: 'system_unit' },
    { label: 'Monitor', value: 'monitor' },
    { label: 'Keyboard', value: 'keyboard' },
    { label: 'Mouse', value: 'mouse' },
    { label: 'AVR', value: 'avr' },
    { label: 'Camera', value: 'web_camera' },
    { label: 'Printer', value: 'printer' },
    { label: 'Other', value: 'other' }
];

const getComponentIcon = (type) => {
    switch (type) {
        case 'system_unit': return <Cpu />;
        case 'monitor': return <Display />;
        case 'keyboard': return <Keyboard />;
        case 'mouse': return <Mouse />;
        case 'web_camera': return <Webcam />;
        case 'printer': return <Printer />;
        case 'avr': return <Tools />;
        default: return <Tools />;
    }
};

const CollapsibleActions = ({ onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="d-flex align-items-center justify-content-end">
            {/* Mobile: Always visible icons */}
            <div className="comp-mobile-actions">
                <button className="action-btn text-primary rounded-circle p-1 me-1" style={{ width: '28px', height: '28px' }} onClick={onEdit} title="Edit">
                    <PencilSquare size={14} />
                </button>
                <button className="action-btn text-danger rounded-circle p-1" style={{ width: '28px', height: '28px' }} onClick={onDelete} title="Delete">
                    <Trash size={14} />
                </button>
            </div>

            {/* Desktop: Animated Collapse */}
            <div className="comp-desktop-actions">
                <div className="d-flex align-items-center rounded bg-body">
                    <Collapse in={isExpanded} dimension="width">
                        <div>
                            <div className="d-flex align-items-center text-nowrap">
                                <button className="action-btn text-primary px-2" onClick={(e) => { e.stopPropagation(); onEdit(); setIsExpanded(false); }} title="Edit">
                                    <PencilSquare size={16} />
                                </button>
                                <button className="action-btn text-danger px-2" onClick={(e) => { e.stopPropagation(); onDelete(); setIsExpanded(false); }} title="Delete">
                                    <Trash size={16} />
                                </button>
                            </div>
                        </div>
                    </Collapse>

                    <button
                        className="action-btn desktop-trigger-btn"
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

// RBAC Helpers
const canViewSensitive = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canEditSetDetails = (user) => ['admin', 'it_head', 'lab_head'].includes(user?.role);
const canEditSetStatus = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canEditComponentDetails = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canDeleteComponent = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canAddComponent = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canEditComponentStatus = (user) => true;

const ComputerSetForm = ({ mode, editingId, initialData, laboratoryId, onSubmit, onCancel, existingTopLevelComponents, user }) => {
    const [creationMode, setCreationMode] = useState('single');
    const [formData, setFormData] = useState({
        set_name: initialData?.set_name || '',
        status: initialData?.status || 'active'
    });
    const [batchConfig, setBatchConfig] = useState({
        prefix: 'PC ',
        start_number: 1,
        count: 1
    });
    const [components, setComponents] = useState([]);

    // Initialize with Core components if creating new
    useEffect(() => {
        if (!editingId && components.length === 0) {
            const initialComponents = CORE_COMPONENTS.map(comp => ({
                component_type: comp.value,
                is_core: true,
                brand_name: '',
                serial_number: '',
                status: 'good'
            }));
            setComponents(initialComponents);
        }
    }, [editingId]);

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleBatchChange = (e) => setBatchConfig({ ...batchConfig, [e.target.name]: e.target.value });

    const handleComponentChange = (index, field, value) => {
        const newComponents = [...components];
        newComponents[index][field] = value;
        setComponents(newComponents);
    };

    const addComponent = (type = 'other', isCore = false) => {
        setComponents([...components, {
            component_type: type,
            is_core: isCore,
            brand_name: '',
            serial_number: '',
            status: 'good'
        }]);
    };

    const removeComponent = (index) => {
        const newComponents = [...components];
        newComponents.splice(index, 1);
        setComponents(newComponents);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let payload = { laboratory_id: laboratoryId };

            if (editingId) {
                payload = { ...payload, ...formData };
                await api.put(`/computer-sets/${editingId}`, payload);
            } else {
                if (creationMode === 'batch') {
                    const start = parseInt(batchConfig.start_number);
                    const end = parseInt(batchConfig.count);
                    if (start >= end) { toast.error("Start Number must be lower than End Number"); return; }
                    if (end > 67) { toast.error("End Number cannot be greater than 67"); return; }

                    payload.batch_config = { ...batchConfig, components: components };
                } else {
                    payload = { ...payload, ...formData, components: components };
                }
                await api.post('/computer-sets/', payload);
            }
            toast.success(`Computer set ${editingId ? 'updated' : 'created'} successfully`);
            onSubmit();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} computer set`);
        }
    };

    const isNameDisabled = editingId && !canEditSetDetails(user);
    const isStatusDisabled = editingId && !canEditSetStatus(user);

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-3">
                {!editingId && (
                    <ul className="nav nav-tabs mb-3">
                        <li className="nav-item"><button type="button" className={`nav-link ${creationMode === 'single' ? 'active' : ''}`} onClick={() => setCreationMode('single')}>Single Add</button></li>
                        <li className="nav-item"><button type="button" className={`nav-link ${creationMode === 'batch' ? 'active' : ''}`} onClick={() => setCreationMode('batch')}>Batch Add</button></li>
                    </ul>
                )}

                {creationMode === 'single' ? (
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <label className="form-label">Set Name</label>
                            <input type="text" className="form-control" name="set_name" value={formData.set_name} onChange={handleInputChange} required placeholder="Example: PC 01" disabled={isNameDisabled} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Status</label>
                            <select className="form-select" name="status" value={formData.status} onChange={handleInputChange} disabled={isStatusDisabled}>
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="row mb-3">
                        <div className="col-md-4"><label className="form-label">Prefix</label><input type="text" className="form-control" name="prefix" value={batchConfig.prefix} onChange={handleBatchChange} required placeholder="Example PC " /></div>
                        <div className="col-md-4"><label className="form-label">Start Number</label><input type="number" className="form-control" name="start_number" value={batchConfig.start_number} onChange={handleBatchChange} required min="1" /></div>
                        <div className="col-md-4"><label className="form-label">End Number</label><input type="number" className="form-control" name="count" value={batchConfig.count} onChange={handleBatchChange} required min="1" max="67" /></div>
                    </div>
                )}

                {!editingId && (
                    <>
                        <hr />
                        <h6 className="mb-3">Components</h6>
                        <div className="px-3">
                            {components.map((comp, index) => (
                                <div key={index} className="card mb-3 border-0">
                                    <div className="card-body p-0">
                                        <div className="row g-2 align-items-center">
                                            <div className="col-md-3">
                                                <select className="form-select form-select-sm" value={comp.component_type} onChange={(e) => handleComponentChange(index, 'component_type', e.target.value)} disabled={comp.is_core}>
                                                    <option value="" selected hidden>Select Type</option>
                                                    {COMPONENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col"><input type="text" className="form-control" placeholder="Brand" value={comp.brand_name} onChange={(e) => handleComponentChange(index, 'brand_name', e.target.value)} required /></div>
                                            {creationMode === 'single' && (
                                                <div className="col-md-4"><input type="text" className="form-control border" placeholder="Serial No." value={comp.serial_number} onChange={(e) => handleComponentChange(index, 'serial_number', e.target.value)} /></div>
                                            )}
                                            <div className="col-md-1 text-center">
                                                {!comp.is_core && (
                                                    <button type="button" className="btn btn-outline-danger border-0 w-100" title='Remove Component' onClick={() => removeComponent(index)}><Trash /></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={() => addComponent()}>Add New Component</button>
                    </>
                )}
            </div>

            <div className="modal-footer mt-3">
                <Button variant="secondary" onClick={onCancel}>Close</Button>
                {(!editingId || !isNameDisabled || !isStatusDisabled) && <Button variant="primary" type="submit">{editingId ? 'Update' : 'Create'}</Button>}
            </div>
        </form>
    );
};

const ComponentsManager = ({ set, initialComponents, laboratoryId, onClose, onUpdate, user }) => {
    const [components, setComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [originalComponents, setOriginalComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [isEditMode, setIsEditMode] = useState(false);
    const { theme } = useTheme();

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'text-success';
            case 'bad': return 'text-warning';
            case 'maintenance': return 'text-info';
            case 'missing': return 'text-danger';
            default: return 'text-secondary';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    const addNewRow = () => {
        const newComp = {
            id: `new-${Date.now()}`,
            computer_set_id: set.id,
            component_type: 'other',
            brand_name: '',
            serial_number: '',
            status: 'good',
            is_core: false
        };
        setComponents([...components, newComp]);
        setIsEditMode(true);
    };

    const handleLocalChange = (id, field, value) => {
        const newComponents = components.map(c => c.id === id ? { ...c, [field]: value } : c);
        setComponents(newComponents);
    };

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

    const handleSave = async () => {
        const promises = [];
        let changesCount = 0;
        let conflictFoundAndCancelled = false;

        try {
            for (const comp of components) {
                if (conflictFoundAndCancelled) break;

                if (comp.id.toString().startsWith('new-')) {
                    if (!comp.brand_name) {
                        toast.error(`Brand name is required for new ${comp.component_type} component`);
                        throw new Error("Validation Error");
                    }

                    // CHECK SERIAL CONFLICT
                    let targetId = null;

                    if (comp.serial_number) {
                        const check = await api.get(`/components/check-serial?serial_number=${encodeURIComponent(comp.serial_number)}`);
                        if (check.data.exists) {
                            const existing = check.data.component;
                            let msg = `Serial Number "${comp.serial_number}" is already currently used by a ${existing.component_type} (${existing.brand_name}).\n\n`;

                            if (existing.computer_set) {
                                msg += `It is currently assigned to "${existing.computer_set.set_name}" in "${existing.laboratory.name}".\n`;
                            } else {
                                msg += `It is currently a ROGUE component (Unassigned).\n`;
                            }
                            msg += `\nDo you want to MOVE/UPDATE that component to this computer set?`;

                            if (await showConfirm("Serial Number Conflict", msg)) {
                                targetId = existing.id;
                            } else {
                                conflictFoundAndCancelled = true;
                                break;
                            }
                        }
                    }

                    const isCore = ['system_unit', 'monitor', 'keyboard', 'mouse'].includes(comp.component_type);
                    changesCount++;

                    if (targetId) {
                        // MERGE/MOVE existing component
                        promises.push(
                            api.put(`/components/${targetId}`, {
                                computer_set_id: set.id,
                                laboratory_id: laboratoryId,
                                component_type: comp.component_type,
                                brand_name: comp.brand_name,
                                serial_number: comp.serial_number,
                                is_core: isCore,
                                status: comp.status
                            })
                        );
                    } else {
                        // CREATE normally
                        promises.push(
                            api.post('/components/', {
                                computer_set_id: set.id,
                                component_type: comp.component_type,
                                brand_name: comp.brand_name,
                                serial_number: comp.serial_number,
                                is_core: isCore,
                                laboratory_id: laboratoryId,
                                status: comp.status
                            })
                        );
                    }

                } else {
                    // 2. Existing Component Update
                    const original = originalComponents.find(o => o.id === comp.id);
                    if (original) {
                        let isDirty = false;
                        if (original.brand_name !== comp.brand_name || original.serial_number !== comp.serial_number || original.status !== comp.status || original.component_type !== comp.component_type) {
                            isDirty = true;
                        }

                        if (isDirty) {
                            if (comp.serial_number && comp.serial_number !== original.serial_number) {
                                const check = await api.get(`/components/check-serial?serial_number=${encodeURIComponent(comp.serial_number)}`);
                                if (check.data.exists && check.data.component.id !== comp.id) {
                                    const existing = check.data.component;
                                    let msg = `By changing the serial number to "${comp.serial_number}", you are referencing a component that ALREADY EXISTS.\n\n`;
                                    msg += `Existing: ${existing.component_type} (${existing.brand_name})\n`;
                                    msg += `Location: ${existing.computer_set ? existing.computer_set.set_name : 'Unassigned'}\n\n`;
                                    msg += `Do you want to MOVE that component here instead (replacing the current one)?`;

                                    if (await showConfirm("Confirm Move", msg)) {
                                        changesCount++;
                                        promises.push(api.put(`/components/${comp.id}`, { ...comp, computer_set_id: null })); // Unlink current
                                        promises.push(api.put(`/components/${existing.id}`, {
                                            ...existing,
                                            computer_set_id: set.id,
                                            laboratory_id: laboratoryId,
                                            component_type: comp.component_type,
                                            brand_name: comp.brand_name,
                                            status: comp.status
                                        }));
                                        continue;
                                    } else {
                                        conflictFoundAndCancelled = true;
                                        break;
                                    }
                                }
                            }

                            changesCount++;
                            promises.push(api.put(`/components/${comp.id}`, comp));
                        }
                    }
                }
            }

            if (conflictFoundAndCancelled) {
                toast("Save cancelled.");
                return;
            }

            if (changesCount === 0) {
                toast("No changes to save");
                setIsEditMode(false);
                return;
            }

            await Promise.all(promises);
            toast.success(`Updated components successfully`);
            setOriginalComponents(JSON.parse(JSON.stringify(components)));
            onUpdate(); // Refresh parent data
            setIsEditMode(false);

        } catch (err) {
            if (err.message !== "Validation Error") {
                console.error(err);
                toast.error("Failed to save changes. " + (err.response?.data?.msg || ""));
            }
        }
    };

    const handleRemove = async (comp) => {
        if (comp.id.toString().startsWith('new-')) {
            const updated = components.filter(c => c.id !== comp.id);
            setComponents(updated);
            return;
        }

        if (await showConfirm("Confirm Delete", "Permanently DELETE this component?\n\nThis cannot be undone.")) {
            try {
                await api.delete(`/components/${comp.id}`);
                const updated = components.filter(c => c.id !== comp.id);
                setComponents(updated);
                setOriginalComponents(originalComponents.filter(c => c.id !== comp.id));
                toast.success("Component deleted");
                onUpdate();
            } catch (err) {
                toast.error("Failed to delete component");
            }
        }
    };

    const handleUnlink = async (comp) => {
        if (comp.id.toString().startsWith('new-')) {
            const updated = components.filter(c => c.id !== comp.id);
            setComponents(updated);
            return;
        }

        if (await showConfirm("Confirm Unlink", "Unlink this component?\n\nIt will be moved to the 'Unassigned' list.")) {
            try {
                // We update the component to have NULL computer_set_id
                await api.put(`/components/${comp.id}`, {
                    ...comp,
                    computer_set_id: null
                });

                const updated = components.filter(c => c.id !== comp.id);
                setComponents(updated);
                setOriginalComponents(originalComponents.filter(c => c.id !== comp.id));
                toast.success("Component unlinked");
                onUpdate();
            } catch (err) {
                toast.error("Failed to unlink component");
            }
        }
    }

    return (
        <>
            <div className="p-3">
                <div className="mb-3 d-flex flex-column align-items-center">
                    <h5 className="mb-1 text-center">{set.set_name}</h5>
                    <span className={`badge text-center text-${theme == "light" ? "light" : "dark"} text-capitalize ${set.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                        {set.status}
                    </span>
                </div>
                {
                    components.length > 0 && components.map((comp) => (
                        <div key={comp.id} className="d-flex align-items-center mb-3">
                            <div className={`container-fluid flex-fill rounded p-2 ${!isEditMode ? (comp.status === 'good' ? 'bg-success-subtle' : comp.status === 'bad' ? 'bg-warning-subtle' : comp.status === 'maintenance' ? 'bg-info-subtle' : 'bg-danger-subtle') : ''}`}>
                                <div className="row align-items-center">
                                    {/* Icon/Type */}
                                    {
                                        isEditMode && canEditComponentDetails(user) ? (
                                            <div className="col-12 col-md-3 p-1">
                                                <select
                                                    className={`form-select ${comp.is_core ? "remove-arrow-select-input " : ""} border form-select-sm p-1 bg-transparent`}
                                                    value={comp.component_type}
                                                    onChange={(e) => handleLocalChange(comp.id, 'component_type', e.target.value)}
                                                    disabled={comp.is_core}
                                                >
                                                    {COMPONENT_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <div className="col-1 d-flex justify-content-center align-items-center" title={comp.component_type}>
                                                <div className="p-1 px-2 rounded text-center bg-body-secondary">
                                                    <span>{getComponentIcon(comp.component_type)}</span>
                                                </div>
                                            </div>
                                        )
                                    }

                                    {/* Brand Name */}
                                    {
                                        isEditMode && canEditComponentDetails(user) ? (
                                            <div className="col-12 col-md-3 p-1">
                                                <input type="text" className="form-control form-control-sm p-1 bg-transparent p-0" value={comp.brand_name} onChange={(e) => handleLocalChange(comp.id, 'brand_name', e.target.value)} placeholder="Brand Name" />
                                            </div>
                                        ) : (
                                            <div className="col p-1 d-flex align-items-center">
                                                <span className="fw-bold me-1">{comp.brand_name}</span>
                                                <button className="btn btn-link p-0 text-muted" onClick={() => copyToClipboard(comp.brand_name)} title="Copy Brand">
                                                    <i className="bi bi-clipboard" style={{ fontSize: '0.8rem' }}></i>
                                                    <ArrowReturnLeft size={10} className="d-none" />
                                                </button>
                                            </div>
                                        )
                                    }

                                    {/* Serial Number */}
                                    {
                                        isEditMode && canEditComponentDetails(user) ? (
                                            <div className="col-12 col-md-3 p-1">
                                                <input type="text" className="form-control form-control-sm p-1 bg-transparent p-0" value={comp.serial_number} placeholder="Serial Number" onChange={(e) => handleLocalChange(comp.id, 'serial_number', e.target.value)} />
                                            </div>
                                        ) : (
                                            <div className="col p-1 d-flex align-items-center">
                                                <span className="p-1 px-2 bg-body-secondary rounded me-1 text-truncate" style={{ maxWidth: '150px' }}>
                                                    {comp.serial_number || <span className="text-muted fst-italic">No S/N</span>}
                                                </span>
                                                {comp.serial_number && (
                                                    <button className="btn btn-link p-0 text-muted" onClick={() => copyToClipboard(comp.serial_number)} title="Copy Serial">
                                                        <i className="bi bi-clipboard" style={{ fontSize: '0.8rem' }}></i>
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    }

                                    {/* Status */}
                                    <div className="col p-1">
                                        {
                                            isEditMode && canEditComponentStatus(user) ? (
                                                <select className={`form-select form-select-sm border bg-transparent p-1 ${getStatusColor(comp.status)}`} value={comp.status} onChange={(e) => handleLocalChange(comp.id, 'status', e.target.value)}>
                                                    <option value="good">Good</option><option value="bad">Bad</option><option value="maintenance">Maintenance</option><option value="missing">Missing</option>
                                                </select>
                                            ) : (
                                                <span className={`badge ${comp.status === 'good' ? 'bg-success' : comp.status === 'bad' ? 'bg-warning' : comp.status === 'maintenance' ? 'bg-info' : 'bg-danger'}`}>{comp.status}</span>
                                            )
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="w-fit h-full gap-1 d-flex ps-2">
                                {isEditMode ? (
                                    <>
                                        {canEditComponentDetails(user) && (
                                            <button className="btn btn-sm btn-outline-warning border-0" title='Unlink (Move to Unassigned)' onClick={() => handleUnlink(comp)}>
                                                <BoxArrowUpRight />
                                            </button>
                                        )}
                                        {!comp.is_core && canDeleteComponent(user) && (
                                            <button className="btn btn-sm btn-outline-danger border-0" title='Permanent Delete' onClick={() => handleRemove(comp)}>
                                                <Trash />
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button className="btn btn-sm btn-outline-secondary border-0" title='Flag Issue'>
                                        <ExclamationTriangleFill />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                }

                {components.length === 0 && (
                    <div className="row">
                        <div className="text-center text-muted">No components found.</div>
                    </div>
                )}
            </div>

            {/* Modal Confirmation */}
            <Modal show={confirmModal.show} onHide={() => handleConfirmResult(false)} centered size="sm">
                <Modal.Header closeButton>
                    <Modal.Title>{confirmModal.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ whiteSpace: 'pre-line' }}>{confirmModal.message}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => handleConfirmResult(false)}>Cancel</Button>
                    <Button variant="primary" onClick={() => handleConfirmResult(true)}>Confirm</Button>
                </Modal.Footer>
            </Modal>

            <div className="modal-footer border-0 d-flex justify-content-between">
                <div className="d-flex gap-2">
                    {/* Edit Mode Toggle */}
                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        isEditMode ? (
                            <>
                                <button className="btn btn-primary btn-sm" onClick={() => setIsEditMode(false)} title="Exit Edit Mode">
                                    <PencilSquare className="me-1" /> View Mode
                                </button>
                                {canAddComponent(user) && (
                                    <button className="btn btn-outline-secondary btn-sm" onClick={addNewRow} title="Add New Component">
                                        <Plus className="me-1" /> Add Component
                                    </button>
                                )}
                            </>
                        ) : (
                            <button className="btn btn-outline-primary btn-sm" onClick={() => setIsEditMode(true)} title="Enter Edit Mode">
                                <PencilSquare className="me-1" /> Edit Mode
                            </button>
                        )
                    )}
                </div>
                <div className="d-flex gap-2">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        isEditMode ? (
                            <Button variant="success" onClick={handleSave}>Save Changes</Button>
                        ) : (
                            <Button variant="primary" onClick={handleSave}>Save Updates</Button>
                        )
                    )}
                </div>
            </div>
        </>
    );
};

const ComputerSetCard = ({ set, components, user, onView, onEdit, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Helper explicitly inside or global? Using global `getComponentIcon`
    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'text-success';
            case 'bad': return 'text-warning';
            case 'maintenance': return 'text-info';
            case 'missing': return 'text-danger';
            default: return 'text-secondary';
        }
    }

    const canEdit = canEditSetDetails(user) || canEditSetStatus(user);
    const canDelete = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    return (
        <div className="col p-1">
            <div
                className={`card h-100 position-relative overflow-hidden shadow-sm hover-shadow ${set.status === 'active' ? 'bg-success-subtle' : 'bg-warning-subtle'}`}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onView(set)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowMobilePreview(false); }}
            >
                <div className="card-body text-center d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '150px' }}>
                    <h5 className="card-title fw-bold mb-0">{set.set_name}</h5>
                    <div className="d-flex gap-1">
                        <span className={`badge text-capitalize ${set.status === 'active' ? 'bg-success' : 'bg-warning'} mt-2`}>
                            {set.status}
                        </span>
                    </div>

                    {/* Hover/Preview Overlay */}
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 p-3 d-flex flex-wrap align-items-center justify-content-center"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            opacity: (isHovered || showMobilePreview) ? 1 : 0,
                            transition: 'opacity 0.3s',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}
                    >
                        <div className='d-flex flex-wrap justify-content-center'>
                            {components.map(comp => (
                                <div key={comp.id} className={`m-1 fs-6 ${getStatusColor(comp.status)}`} title={`${comp.brand_name} (${comp.status})`}>
                                    {getComponentIcon(comp.component_type)}
                                </div>
                            ))}
                        </div>
                        {components.length === 0 && <span className="text-muted small">No components</span>}
                    </div>
                </div>

                {/* Collapsible Action Bar */}
                {(canEdit || canDelete) && (
                    <div className="position-absolute top-0 end-0 p-2 z-20 computer-set-actions" style={{ zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
                        <style>
                            {`
                                    .action-btn { background: none; border: none; padding: 4px; cursor: pointer; transition: color 0.2s; display: flex; align-items: center; justify-content: center; }
                                    .action-btn:hover { opacity: 0.7; }
                                    @media (max-width: 767.98px) {
                                        .comp-mobile-actions { display: flex; gap: 4px; border-radius: 4px; padding: 2px; }
                                        .comp-desktop-actions { display: none; }
                                    }
                                    @media (min-width: 768px) {
                                        .comp-mobile-actions { display: none; }
                                        .comp-desktop-actions { display: block; }
                                        .card:not(:hover) .desktop-trigger-btn { opacity: 1; }
                                        .desktop-trigger-btn { transition: opacity 0.2s; }
                                    }
                                `}
                        </style>
                        <CollapsibleActions
                            onEdit={canEdit ? () => onEdit(set) : undefined}
                            onDelete={canDelete ? () => onDelete(set.id) : undefined}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const LaboratoryComputersPage = () => {
    const { id: laboratoryId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const [computerSets, setComputerSets] = useState([]);
    const [laboratory, setLaboratory] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI Logic States only
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState('create'); // 'create', 'edit', 'view'
    const [selectedSet, setSelectedSet] = useState(null);
    const [allComponents, setAllComponents] = useState([]); // Kept for Card counts

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
            const [labRes, setsRes, compsRes] = await Promise.all([
                api.get(`/laboratories/${laboratoryId}`),
                api.get(`/computer-sets/?laboratory_id=${laboratoryId}`),
                api.get(`/components/?laboratory_id=${laboratoryId}`)
            ]);
            setLaboratory(labRes.data);
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
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this computer set?")) return;
        try {
            await api.delete(`/computer-sets/${id}`);
            toast.success("Computer set deleted successfully");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to delete computer set");
        }
    };

    const handleFormSubmit = () => {
        setShowModal(false);
        fetchData();
    };


    if (loading) return <LoadingSpinner centered />;
    if (!laboratory) return <div className="container py-3">Laboratory not found</div>;

    return (
        <div className="container py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h4 className='h4 mb-0'>Computer Sets ({laboratory.name})</h4>
                </div>
                {canManage &&
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <div className="d-inline d-md-none"><Plus /></div>
                        <span className='d-none d-md-inline'>New Computer Set</span>
                    </button>}
            </div>

            <div className="row row-cols-2 row-cols-xs-3 row-cols-md-4 row-cols-lg-5">
                {computerSets.map(set => (
                    <ComputerSetCard
                        key={set.id}
                        set={set}
                        components={getSetComponents(set.id)}
                        user={user}
                        onView={handleViewComponents}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
            {computerSets.length === 0 && <div className="text-center text-muted"><p>No computer sets found in this laboratory.</p></div>}

            <Modal className='pb-5' show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {mode === 'view' ? "Computer Components" : (mode === 'edit' ? 'Edit Computer Set' : 'New Computer Set')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className='p-0'>
                    {mode === 'view' && selectedSet ? (
                        <ComponentsManager
                            set={selectedSet}
                            initialComponents={getSetComponents(selectedSet.id)}
                            laboratoryId={laboratoryId}
                            onClose={() => setShowModal(false)}
                            onUpdate={fetchData}
                            user={user}
                        />
                    ) : (
                        <ComputerSetForm
                            mode={mode}
                            editingId={selectedSet?.id}
                            initialData={selectedSet}
                            laboratoryId={laboratoryId}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setShowModal(false)}
                            user={user}
                        />
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default LaboratoryComputersPage;
