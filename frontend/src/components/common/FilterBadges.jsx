import React from 'react';
import { X, Plus } from 'react-bootstrap-icons';

/**
 * FilterBadges - Reusable filter badges display
 * 
 * @param {Array} filters - Array of {key, label, onRemove} objects
 * @param {function} onAddFilter - Callback when Add/Edit Filter is clicked
 * @param {boolean} hasFilters - Whether any filters are active
 */
const FilterBadges = ({
    filters = [],
    onAddFilter,
    hasFilters = false
}) => {
    return (
        <div className='d-flex gap-2 flex-wrap'>
            {filters.map(filter => (
                <div
                    key={filter.key}
                    className="badge bg-body d-flex justify-content-center align-items-center rounded border text-body p-2 cursor-pointer text-capitalize"
                    onClick={filter.onRemove}
                    title={`Remove filter`}
                >
                    {filter.label}
                    <X className='ms-1 mb-0' />
                </div>
            ))}
            <div
                className="badge bg-body d-flex justify-content-center align-items-center text-body border p-2 cursor-pointer"
                onClick={onAddFilter}
                title='Add Filter'
                style={{ cursor: 'pointer' }}
            >
                {hasFilters ? 'Edit Filters' : 'Add Filter'}
                <Plus className='ms-1 mb-0' />
            </div>
        </div>
    );
};

export default FilterBadges;
