import React, { useState, useEffect } from 'react';
import { Modal, Button, Collapse, Alert, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Pc, Mouse, Keyboard, Display, Webcam, Hdd, Tools, ThreeDots, PencilSquare, Trash, Plus, Info, Exclamation, ExclamationTriangleFill, ChevronLeft, ArrowReturnLeft, BoxArrowUpRight, Printer, Headphones, CircleFill, Copy, CheckCircle, XCircle, XCircleFill, CheckCircleFill, QuestionCircle, Check, Check2, Question, QuestionLg, XLg, Flag, ArrowDownUp, ArrowUp, ArrowDown } from 'react-bootstrap-icons';
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
    { label: 'Headset', value: 'headset' },
    { label: 'Others', value: 'other' }
];

const getLabelByValue = (value) => {
    const component = COMPONENT_TYPES.find(type => type.value === value);
    return component ? component.label : 'Unknown Component';
};

const getComponentIcon = (type) => {
    switch (type) {
        case 'system_unit': return <Pc />;
        case 'monitor': return <Display />;
        case 'keyboard': return <Keyboard />;
        case 'mouse': return <Mouse />;
        case 'web_camera': return <Webcam />;
        case 'printer': return <Printer />;
        case 'headset': return <Headphones />;
        case 'avr': return <Tools />;
        default: return <Tools />;
    }
}


