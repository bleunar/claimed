import React from 'react';
import CollapsibleActions from './CollapsibleActions';

const LaboratoryCard = ({ lab, canManage, onEdit, onDelete, onNavigate }) => {
    return (
        <div className="col p-2">
            <div
                className="card bg-body-secondary h-100 shadow-sm hover-shadow"
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onNavigate(lab.id)}
            >
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                        <h4 className="card-title mb-1">{lab.name}</h4>

                        {canManage && (
                            <div className="action-bar-container" onClick={(e) => e.stopPropagation()}>
                                <style>
                                    {`
                                        .action-btn {
                                            background: none;
                                            border: none;
                                            padding: 4px;
                                            cursor: pointer;
                                            transition: color 0.2s;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                        }
                                        .action-btn:hover {
                                            opacity: 0.7;
                                        }
                                        .desktop-actions {
                                            display: none;
                                        }
                                        
                                        @media (max-width: 767.98px) {
                                            .mobile-actions {
                                                display: flex;
                                                gap: 8px;
                                            }
                                            .desktop-trigger {
                                                display: none;
                                            }
                                        }

                                        @media (min-width: 768px) {
                                            .mobile-actions {
                                                display: none;
                                            }
                                            .desktop-trigger {
                                                display: block;
                                            }
                                        }
                                    `}
                                </style>

                                <CollapsibleActions
                                    onEdit={() => onEdit(lab)}
                                    onDelete={() => onDelete(lab.id)}
                                />
                            </div>
                        )}
                    </div>

                    <h6 className="card-subtitle mb-2 text-muted">{lab.location}</h6>
                    <p className="card-text text-truncate">{lab.description}</p>
                </div>
            </div>
        </div>
    );
};

export default LaboratoryCard;
