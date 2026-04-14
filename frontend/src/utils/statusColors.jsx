/**
 * Status Color Utility
 * 
 * Provides consistent color mapping for computer set and component statuses
 */

// Computer Set Status Colors
export const COMPUTER_SET_STATUS_COLORS = {
    operational: '#006633',  // Green
    active: '#006633',       // Green (alias)
    maintenance: '#0dcaf0',  // Cyan
};

// Component Status Colors
export const COMPONENT_STATUS_COLORS = {
    good: '#006633',         // Green
    working: '#006633',      // Green (alias)
    bad: '#fd7e14',          // Orange
    defective: '#fd7e14',    // Orange (alias)
    maintenance: '#0dcaf0',  // Cyan
    missing: '#dc3545',      // Red
};

/**
 * Get color for computer set status
 * @param {string} status - The status string (operational, active, maintenance)
 * @returns {string} Hex color code
 */
export const getComputerSetStatusColor = (status) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    return COMPUTER_SET_STATUS_COLORS[normalizedStatus] || '#6c757d'; // Gray as fallback
};

/**
 * Get color for component status
 * @param {string} status - The status string (good, bad, maintenance, missing)
 * @returns {string} Hex color code
 */
export const getComponentStatusColor = (status) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    return COMPONENT_STATUS_COLORS[normalizedStatus] || '#6c757d'; // Gray as fallback
};

/**
 * Get Bootstrap variant class for computer set status
 * @param {string} status - The status string
 * @returns {string} Bootstrap color variant (success, info, etc.)
 */
export const getComputerSetStatusVariant = (status) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    const variantMap = {
        operational: 'success',
        active: 'success',
        maintenance: 'info',
    };
    return variantMap[normalizedStatus] || 'secondary';
};

/**
 * Get Bootstrap variant class for component status
 * @param {string} status - The status string
 * @returns {string} Bootstrap color variant (success, warning, danger, info, etc.)
 */
export const getComponentStatusVariant = (status) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    const variantMap = {
        good: 'success',
        working: 'success',
        bad: 'warning',
        defective: 'warning',
        maintenance: 'info',
        missing: 'danger',
    };
    return variantMap[normalizedStatus] || 'secondary';
};

/**
 * StatusBadge Component - Displays a colored badge for status
 */
export const StatusBadge = ({ status, type = 'component', className = '' }) => {
    const color = type === 'computerSet'
        ? getComputerSetStatusColor(status)
        : getComponentStatusColor(status);

    const variant = type === 'computerSet'
        ? getComputerSetStatusVariant(status)
        : getComponentStatusVariant(status);

    return (
        <span
            className={`badge bg-${variant} ${className}`}
            style={{ backgroundColor: color }}
        >
            {status || 'Unknown'}
        </span>
    );
};

/**
 * StatusDot Component - Displays a small colored dot indicator
 */
export const StatusDot = ({ status, type = 'component', size = 10, className = '' }) => {
    const color = type === 'computerSet'
        ? getComputerSetStatusColor(status)
        : getComponentStatusColor(status);

    return (
        <span
            className={`d-inline-block rounded-circle ${className}`}
            style={{
                width: size,
                height: size,
                backgroundColor: color,
                minWidth: size
            }}
            title={status || 'Unknown'}
        />
    );
};

export default {
    COMPUTER_SET_STATUS_COLORS,
    COMPONENT_STATUS_COLORS,
    getComputerSetStatusColor,
    getComponentStatusColor,
    getComputerSetStatusVariant,
    getComponentStatusVariant,
    StatusBadge,
    StatusDot,
};