const ReportIssueModal = ({ show, onHide, target, type, user, onSubmit }) => {
    const isAdvancedUser = ['admin', 'it_head', 'lab_head'].includes(user?.role);
    const [formData, setFormData] = useState({ title: '', description: '', priority: 'low' });

    useEffect(() => {
        if (show) setFormData({ title: '', description: '', priority: 'low' });
    }, [show]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const TITLES = ["Broken/Damaged", "Missing", "Not Working", "Software Issue", "Other"];

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Report Issue: {type === 'set' ? target?.set_name : target?.brand_name}</Modal.Title>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className="mb-3">
                        <label className="form-label">Issue</label>
                        {isAdvancedUser ? (
                            <input type="text" className="form-control" name="title" value={formData.title} onChange={handleChange} required placeholder="Brief title of the issue" />
                        ) : (
                            <select className="form-select" name="title" value={formData.title} onChange={handleChange} required>
                                <option value="">Select Issue...</option>
                                {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Description {isAdvancedUser ? '(Required)' : '(Optional)'}</label>
                        <textarea className="form-control" name="description" value={formData.description} onChange={handleChange} rows="3" required={isAdvancedUser} placeholder="Provide more details..."></textarea>
                    </div>
                    {isAdvancedUser && (
                        <div className="mb-3">
                            <label className="form-label">Priority</label>
                            <select className="form-select" name="priority" value={formData.priority} onChange={handleChange}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="danger" type="submit">Report Issue</Button>
                </Modal.Footer>
            </form>
        </Modal>
    );
};



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
        if (!confirm(`Are you sure you want to update status for ${selectedIds.length} sets?`)) return;

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
                            <button className="btn btn-sm btn-link" onClick={handleSelectAll}>Select All Remaining</button>
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
        count: 10
    });
    const [components, setComponents] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

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
        setIsSubmitting(true);
        try {
            let payload = { laboratory_id: laboratoryId };

            if (editingId) {
                payload = { ...payload, ...formData };
                await api.put(`/computer-sets/${editingId}`, payload);
            } else {
                if (creationMode === 'batch') {
                    const start = parseInt(batchConfig.start_number);
                    const endNumber = parseInt(batchConfig.count); // UI field is 'End Number' but state key is 'count'

                    if (start > endNumber) { toast.error("Start Number must be lower than or equal to End Number"); setIsSubmitting(false); return; }
                    if (endNumber > 67) { toast.error("End Number cannot be greater than 67"); setIsSubmitting(false); return; }

                    const quantity = endNumber - start + 1;
                    if (quantity <= 0) { toast.error("Invalid range"); setIsSubmitting(false); return; }

                    payload.batch_config = {
                        ...batchConfig,
                        count: quantity, // Send calculated quantity, not the end number
                        components: components
                    };
                } else {
                    payload = { ...payload, ...formData, components: components };
                }
                await api.post('/computer-sets/', payload);
            }
            toast.success(`Computer set ${editingId ? 'updated' : 'created'} successfully`);
            onSubmit();
        } catch (err) {
            toast.error(err.response?.data?.msg || `Failed to ${editingId ? 'update' : 'create'} computer set`);
        } finally {
            setIsSubmitting(false);
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
                            <input type="text" className="form-control" name="set_name" value={formData.set_name} onChange={handleInputChange} required placeholder="PC X" disabled={isNameDisabled} maxLength={32} />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label">Status</label>
                            <select className="form-select" name="status" value={formData.status} onChange={handleInputChange} disabled={isStatusDisabled}>
                                <option value="active">Operational</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="row mb-3">
                        <div className="col-12 col-md-4 mb-3"><label className="form-label">Prefix Name</label><input type="text" className="form-control" name="prefix" value={batchConfig.prefix} onChange={handleBatchChange} required placeholder="PC " /></div>
                        <div className="col-6 col-md-4 mb-3"><label className="form-label">Start Number</label><input type="number" className="form-control" name="start_number" value={batchConfig.start_number} onChange={handleBatchChange} required min="1" /></div>
                        <div className="col-6 col-md-4 mb-3"><label className="form-label">End Number</label><input type="number" className="form-control" name="count" value={batchConfig.count} onChange={handleBatchChange} required min="1" max="67" /></div>
                    </div>
                )}

                {
                    !editingId && (
                        <>
                            <hr />
                            <div className="h4 mb-3">Components</div>
                            {components.map((comp, index) => (
                                <div key={index} className="card mb-3 border-0 bg-body-tertiary p-2">
                                    <div className="card-body p-2">
                                        <div className="row g-2 align-items-center">
                                            <div className="col-md-4">
                                                <select className="form-select form-select-sm" value={comp.component_type} onChange={(e) => handleComponentChange(index, 'component_type', e.target.value)} disabled={comp.is_core}>
                                                    <option value="" selected hidden>Select Type</option>
                                                    {COMPONENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="col">
                                                <div className="d-flex">
                                                    <input type="text" className="form-control flex-fill" placeholder="Brand" value={comp.brand_name} onChange={(e) => handleComponentChange(index, 'brand_name', e.target.value)} required maxLength={36} />

                                                    {!comp.is_core && creationMode != 'single' && (
                                                        <div className="bg-body rounded ms-1 border">
                                                            <button type="button" className="btn btn-outline-danger border-0 " title='Remove Component' onClick={() => removeComponent(index)}><Trash /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {creationMode === 'single' && (
                                                <div className="col-md-4">
                                                    <div className="d-flex">
                                                        <input type="text" className="form-control border" placeholder="Serial No." value={comp.serial_number} onChange={(e) => handleComponentChange(index, 'serial_number', e.target.value)} maxLength={36} />
                                                        {!comp.is_core && (
                                                            <div className="bg-body rounded ms-1 border">
                                                                <button type="button" className="btn btn-outline-danger border-0 " title='Remove Component' onClick={() => removeComponent(index)}><Trash /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-link btn-sm w-100 text-end" onClick={() => addComponent()}>Add New Component</button>
                        </>
                    )
                }
            </div>

            <div className="modal-footer mt-3">
                <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Close</Button>
                {(!editingId || !isNameDisabled || !isStatusDisabled) && (
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>{editingId ? 'Updating...' : 'Creating...'}</> : (editingId ? 'Update' : 'Create')}
                    </Button>
                )}
            </div>
        </form>
    );
};

const ComponentsManager = ({ set, initialComponents, laboratoryId, onClose, onUpdate, user, onReport, onDelete }) => {
    const [components, setComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [originalComponents, setOriginalComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [setName, setSetName] = useState(set.set_name);
    const [setStatus, setSetStatus] = useState(set.status);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showSerialModal, setShowSerialModal] = useState(false);
    const [serialInput, setSerialInput] = useState('');

    // Batched Actions State
    const [pendingDeletes, setPendingDeletes] = useState([]);
    const [pendingUnlinks, setPendingUnlinks] = useState([]);

    const { theme } = useTheme();

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    // Helper to sort components: Core first, then Alphabetical Type, then Brand
    const sortComponents = (comps) => {
        return [...comps].sort((a, b) => {
            // 1. Core components first
            if (a.is_core && !b.is_core) return -1;
            if (!a.is_core && b.is_core) return 1;

            // 2. Sort by Component Type (Alphabetical)
            const typeA = a.component_type || '';
            const typeB = b.component_type || '';
            if (typeA.localeCompare(typeB) !== 0) return typeA.localeCompare(typeB);

            // 3. Sort by Brand Name (Alphabetical)
            const brandA = a.brand_name || '';
            const brandB = b.brand_name || '';
            return brandA.localeCompare(brandB);
        });
    };

    // Reset state when initialComponents changes (e.g. after a fetch refresh)
    useEffect(() => {
        const sorted = sortComponents(initialComponents);
        setComponents(JSON.parse(JSON.stringify(sorted)));
        setOriginalComponents(JSON.parse(JSON.stringify(sorted)));
        setPendingDeletes([]);
        setPendingUnlinks([]);
    }, [initialComponents]);

    useEffect(() => {
        setSetName(set.set_name);
        setSetStatus(set.status);
    }, [set]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'text-success';
            case 'bad': return 'text-secondary';
            case 'maintenance': return 'text-info';
            case 'missing': return 'text-danger';
            default: return 'text-secondary';
        }
    };

    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                toast.success("Copied to clipboard!");
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch (err) {
            // Fallback for insecure contexts or mobile browsers without clipboard API access
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed"; // Avoid scrolling
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    toast.success("Copied to clipboard!");
                } else {
                    toast.error("Failed to copy");
                }
            } catch (fallbackErr) {
                console.error("Copy failed", fallbackErr);
                toast.error("Failed to copy");
            }
        }
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

    const handleAddBySerial = async (e) => {
        e.preventDefault();
        if (!serialInput.trim()) return;

        try {
            const checkRes = await api.get(`/components/check-serial?serial_number=${serialInput.trim()}`);
            if (!checkRes.data.exists) {
                toast.error("Component with this serial number does not exist.");
                return;
            }

            const existing = checkRes.data.component;

            // If already in THIS set
            if (existing.computer_set_id === set.id) {
                toast.success("Component is already in this set.");
                setShowSerialModal(false);
                setSerialInput('');
                return;
            }

            let confirmMsg = '';
            let isMove = false;

            if (existing.computer_set_name) {
                // Assigned to another set
                confirmMsg = `Component "${existing.brand_name}" (${existing.component_type}) is currently assigned to set "${existing.computer_set_name}" in "${existing.laboratory_name}".\n\nDo you want to MOVE it to this set?`;
                isMove = true;
            } else {
                // Rogue
                confirmMsg = `Component "${existing.brand_name}" (${existing.component_type}) is currently UNASSIGNED.\n\nDo you want to LINK it to this set?`;
            }

            const confirmed = await showConfirm(
                isMove ? "Move Component" : "Link Component",
                confirmMsg
            );

            if (confirmed) {
                // Perform the move/link immediately via API
                // Note: We are bypassing the "save" button here because this is a specific action on an existing component
                // But typically ComponentsManager uses local state 'components'. 
                // However, moving an existing component involves changing its ID in the DB.
                // If we want consistency, we should probably call the API here.

                await api.put(`/components/${existing.id}`, { ...existing, computer_set_id: set.id });
                toast.success(isMove ? "Component moved successfully" : "Component linked successfully");

                setShowSerialModal(false);
                setSerialInput('');

                // Refresh components
                onUpdate(); // Triggers parent refresh -> triggers useEffect here
            }

        } catch (err) {
            console.error(err);
            toast.error("Failed to check serial number");
        }
    };

    const handleSave = async () => {
        const promises = [];
        let changesCount = 0;
        let conflictFoundAndCancelled = false;

        setIsSaving(true);
        try {
            // 1. Process Pending Deletes
            for (const id of pendingDeletes) {
                promises.push(api.delete(`/components/${id}`));
                changesCount++;
            }

            // 2. Process Pending Unlinks
            for (const id of pendingUnlinks) {
                const original = originalComponents.find(c => c.id === id);
                if (original) {
                    promises.push(api.put(`/components/${id}`, { ...original, computer_set_id: null }));
                    changesCount++;
                }
            }

            // 3. Process Updates and Creates
            for (const comp of components) {
                if (conflictFoundAndCancelled) break;

                // Skip if this component is marked for deletion/unlinking (shouldn't be in 'components' array if logic is correct, but safe check)
                if (pendingDeletes.includes(comp.id) || pendingUnlinks.includes(comp.id)) continue;

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
                    // Update Existing Component
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

            // 4. Update Set Info
            if (setName !== set.set_name || setStatus !== set.status) {
                changesCount++;
                promises.push(api.put(`/computer-sets/${set.id}`, {
                    laboratory_id: laboratoryId,
                    set_name: setName,
                    status: setStatus
                }));
            }

            if (changesCount === 0) {
                toast("No changes to save");
                setIsEditMode(false);
                return;
            }

            await Promise.all(promises);
            toast.success(`Changes saved successfully`);
            onUpdate(); // Refresh parent data
            if (isEditMode) {
                setIsEditMode(false);
            } else {
                onClose();
            }

        } catch (err) {
            if (err.message !== "Validation Error") {
                console.error(err);
                toast.error("Failed to save changes. " + (err.response?.data?.msg || ""));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (comp) => {
        // Just remove from UI list and add to pendingDeletes if it exists remotely
        if (comp.id.toString().startsWith('new-')) {
            const updated = components.filter(c => c.id !== comp.id);
            setComponents(updated);
            return;
        }

        if (await showConfirm("Delete Component", "This component will be permanently DELETED when you likely 'Save Changes'.\n\nIs this okay?")) {
            setPendingDeletes([...pendingDeletes, comp.id]);
            setComponents(components.filter(c => c.id !== comp.id));
        }
    };


    return (
        <>
            <div className="p-3">
                <div className="mb-5 d-flex flex-column align-items-center gap-2 p-3 bg-body-s rounded">
                    {isEditMode && canManage ? (
                        <div className="row g-2 w-100 justify-content-center">
                            <div className="col-8 col-md-6">
                                <input
                                    type="text"
                                    className="form-control text-center fw-bold"
                                    value={setName}
                                    onChange={(e) => setSetName(e.target.value)}
                                    placeholder="Set Name"
                                />
                            </div>
                            <div className="col-4 col-md-3">
                                <select
                                    className="form-select"
                                    value={setStatus}
                                    onChange={(e) => setSetStatus(e.target.value)}
                                >
                                    <option value="active">Active</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="retired">Retired</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h5 className="mb-0 text-center fw-bold">{set.set_name}</h5>
                            <div className="d-flex align-items-center gap-2">
                                {canManage ? (
                                    <ToggleButtonGroup type="radio" name="set-status-toggle" value={setStatus} onChange={setSetStatus} size="sm" className='bg-body-secondary'>
                                        <ToggleButton id="tbg-set-active" value="active" variant={setStatus === 'active' ? 'success' : 'outline-success'} title="Active" className='border-0'>
                                            <span className='ms-1'>Active</span>
                                        </ToggleButton>
                                        <ToggleButton id="tbg-set-maint" value="maintenance" variant={setStatus === 'maintenance' ? 'info' : 'outline-info'} title="Maintenance" className='border-0'>
                                            <span className='ms-1'>Maintenance</span>
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                ) : (
                                    <span className={`badge text-capitalize ${getStatusColor(set.status)} border`}>
                                        {set.status}
                                    </span>
                                )}
                                <button className="btn btn-sm border-0 bg-body-secondary" title="Report Issue" onClick={() => onReport(set)}>
                                    <ExclamationTriangleFill />
                                </button>
                                {canManage && (
                                    <button className="btn btn-sm border-0 bg-body-secondary" title="Delete Set" onClick={() => onDelete(set.id)}>
                                        <Trash />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* <div className="h4 mb-3">Components</div> */}

                {
                    components.length > 0 && components.map((comp) => (
                        <div key={comp.id} className="shadow-sm rounded bg-body-tertiary border mb-3 px-4 py-2">
                            <div className="row">
                                {/* Icon/Type */}
                                {
                                    isEditMode && canEditComponentDetails(user) ? (
                                        <div className='col-12 col-md-2 p-1'>
                                            <div className="flex-fill d-flex align-items-center rounded border">
                                                {/* <span className='px-2'>{getComponentIcon(comp.component_type)}</span> */}
                                                <select
                                                    className={`form-select bg-body-secondary border-0 ${comp.is_core ? "remove-arrow-select-input bg-transparent" : ""} fw-bold form-select-sm`}
                                                    value={comp.component_type}
                                                    onChange={(e) => handleLocalChange(comp.id, 'component_type', e.target.value)}
                                                    disabled={comp.is_core}
                                                >
                                                    {COMPONENT_TYPES.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        ""
                                    )
                                }

                                {/* Brand Name */}
                                {
                                    isEditMode && canEditComponentDetails(user) ? (
                                        <div className="col-12 col-md-3 p-1">
                                            <input type="text" className="form-control form-control-sm p-1 bg-body-secondary p-0" value={comp.brand_name} onChange={(e) => handleLocalChange(comp.id, 'brand_name', e.target.value)} placeholder="Brand Name" maxLength={36} />
                                        </div>
                                    ) : (
                                        <div className="col-12 col-md-4 p-1 d-flex align-items-center py-0">
                                            <span title={getLabelByValue(comp.component_type)} className='me-2'>{getComponentIcon(comp.component_type)}</span>
                                            <span className="cursor-pointer me-1 text-nowrap text-truncate text-uppercase" title={comp.brand_name} onClick={() => copyToClipboard(comp.brand_name)} >{comp.brand_name}</span>
                                            <button className="btn btn-link p-0 text-muted" onClick={() => copyToClipboard(comp.brand_name)} title="Copy Name/Brand">
                                                <Copy style={{ fontSize: "0.75rem", marginLeft: '4px' }} />
                                            </button>
                                        </div>
                                    )
                                }

                                {/* Serial Number */}
                                {
                                    isEditMode && canEditComponentDetails(user) ? (
                                        <div className="col-12 col-md-3 p-1">
                                            <input type="text" className="form-control form-control-sm p-1 bg-body-secondary p-0" value={comp.serial_number} placeholder="Serial Number" onChange={(e) => handleLocalChange(comp.id, 'serial_number', e.target.value)} maxLength={36} />
                                        </div>
                                    ) : (
                                        <div className="col-12 col-md-4 p-1 d-flex align-items-center mb-2 mb-md-0 py-0">
                                            <span className={`me-1 px-1 rounded text-nowrap text-truncate ${comp.serial_number ? "bg-body-secondary cursor-pointer" : "cursor-help"}`} title={comp.serial_number ? comp.serial_number : "No Serial Number is Set"} onClick={() => comp.serial_number && copyToClipboard(comp.serial_number)} >
                                                {comp.serial_number || <span className="text-muted fst-italic">Serial not set</span>}
                                            </span>
                                            {comp.serial_number && (
                                                <button className="btn btn-link p-0 text-muted" onClick={() => copyToClipboard(comp.serial_number)} title="Copy Serial">
                                                    <Copy style={{ fontSize: "0.75rem", marginLeft: '4px' }} />
                                                </button>
                                            )}
                                        </div>
                                    )
                                }

                                {/* Status */}
                                <div className="col p-1">
                                    <div className="d-flex justify-content-between gap-2">

                                        {
                                            isEditMode && canEditComponentStatus(user) ? (
                                                <select className={`form-select form-select-sm border bg-body-secondary p-1 ${getStatusColor(comp.status)}`} value={comp.status} onChange={(e) => handleLocalChange(comp.id, 'status', e.target.value)}>
                                                    <option value="good">Good</option><option value="bad">Bad</option><option value="maintenance">Maintenance</option><option value="missing">Missing</option>
                                                </select>
                                            ) : (
                                                <ToggleButtonGroup
                                                    type="radio"
                                                    name={`status-${comp.id}`}
                                                    value={comp.status}
                                                    onChange={(val) => handleLocalChange(comp.id, 'status', val)}
                                                    size="sm"
                                                    className='flex-fill bg-body-secondary'
                                                >
                                                    <ToggleButton
                                                        id={`tbg-btn-good-${comp.id}`}
                                                        value="good"
                                                        variant={comp.status === 'good' ? 'success' : 'outline-success'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-1 d-flex align-items-center justify-content-center border-0"
                                                        style={{ width: '30px', height: '30px' }}
                                                        title="Good"
                                                    >
                                                        <Check2 size={16} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-bad-${comp.id}`}
                                                        value="bad"
                                                        variant={comp.status === 'bad' ? 'secondary' : 'outline-secondary'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-1 d-flex align-items-center justify-content-center border-0"
                                                        style={{ width: '30px', height: '30px' }}
                                                        title="Bad"
                                                    >
                                                        <XLg size={16} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-maint-${comp.id}`}
                                                        value="maintenance"
                                                        variant={comp.status === 'maintenance' ? 'info' : 'outline-info'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-1 d-flex align-items-center justify-content-center border-0"
                                                        style={{ width: '30px', height: '30px' }}
                                                        title="Maintenance"
                                                    >
                                                        <Tools size={16} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-missing-${comp.id}`}
                                                        value="missing"
                                                        variant={comp.status === 'missing' ? 'danger' : 'outline-danger'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-1 d-flex align-items-center justify-content-center border-0"
                                                        style={{ width: '30px', height: '30px' }}
                                                        title="Missing"
                                                    >
                                                        <QuestionLg size={16} />
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            )
                                        }

                                        {isEditMode ? (
                                            <>
                                                {canDeleteComponent(user) && (
                                                    <div className="bg-body-secondary rounded">
                                                        <button className="btn btn-sm btn-outline-danger border-0 h-100" title='Delete Component' onClick={() => handleRemove(comp)}>
                                                            <Trash />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="bg-body-secondary rounded">
                                                <button className="btn btn-sm btn-outline-primary border-0 h-100" title='Report Issue' onClick={() => onReport(comp)}>
                                                    <ExclamationTriangleFill />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                }


                {components.length === 0 && (
                    <div className="row">
                        <div className="text-center text-muted">No components found.</div>
                    </div>
                )}


                {
                    !isEditMode && (
                        <div className="d-flex justify-content-center gap-3 mt-4 text-muted small">
                            <div className="d-flex align-items-center"><Check2 className="text-success me-1" size={16} /> Good</div>
                            <div className="d-flex align-items-center"><XLg className="text-secondary me-1" size={16} /> Bad</div>
                            <div className="d-flex align-items-center"><Tools className="text-info me-1" size={16} /> Maintenance</div>
                            <div className="d-flex align-items-center"><QuestionLg className="text-danger me-1" size={16} /> Missing</div>
                        </div>
                    )
                }
            </div>

            {/* Add by Serial Modal */}
            <Modal show={showSerialModal} onHide={() => setShowSerialModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add Component by Serial</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleAddBySerial}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Serial Number</label>
                            <input
                                type="text"
                                className="form-control"
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value)}
                                placeholder="Enter serial number..."
                                autoFocus
                                required
                            />
                            <div className="form-text">
                                Enter the serial number of an existing component to add it to this set.
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowSerialModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Check & Add</Button>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Confirmation Modal (Generic) */}
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

            <div className={`modal-footer border-0 d-flex justify-content-${isEditMode ? "edit" : "between"} justify-content-md-between`}>
                <div className={`d-flex justify-content-center justify-content-md-start ${isEditMode ? "mb-4" : "mb-0"} mb-md-0 gap-2 flex-wrap`}>
                    {/* Edit Mode Toggle */}
                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        isEditMode ? (
                            <>
                                <button className="btn btn-primary btn-sm" onClick={() => setIsEditMode(false)} title="Exit Edit Mode">
                                    <PencilSquare className="me-1" /> Exit Edit Mode
                                </button>
                                {canAddComponent(user) && (
                                    <div className="d-flex gap-2">
                                        <button className="btn btn-sm btn-outline-primary" onClick={addNewRow}>
                                            <Plus className="me-1" /> New Component
                                        </button>
                                        <button className="btn btn-sm btn-outline-primary" onClick={() => setShowSerialModal(true)}>
                                            <BoxArrowUpRight className="me-1" /> Add by Serial #
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => setIsEditMode(true)} title="Enter Edit Mode">
                                <PencilSquare className="me-1" /> Edit
                            </button>
                        )
                    )}
                </div>
                <div className="d-flex gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Close</Button>
                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        isEditMode ? (
                            <Button variant="success" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</> : 'Save Changes'}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : 'Update'}
                            </Button>
                        )
                    )}
                </div>
            </div>
        </>
    );
};

const ComputerSetCard = ({ set, components, onView }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    // Helper explicitly inside or global? Using global `getComponentIcon`
    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'text-white';
            case 'bad': return 'text-secondary';
            case 'maintenance': return 'text-info';
            case 'missing': return 'text-danger';
            default: return 'text-secondary';
        }
    }

    const goodCount = components.filter(c => c.status === 'good').length;
    const badCount = components.filter(c => c.status === 'bad').length;
    const maintCount = components.filter(c => c.status === 'maintenance').length;
    const missingCount = components.filter(c => c.status === 'missing').length;
    const totalCount = goodCount + badCount + maintCount

    return (
        <div className="col p-0 border">
            <div
                className={`card h-100 position-relative border-0 rounded-0 overflow-hidden shadow-sm hover-shadow ${set.status === 'active' ? 'bg-body-secondary' : 'bg-info-subtle'}`}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onView(set)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowMobilePreview(false); }}
            >
                <div className="card-body text-center d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '150px' }}>
                    <h5 className="card-title fw-bold mb-0">{set.set_name}</h5>
                    <div className="d-flex gap-1 flex-wrap justify-content-center">
                        <span className={`d-none badge text-capitalize ${set.status === 'active' ? 'bg-success' : 'bg-warning'} mt-2`}>
                            {set.status}
                        </span>

                        {
                            totalCount === goodCount ? (
                                <span className="badge bg-primary rounded-pill mt-2" title={`${goodCount} Good Components`}>{goodCount} Operational</span>
                            ) : (
                                <>
                                    {goodCount > 0 && <span className="badge bg-primary rounded-pill mt-2" title={`${goodCount} Good Components`}>{goodCount}</span>}
                                    {badCount > 0 && <span className="badge bg-secondary rounded-pill mt-2" title={`${badCount} Bad Components`}>{badCount}</span>}
                                    {maintCount > 0 && <span className="badge bg-info rounded-pill mt-2" title={`${maintCount} Maintenance Components`}>{maintCount}</span>}
                                    {missingCount > 0 && <span className="badge bg-danger rounded-pill mt-2" title={`${missingCount} Missing Components`}>{missingCount}</span>}
                                </>
                            )
                        }
                    </div>

                    { }
                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 p-3 d-none d-md-flex flex-wrap align-items-center justify-content-center bg-primary"
                        style={{
                            opacity: (isHovered) ? 1 : 0,
                            transition: 'opacity 0.3s',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}
                    >
                        <div className='d-flex flex-wrap justify-content-center'>
                            {components.map(comp => (
                                <div key={comp.id} className={`m-1 fs-5 ${getStatusColor(comp.status)}`} title={`${comp.brand_name} (${comp.status})`}>
                                    {getComponentIcon(comp.component_type)}
                                </div>
                            ))}
                        </div>
                        {components.length === 0 && <span className="text-muted small">No components</span>}
                    </div>
                </div>


            </div>
        </div>
    );
};

const LaboratoryComputersPage = () => {
    const { id: laboratoryId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const [computerSets, setComputerSets] = useState([]);
    const [laboratory, setLaboratory] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI Logic States only
    const [showModal, setShowModal] = useState(false);
    const [showBatchEditModal, setShowBatchEditModal] = useState(false);
    const [showComponentsModal, setShowComponentsModal] = useState(false);
    const [mode, setMode] = useState('create'); // 'create', 'edit', 'view'
    const [selectedSet, setSelectedSet] = useState(null);
    const [allComponents, setAllComponents] = useState([]); // Kept for Card counts
    const [itemsPerRow, setItemsPerRow] = useState(5);

    // Reporting State
    const [reportModal, setReportModal] = useState({ show: false, target: null, type: 'set' }); // type: 'set' or 'component'

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
        setShowComponentsModal(true);
    };

    const handleDeleteSet = async (id) => {
        if (!window.confirm("Are you sure you want to delete this computer set? (All components will be unlinked)")) return;
        try {
            await api.delete(`/computer-sets/${id}`);
            toast.success("Computer set deleted");
            fetchData();
        } catch (err) {
            toast.error("Failed to delete computer set");
        }
    };

    const handleReportIssue = (target, type = 'set') => {
        setReportModal({ show: true, target: target, type: type });
    };

    const handleReportSubmit = async (data) => {
        try {
            const payload = {
                laboratory_id: laboratoryId,
                title: data.title,
                description: data.description,
                priority: data.priority
            };

            if (reportModal.type === 'set') {
                payload.computer_set_id = reportModal.target.id;
            } else {
                payload.computer_set_id = reportModal.target.computer_set_id; // Still link to set if possible? Yes, components usually in set.
                payload.component_id = reportModal.target.id;
            }

            await api.post('/issues/', payload);
            toast.success("Issue reported successfully");
            setReportModal({ ...reportModal, show: false });
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to report issue");
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
                    laboratory_id: laboratoryId,
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
            const promises = ids.map(id => api.delete(`/computer-sets/${id}`));
            await Promise.all(promises);
            toast.success(`Deleted ${ids.length} computer sets successfully`);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete some computer sets");
        }
    };

    if (loading) return <LoadingSpinner centered />;
    if (!laboratory) return <div className="container py-3">Laboratory not found</div>;

    return (
        <div className="container-fluid py-3">
            <div className="row mb-4">
                <div className='col-12 col-md-6 mb-2 mb-md-0'>
                    <div className="h4 fw-bold mb-0">{laboratory?.name}</div>
                    <div className="text-muted mb-0">{laboratory?.description}</div>
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

            <div className="container-fluid p-0">

                <div className="d-md-flex justify-content-end mb-2 d-none">
                    <select
                        className="form-select form-select-sm w-auto"
                        value={itemsPerRow}
                        onChange={(e) => setItemsPerRow(parseInt(e.target.value))}
                        title="Items per row"
                    >
                        <option value={5}>5 PC per row</option>
                        <option value={4}>4 PC per row</option>
                        <option value={3}>3 PC per row</option>
                    </select>
                </div>

                <div className={`row overflow-hidden border rounded row-cols-2 row-cols-md-${itemsPerRow}`}>
                    {
                        computerSets.length > 0 && (
                            computerSets.map(set => (
                                <ComputerSetCard
                                    key={set.id}
                                    set={set}
                                    components={allComponents ? allComponents.filter(c => c.computer_set_id === set.id) : []}
                                    onView={handleViewComponents}
                                />
                            ))
                        )
                    }
                </div>

                {
                    computerSets.length == 0 && (
                        <div className="col-12">
                            <div className="text-center text-muted"><p>No computer sets found in this laboratory.</p></div>
                        </div>
                    )
                }
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
                        laboratoryId={laboratoryId}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseSetModal}
                        user={user}
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
                        onReport={(target) => handleReportIssue(target, target.serial_number ? 'component' : 'set')}
                    />
                    {reportModal.show && (
                        <div
                            className="position-absolute w-100 h-100 start-0 top-0 bg-dark"
                            style={{ opacity: 0.5, zIndex: 1050 }}
                        ></div>
                    )}
                </Modal>
            )}

            {/* Report Issue Modal */}
            <ReportIssueModal
                show={reportModal.show}
                onHide={() => setReportModal({ ...reportModal, show: false })}
                target={reportModal.target}
                type={reportModal.type}
                user={user}
                onSubmit={handleReportSubmit}
            />
        </div>
    );
};

export default LaboratoryComputersPage;
