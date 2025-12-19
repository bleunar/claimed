import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Badge, Card, Collapse, Form, Button, Accordion, Modal, Spinner, Table, ButtonGroup, ToggleButton } from 'react-bootstrap';
import toast from 'react-hot-toast';
import { Backspace, ArrowClockwise, ChevronDown, ChevronUp, PersonCircle, Calendar3, Laptop, PcDisplay, Building, HddStack, DoorClosed, Keyboard, Pc, Send, Person, ClockHistory } from 'react-bootstrap-icons';
import Pagination from '../components/Pagination';

const ActivityLogsPage = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [laboratories, setLaboratories] = useState([]);

    // View Mode: 'default' (Grouped) or 'all' (List / History)
    const [viewMode, setViewMode] = useState('default');

    // Filters for 'All' mode
    const [labFilter, setLabFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [targetFilter, setTargetFilter] = useState('');

    // Pagination (for 'All' mode only)
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    // Expanded State for details
    const [expandedLogs, setExpandedLogs] = useState({});

    // State to trigger manual refresh
    const [refreshKey, setRefreshKey] = useState(0);

    // Modal State for Set History
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);

    const [showSendModal, setShowSendModal] = useState(false);
    const [sendingReport, setSendingReport] = useState(false);

    // Bulk Actions State
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Email Recipient List State
    const [recipientList, setRecipientList] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);

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
            const ids = currentLogs.map(log => log.id);
            setSelectedLogs(prev => [...new Set([...prev, ...ids])]);
        } else {
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

            // In default mode, fetch pending only (or sufficient recent ones) to build the dashboard
            if (viewMode === 'default') {
                query += 'pending_only=true&limit=200&';
            } else {
                query += 'show_all=true&limit=100&'; // Limit for list view to avoid overload
            }

            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (actionFilter) query += `action_type=${actionFilter}&`;
            if (targetFilter) query += `target_type=${targetFilter}&`;

            const res = await api.get(query);
            const sortedLogs = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLogs(sortedLogs);
            setCurrentPage(1);
        } catch (err) {
            console.error("Failed to fetch logs", err);
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    }, [labFilter, actionFilter, targetFilter, viewMode]);

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

    // Fetch History for a specific Set
    const fetchSetHistory = async (setId, setName, labName) => {
        setSelectedSet({ name: setName, labName });
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            // Updated backend allows filtering by set_target_id
            const res = await api.get(`/activities/?set_target_id=${setId}&show_all=true&limit=50`);
            const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setHistoryLogs(sorted);
        } catch (err) {
            console.error("Failed to fetch history", err);
            toast.error("Failed to fetch history");
        } finally {
            setHistoryLoading(false);
        }
    };

    // Pagination Logic (Only for 'all' mode)
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLogs = viewMode === 'all' ? logs.slice(indexOfFirstItem, indexOfLastItem) : logs; // In default, grouping handles all
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const toggleExpand = (id) => {
        setExpandedLogs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleCloseHistoryModal = () => {
        setShowHistoryModal(false);
        setHistoryLogs([]);
        setSelectedSet(null);
    };

    const handleSendReport = async (recipientIds) => {
        if (!recipientIds || recipientIds.length === 0) {
            toast.error("Please select at least one recipient");
            return;
        }

        setSendingReport(true);
        try {
            await api.post('/activities/report', { recipient_ids: recipientIds });
            toast.success("Activity report sent successfully");
            setShowSendModal(false);
            fetchLogs();
        } catch (err) {
            console.error("Failed to send report", err);
            toast.error(err.response?.data?.msg || "Failed to send report");
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

    const renderLogCard = (log, metaData, minimal = false) => {
        const snapshotUser = metaData.snapshot?.account?.name;
        const user = (snapshotUser && snapshotUser !== 'Unknown') ? snapshotUser : log.user_name;

        return (
            <Card key={log.id} className="border-0 bg-body rounded-0 border-bottom">
                <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex gap-3">
                            <div>
                                <div className="fs-6 mb-1 d-flex align-items-center gap-2">
                                    <Badge bg={
                                        log.action_type === 'create' ? 'success' :
                                            log.action_type === 'update' ? 'warning' :
                                                log.action_type === 'delete' ? 'danger' : 'info'
                                    } className="text-uppercase rounded-pill" style={{ fontSize: '0.6em' }}>
                                        {log.action_type}
                                    </Badge>
                                    <span className='fw-bold'>{log.summary}</span>
                                </div>
                                {!minimal && formatContext(metaData.snapshot)}
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

    // Grouping Logic for Default View
    const groupLogs = (logsToGroup) => {
        const labs = {};

        logsToGroup.forEach(log => {
            const meta = parseMetadata(log.metadata);
            const snapshot = meta.snapshot?.target || {};

            // Determine Laboratory
            // Prefer existing laboratory record id to group correctly even if names differ slightly logs
            // But we display by name.
            // Let's use ID as primary key if available, else name.
            const labId = snapshot.laboratory?.id || log.lab_target_id;
            const labName = snapshot.laboratory?.name || log.laboratory_name || laboratories.find(l => l.id === labId)?.name || "General Laboratory";

            if (!labs[labName]) {
                labs[labName] = {
                    name: labName,
                    id: labId,
                    generalLogs: [],
                    sets: {} // Map: SetID -> { name, logs: [], lastUpdate }
                };
            }

            // Determine if Set-related
            const setId = snapshot.computer_set?.id || log.set_target_id;
            const setName = snapshot.computer_set?.name || log.computer_set_name;

            if (setId) {
                // It is a set-related log (Set or Component)
                const sName = setName || "Unknown Set";

                if (!labs[labName].sets[setId]) {
                    labs[labName].sets[setId] = {
                        id: setId,
                        name: sName,
                        logs: [],
                        lastUpdate: log.created_at // Init with current as we iterate
                    };
                }

                // Update last updated if current log is newer (though list is sorted desc, so first seen is newest)
                if (new Date(log.created_at) > new Date(labs[labName].sets[setId].lastUpdate)) {
                    labs[labName].sets[setId].lastUpdate = log.created_at;
                }

                labs[labName].sets[setId].logs.push({ log, meta });

            } else {
                // Lab-level or General
                labs[labName].generalLogs.push({ log, meta });
            }
        });

        return labs;
    };

    const groupedLabs = groupLogs(currentLogs);
    const sortedLabs = Object.values(groupedLabs).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return (
        <div className="container-fluid py-3 position-relative" style={{ minHeight: '100vh' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
                <div className="h4 mb-0">Activity Timeline</div>
                <ButtonGroup>
                    <ToggleButton
                        key="default" size='sm' id="radio-default" type="radio" variant={viewMode === 'default' ? 'primary' : 'outline-primary'}
                        name="radio" value="default" checked={viewMode === 'default'}
                        onChange={(e) => { setViewMode(e.currentTarget.value); setRefreshKey(prev => prev + 1); }}
                    >
                        Grouped View
                    </ToggleButton>
                    <ToggleButton
                        key="all" size='sm' id="radio-all" type="radio" variant={viewMode === 'all' ? 'primary' : 'outline-primary'}
                        name="radio" value="all" checked={viewMode === 'all'}
                        onChange={(e) => { setViewMode(e.currentTarget.value); setRefreshKey(prev => prev + 1); }}
                    >
                        List View
                    </ToggleButton>
                </ButtonGroup>
            </div>

            {/* Filters (Only for 'All' mode) */}
            {viewMode === 'all' && (
                <div className="card mb-4 border-0 shadow-sm">
                    <div className="card-body bg-body-tertiary rounded border-0">
                        <div className="row g-3 align-items-center">
                            <div className="col-md-3">
                                <Form.Select value={labFilter} onChange={(e) => setLabFilter(e.target.value)} size="sm">
                                    <option value="">All Laboratories</option>
                                    {laboratories.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
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
                                <button className="btn btn-sm btn-outline-secondary" onClick={() => { setLabFilter(''); setActionFilter(''); setTargetFilter(''); }}><Backspace /></button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setRefreshKey(prev => prev + 1)}><ArrowClockwise /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : (
                <>
                    {viewMode === 'default' ? (
                        /* GROUPED VIEW */
                        <div className="d-flex flex-column gap-3">
                            {sortedLabs.length === 0 && <div className="text-center text-muted py-5">No recent activities found.</div>}

                            {sortedLabs.map((lab, idx) => (
                                <Accordion defaultActiveKey={['0']} alwaysOpen key={lab.name} className="shadow-sm">
                                    <Accordion.Item eventKey={String(idx)}>
                                        <Accordion.Header>
                                            <div className="d-flex align-items-center gap-3 w-100">
                                                <DoorClosed size={24} className="text-body" />
                                                <div className="d-flex flex-column">
                                                    <span className="h5 mb-0 text-body fw-bold">{lab.name}</span>
                                                    <span className="text-muted small">
                                                        {Object.keys(lab.sets).length} Computer Sets &bull; {lab.generalLogs.length} General Activities
                                                    </span>
                                                </div>
                                            </div>
                                        </Accordion.Header>
                                        <Accordion.Body className="bg-light p-3">

                                            {/* 1. General Lab Activities */}
                                            {lab.generalLogs.length > 0 && (
                                                <div className="mb-4">
                                                    <h6 className="text-muted text-uppercase small fw-bold mb-2">General Laboratory Updates</h6>
                                                    <div className="card border-0">
                                                        {lab.generalLogs.map(({ log, meta }) => renderLogCard(log, meta, true))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2. Computer Sets Grid */}
                                            {Object.keys(lab.sets).length > 0 && (
                                                <div>
                                                    <h6 className="text-muted text-uppercase small fw-bold mb-2">Computer Set Activities</h6>
                                                    <div className="row g-3">
                                                        {Object.values(lab.sets)
                                                            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                                                            .map(set => (
                                                                <div className="col-md-6 col-lg-4 col-xl-3" key={set.id}>
                                                                    <div className="card h-100 border-0 shadow-sm">
                                                                        <div className="card-body d-flex flex-column">
                                                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                                                <PcDisplay className="text-primary" size={20} />
                                                                                <h6 className="card-title mb-0 fw-bold">{set.name}</h6>
                                                                            </div>
                                                                            <div className="text-muted small mb-3 flex-grow-1">
                                                                                {set.logs.length} pending updates
                                                                                <br />
                                                                                {new Date(set.lastUpdate).toLocaleString()}
                                                                            </div>
                                                                            <Button
                                                                                variant="outline-primary"
                                                                                size="sm"
                                                                                className="mt-auto w-100 d-flex align-items-center justify-content-center gap-2"
                                                                                onClick={() => fetchSetHistory(set.id, set.name, lab.name)}
                                                                            >
                                                                                <ClockHistory /> View History
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}

                                            {lab.generalLogs.length === 0 && Object.keys(lab.sets).length === 0 && (
                                                <div className="text-muted small fst-italic">No active logs.</div>
                                            )}

                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                            ))}
                        </div>
                    ) : (
                        /* LIST VIEW (Legacy Table) */
                        <>
                            {currentLogs.length === 0 ? (
                                <div className="text-center text-muted py-5">No activities found.</div>
                            ) : (
                                <>
                                    {/* Bulk Toolbar */}
                                    {canManageLogs && selectedLogs.length > 0 && (
                                        <div className="bg-primary-subtle border border-primary text-primary px-3 py-2 rounded mb-3 d-flex align-items-center justify-content-between">
                                            <span className="fw-bold">{selectedLogs.length} Selected</span>
                                            <div className="d-flex gap-2">
                                                <Button variant="outline-primary" size="sm" onClick={() => handleBatchStatusUpdate('skipped')} disabled={isUpdatingStatus}>Mark as Checked</Button>
                                                <Button variant="outline-secondary" size="sm" onClick={() => setSelectedLogs([])} disabled={isUpdatingStatus}>Cancel</Button>
                                            </div>
                                        </div>
                                    )}

                                    <Card className="border-0 shadow-sm">
                                        <Table hover responsive className="mb-0 align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    {canManageLogs && <th style={{ width: '40px' }}><Form.Check type="checkbox" checked={currentLogs.length > 0 && currentLogs.every(log => selectedLogs.includes(log.id))} onChange={(e) => handleSelectAll(e.target.checked)} /></th>}
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
                                                                {canManageLogs && <td><Form.Check type="checkbox" checked={isSelected} onChange={() => handleSelect(log.id)} /></td>}
                                                                <td className="text-nowrap text-muted small">
                                                                    {new Date(log.created_at).toLocaleString()}
                                                                    {log.email_notification_status === 'skipped' && <Badge bg="secondary" className="ms-2">Checked</Badge>}
                                                                    {log.email_notification_status === 'sent' && <Badge bg="success" className="ms-2">Sent</Badge>}
                                                                </td>
                                                                <td><div className="d-flex align-items-center gap-2"><PersonCircle className="text-secondary" /><span className="fw-semibold small">{log.user_name}</span></div></td>
                                                                <td>
                                                                    <Badge bg={
                                                                        log.action_type === 'create' ? 'success' :
                                                                            log.action_type === 'update' ? 'warning' :
                                                                                log.action_type === 'delete' ? 'danger' : 'info'
                                                                    } className="text-uppercase rounded-pill" style={{ fontSize: '0.7em' }}>
                                                                        {log.action_type}
                                                                    </Badge>
                                                                </td>
                                                                <td><div className="d-flex align-items-center gap-2"><TargetIcon type={log.target_type} /><span className="text-capitalize small">{log.target_type.replace('_', ' ')}</span></div></td>
                                                                <td>{log.summary}</td>
                                                                <td className="text-end">
                                                                    <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => toggleExpand(log.id)}>
                                                                        {expandedLogs[log.id] ? <ChevronUp /> : <ChevronDown />}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                            {expandedLogs[log.id] && (
                                                                <tr><td colSpan={canManageLogs ? "7" : "6"} className="p-0 border-0"><div className="p-3 bg-body-tertiary border-bottom"><div className="mb-2"><strong>Context:</strong>{formatContext(meta.snapshot)}</div><div><strong>Changes:</strong>{renderChanges(meta.changes)}</div></div></td></tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </Card>
                                    <div className="mt-4 d-flex justify-content-center">
                                        <Pagination itemsPerPage={itemsPerPage} totalItems={logs.length} paginate={paginate} currentPage={currentPage} />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            {/* History Modal */}
            <Modal show={showHistoryModal} onHide={handleCloseHistoryModal} size="lg" centered scrollable>
                <Modal.Header closeButton>
                    <Modal.Title className="h5 d-flex flex-column">
                        <div className="d-flex align-items-center gap-2">
                            <PcDisplay />
                            <span>{selectedSet?.name}</span>
                        </div>
                        <small className="text-muted fw-normal fs-6">{selectedSet?.labName}</small>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-body-tertiary p-0">
                    {historyLoading ? (
                        <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
                    ) : (
                        <>
                            {historyLogs.length === 0 ? (
                                <div className="text-center text-muted py-5">No history found.</div>
                            ) : (
                                historyLogs.map(log => {
                                    const meta = parseMetadata(log.metadata);
                                    return renderLogCard(log, meta, false);
                                })
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseHistoryModal}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Helper FAB (Admin Only) */}
            {user?.role === 'admin' && viewMode === 'default' && (
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
                    <Modal show={showSendModal} onHide={() => setShowSendModal(false)} centered onShow={() => {
                        // Fetch recipients when modal opens
                        const fetchRecipients = async () => {
                            try {
                                const res = await api.get('/accounts/?status=active');
                                const recipients = res.data.accounts.filter(acc => ['admin', 'it_head', 'lab_head'].includes(acc.role));
                                // Sort: Admin first, then Heads
                                recipients.sort((a, b) => {
                                    const roleOrder = { 'admin': 1, 'it_head': 2, 'lab_head': 3 };
                                    if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
                                    return a.name.localeCompare(b.name);
                                });
                                setRecipientList(recipients);
                                // Default selection: IT Head roles
                                const defaultSelected = recipients.filter(r => r.role === 'it_head').map(r => r.id);
                                setSelectedRecipients(defaultSelected);
                            } catch (err) {
                                console.error("Failed to fetch recipients", err);
                                toast.error("Failed to load recipient list");
                            }
                        };
                        fetchRecipients();
                    }}>
                        <Modal.Header closeButton>
                            <Modal.Title>Send Activity Report</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <p>Are you sure you want to <strong>send the Laboratory Activity Report</strong> to the following accounts?</p>

                            <div className="mt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="fw-bold text-secondary mb-0" style={{ fontSize: '0.85rem' }}>RECIPIENTS:</h6>
                                    <div className="btn-group btn-group-sm">
                                        <button className="btn btn-link text-decoration-none py-0 px-1 small" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedRecipients(recipientList.map(r => r.id))}>Select All</button>
                                        <button className="btn btn-link text-decoration-none py-0 px-1 small" style={{ fontSize: '0.8rem' }} onClick={() => setSelectedRecipients([])}>Clear</button>
                                    </div>
                                </div>

                                <div className="p-2 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {recipientList.length > 0 ? (
                                        <ul className="list-unstyled mb-0 small">
                                            {recipientList.map(u => {
                                                const isSelected = selectedRecipients.includes(u.id);
                                                return (
                                                    <li key={u.id}
                                                        className={`d-flex align-items-center p-2 mb-1 rounded cursor-pointer user-select-none ${isSelected ? 'bg-primary-subtle border border-primary-subtle' : 'bg-body-tertiary border'}`}
                                                        onClick={() => {
                                                            setSelectedRecipients(prev =>
                                                                prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                                                            );
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => { }} // Handled by li click
                                                            className="me-2 pointer-events-none"
                                                        />
                                                        <Person className="text-secondary me-2" size={14} />
                                                        <span className="fw-semibold text-truncate" style={{ maxWidth: '180px' }}>{u.name}</span>
                                                        <Badge bg={u.role === 'admin' ? 'danger' : u.role === 'it_head' ? 'primary' : 'info'} className="text-uppercase small ms-auto rounded-pill" style={{ fontSize: '0.65rem' }}>{u.role.replace('_', ' ')}</Badge>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-muted small p-3">Loading recipients...</div>
                                    )}
                                </div>
                                <div className="text-end mt-1">
                                    <small className="text-muted">{selectedRecipients.length} selected</small>
                                </div>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowSendModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={() => handleSendReport(selectedRecipients)} disabled={sendingReport}>{sendingReport ? <Spinner size="sm" /> : "Send Report"}</Button>
                        </Modal.Footer>
                    </Modal>
                </>
            )}
        </div>
    );
};

export default ActivityLogsPage;
