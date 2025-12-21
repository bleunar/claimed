import React, { useState } from 'react';
import { Collapse } from 'react-bootstrap';
import { ThreeDots, PencilSquare, Trash } from 'react-bootstrap-icons';

const CollapsibleActions = ({ onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="d-flex align-items-center justify-content-end">
            <div className="mobile-actions">
                <button className="action-btn" onClick={onEdit} title="Edit">
                    <PencilSquare size={18} />
                </button>
                <button className="action-btn" onClick={onDelete} title="Delete">
                    <Trash size={18} />
                </button>
            </div>

            <div className="desktop-actions d-none d-md-flex align-items-center justify-content-end">
                <div className={`d-flex align-items-center text-body rounded-pill ${isExpanded ? "bg-body" : "bg-transparent"}`}>
                    <Collapse in={isExpanded} dimension="width">
                        <div>
                            <div className="d-flex align-items-center text-nowrap">
                                <button className="action-btn text-primary px-2" onClick={(e) => { e.stopPropagation(); onEdit(); setIsExpanded(false); }} title="Edit">
                                    <PencilSquare size={18} />
                                </button>
                                <button className="action-btn text-danger px-2" onClick={(e) => { e.stopPropagation(); onDelete(); setIsExpanded(false); }} title="Delete">
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    </Collapse>

                    <button
                        className="action-btn rounded-circle bg-transparent"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title={isExpanded ? "Collapse" : "Show Actions"}
                    >
                        <ThreeDots size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleActions;
