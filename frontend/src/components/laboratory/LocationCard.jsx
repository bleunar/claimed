import React from 'react';
import { Card } from 'react-bootstrap';
import { PencilSquare, Trash, Pc, GeoAlt, PcDisplay } from 'react-bootstrap-icons';

const LocationCard = ({ location, canEdit, canDelete, onEdit, onDelete, onNavigate, showLocationType = false, showDepartment = false }) => {
    return (
        <div className="col p-2">
            <Card className="h-100 shadow-sm hover-raised bg-body-secondary">
                <Card.Header className='bg-transparent border-0 p-3 pb-2 cursor-pointer' onClick={() => onNavigate(location.id)}>
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex flex-column" title={location.description}>
                            <Card.Title className="mb-0 h5 fw-semibold text-truncate">{location.name}</Card.Title>
                            {(showLocationType || (showDepartment && location.department_name)) && (
                                <div className="d-flex gap-1 align-items-center flex-wrap mt-1">
                                    {showDepartment && location.department_name && (
                                        <span className="badge bg-claims-primary text-truncate" style={{ maxWidth: '150px' }} title={location.department_description}>
                                            {location.department_name}
                                        </span>
                                    )}
                                    {showLocationType && location.type && (
                                        <span className={`badge bg-claims-primary text-capitalize`}>
                                            {location.type}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Stats Pill */}
                        <div className="d-flex justify-content-center ms-2">
                            <div className="d-flex gap-2 text-muted small rounded bg-body-tertiary border p-1 px-3" title="Computer Sets">
                                <span className="d-flex align-items-center">
                                    <PcDisplay className="me-1" />
                                    {location.computer_set_count || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card.Header>

                <Card.Body className='bg-transparent cursor-pointer py-0' onClick={() => onNavigate(location.id)}>
                    <div className="text-muted" style={{ fontSize: '0.75em' }}>{location.description}</div>
                </Card.Body>

                <Card.Footer className="bg-transparent border-top-0 p-3 d-flex justify-content-end gap-2">
                    <div className="btn-group btn-group-sm rounded overflow-hidden border">
                        {canDelete && (
                            <button
                                className="btn btn-sm text-body bg-body"
                                onClick={(e) => { e.stopPropagation(); onDelete(location.id); }}
                                title="Delete Location"
                            >
                                <Trash />
                            </button>
                        )}
                        {canEdit && (
                            <button
                                className="btn btn-sm text-body bg-body"
                                onClick={(e) => { e.stopPropagation(); onEdit(location); }}
                                title="Edit Location"
                            >
                                <PencilSquare />
                            </button>
                        )}
                        <button
                            className="btn btn-sm btn-claims-primary"
                            onClick={() => onNavigate(location.id)}
                        >
                            View Details
                        </button>
                    </div>
                </Card.Footer>
            </Card>
        </div>
    );
};

export default LocationCard;
