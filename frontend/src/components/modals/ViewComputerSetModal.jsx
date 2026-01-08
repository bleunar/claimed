import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useTitle } from '../../context/TitleContext';

// Natural sort comparator for names with numbers (Lab 1, Lab 2... Lab 10, not Lab 1, Lab 10, Lab 2)
const naturalSort = (a, b, key) => {
    return a[key].localeCompare(b[key], undefined, { numeric: true, sensitivity: 'base' });
};

const ViewComputerSetModal = ({ show, onHide }) => {
    const navigate = useNavigate();
    const [locations, setLocations] = useState([]);
    const [computerSets, setComputerSets] = useState([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingComputerSets, setLoadingComputerSets] = useState(false);
    const { setTitle, resetTitle } = useTitle()

    useEffect(() => {
        if (show) {
            setTitle("Computer Set")
        } else {
            resetTitle()
        }
    }, [show])

    // Fetch laboratories on mount
    useEffect(() => {
        if (show) {
            fetchLocations();
        }
    }, [show]);

    // Fetch computer sets when lab changes
    useEffect(() => {
        if (selectedLab) {
            fetchComputerSets(selectedLab);
        } else {
            setComputerSets([]);
        }
    }, [selectedLab]);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            // Only fetch laboratory-type locations
            const response = await api.get('/locations/');
            setLocations(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch locations', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComputerSets = async (labId) => {
        setLoadingComputerSets(true);
        try {
            // Use query parameter, not nested route
            const response = await api.get(`/computer-sets/?location_id=${labId}`);
            // API returns array directly
            setComputerSets(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch computer sets', err);
        } finally {
            setLoadingComputerSets(false);
        }
    };

    const handleClose = () => {
        setSelectedLab('');
        setComputerSets([]);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton className='border-0'>
                <Modal.Title>View Computer Set</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Laboratory</Form.Label>
                    <Form.Select
                        value={selectedLab}
                        onChange={(e) => setSelectedLab(e.target.value)}
                        disabled={loading || (!loading && locations.length === 0)}
                    >
                        {loading ? (
                            <option value="" hidden>Loading...</option>
                        ) : locations.length === 0 ? (
                            <option value="" disabled>None</option>
                        ) : (
                            <>
                                <option value="" hidden disabled>Select the target location</option>
                                {[...locations].sort((a, b) => naturalSort(a, b, 'name')).map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </>
                        )}
                    </Form.Select>
                </Form.Group>

                {
                    computerSets.length > 0 && !loadingComputerSets ? (
                        <Form.Group className="mb-3">
                            <div className='p mb-3 mt-4 text-center text-muted'>Select the computer you want to view</div>
                            <div className="d-flex flex-wrap gap-2">
                                {
                                    [...computerSets].sort((a, b) => naturalSort(a, b, 'set_name')).map((cs) => (
                                        <div
                                            key={cs.id}
                                            className="badge bg-claims-primary p-2 cursor-pointer hover-shadow"
                                            onClick={() => {
                                                navigate(`/dashboard/locations/${selectedLab}?set=${cs.id}&components=true`);
                                                handleClose();
                                            }}
                                            style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                                            title="Click to view details"
                                        >
                                            {cs.set_name}
                                        </div>
                                    ))
                                }
                            </div>
                        </Form.Group>
                    ) : (
                        <>
                            {
                                selectedLab && (
                                    <div className="text-muted text-center small">No Computers available for this location</div>
                                )
                            }

                            {
                                !selectedLab && (
                                    <div className="text-muted text-center small">Select a target location</div>
                                )
                            }
                        </>
                    )
                }
            </Modal.Body>
            <Modal.Footer className='border-0'>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ViewComputerSetModal;
