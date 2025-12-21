import React, { useState, useEffect } from 'react';
import { Modal, Button, ToggleButton, ToggleButtonGroup, Form } from 'react-bootstrap';
import { PencilSquare, Trash, Copy, Check2, XLg, QuestionLg, ListUl, Tools } from 'react-bootstrap-icons';
import KeyValueEditor from '../common/KeyValueEditor';
import KeyValues from '../common/KeyValues';
import ConfirmModal, { useConfirmModal } from '../common/ConfirmModal';
import BarcodeScanner from '../common/BarcodeScanner';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useTheme } from '../../context/ThemeContext';
import { COMPONENT_TYPES, getLabelByValue, getDefaultPropertiesForType } from '../../utils/componentTypes';
import { getComponentIcon } from '../../utils/componentIcons';

// Role-based access control helpers
const canEditComponentDetails = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canDeleteComponent = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canAddComponent = (user) => ['admin', 'it_head', 'lab_head', 'it_technician'].includes(user?.role);
const canEditComponentStatus = () => true;

const ComponentsManager = ({ set, initialComponents, laboratoryId, onClose, onUpdate, user, onDelete }) => {
    const [components, setComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [originalComponents, setOriginalComponents] = useState(JSON.parse(JSON.stringify(initialComponents)));
    const [setName, setSetName] = useState(set.set_name);
    const [setStatus, setSetStatus] = useState(set.status);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showSerialModal, setShowSerialModal] = useState(false);
    const [serialInput, setSerialInput] = useState('');

    const [pendingDeletes, setPendingDeletes] = useState([]);
    const [pendingUnlinks, setPendingUnlinks] = useState([]);
    const [propertiesModal, setPropertiesModal] = useState({ show: false, componentId: null, mode: 'view', valid: true });

    const { theme } = useTheme();

    const canManage = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    // Sort: core components first, then by type, then by brand
    const sortComponents = (comps) => {
        return [...comps].sort((a, b) => {
            if (a.is_core && !b.is_core) return -1;
            if (!a.is_core && b.is_core) return 1;

            const typeA = a.component_type || '';
            const typeB = b.component_type || '';
            if (typeA.localeCompare(typeB) !== 0) return typeA.localeCompare(typeB);

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
        setSetName(set.set_name);
        setSetStatus(set.status);
    }, [initialComponents, set]);

    const handlePropertiesChange = (componentId, newProperties) => {
        const updated = components.map(c => {
            if (c.id === componentId) {
                return { ...c, properties: newProperties };
            }
            return c;
        });
        setComponents(updated);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'text-success';
            case 'bad': return 'text-secondary';
            case 'maintenance': return 'text-info';
            case 'missing': return 'text-danger';
            case 'active': return 'text-success';
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
            // Fallback for browsers without Clipboard API
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
            is_core: false,
            properties: getDefaultPropertiesForType('other')
        };
        setComponents([...components, newComp]);
        setIsEditMode(true);
    };

    const handleLocalChange = (id, field, value) => {
        const newComponents = components.map(c => c.id === id ? { ...c, [field]: value } : c);
        setComponents(newComponents);
    };

    // Confirm modal hook
    const { confirmModal, showConfirm, handleConfirmResult } = useConfirmModal();

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
                confirmMsg = `Component "${existing.brand_name}"(${existing.component_type}) is currently assigned to set "${existing.computer_set_name}" in "${existing.laboratory_name}".\n\nDo you want to MOVE it to this set ? `;
                isMove = true;
            } else {
                // Rogue
                confirmMsg = `Component "${existing.brand_name}"(${existing.component_type}) is currently UNASSIGNED.\n\nDo you want to LINK it to this set ? `;
            }

            const confirmed = await showConfirm(
                isMove ? "Move Component" : "Link Component",
                confirmMsg
            );

            if (confirmed) {

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
        const batchPayload = {
            creates: [],
            updates: [],
            deletes: [],
            laboratory_id: laboratoryId
        };

        let conflictFoundAndCancelled = false;
        let changesCount = 0;

        setIsSaving(true);
        try {
            // 1. Process Pending Deletes
            batchPayload.deletes = [...pendingDeletes];

            // 2. Process Pending Unlinks (Treat as updates: set computer_set_id to null)
            for (const id of pendingUnlinks) {
                const original = originalComponents.find(c => c.id === id);
                if (original) {
                    batchPayload.updates.push({ ...original, computer_set_id: null });
                }
            }

            // 3. Process Components
            for (const comp of components) {
                if (conflictFoundAndCancelled) break;

                // Skip if marked for delete/unlink
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
                                msg += `It is currently a ROGUE component(Unassigned).\n`;
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

                    if (targetId) {
                        // MERGE/MOVE existing component (Update)
                        batchPayload.updates.push({
                            id: targetId,
                            computer_set_id: set.id,
                            laboratory_id: laboratoryId,
                            component_type: comp.component_type,
                            brand_name: comp.brand_name,
                            serial_number: comp.serial_number,
                            properties: comp.properties,
                            is_core: isCore,
                            status: comp.status
                        });
                    } else {
                        // CREATE normally
                        batchPayload.creates.push({
                            computer_set_id: set.id,
                            component_type: comp.component_type,
                            brand_name: comp.brand_name,
                            serial_number: comp.serial_number,
                            properties: comp.properties,
                            is_core: isCore,
                            laboratory_id: laboratoryId,
                            status: comp.status
                        });
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
                                    let msg = `You are referencing the serial number of a component!\n`;
                                    msg += `Existing: ${existing.component_type} (${existing.brand_name}) \n`;
                                    msg += `Location: ${existing.computer_set ? existing.computer_set.set_name : 'No'} \n\n`;
                                    msg += `Do you want to MOVE that component here (replacing the current one)?`;

                                    if (await showConfirm("Confirm Move", msg)) {
                                        // Complex Move: Unlink current, Update existing to link here
                                        batchPayload.updates.push({ id: comp.id, computer_set_id: null }); // Unlink current

                                        batchPayload.updates.push({
                                            id: existing.id,
                                            computer_set_id: set.id,
                                            laboratory_id: laboratoryId,
                                            component_type: comp.component_type,
                                            brand_name: comp.brand_name,
                                            status: comp.status
                                        });
                                        continue;
                                    } else {
                                        conflictFoundAndCancelled = true;
                                        break;
                                    }
                                }
                            }

                            batchPayload.updates.push(comp);
                        } else {
                            // Check deep equality for properties if implemented strictly, but for now simple check
                            if (JSON.stringify(original.properties || {}) !== JSON.stringify(comp.properties || {})) {
                                batchPayload.updates.push(comp);
                            }
                        }
                    }
                }
            }

            if (conflictFoundAndCancelled) {
                toast("Save cancelled.");
                return;
            }

            const promises = [];

            if (batchPayload.creates.length > 0 || batchPayload.updates.length > 0 || batchPayload.deletes.length > 0) {
                promises.push(api.post('/components/batch-transaction', batchPayload));
                changesCount += (batchPayload.creates.length + batchPayload.updates.length + batchPayload.deletes.length);
            }

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
                if (isEditMode) {
                    setIsEditMode(false);
                } else {
                    onClose();
                }
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
            <div className="p-3 pb-0">
                {isEditMode && canManage ? (
                    <div className="d-flex flex-column align-items-center gap-2 p-3 py-3 rounded">
                        <div className='row'>
                            <div className="col-12 col-md-8 p-1">
                                <Form.Group className="">
                                    <Form.Label>Computer Set Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={setName}
                                        onChange={(e) => setSetName(e.target.value)}
                                        placeholder="Enter department name"
                                    />
                                </Form.Group>
                            </div>

                            <div className="col-12 col-md-4 p-1">
                                <Form.Group className="mb-3">
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select
                                        value={setStatus}
                                        onChange={(e) => setSetStatus(e.target.value)}
                                    >
                                        <option value="active">Active</option>
                                        <option value="maintenance">Maintenance</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="d-flex flex-column align-items-center gap-2 p-3 py-4 bg-body-s rounded">
                            <h5 className="mb-0 text-center fw-bold">{set.set_name}</h5>
                            <div className="d-flex align-items-center cursor-pointer gap-2">
                                {(canManage || user?.role === 'it_technician') ? (
                                    <ToggleButtonGroup type="radio" name="set-status-toggle" value={setStatus} onChange={setSetStatus} size="sm" className='bg-body-secondary'>
                                        <ToggleButton id="tbg-set-active" value="active" variant={setStatus === 'active' ? 'success' : 'outline-success'} title="Active" className='border-0'>
                                            <span className='ms-1'>Active</span>
                                        </ToggleButton>
                                        <ToggleButton id="tbg-set-maint" value="maintenance" variant={setStatus === 'maintenance' ? 'info' : 'outline-info'} title="Maintenance" className='border-0'>
                                            <span className='ms-1'>Maintenance</span>
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                ) : (
                                    <span className={`badge bg-body-secondary text-capitalize ${getStatusColor(set.status)}`}>
                                        {set.status}
                                    </span>
                                )}
                                {canManage && (
                                    <button className="btn btn-sm border-0 bg-body-secondary" title="Delete Set" onClick={() => onDelete(set.id)}>
                                        <Trash />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}


                {
                    components.length > 0 && components.map((comp) => (
                        <div key={comp.id} className="shadow-sm rounded bg-body-tertiary border mb-3 px-4 py-2">
                            <div className="row">
                                {/* Icon/Type */}
                                {
                                    isEditMode && canEditComponentDetails(user) ? (
                                        <div className='col-12 col-lg-2 p-1'>
                                            <div className="flex-fill d-flex align-items-center cursor-pointer rounded border">
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
                                        <div className="col-12 col-lg-4 p-1">
                                            <input type="text" className="form-control form-control-sm p-1 bg-body-secondary p-0" value={comp.brand_name} onChange={(e) => handleLocalChange(comp.id, 'brand_name', e.target.value)} placeholder="Brand Name" maxLength={36} />
                                        </div>
                                    ) : (
                                        <div className="col-12 col-lg-4 p-1 d-flex align-items-center cursor-pointer py-0 pe-0 pe-md-2">
                                            <span title={getLabelByValue(comp.component_type)} className='btn bg-body-secondary me-2' disabled>{getComponentIcon(comp.component_type, "16px")}</span>
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
                                        <div className="col-12 col-lg-3 p-1">
                                            <div className="input-group input-group-sm border rounded">
                                                <input type="text" className="form-control form-control-sm p-1 bg-body-secondary border-0" value={comp.serial_number} placeholder="Serial Number" onChange={(e) => handleLocalChange(comp.id, 'serial_number', e.target.value)} maxLength={36} />
                                                <BarcodeScanner
                                                    onScan={(value) => handleLocalChange(comp.id, 'serial_number', value)}
                                                    buttonIconOnly={true}
                                                    buttonVariant=""
                                                    className="btn-sm d-lg-none border-0 bg-body-secondary"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="col-12 col-lg-4 p-1 d-flex align-items-center cursor-pointer mb-2 mb-lg-0 py-0 pe-0 pe-md-2">
                                            <span className={`me-1 rounded text-nowrap text-truncate fst-italic ${comp.serial_number ? "cursor-pointer" : "cursor-help"} `} title={comp.serial_number ? comp.serial_number : "Serial Number not set"} onClick={() => comp.serial_number && copyToClipboard(comp.serial_number)} >
                                                {comp.serial_number || <span className="text-muted">Serial not set</span>}
                                            </span>
                                            <div className={`d-flex justify-content-start flex-fill `}>
                                                {comp.serial_number && (
                                                    <button className="btn btn-link p-0 text-muted" onClick={() => copyToClipboard(comp.serial_number)} title="Copy Serial">
                                                        <Copy style={{ fontSize: "0.75rem", marginLeft: '4px' }} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }

                                {/* Properties and Status */}
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
                                                        className="p-0 py-1 d-flex align-items-center cursor-pointer justify-content-center border-0"
                                                        title="Good"
                                                    >
                                                        <Check2 size={16} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-bad-${comp.id}`}
                                                        value="bad"
                                                        variant={comp.status === 'bad' ? 'secondary' : 'outline-secondary'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-0 py-1 d-flex align-items-center cursor-pointer justify-content-center border-0"
                                                        title="Bad"
                                                    >
                                                        <XLg size={16} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-maint-${comp.id}`}
                                                        value="maintenance"
                                                        variant={comp.status === 'maintenance' ? 'info' : 'outline-info'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-0 py-1 d-flex align-items-center cursor-pointer justify-content-center border-0"
                                                        title="Maintenance"
                                                    >
                                                        <Tools size={13} />
                                                    </ToggleButton>
                                                    <ToggleButton
                                                        id={`tbg-btn-missing-${comp.id}`}
                                                        value="missing"
                                                        variant={comp.status === 'missing' ? 'danger' : 'outline-danger'}
                                                        disabled={!canEditComponentStatus(user)}
                                                        className="p-0 py-1 d-flex align-items-center cursor-pointer justify-content-center border-0"
                                                        title="Missing"
                                                    >
                                                        <QuestionLg size={16} />
                                                    </ToggleButton>
                                                </ToggleButtonGroup>
                                            )
                                        }

                                        {
                                            isEditMode ? (
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
                                                <div className={`bg-body-secondary rounded ${isEditMode ? "border" : ""}`}>
                                                    <button
                                                        className={`btn btn-sm border-0 h-100 ${comp.properties && Object.keys(comp.properties).length > 0 ? '' : ''}`}
                                                        title='Edit Properties'
                                                        onClick={() => setPropertiesModal({ show: true, componentId: comp.id, componentName: comp.brand_name, mode: isEditMode ? 'edit' : 'view' })}
                                                    >
                                                        <ListUl />
                                                    </button>
                                                </div>
                                            )
                                        }
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
                        <div className="d-flex justify-content-center gap-3 py-4 text-muted small">
                            <div className="d-flex align-items-center cursor-pointer" title='Component is active and operational'>
                                <Check2 className="text-success me-2" size={16} /> Good
                            </div>
                            <div className="d-flex align-items-center cursor-pointer" title='Component has unresolved issues'>
                                <XLg className="text-secondary me-2" size={16} /> Bad
                            </div>
                            <div className="d-flex align-items-center cursor-pointer" title='Component is under maintenance'>
                                <Tools className="text-info me-2" size={13} /> Maintenance
                            </div>
                            <div className="d-flex align-items-center cursor-pointer" title='Component not found'>
                                <QuestionLg className="text-danger me-2" size={16} /> Missing
                            </div>
                        </div>
                    )
                }
            </div>


            {isEditMode && canAddComponent(user) && (
                <div className="d-flex justify-content-start px-3 gap-2">
                    <button className="btn btn-sm btn-link" onClick={addNewRow}>
                        Add New Component
                    </button>
                    <button className="btn btn-sm btn-link" onClick={() => setShowSerialModal(true)}>
                        Add by Serial Number
                    </button>
                </div>
            )}

            {/* Add by Serial Modal */}
            <Modal show={showSerialModal} onHide={() => setShowSerialModal(false)} style={{ zIndex: 1260 }} centered backdrop="static" backdropClassName="stacked-modal-backdrop">
                <Modal.Header closeButton>
                    <Modal.Title>Add Component by Serial</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleAddBySerial}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Serial Number</label>
                            <div className="input-group rounded border-0">
                                <input
                                    type="text"
                                    className="form-control bg-body-secondary"
                                    value={serialInput}
                                    onChange={(e) => setSerialInput(e.target.value)}
                                    placeholder="Enter or scan serial number..."
                                    autoFocus
                                    required
                                />
                                <BarcodeScanner
                                    onScan={(value) => setSerialInput(value)}
                                    buttonIconOnly={true}
                                    buttonVariant=""
                                    className="d-lg-none border-0 bg-body-secondary"
                                />
                            </div>
                            <div className="form-text">
                                Enter the serial number of a component used on other sets
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowSerialModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Check & Add</Button>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Confirmation Modal */}
            <ConfirmModal config={confirmModal} onResult={handleConfirmResult} />

            <div className={`modal-footer border-0 d-flex align-items-center justify-content-${isEditMode ? "edit" : "between"} justify-content-md-between`}>
                <div className={`d-flex justify-content-center justify-content-md-start ${isEditMode ? "mb-4" : "mb-0"} mb-md-0 gap-2 flex-wrap`}>
                    {/* Edit Mode Toggle */}
                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        !isEditMode && (
                            <button className="btn btn-primary" onClick={() => setIsEditMode(true)} title="Enter Edit Mode">
                                <PencilSquare className="me-1" /> Edit Mode
                            </button>
                        )
                    )}
                </div>
                <div className="d-flex gap-2 align-items-center">

                    {(canEditComponentDetails(user) || canEditComponentStatus(user)) && (
                        isEditMode ? (
                            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Updating...</> : 'Update'}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...</> : 'Save'}
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* Background Overlay for Serial Modal */}
            {showSerialModal && (
                <div
                    className="position-absolute w-100 h-100 start-0 top-0 bg-dark"
                    style={{ opacity: 0.5, zIndex: 1040 }}
                ></div>
            )}

            {/* Properties Modal */}
            <Modal show={propertiesModal.show} onHide={() => setPropertiesModal({ ...propertiesModal, show: false })} style={{ zIndex: 1260 }} centered backdrop="static" backdropClassName="stacked-modal-backdrop">
                <Modal.Header closeButton>
                    <div>
                        <div className="h4 mb-0">{propertiesModal.mode === 'edit' ? 'Edit Properties' : 'View Properties'}</div>
                        <div className="text-muted small">{`${propertiesModal.componentName}`}</div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {(() => {
                        const comp = components.find(c => c.id === propertiesModal.componentId);
                        if (!comp) return <div>Component not found</div>;

                        return (
                            <KeyValueEditor
                                properties={comp.properties || {}}
                                onChange={(newProps) => handlePropertiesChange(comp.id, newProps)}
                                readOnly={propertiesModal.mode === 'view'}
                                setPropertiesModal={(key, value) => setPropertiesModal({ ...propertiesModal, [key]: value })}
                                componentType={comp.component_type}
                            />
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer className='justify-content-end'>
                    {propertiesModal.mode === 'edit' ? (
                        <Button
                            variant="primary"
                            onClick={() => setPropertiesModal({ ...propertiesModal, mode: 'view' })}
                            disabled={propertiesModal.valid === false}
                        >
                            Save
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setPropertiesModal({ ...propertiesModal, show: false })}>Close</Button>
                    )}

                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ComponentsManager;
