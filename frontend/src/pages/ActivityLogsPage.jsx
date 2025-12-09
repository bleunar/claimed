import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Modal, Button, Form, Row, Col, Table, Badge } from 'react-bootstrap';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';

const ActivityLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [laboratories, setLaboratories] = useState([]);

    // Filters
    const [labFilter, setLabFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [targetFilter, setTargetFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        fetchLaboratories();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [labFilter, actionFilter, targetFilter]);

    const fetchLaboratories = async () => {
        try {
            const res = await api.get('/laboratories/');
            setLaboratories(res.data);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = '/activities/?';
            if (labFilter) query += `laboratory_id=${labFilter}&`;
            if (actionFilter) query += `action_type=${actionFilter}&`;
            if (targetFilter) query += `target_type=${targetFilter}&`;

            const res = await api.get(query);
            setLogs(res.data);
            setCurrentPage(1);
        } catch (err) {
            console.error("Failed to fetch logs", err);
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const getActionBadge = (action) => {
        switch (action) {
            case 'create': return <Badge bg="success">Create</Badge>;
            case 'update': return <Badge bg="warning" text="dark">Update</Badge>;
            case 'delete': return <Badge bg="danger">Delete</Badge>;
            case 'status_change': return <Badge bg="info">Status Change</Badge>;
            default: return <Badge bg="secondary">{action}</Badge>;
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="mb-4">Activity Logs</h2>

            <Row className="mb-3">
                <Col md={3}>
                    <Form.Select value={labFilter} onChange={(e) => setLabFilter(e.target.value)}>
                        <option value="">All Laboratories</option>
                        {laboratories.map(lab => (
                            <option key={lab.id} value={lab.id}>{lab.name}</option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={3}>
                    <Form.Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                        <option value="">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="status_change">Status Change</option>
                    </Form.Select>
                </Col>
                <Col md={3}>
                    <Form.Select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
                        <option value="">All Targets</option>
                        <option value="laboratory">Laboratory</option>
                        <option value="computer_set">Computer Set</option>
                        <option value="component">Component</option>
                    </Form.Select>
                </Col>
            </Row>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <div className="table-responsive">
                        <Table striped hover>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Laboratory</th>
                                    <th>Action</th>
                                    <th>Target</th>
                                    <th>Summary</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                        <td>{log.user_name}</td>
                                        <td>{log.laboratory_name}</td>
                                        <td>{getActionBadge(log.action_type)}</td>
                                        <td>{log.target_type}</td>
                                        <td>{log.summary}</td>
                                        <td>
                                            {log.changes && (
                                                <Button variant="link" size="sm" onClick={() => handleViewDetails(log)}>
                                                    View
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {currentLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center">No logs found</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    <Pagination
                        itemsPerPage={itemsPerPage}
                        totalItems={logs.length}
                        paginate={paginate}
                        currentPage={currentPage}
                    />
                </>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Activity Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedLog && (
                        <div>
                            <p><strong>Summary:</strong> {selectedLog.summary}</p>
                            <p><strong>Changes:</strong></p>
                            <div className="border rounded p-3 bg-light">
                                {(() => {
                                    try {
                                        const changes = JSON.parse(selectedLog.changes);
                                        return (
                                            <div className="d-flex flex-column gap-2">
                                                {Object.entries(changes).map(([field, value]) => (
                                                    <div key={field} className="d-flex align-items-center flex-wrap">
                                                        <strong className="me-2 text-capitalize">{field.replace('_', ' ')}:</strong>
                                                        {value && typeof value === 'object' && 'previous' in value && 'current' in value ? (
                                                            <div className="d-flex align-items-center">
                                                                <span className="text-muted me-2">{String(value.previous)}</span>
                                                                <span className="text-primary mx-2">&rarr;</span>
                                                                <Badge bg="success" className="fs-6">
                                                                    {String(value.current)}
                                                                </Badge>
                                                            </div>
                                                        ) : (
                                                            <span>{JSON.stringify(value)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    } catch (e) {
                                        return <pre>{selectedLog.changes}</pre>;
                                    }
                                })()}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ActivityLogsPage;
