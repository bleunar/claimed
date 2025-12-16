import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge, Tabs, Tab, Form, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';
import { Search, Backspace, ArrowClockwise, ExclamationTriangleFill, CheckCircle, ChatLeftText, Trash, PencilSquare, InfoCircle } from 'react-bootstrap-icons';

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
        setSearch(''); // Client side only if we implement it
        setLabFilter('');
        // setStatusFilter(''); // Removed
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

    useEffect(() => {
        toast("Reporting System is still in development");
    }, [])

    return (
        <div className="container-fluid py-3">
            <div className='h4 mb-3'>Laboratory Issues</div>

            {/* Filters */}
            <div className="card mb-4 overflow-hidden">
                <div className="card-body bg-body-tertiary">
                    <div className="row g-3 align-items-end">
                        <div className="col-md-4">
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
                        <div className="col-12">
                            <div className="row row-cols-md-2">
                                <div className="col d-flex justify-content-center justify-content-md-start">
                                    <ToggleButtonGroup type="radio" name="dateFilter" value={dateFilter} onChange={(val) => setDateFilter(val)}>
                                        <ToggleButton id="tbg-btn-1" value="today" variant="outline-primary" className='text-nowrap' size="sm">Today</ToggleButton>
                                        <ToggleButton id="tbg-btn-2" value="week" variant="outline-primary" className='text-nowrap' size="sm">This Week</ToggleButton>
                                        <ToggleButton id="tbg-btn-3" value="month" variant="outline-primary" className='text-nowrap' size="sm">This Month</ToggleButton>
                                        <ToggleButton id="tbg-btn-4" value="all" variant="outline-primary" className='text-nowrap' size="sm">All Time</ToggleButton>
                                    </ToggleButtonGroup>
                                </div>
                                <div className="col d-flex justify-content-end justify-content-md-end gap-2">
                                    <button type="button" className="btn btn-sm btn-outline-primary border-0" onClick={() => fetchIssues()} title="Refresh"><ArrowClockwise /></button>
                                    <button type="button" className="btn btn-sm btn-outline-primary border-0" onClick={() => handleClearFilters}><Backspace /> <span className='d-none d-md-inline'>Clear Filters</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
            <div className="card overflow-hidden border-0">
                <div className="table-responsive border-0">
                    <table className="table table-hover table-striped align-middle mb-0">
                        <thead>
                            <tr>
                                <th className="text-center" style={{ width: '100px' }}>Priority</th>
                                <th>Issue / Description</th>
                                <th>Target</th>
                                <th>Reported By</th>
                                <th className="text-center">Status</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr>
                            ) : currentIssues.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4">No issues found.</td></tr>
                            ) : (
                                currentIssues.map(issue => (
                                    <tr key={issue.id}>
                                        <td className="text-center">
                                            {getPriorityBadge(issue.priority)}
                                        </td>
                                        <td>
                                            <div className="fw-bold">{issue.title}</div>
                                            <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }} title={issue.description}>
                                                {issue.description}
                                            </div>
                                            <div className="small text-muted mt-1">
                                                {new Date(issue.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column">
                                                <Link to={`/dashboard/laboratories/${issue.laboratory_id}`} className="text-decoration-none fw-bold text-dark">
                                                    {issue.laboratory_name}
                                                </Link>
                                                {issue.computer_set_name && (
                                                    <Link
                                                        to={`/dashboard/laboratories/${issue.laboratory_id}?set=${issue.computer_set_id}&components=true`}
                                                        className="badge fw-normal bg-light text-dark border text-decoration-none mt-1"
                                                    >
                                                        {issue.computer_set_name}
                                                    </Link>
                                                )}
                                                {issue.component_brand && (
                                                    <small className="text-muted mt-1">
                                                        Comp: {issue.component_brand}
                                                    </small>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div>{issue.flagged_by_name}</div>
                                        </td>
                                        <td className="text-center">
                                            {getStatusBadge(issue.status)}
                                            {issue.resolved_by && <div className="small text-success mt-1">by {issue.resolved_by_name}</div>}
                                        </td>
                                        <td className="text-end">
                                            <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(issue)} title="Update Status">
                                                <PencilSquare /> Update
                                            </button>
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
        </div>
    );
};

export default LaboratoryIssuesPage;
