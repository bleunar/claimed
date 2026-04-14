// Component type constants shared across the application

export const CORE_COMPONENTS = [
    { label: 'System Unit', value: 'system_unit' },
    { label: 'Monitor', value: 'monitor' },
    { label: 'Keyboard', value: 'keyboard' },
    { label: 'Mouse', value: 'mouse' }
];

export const COMPONENT_TYPES = [
    { label: 'System Unit', value: 'system_unit' },
    { label: 'Monitor', value: 'monitor' },
    { label: 'Keyboard', value: 'keyboard' },
    { label: 'Mouse', value: 'mouse' },
    { label: 'AVR', value: 'avr' },
    { label: 'Camera', value: 'web_camera' },
    { label: 'Printer', value: 'printer' },
    { label: 'Headset', value: 'headset' },
    { label: 'Others', value: 'other' }
];

// Suggested property keys by component type
export const SUGGESTED_KEYS_BY_TYPE = {
    system_unit: ['MODEL', 'NOTES', 'PROCESSOR', 'RAM', 'STORAGE', 'GRAPHICS_CARD', 'OS', 'MOTHERBOARD', 'POWER_SUPPLY', 'WIFI_MAC_ADDRESS'],
    monitor: ['MODEL', 'NOTES', 'SCREEN_SIZE', 'RESOLUTION', 'PANEL_TYPE', 'REFRESH_RATE', 'PORTS'],
    keyboard: ['MODEL', 'NOTES', 'LAYOUT', 'CONNECTION_TYPE', 'BACKLIT'],
    mouse: ['MODEL', 'NOTES', 'DPI', 'CONNECTION_TYPE', 'BUTTONS'],
    avr: ['MODEL', 'NOTES', 'WATTAGE', 'OUTLETS'],
    web_camera: ['MODEL', 'NOTES', 'RESOLUTION', 'FRAMERATE', 'MICROPHONE'],
    printer: ['MODEL', 'NOTES', 'TYPE', 'CONNECTION_TYPE', 'COLOR_SUPPORT'],
    headset: ['MODEL', 'NOTES', 'CONNECTION_TYPE', 'MICROPHONE', 'SURROUND'],
    other: ['MODEL', 'NOTES', 'DESCRIPTION']
};

export const DEFAULT_KEYS = ['MODEL', 'NOTES'];

export const getLabelByValue = (value) => {
    const component = COMPONENT_TYPES.find(type => type.value === value);
    return component ? component.label : 'Unknown Component';
};

/**
 * Get default properties object for a component type
 * @param {string} componentType - The component type (e.g., 'system_unit', 'monitor')
 * @returns {object} - Properties object with keys set to empty strings
 */
export const getDefaultPropertiesForType = (componentType) => {
    const keys = SUGGESTED_KEYS_BY_TYPE[componentType] || DEFAULT_KEYS;
    const properties = {};
    keys.forEach(key => {
        properties[key] = '';
    });
    return properties;
};
