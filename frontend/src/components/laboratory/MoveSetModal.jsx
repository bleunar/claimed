import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const MoveSetModal = ({ show, onHide, computerSetIds, currentLocationId, onMoveSuccess }) => {
    const [locations, setLocations] = useState([]);
    const [targetLocation, setTargetLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (show) {
            fetchLocations();
            setTargetLocation('');
        }
    }, [show]);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const res = await api.get('/locations/');
            // Filter out current location (can't move to where we are)
            // Note: backend 'list_locations' endpoint already handles dept scoping for heads.
            const available = res.data.filter(l => l.id !== currentLocationId);
            setLocations(available);

            if (available.length > 0) {
                // Pre-select first valid option if available, or stay empty
                // setTargetLocation(available[0].id);
            }
        } catch (err) {
            console.error("Failed to fetch locations", err);
            toast.error("Failed to load available locations");
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        if (!targetLocation) return;
        setSubmitting(true);
        try {
            // We can reuse the same pattern as batch update: Promise.all
            // But we might want to do it in the parent? 
            // The plan said "Call PUT /computer-sets/:id for each ID".

            const promises = computerSetIds.map(id =>
                api.put(`/computer-sets/${id}`, { location_id: targetLocation })
            );

            await Promise.all(promises);

            toast.success(`Successfully moved ${computerSetIds.length} computer set(s)`);
            if (onMoveSuccess) onMoveSuccess();
            onHide();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.msg || "Failed to move computer sets");
        } finally {
            setSubmitting(false);
        }
    };

    // Find name of current location for display context if possible? 
    // Not critical, but nice. We don't have the list of ALL locations easily available to look up 'currentLocationId'.
    // We can assume user knows where they are or just say "Move to..."

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Move Computer Set{computerSetIds.length > 1 ? 's' : ''}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <p>Select the new location for the <strong>{computerSetIds.length}</strong> selected computer set{computerSetIds.length > 1 ? 's' : ''}.</p>

                    {loading ? (
                        <div className="text-center py-3"><span className="spinner-border text-primary"></span></div>
                    ) : locations.length === 0 ? (
                        <div className="alert alert-warning">No other compatible locations found to move to.</div>
                    ) : (
                        <Form.Group>
                            <Form.Label>Target Location</Form.Label>
                            <Form.Select
                                value={targetLocation}
                                onChange={(e) => setTargetLocation(e.target.value)}
                                autoFocus
                            >
                                <option value="" disabled hidden>Select a location...</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name} {loc.department_name ? `(${loc.department_name})` : ''} ({loc.type})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide} disabled={submitting}>Cancel</Button>
                <Button
                    variant="primary"
                    onClick={handleMove}
                    disabled={submitting || !targetLocation || loading}
                >
                    {submitting ? 'Moving...' : 'Move Here'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MoveSetModal;
