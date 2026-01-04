import React from 'react';
import { Search, ArrowClockwise } from 'react-bootstrap-icons';

/**
 * SearchBar - Reusable search input component
 * 
 * @param {string} value - Current search value
 * @param {function} onChange - Callback when search value changes
 * @param {string} placeholder - Placeholder text
 * @param {function} onRefresh - Optional callback for refresh button
 * @param {boolean} showRefresh - Whether to show refresh button
 */
const SearchBar = ({
    value,
    onChange,
    placeholder = 'Search...',
    onRefresh,
    showRefresh = true
}) => {
    return (
        <div className="d-flex gap-2 align-items-center">
            <div className="input-group">
                <span className='btn bg-claims-primary text-white'>
                    <Search />
                </span>
                <input
                    type="text"
                    className="form-control"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
            {showRefresh && onRefresh && (
                <button
                    className='btn btn-outline-secondary'
                    onClick={onRefresh}
                    title="Refresh"
                >
                    <ArrowClockwise />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
