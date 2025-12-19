import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Tabs, Tab, Form, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { Search, Backspace, ArrowClockwise, ExclamationTriangleFill, CheckCircle, ChatLeftText, Trash, PencilSquare, InfoCircle, Envelope, Eye, Plus } from 'react-bootstrap-icons';

const LaboratoryIssuesPage = () => {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState(''); // Client-side or new endpoint param? Currently backend issues list doesn't support search. It's okay, maybe simple client filter for now or just skip text search if backend doesn't have it.
    // Wait, implementation plan says "Filters (Status, Priority, Lab)". Backend supports these.
    // Layout requires "Search (Title)". I should add search param to backend or client side filter.
    // Let's implement client side search for title/desc for simplicity as list is limited to 100? No, list has no limit in code (pagination added here).
    // Let's rely on backend filters and maybe add filtering later if needed, or simple client processing for now.

    const [activeTab, setActiveTab] = useState('flags');
    const [dateFilter, setDateFilter] = useState('today');
    // Status filter removed as it is controlled by tabs
    const [priorityFilter, setPriorityFilter] = useState('');
    const [labFilter, setLabFilter] = useState('');

    const [laboratories, setLaboratories] = useState([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingIssue, setEditingIssue] = useState(null);
    const [formData, setFormData] = useState({
        status: '',
        resolution_notes: ''
    });
    // State for Issue Selection
    const [selectedIssueIds, setSelectedIssueIds] = useState([]);

    // State for Submit Issue Modal
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitFormData, setSubmitFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        laboratory_id: '',
        computer_set_id: '',
        component_id: ''
    });
    const [selectableSets, setSelectableSets] = useState([]);
    const [selectableComponents, setSelectableComponents] = useState([]);

    // State for View Modal
    const [viewingIssue, setViewingIssue] = useState(null);



    // State for Recipient Modal
    const [showSendModal, setShowSendModal] = useState(false);
    const [recipientList, setRecipientList] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [sendingEmail, setSendingEmail] = useState(false);

    // ... (Existing state: showModal, editingIssue, formData) ...

    // Batch Update State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchStatus, setBatchStatus] = useState('');
    const [batchNotes, setBatchNotes] = useState('');

    const handleBatchUpdate = async () => {
        if (!batchStatus) return;

        if (!confirm(`Are you sure you want to update ${selectedIssueIds.length} issues to '${batchStatus}'?`)) return;

        try {
            await api.put('/issues/batch', {
                ids: selectedIssueIds,
                status: batchStatus,
                resolution_notes: batchNotes
            });
            toast.success(`Updated ${selectedIssueIds.length} issues`);
            setShowBatchModal(false);
            setBatchStatus('');
            setBatchNotes('');
            setSelectedIssueIds([]);
            fetchIssues();
        } catch (err) {
            console.error("Batch update failed", err);
            toast.error(err.response?.data?.msg || "Failed to update issues");
        }
    };

    const isHead = ['admin', 'it_head', 'lab_head'].includes(user?.role);

    const fetchLaboratories = async () => {
        try {
            const res = await api.get('/laboratories/');
            const sortedLabs = res.data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setLaboratories(sortedLabs);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        }
    };

    const fetchIssues = async () => {
        setLoading(true);
        try {
            let query = `/issues/?`;
            if (activeTab) query += `tab=${activeTab}&`;
            if (dateFilter && dateFilter !== 'all') query += `date_filter=${dateFilter}&`;
            if (priorityFilter) query += `priority=${priorityFilter}&`;
            if (labFilter) query += `laboratory_id=${labFilter}&`;

            const res = await api.get(query);
            setIssues(res.data);
        } catch (err) {
            console.error("Failed to fetch issues", err);
            toast.error("Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

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

    const fetchSelectableSets = async (labId) => {
        if (!labId) {
            setSelectableSets([]);
            return;
        }
        try {
            const res = await api.get(`/computer-sets/?laboratory_id=${labId}`);
            setSelectableSets(res.data);
        } catch (err) {
            console.error("Failed to fetch computer sets", err);
        }
    };

    const fetchSelectableComponents = async (setId) => {
        if (!setId) {
            setSelectableComponents([]);
            return;
        }
        try {
            const res = await api.get(`/components/?computer_set_id=${setId}`);
            setSelectableComponents(res.data);
        } catch (err) {
            console.error("Failed to fetch components", err);
        }
    };

    const handleLabChange = (labId) => {
        setSubmitFormData(prev => ({ ...prev, laboratory_id: labId, computer_set_id: '', component_id: '' }));
        fetchSelectableSets(labId);
        setSelectableComponents([]);
    };

    const handleSetChange = (setId) => {
        setSubmitFormData(prev => ({ ...prev, computer_set_id: setId, component_id: '' }));
        fetchSelectableComponents(setId);
    };

    const handleIssueSubmit = async (e, shouldEmail = false) => {
        // e might be null if called programmatically
        if (e && e.preventDefault) e.preventDefault();

        try {
            const res = await api.post('/issues/', submitFormData);
            toast.success("Issue reported successfully");
            setShowSubmitModal(false);
            fetchIssues();

            // Reset form
            setSubmitFormData({
                title: '',
                description: '',
                priority: 'medium',
                laboratory_id: '',
                computer_set_id: '',
                component_id: ''
            });

            if (shouldEmail) {
                const newIssueId = res.data.id;
                setSelectedIssueIds([newIssueId]);
                fetchRecipients();
                setShowSendModal(true);
            }

        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to submit issue");
        }
    };

    const handleSelectIssue = (id) => {
        setSelectedIssueIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleView = (issue) => {
        setViewingIssue(issue);
    };



    const handleSendReport = async () => {
        if (selectedRecipients.length === 0) {
            toast.error("Please select at least one recipient");
            return;
        }
        setSendingEmail(true);
        try {
            await api.post('/issues/email', {
                issue_ids: selectedIssueIds,
                recipient_ids: selectedRecipients
            });
            toast.success("Issue report emailed successfully");
            setShowSendModal(false);
            setSelectedIssueIds([]);
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to send email");
        } finally {
            setSendingEmail(false);
        }
    };

    useEffect(() => {
        fetchLaboratories();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchIssues();
        }, 500);
        return () => clearTimeout(timer);
    }, [activeTab, dateFilter, priorityFilter, labFilter]);

    const handleEdit = (issue) => {
        setEditingIssue(issue);
        setFormData({
            status: issue.status,
            resolution_notes: issue.resolution_notes || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/issues/${editingIssue.id}`, formData);
            toast.success("Issue updated successfully");
            setShowModal(false);
            fetchIssues();
        } catch (err) {
            toast.error(err.response?.data?.msg || "Failed to update issue");
        }
    };

    const handleClearFilters = () => {
        setSearch('');
        setLabFilter('');
        setPriorityFilter('');
        setCurrentPage(1);
    };

    // Derived state for client-side search (Title/Desc)
    const filteredIssues = issues.filter(i => {
        if (!search) return true;
        const term = search.toLowerCase();
        return i.title.toLowerCase().includes(term) || i.description.toLowerCase().includes(term);
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentIssues = filteredIssues.slice(indexOfFirstItem, indexOfLastItem);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const getPriorityBadge = (p) => {
        switch (p) {
            case 'critical': return <span className="badge bg-danger text-uppercase">Critical</span>;
            case 'high': return <span className="badge bg-warning text-dark text-uppercase">High</span>;
            case 'medium': return <span className="badge bg-secondary text-uppercase">Medium</span>;
            case 'low': return <span className="badge bg-light text-dark border text-uppercase">Low</span>;
            default: return <span className="badge bg-secondary">Unknown</span>;
        }
    };

    const getStatusBadge = (s) => {
        switch (s) {
            case 'new': return <span className="badge bg-primary">New</span>;
            case 'open': return <span className="badge bg-info text-dark">Open</span>;
            case 'in_progress': return <span className="badge bg-warning text-dark">In Progress</span>;
            case 'resolved': return <span className="badge bg-success">Resolved</span>;
            case 'closed': return <span className="badge bg-secondary">Closed</span>;
            case 'wont_fix': return <span className="badge bg-dark">Won't Fix</span>;
            default: return <span className="badge bg-secondary">{s}</span>;
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIssueIds(currentIssues.map(i => i.id));
        } else {
            setSelectedIssueIds([]);
        }
    };

    return (
        <div className="container-fluid py-3">
            {/* ... (Existing Header and Filters) ... */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className='h4 mb-0'>Laboratory Issues</div>
                {isHead && (
                    <Button variant="primary" size='sm' onClick={() => setShowSubmitModal(true)} title='Submit New Issue'>
                        <Plus className="me-0 me-md-1 d-inline d-md-none" /> <span className='d-none d-md-inline'>Create Issue Report</span>
                    </Button>
                )}
            </div>

            {/* Filters UI (keeping existing structure) */}
            <div className="card mb-4 overflow-hidden">
                <div className="card-body bg-body-tertiary">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text"><Search /></span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search Title or Description"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-sm-6 col-md-3">
                            <select
                                className="form-select"
                                value={labFilter}
                                onChange={(e) => setLabFilter(e.target.value)}
                            >
                                <option value="">All Laboratories</option>
                                {laboratories.map(lab => (
                                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-sm-6 col-md-3">
                            <select
                                className="form-select"
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="">All Priorities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="d-flex justify-content-center justify-content-md-start align-items-center">
                                <ToggleButtonGroup type="radio" name="dateFilter" value={dateFilter} onChange={(val) => setDateFilter(val)} className='bg-body-secondary'>
                                    <ToggleButton id="tbg-btn-1" value="today" variant="outline-primary" className='text-nowrap border-0' size="sm">Today</ToggleButton>
                                    <ToggleButton id="tbg-btn-2" value="week" variant="outline-primary" className='text-nowrap border-0' size="sm">This Week</ToggleButton>
                                    <ToggleButton id="tbg-btn-3" value="month" variant="outline-primary" className='text-nowrap border-0' size="sm">This Month</ToggleButton>
                                    <ToggleButton id="tbg-btn-4" value="all" variant="outline-primary" className='text-nowrap border-0' size="sm">All Time</ToggleButton>
                                </ToggleButtonGroup>
                            </div>
                        </div>


                        <div className="col-12 col-md-6">
                            <div className="d-flex justify-content-end justify-content-md-end gap-2 b">
                                <button type="button" className="btn btn-sm btn-link border-0" onClick={() => fetchIssues()} title="Refresh">Refresh</button>
                                <button type="button" className="btn btn-sm btn-link border-0" onClick={() => handleClearFilters}> Clear Filters</button>
                                <button type="button" className="btn btn-sm btn-primary border-0" onClick={() => handleClearFilters}><Search /> <span>Search</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Toolbar */}
            {isHead && selectedIssueIds.length > 0 && (
                <div className="bg-primary-subtle border border-primary text-primary px-3 py-2 rounded mb-3 d-flex align-items-center justify-content-between">
                    <span className="fw-bold">{selectedIssueIds.length} Selected</span>
                    <div className="d-flex gap-2">
                        <Button variant="outline-primary" size="sm" onClick={() => setShowBatchModal(true)}>Update Status</Button>
                        <Button variant="outline-primary" size="sm" onClick={() => { fetchRecipients(); setShowSendModal(true); }}>Email Report</Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => setSelectedIssueIds([])}>Cancel</Button>
                    </div>
                </div>
            )}

            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-3"
            >
                <Tab eventKey="flags" title="Flags (New Issues)" />
                <Tab eventKey="active" title="Active" />
                <Tab eventKey="closed" title="Closed" />
            </Tabs>

            {/* Table */}
            <div className="card border-0">
                <div className="table-responsive border-0">
                    <table className="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                {isHead && (
                                    <th className='text-center' style={{ width: '40px' }}>
                                        <Form.Check
                                            type="checkbox"
                                            checked={currentIssues.length > 0 && selectedIssueIds.length === currentIssues.length}
                                            onChange={handleSelectAll}
                                            disabled={currentIssues.length === 0}
                                        />
                                    </th>
                                )}
                                <th>Issue Details</th>
                                <th>Target</th>
                                <th className="text-center">Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isHead ? "7" : "6"} className="text-center py-4">Loading...</td></tr>
                            ) : currentIssues.length === 0 ? (
                                <tr><td colSpan={isHead ? "7" : "6"} className="text-center py-4">No issues found.</td></tr>
                            ) : (
                                currentIssues.map(issue => (
                                    <tr key={issue.id} className={selectedIssueIds.includes(issue.id) ? 'table-primary' : ''}>
                                        {isHead && (
                                            <td className='text-center'>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedIssueIds.includes(issue.id)}
                                                    onChange={() => handleSelectIssue(issue.id)}
                                                />
                                            </td>
                                        )}
                                        <td>
                                            <div className="fw-bold mb-1 text-truncate">
                                                {getPriorityBadge(issue.priority)} {issue.title}
                                            </div>
                                            <div className="text-muted text-truncate mb-2" style={{ maxWidth: '400px' }} title={issue.description}>
                                                {issue.description}
                                            </div>
                                            <div className="small text-muted d-flex align-items-center gap-2">
                                                <span className="fw-medium text-body">{issue.flagged_by_name}</span>
                                                <span className="text-body">|</span>
                                                <span className='text-body'>{new Date(issue.created_at).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1 align-items-start">
                                                <Link to={`/dashboard/laboratories/${issue.laboratory_id}`} className="badge bg-primary text-decoration-none fw-semibold">
                                                    {issue.laboratory_name}
                                                </Link>
                                                {issue.computer_set_name && (
                                                    <Link
                                                        to={`/dashboard/laboratories/${issue.laboratory_id}?set=${issue.computer_set_id}&components=true`}
                                                        className="badge bg-primary text-decoration-none"
                                                    >
                                                        {issue.computer_set_name}
                                                    </Link>
                                                )}
                                                {issue.component_brand && (
                                                    <small className="text-muted">
                                                        Comp: {issue.component_brand}
                                                    </small>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {getStatusBadge(issue.status)}
                                            {issue.resolved_by && <div className="small text-success mt-1">by {issue.resolved_by_name}</div>}
                                        </td>
                                        <td className="text-end">
                                            <div className="d-flex justify-content-end gap-2">
                                                {issue.resolution_notes && (
                                                    <button className="btn btn-sm" title={`Notes: ` + issue.resolution_notes}>
                                                        <ChatLeftText />
                                                    </button>
                                                )}

                                                <button className="btn btn-sm btn-outline-primary border-0" onClick={() => handleView(issue)} title="View Details">
                                                    <Eye />
                                                </button>

                                                {isHead && (
                                                    <button
                                                        className="btn btn-sm btn-outline-primary border-0"
                                                        onClick={() => {
                                                            setSelectedIssueIds([issue.id]);
                                                            fetchRecipients();
                                                            setShowSendModal(true);
                                                        }}
                                                        title="Email this Issue"
                                                    >
                                                        <Envelope />
                                                    </button>
                                                )}
                                                <button className="btn btn-sm btn-outline-primary border-0" onClick={() => handleEdit(issue)} title="Update Status">
                                                    <PencilSquare />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination
                itemsPerPage={itemsPerPage}
                totalItems={filteredIssues.length}
                paginate={paginate}
                currentPage={currentPage}
            />

            {/* SEND REPORT FAB (Admin/Head Only, when issues selected) */}
            {isHead && selectedIssueIds.length > 0 && (
                <Button
                    variant="primary"
                    className="position-fixed bottom-0 end-0 m-4 rounded-circle shadow d-flex align-items-center justify-content-center"
                    style={{ width: '60px', height: '60px', zIndex: 1050 }}
                    onClick={() => {
                        fetchRecipients();
                        setShowSendModal(true);
                    }}
                    title="Send Issue Report"
                >
                    <ChatLeftText size={24} /> {/* Using ChatLeftText as icon, or Import 'Send' or 'Envelope' */}
                </Button>
            )}

            {/* Update Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Update Issue</Modal.Title>
                </Modal.Header>
                <form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="mb-3">
                            <label className="form-label">Status</label>
                            <select
                                className="form-select"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="new">New</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                                <option value="wont_fix">Won't Fix</option>
                            </select>
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Resolution Notes</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={formData.resolution_notes}
                                onChange={(e) => setFormData({ ...formData, resolution_notes: e.target.value })}
                                placeholder="Add details about the resolution..."
                            ></textarea>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Update Issue</Button>
                    </Modal.Footer>
                </form>
            </Modal>

            {/* Send Report Modal */}
            <Modal show={showSendModal} onHide={() => setShowSendModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Email Selected Issues</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>You are about to email a report containing <strong>{selectedIssueIds.length}</strong> selected issues to the following recipients:</p>

                    <div className="mt-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="fw-bold mb-0" style={{ fontSize: '0.85rem' }}>RECIPIENTS:</h6>
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
                                                className={`d-flex align-items-center p-2 mb-1 rounded cursor-pointer user-select-none ${isSelected ? 'bg-body' : 'bg-body-tertiary'}`}
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
                    <Button variant="secondary" onClick={() => setShowSendModal(false)} disabled={sendingEmail}>Cancel</Button>
                    <Button variant="primary" onClick={handleSendReport} disabled={sendingEmail || selectedRecipients.length === 0}>
                        {sendingEmail ? 'Sending...' : 'Send Email'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Submit Issue Modal */}
            <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)} size="lg" backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Submit Issue</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <div className="row g-3">
                            <div className="col-md-9">
                                <Form.Group>
                                    <Form.Label>Issue Title <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={submitFormData.title}
                                        onChange={e => setSubmitFormData({ ...submitFormData, title: e.target.value })}
                                        placeholder="Brief summary of the issue"
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-md-3">
                                <Form.Group>
                                    <Form.Label>Priority</Form.Label>
                                    <Form.Select
                                        value={submitFormData.priority}
                                        onChange={e => setSubmitFormData({ ...submitFormData, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-12">
                                <Form.Group>
                                    <Form.Label>Description <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={4}
                                        value={submitFormData.description}
                                        onChange={e => setSubmitFormData({ ...submitFormData, description: e.target.value })}
                                        placeholder="Detailed description of the problem..."
                                    />
                                </Form.Group>
                            </div>

                            <hr className="my-3" />
                            <h6 className="text-muted small text-uppercase">Context (Optional)</h6>

                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Laboratory</Form.Label>
                                    <Form.Select
                                        value={submitFormData.laboratory_id}
                                        onChange={e => handleLabChange(e.target.value)}
                                    >
                                        <option value="">-- General / None --</option>
                                        {laboratories.map(lab => (
                                            <option key={lab.id} value={lab.id}>{lab.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Computer Set</Form.Label>
                                    <Form.Select
                                        value={submitFormData.computer_set_id}
                                        onChange={e => handleSetChange(e.target.value)}
                                        disabled={!submitFormData.laboratory_id}
                                    >
                                        <option value="">-- None --</option>
                                        {selectableSets.map(set => (
                                            <option key={set.id} value={set.id}>{set.set_name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-4">
                                <Form.Group>
                                    <Form.Label>Component</Form.Label>
                                    <Form.Select
                                        value={submitFormData.component_id}
                                        onChange={e => setSubmitFormData({ ...submitFormData, component_id: e.target.value })}
                                        disabled={!submitFormData.computer_set_id}
                                    >
                                        <option value="">-- None --</option>
                                        {selectableComponents.map(comp => (
                                            <option key={comp.id} value={comp.id}>{comp.brand_name} ({comp.component_type})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                    <Button
                        variant="outline-primary"
                        onClick={() => handleIssueSubmit(null, true)}
                        disabled={!submitFormData.title || !submitFormData.description}
                    >
                        Submit & Email
                    </Button>
                    <Button
                        variant="primary"
                        onClick={(e) => handleIssueSubmit(e, false)}
                        disabled={!submitFormData.title || !submitFormData.description}
                    >
                        Submit Issue
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Batch Update Modal */}
            <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Update {selectedIssueIds.length} Issues</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <Form.Label>New Status</Form.Label>
                        <Form.Select
                            value={batchStatus}
                            onChange={(e) => setBatchStatus(e.target.value)}
                        >
                            <option value="">-- Select Status --</option>
                            <option value="new">New</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                            <option value="wont_fix">Won't Fix</option>
                        </Form.Select>
                    </div>
                    <div className="mb-3">
                        <Form.Label>Resolution Notes (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={batchNotes}
                            onChange={(e) => setBatchNotes(e.target.value)}
                            placeholder="Add notes for this batch update..."
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBatchModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleBatchUpdate} disabled={!batchStatus}>Update All</Button>
                </Modal.Footer>
            </Modal>

            {/* View Issue Modal */}
            <Modal show={!!viewingIssue} onHide={() => setViewingIssue(null)} size="lg" centered>
                {viewingIssue && (
                    <>
                        <Modal.Header closeButton>
                            <Modal.Title className="d-flex align-items-center gap-2">
                                Detail View
                                {getPriorityBadge(viewingIssue.priority)}
                                {getStatusBadge(viewingIssue.status)}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="row g-3">
                                <div className="col-12">
                                    <h5 className="mb-3">{viewingIssue.title}</h5>
                                    <div className="p-3 rounded border">
                                        <h6 className="text-muted small text-uppercase fw-bold mb-2">Description</h6>
                                        <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{viewingIssue.description}</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="p-3 border rounded h-100">
                                        <h6 className="text-muted small text-uppercase fw-bold mb-3">Target Info</h6>
                                        <div className="mb-2"><strong>Lab:</strong> {viewingIssue.laboratory_name}</div>
                                        {viewingIssue.computer_set_name && <div className="mb-2"><strong>Set:</strong> {viewingIssue.computer_set_name}</div>}
                                        {viewingIssue.component_brand && <div><strong>Component:</strong> {viewingIssue.component_brand} ({viewingIssue.component_type})</div>}
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="p-3 border rounded h-100">
                                        <h6 className="text-muted small text-uppercase fw-bold mb-3">Report Info</h6>
                                        <div className="mb-2"><strong>By:</strong> {viewingIssue.flagged_by_name}</div>
                                        <div><strong>Date:</strong> {new Date(viewingIssue.created_at).toLocaleString()}</div>
                                    </div>
                                </div>
                                {viewingIssue.resolution_notes && (
                                    <div className="col-12">
                                        <div className="p-3 bg-success-subtle border border-success-subtle rounded">
                                            <h6 className="text-success small text-uppercase fw-bold mb-2">Resolution</h6>
                                            <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>{viewingIssue.resolution_notes}</p>
                                            {viewingIssue.resolved_by && <small className="text-muted">Resolved by: {viewingIssue.resolved_by_name}</small>}
                                            {/* Submit Issue Modal Removed from here */}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setViewingIssue(null)}>Close</Button>
                            {isHead && (
                                <Button
                                    variant="outline-primary"
                                    onClick={() => {
                                        setViewingIssue(null);
                                        handleEdit(viewingIssue);
                                    }}
                                >
                                    <PencilSquare className="me-2" /> Edit Issue
                                </Button>
                            )}
                        </Modal.Footer>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default LaboratoryIssuesPage;
