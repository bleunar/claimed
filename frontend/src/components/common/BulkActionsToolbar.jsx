import React from 'react';
import { CheckCircleFill } from 'react-bootstrap-icons';

/**
 * BulkActionsToolbar - Reusable toolbar for bulk operations
 * 
 * @param {number} selectedCount - Number of selected items
 * @param {function} onClear - Callback when Clear Selection is clicked
 * @param {function} onAction - Callback when primary action button is clicked
 * @param {string} actionLabel - Label for the primary action button
 * @param {boolean} disabled - Whether buttons should be disabled
 */
const BulkActionsToolbar = ({
    selectedCount,
    onClear,
    onAction,
    actionLabel = 'Update Selection',
    disabled = false
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="card mb-3 border-0 shadow-sm">
            <div className="card-body bg-body rounded shadow-sm p-2 d-flex align-items-center justify-content-center flex-wrap gap-2">
                <div className="row w-100 align-items-center">
                    <div className="col-12 col-md-6 p-0 text-center text-md-start mb-2 mb-md-0">
                        <span className='fw-bold text-body'>
                            <CheckCircleFill className="me-2 text-claims-primary" />
                            {selectedCount} Item{selectedCount !== 1 ? 's' : ''} Selected
                        </span>
                    </div>
                    <div className="col-12 col-md-6 p-0">
                        <div className="d-flex justify-content-center justify-content-md-end gap-2">
                            <button
                                className="btn btn-sm btn-secondary border-0 text-nowrap text-decoration-none"
                                onClick={onClear}
                                disabled={disabled}
                            >
                                Clear Selection
                            </button>
                            <button
                                className="btn btn-sm btn-claims-primary text-nowrap text-decoration-none"
                                onClick={onAction}
                                disabled={disabled}
                            >
                                {actionLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkActionsToolbar;
