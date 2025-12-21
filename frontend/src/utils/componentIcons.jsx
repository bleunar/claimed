import React from 'react';
import { Pc, Mouse2Fill, KeyboardFill, DisplayFill, WebcamFill, PrinterFill, Headphones, Tools } from 'react-bootstrap-icons';

// Get icon component for a component type
export const getComponentIcon = (type, size = '20px') => {
    switch (type) {
        case 'system_unit': return <Pc size={size} />;
        case 'monitor': return <DisplayFill size={size} />;
        case 'keyboard': return <KeyboardFill size={size} />;
        case 'mouse': return <Mouse2Fill size={size} />;
        case 'web_camera': return <WebcamFill size={size} />;
        case 'printer': return <PrinterFill size={size} />;
        case 'headset': return <Headphones size={size} />;
        case 'avr': return <Tools size={size} />;
        default: return <Tools size={size} />;
    }
};
