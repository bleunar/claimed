import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Badge, Card, Collapse, Form, Button, Accordion, Modal, Spinner, Table, ButtonGroup, ToggleButton } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Backspace, ArrowClockwise, ChevronDown, ChevronUp, PersonCircle, Calendar3, Laptop, PcDisplay, Building, HddStack, DoorClosed, Keyboard, Pc, Send } from 'react-bootstrap-icons';
import Pagination from '../components/Pagination';

const ActivityLogsPage = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [laboratories, setLaboratories] = useState([]);

    // View Mode: 'default' (Pending) or 'all' (History)
    const [viewMode, setViewMode] = useState('default');

    // Filters
    const [labFilter, setLabFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const [targetFilter, setTargetFilter] = useState('');
    const [showAll] = useState(false);

    // Pagination (Increased items per page for grouped view utility)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Expanded State for details
    const [expandedLogs, setExpandedLogs] = useState({});

    // State to trigger manual refresh
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State for Component Logs
    const [showComponentModal, setShowComponentModal] = useState(false);
    const [selectedComponentLogs, setSelectedComponentLogs] = useState([]);
    const [selectedComponentName, setSelectedComponentName] = useState("");

    const [showSendModal, setShowSendModal] = useState(false);
    const [sendingReport, setSendingReport] = useState(false);

    // Bulk Actions State
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const canManageLogs = ['admin', 'it_head'].includes(user?.role);

    const handleSelect = (id) => {
        setSelectedLogs(prev => {
            if (prev.includes(id)) {
                return prev.filter(logId => logId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            // Select all visible on current page
            const ids = currentLogs.map(log => log.id);
            // Merge with existing, avoiding duplicates (though usually we select page, clearing others might be safer or adding? Let's add)
            setSelectedLogs(prev => [...new Set([...prev, ...ids])]);
        } else {
            // Unselect all visible on current page
            const pageIds = currentLogs.map(log => log.id);
            setSelectedLogs(prev => prev.filter(id => !pageIds.includes(id)));
        }
    };

    const handleBatchStatusUpdate = async (status) => {
        if (selectedLogs.length === 0) return;
        if (!confirm(`Are you sure you want to mark ${selectedLogs.length} activities as '${status}'?`)) return;

        setIsUpdatingStatus(true);
        try {
            await api.put('/activities/status', { ids: selectedLogs, status });
            toast.success(`Updated ${selectedLogs.length} activities`);
            setSelectedLogs([]);
            fetchLogs(); // Refresh
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    useEffect(() => {
        fetchLaboratories();
    }, []);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            let query = '/activities/?';
            if (viewMode === 'default') {
                query += 'pending_only=true&';
            }

            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (actionFilter) query += `action_type=${actionFilter}&`;

            if (targetFilter) query += `target_type=${targetFilter}&`;
            if (showAll) query += `show_all=true&`;

            const res = await api.get(query);
            // Sort by date desc
            const sortedLogs = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLogs(sortedLogs);
            setCurrentPage(1);
        } catch (err) {
            console.error("Failed to fetch logs", err);
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    }, [labFilter, actionFilter, targetFilter, showAll, viewMode]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs, refreshKey]);

    const fetchLaboratories = async () => {
        try {
            const res = await api.get('/laboratories/');
            const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setLaboratories(sorted);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const toggleExpand = (id) => {
        setExpandedLogs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleShowComponentLogs = (name, logs) => {
        setSelectedComponentName(name);
        setSelectedComponentLogs(logs);
        setShowComponentModal(true);
    };

    const handleCloseComponentModal = () => {
        setShowComponentModal(false);
        setSelectedComponentLogs([]);
        setSelectedComponentName("");
    };

    const handleSendReport = async () => {
        setSendingReport(true);
        try {
            await api.post('/activities/report');
            toast.success("Activity report sent successfully!");
            setShowSendModal(false);
            setRefreshKey(prev => prev + 1); // Refresh to clear pending logs
        } catch (error) {
            console.error("Failed to send report", error);
            toast.error("Failed to send activity report.");
        } finally {
            setSendingReport(false);
        }
    };

    const TargetIcon = ({ type }) => {
        switch (type) {
            case 'laboratory': return <DoorClosed />;
            case 'computer_set': return <PcDisplay />;
            case 'component': return <Keyboard />;
            default: return <Pc />;
        }
    };

    const parseMetadata = (metadata) => {
        try {
            const parsed = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            if (parsed && parsed.snapshot) {
                return parsed;
            } else {
                return {
                    snapshot: {
                        account: { name: 'Unknown' },
                        target: {}
                    },
                    changes: parsed
                };
            }
        } catch {
            return { snapshot: {}, changes: {} };
        }
    };

    const formatContext = (snapshot) => {
        if (!snapshot || !snapshot.target) return null;
        const t = snapshot.target;

        const parts = [];
        if (t.laboratory) parts.push(`${t.laboratory.name}`);
        if (t.computer_set) parts.push(`${t.computer_set.name}`);
        if (t.component) parts.push(`${t.component.brand_name} (${t.component.type.toUpperCase()})`);

        if (parts.length === 0) return null;

        return (
            <div className="text-muted small mt-1 d-flex gap-2">
                <span>{parts.join(' > ')}</span>
            </div>
        );
    };

    const renderChanges = (changes) => {
        if (!changes || Object.keys(changes).length === 0) return <div className="text-muted small fst-italic">No specific field changes recorded.</div>;

        return (
            <div className="bg-body-secondary px-3 py-2 rounded small">
                {Object.entries(changes).map(([field, value]) => (
                    <div key={field} className="d-flex align-items-center">
                        <strong className="me-2 text-capitalize">{field.replace(/_/g, ' ')}:</strong>
                        {value && typeof value === 'object' && 'previous' in value ? (
                            <div className="d-flex align-items-center flex-wrap">
                                <span className="text-secondary text-decoration-line-through me-2">{String(value.previous)}</span>
                                <span className="text-muted mx-1">&rarr;</span>
                                <span className="text-success fw-bold">{String(value.current)}</span>
                            </div>
                        ) : (
                            <span>{JSON.stringify(value)}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    // Grouping Logic
    const groupLogs = (logsToGroup) => {
        const labs = {};

        logsToGroup.forEach(log => {
            const meta = parseMetadata(log.metadata);
            const snapshot = meta.snapshot?.target || {};

            // Level 0: Laboratory
            const labKey = snapshot.laboratory?.name || "General / Unassigned Laboratory";

            if (!labs[labKey]) {
                // Try to find description from fetched laboratories
                const labId = snapshot.laboratory?.id;
                const labInfo = laboratories.find(l => l.id === labId);

                labs[labKey] = {
                    name: labKey,
                    description: labInfo?.description || "",
                    sets: {}
                };
            }

            // Level 1: Computer Set
            let setKey = snapshot.computer_set?.name || "General Lab Activities";

            if (!labs[labKey].sets[setKey]) {
                labs[labKey].sets[setKey] = {
                    name: setKey,
                    isSet: !!snapshot.computer_set,
                    components: {},
                    rootLogs: []
                };
            }

            // Level 2: Component (if applicable)
            if (log.target_type === 'component') {
                let compKey = snapshot.component
                    ? `${snapshot.component.brand_name || 'Generic'} (${snapshot.component.type || 'Component'})`
                    : "Unknown Component";

                if (!labs[labKey].sets[setKey].components[compKey]) {
                    labs[labKey].sets[setKey].components[compKey] = [];
                }
                labs[labKey].sets[setKey].components[compKey].push({ log, meta });
            } else {
                // It's a Set or Lab log
                labs[labKey].sets[setKey].rootLogs.push({ log, meta });
            }
        });

        return labs;
    };

    const renderLogCard = (log, metaData) => {
        const snapshotUser = metaData.snapshot?.account?.name;
        const user = (snapshotUser && snapshotUser !== 'Unknown') ? snapshotUser : log.user_name;

        return (
            <Card key={log.id} className="border-0 bg-body rounded-0 border-bottom">
                <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex gap-3">
                            <div>
                                <div className="fs-6 mb-1 d-flex align-items-center gap-2">
                                    <span className='fw-bold'>{log.summary}</span>
                                </div>

                                {formatContext(metaData.snapshot)}
                            </div>
                        </div>

                        <Button
                            variant="link"
                            size="sm"
                            className="text-decoration-none text-muted"
                            onClick={() => toggleExpand(log.id)}
                        >
                            {expandedLogs[log.id] ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                    </div>

                    <Collapse in={expandedLogs[log.id]}>
                        <div className="">
                            <div className="bg-transparent rounded py-3">
                                {renderChanges(metaData.changes)}

                                <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center pt-1 text-truncate">
                                    <span className="text-muted text-nowrap small">{user}</span>
                                    <span className="text-muted mx-2 small d-none d-md-inline">•</span>
                                    <span className="text-muted small">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Collapse>
                </Card.Body>
            </Card>
        );
    };

    const renderSetAccordion = (sets) => {
        const sortedSets = Object.values(sets).sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true })
        );

        return (
            <Accordion defaultActiveKey={[]} alwaysOpen>
                {sortedSets.map((group, groupIdx) => (
                    <Accordion.Item eventKey={String(groupIdx)} key={group.name} className="border-bottom shadow overflow-hidden rounded-top-0">
                        <Accordion.Header>
                            <div className="d-flex align-items-center gap-2">
                                {group.isSet ? <PcDisplay size={18} /> : <Building size={18} />}
                                <span className="fw-bold">{group.name}</span>
                                <Badge bg="primary" pill className="ms-2">
                                    {group.rootLogs.length + Object.values(group.components).reduce((a, b) => a + b.length, 0)}
                                </Badge>
                            </div>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">

                            {/* 1. Root Logs (Set/Lab Actions) */}
                            {group.rootLogs.length > 0 && (
                                <div className="px-0">
                                    {
                                        group.rootLogs.map(({ log, meta }) => renderLogCard(log, meta))
                                    }
                                </div>
                            )}

                            {Object.keys(group.components).length > 0 && (
                                <div className="mt-3 px-3 pb-3">

                                    {/* 2. Component Groups as Buttons */}
                                    <div className="d-flex flex-wrap gap-2">
                                        {Object.entries(group.components).map(([compName, compLogs]) => (
                                            <Button
                                                key={compName}
                                                variant="outline-primary"
                                                size="sm"
                                                className="d-flex align-items-center gap-2 rounded-pill"
                                                onClick={() => handleShowComponentLogs(compName, compLogs)}
                                            >
                                                <Keyboard size={14} />
                                                <span className="fw-semibold">{compName}</span>
                                                <Badge bg="primary" className="ms-1 rounded-pill">{compLogs.length}</Badge>
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Accordion.Body>
                    </Accordion.Item>
                ))}
            </Accordion>
        );
    };

    const groupedLabs = groupLogs(currentLogs);
    const labKeys = Object.keys(groupedLabs);
    const multipleLabs = labKeys.length > 1;

    // Sort labs by name (handling 'CL 1', 'CL 2' numerically)
    const sortedLabs = Object.values(groupedLabs).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    return (
        <div className="container-fluid py-3 position-relative" style={{ minHeight: '100vh' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
                <div className="h4 mb-0">Activity Timeline</div>

                <ButtonGroup>
                    <ToggleButton
                        key="default"
                        id="radio-default"
                        type="radio"
                        variant={viewMode === 'default' ? 'primary' : 'outline-primary'}
                        name="radio"
                        value="default"
                        checked={viewMode === 'default'}
                        onChange={(e) => {
                            setViewMode(e.currentTarget.value);
                            setRefreshKey(prev => prev + 1); // Refresh when toggling
                        }}
                    >
                        Pending Report
                    </ToggleButton>
                    <ToggleButton
                        key="all"
                        id="radio-all"
                        type="radio"
                        variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
                        name="radio"
                        value="all"
                        checked={viewMode === 'all'}
                        onChange={(e) => {
                            setViewMode(e.currentTarget.value);
                            setRefreshKey(prev => prev + 1);
                        }}
                    >
                        View All
                    </ToggleButton>
                </ButtonGroup>
            </div>

            {/* Filters (Only for 'All' mode) */}
            {viewMode === 'all' && (
                <div className="card mb-4 border-0 shadow-sm">
                    <div className="card-body bg-body-tertiary rounded">
                        <div className="row g-3 align-items-center">
                            <div className="col-md-3">
                                <Form.Select value={labFilter} onChange={(e) => setLabFilter(e.target.value)} size="sm">
                                    <option value="">All Laboratories</option>
                                    {laboratories.map(lab => (
                                        <option key={lab.id} value={lab.id}>{lab.name}</option>
                                    ))}
                                </Form.Select>
                            </div>
                            <div className="col-md-3">
                                <Form.Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} size="sm">
                                    <option value="">All Actions</option>
                                    <option value="create">Create</option>
                                    <option value="update">Update</option>
                                    <option value="delete">Delete</option>
                                    <option value="status_change">Status Change</option>
                                </Form.Select>
                            </div>
                            <div className="col-md-3">
                                <Form.Select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} size="sm">
                                    <option value="">All Targets</option>
                                    <option value="laboratory">Laboratory</option>
                                    <option value="computer_set">Computer Set</option>
                                    <option value="component">Component</option>
                                </Form.Select>
                            </div>

                            <div className="col-md-3 d-flex gap-2 justify-content-end">
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setLabFilter(''); setActionFilter(''); setTargetFilter(''); }} title="Clear Filters">
                                    <Backspace />
                                </button>
                                <button className="btn btn-sm btn-outline-primary" onClick={handleRefresh} title="Refresh">
                                    <ArrowClockwise />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {
                loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="row justify-content-center">
                            <div className="container p-0">
                                {currentLogs.length === 0 ? (
                                    <div className="text-center text-muted py-5">No activities found.</div>
                                ) : (
                                    <>
                                        {viewMode === 'default' ? (
                                            // 1. Grouped View (Timeline) for Pending Logs
                                            <div className="d-flex flex-column gap-3">
                                                {multipleLabs ? (
                                                    <Accordion defaultActiveKey={['0']} alwaysOpen>
                                                        {sortedLabs.map((lab, idx) => (
                                                            <Accordion.Item eventKey={String(idx)} key={lab.name}>
                                                                <Accordion.Header>
                                                                    <div className="d-flex align-items-center gap-3 w-100">
                                                                        <DoorClosed size={24} className="text-body" />
                                                                        <div className="d-flex flex-column">
                                                                            <span className="h4 mb-0 text-body fw-bold">{lab.name}</span>
                                                                            {lab.description && <span className="text-muted fw-normal">{lab.description}</span>}
                                                                        </div>
                                                                    </div>
                                                                </Accordion.Header>
                                                                <Accordion.Body className="p-0 bg-transparent">
                                                                    {renderSetAccordion(lab.sets)}
                                                                </Accordion.Body>
                                                            </Accordion.Item>
                                                        ))}
                                                    </Accordion>
                                                ) : (
                                                    // Single Lab view - just show the sets
                                                    renderSetAccordion(Object.values(groupedLabs)[0]?.sets || {})
                                                )}
                                            </div>
                                        ) : (
                                            // 2. Table View for All History
                                            <>
                                                {/* Bulk Action Toolbar */}
                                                {viewMode === 'all' && canManageLogs && selectedLogs.length > 0 && (
                                                    <div className="bg-primary-subtle border border-primary text-primary px-3 py-2 rounded mb-3 d-flex align-items-center justify-content-between">
                                                        <span className="fw-bold">{selectedLogs.length} Selected</span>
                                                        <div className="d-flex gap-2">
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() => handleBatchStatusUpdate('skipped')}
                                                                disabled={isUpdatingStatus}
                                                            >
                                                                Mark as Checked
                                                            </Button>
                                                            <Button
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                onClick={() => setSelectedLogs([])}
                                                                disabled={isUpdatingStatus}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                <Card className="border-0 shadow-sm">
                                                    <Table hover responsive className="mb-0 align-middle">
                                                        <thead className="bg-light">
                                                            <tr>
                                                                {canManageLogs && viewMode === 'all' && (
                                                                    <th style={{ width: '40px' }} className="text-center">
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            checked={currentLogs.length > 0 && currentLogs.every(log => selectedLogs.includes(log.id))}
                                                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                                                        />
                                                                    </th>
                                                                )}
                                                                <th>Time</th>
                                                                <th>User</th>
                                                                <th>Action</th>
                                                                <th>Target</th>
                                                                <th>Summary</th>
                                                                <th className="text-end">Details</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {currentLogs.map(log => {
                                                                const meta = parseMetadata(log.metadata);
                                                                const isSelected = selectedLogs.includes(log.id);
                                                                return (
                                                                    <React.Fragment key={log.id}>
                                                                        <tr className={`${expandedLogs[log.id] ? "bg-light" : ""} ${isSelected ? "table-primary" : ""}`}>
                                                                            {canManageLogs && viewMode === 'all' && (
                                                                                <td className="text-center">
                                                                                    <Form.Check
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => handleSelect(log.id)}
                                                                                    />
                                                                                </td>
                                                                            )}
                                                                            <td className="text-nowrap text-muted small">
                                                                                {new Date(log.created_at).toLocaleString()}
                                                                                {log.email_notification_status === 'skipped' && <Badge bg="secondary" className="ms-2">Checked</Badge>}
                                                                                {log.email_notification_status === 'sent' && <Badge bg="success" className="ms-2">Sent</Badge>}
                                                                            </td>
                                                                            <td>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <PersonCircle className="text-secondary" />
                                                                                    <span className="fw-semibold small">{log.user_name}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td>
                                                                                <Badge bg={
                                                                                    log.action_type === 'create' ? 'success' :
                                                                                        log.action_type === 'update' ? 'warning' :
                                                                                            log.action_type === 'delete' ? 'danger' : 'info'
                                                                                } className="text-uppercase rounded-pill" style={{ fontSize: '0.7em' }}>
                                                                                    {log.action_type}
                                                                                </Badge>
                                                                            </td>
                                                                            <td>
                                                                                <div className="d-flex align-items-center gap-2">
                                                                                    <TargetIcon type={log.target_type} />
                                                                                    <span className="text-capitalize small">{log.target_type.replace('_', ' ')}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td>{log.summary}</td>
                                                                            <td className="text-end">
                                                                                <Button
                                                                                    variant="link"
                                                                                    size="sm"
                                                                                    className="p-0 text-muted"
                                                                                    onClick={() => toggleExpand(log.id)}
                                                                                >
                                                                                    {expandedLogs[log.id] ? <ChevronUp /> : <ChevronDown />}
                                                                                </Button>
                                                                            </td>
                                                                        </tr>
                                                                        {expandedLogs[log.id] && (
                                                                            <tr>
                                                                                <td colSpan={canManageLogs && viewMode === 'all' ? "7" : "6"} className="p-0 border-0">
                                                                                    <div className="p-3 bg-body-tertiary border-bottom">
                                                                                        <div className="mb-2">
                                                                                            <strong>Context:</strong>
                                                                                            {formatContext(meta.snapshot)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <strong>Changes:</strong>
                                                                                            {renderChanges(meta.changes)}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                </Card>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 d-flex justify-content-center">
                            <Pagination
                                itemsPerPage={itemsPerPage}
                                totalItems={logs.length}
                                paginate={paginate}
                                currentPage={currentPage}
                            />
                        </div>
                    </>
                )}


            {/* Component Logs Modal */}
            <Modal show={showComponentModal} onHide={handleCloseComponentModal} size="lg" centered scrollable>
                <Modal.Header closeButton>
                    <Modal.Title className="h5 d-flex align-items-center gap-2">
                        <span className='text-capitalize'>{selectedComponentName}</span>
                        <Badge bg="primary" className="ms-2 small rounded-pill">{selectedComponentLogs.length}</Badge>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-body-tertiary p-0">
                    {selectedComponentLogs.map(({ log, meta }) => renderLogCard(log, meta))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseComponentModal}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Send Report FAB (Admin Only) - ONLY VISIBLE IN DEFAULT MODE */}
            {
                user?.role === 'admin' && viewMode === 'default' && (
                    <>
                        <Button
                            variant="primary"
                            className="position-fixed bottom-0 end-0 m-4 rounded-circle shadow d-flex align-items-center justify-content-center"
                            style={{ width: '60px', height: '60px', zIndex: 1050 }}
                            onClick={() => setShowSendModal(true)}
                            title="Send Activity Report"
                        >
                            <Send size={24} />
                        </Button>

                        <Modal show={showSendModal} onHide={() => setShowSendModal(false)} centered>
                            <Modal.Header closeButton>
                                <Modal.Title>Send Activity Report</Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                <p>Are you sure you want to email the <strong>period (pending)</strong> activity report to all administrators?</p>
                                <p className="text-muted small mb-0">This will mark the currently displayed activities as 'sent' and remove them from the pending view.</p>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowSendModal(false)} disabled={sendingReport}>
                                    Cancel
                                </Button>
                                <Button variant="primary" onClick={handleSendReport} disabled={sendingReport}>
                                    {sendingReport ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="me-2" />
                                            Send Report
                                        </>
                                    )}
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </>
                )
            }
        </div >
    );
};

export default ActivityLogsPage;
