import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const ThemedToaster = () => {
    const { toastPosition, theme } = useTheme();

    return (
        <Toaster
            position={toastPosition}
            reverseOrder={false}
            toastOptions={{
                style: {
                    background: theme === 'dark' ? '#333' : '#fff',
                    color: theme === 'dark' ? '#fff' : '#000',
                },
            }}
        />
    );
};

export default ThemedToaster;
