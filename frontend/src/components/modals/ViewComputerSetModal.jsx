import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

// Natural sort comparator for names with numbers (Lab 1, Lab 2... Lab 10, not Lab 1, Lab 10, Lab 2)
const naturalSort = (a, b, key) => {
    return a[key].localeCompare(b[key], undefined, { numeric: true, sensitivity: 'base' });
};

const ViewComputerSetModal = ({ show, onHide }) => {
    const navigate = useNavigate();
    const [laboratories, setLaboratories] = useState([]);
    const [computerSets, setComputerSets] = useState([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [selectedComputerSet, setSelectedComputerSet] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingComputerSets, setLoadingComputerSets] = useState(false);

    // Fetch laboratories on mount
    useEffect(() => {
        if (show) {
            fetchLaboratories();
        }
    }, [show]);

    // Fetch computer sets when lab changes
    useEffect(() => {
        if (selectedLab) {
            fetchComputerSets(selectedLab);
        } else {
            setComputerSets([]);
            setSelectedComputerSet('');
        }
    }, [selectedLab]);

    const fetchLaboratories = async () => {
        setLoading(true);
        try {
            const response = await api.get('/laboratories');
            // API returns array directly, not {laboratories: [...]}
            setLaboratories(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch laboratories', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComputerSets = async (labId) => {
        setLoadingComputerSets(true);
        try {
            // Use query parameter, not nested route
            const response = await api.get(`/computer-sets?laboratory_id=${labId}`);
            // API returns array directly
            setComputerSets(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch computer sets', err);
        } finally {
            setLoadingComputerSets(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedLab && selectedComputerSet) {
            navigate(`/dashboard/laboratories/${selectedLab}?set=${selectedComputerSet}&components=true`);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedLab('');
        setSelectedComputerSet('');
        setComputerSets([]);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>View Computer Set</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Laboratory</Form.Label>
                        <Form.Select
                            value={selectedLab}
                            onChange={(e) => setSelectedLab(e.target.value)}
                            disabled={loading}
                            required
                        >
                            <option value="" hidden>
                                {loading ? 'Loading...' : 'Select a laboratory'}
                            </option>
                            {[...laboratories].sort((a, b) => naturalSort(a, b, 'name')).map((lab) => (
                                <option key={lab.id} value={lab.id}>
                                    {lab.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Computer Set</Form.Label>
                        <Form.Select
                            value={selectedComputerSet}
                            onChange={(e) => setSelectedComputerSet(e.target.value)}
                            disabled={!selectedLab || loadingComputerSets}
                            required
                        >
                            <option value="" hidden>
                                {loadingComputerSets
                                    ? 'Loading...'
                                    : selectedLab
                                        ? 'Select a computer set'
                                        : 'Select a laboratory first'}
                            </option>
                            {[...computerSets].sort((a, b) => naturalSort(a, b, 'set_name')).map((cs) => (
                                <option key={cs.id} value={cs.id}>
                                    {cs.set_name}
                                </option>
                            ))}
                        </Form.Select>
                        {selectedLab && !loadingComputerSets && computerSets.length === 0 && (
                            <Form.Text className="text-muted">
                                No computer sets found in this laboratory
                            </Form.Text>
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={!selectedLab || !selectedComputerSet}
                    >
                        View Computer Set
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ViewComputerSetModal;
