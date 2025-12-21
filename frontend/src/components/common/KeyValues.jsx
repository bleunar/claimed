import React from 'react';
import { Copy } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

/**
 * KeyValues - Display component for key-value pairs
 * Companion to KeyValueEditor for read-only display
 */
const KeyValues = ({ data, emptyMessage = "No properties defined" }) => {
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                toast.success("Copied!");
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                toast.success("Copied!");
            }
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="text-muted small fst-italic text-center py-2">
                {emptyMessage}
            </div>
        );
    }

    const entries = Object.entries(data);

    return (
        <div className="key-values">
            {entries.map(([key, value], index) => (
                <div
                    key={key}
                    className={`d-flex justify-content-between align-items-center py-2 ${index < entries.length - 1 ? 'border-bottom' : ''}`}
                >
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">{key}</span>
                        <button
                            className="btn btn-link btn-sm p-0 text-muted opacity-50"
                            onClick={() => copyToClipboard(key)}
                            title="Copy key"
                        >
                            <Copy size={10} />
                        </button>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="fw-medium small text-end">{value || '-'}</span>
                        {value && (
                            <button
                                className="btn btn-link btn-sm p-0 text-muted opacity-50"
                                onClick={() => copyToClipboard(value)}
                                title="Copy value"
                            >
                                <Copy size={10} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KeyValues;
