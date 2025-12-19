import React, { useState, useEffect } from 'react';
import { Plus, Trash, ExclamationCircle, Copy } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';

const KeyValueEditor = ({ properties, onChange, readOnly = false }) => {
    // Properties object to array of {key, value}
    const [pairs, setPairs] = useState([]);

    useEffect(() => {
        if (!properties) {
            setPairs([]);
            return;
        }

        // Convert current pairs to object for comparison
        const currentProps = {};
        pairs.forEach(p => {
            if (p.key.trim()) {
                currentProps[p.key.trim()] = p.value;
            }
        });

        // Simple deep compare
        const keys1 = Object.keys(properties).sort();
        const keys2 = Object.keys(currentProps).sort();

        let isEqual = keys1.length === keys2.length;
        if (isEqual) {
            for (let i = 0; i < keys1.length; i++) {
                const key = keys1[i];
                if (key !== keys2[i] || properties[key] !== currentProps[key]) {
                    isEqual = false;
                    break;
                }
            }
        }

        // Only update pairs if pending properties are different from current internal state representation
        if (!isEqual) {
            setPairs(Object.entries(properties).map(([k, v]) => ({ key: k, value: v })));
        }
    }, [properties]);

    const handlePairChange = (index, field, value) => {
        const newPairs = [...pairs];
        newPairs[index][field] = value;
        setPairs(newPairs);
        propagateChange(newPairs);
    };

    const handleAddPair = () => {
        const newPairs = [...pairs, { key: '', value: '' }];
        setPairs(newPairs);
        propagateChange(newPairs);
    };

    const handleRemovePair = (index) => {
        const newPairs = pairs.filter((_, i) => i !== index);
        setPairs(newPairs);
        propagateChange(newPairs);
    };

    const propagateChange = (currentPairs) => {
        const newProps = {};
        currentPairs.forEach(p => {
            if (p.key.trim()) {
                newProps[p.key.trim()] = p.value;
            }
        });
        onChange(newProps);
    };

    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                toast.success("Copied to clipboard!");
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success("Copied to clipboard!");
            } catch (err) {
                toast.error("Failed to copy");
            }
            document.body.removeChild(textArea);
        }
    };

    if (readOnly) {
        if (!properties || Object.keys(properties).length === 0) {
            return <div className="text-muted small fst-italic text-center">No properties defined for this component.</div>;
        }
        return (
            <div className="table-responsive">
                <table className="table table-sm table-borderless table-striped mb-0">
                    <thead>
                        <tr className='border-bottom'>
                            <th>Property</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(properties).map(([k, v]) => (
                            <tr key={k}>
                                <td className="fw-medium">
                                    <div className="d-flex align-items-center justify-content-start">
                                        <span className="text-truncate me-2">{k}</span>
                                        <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => copyToClipboard(k)} title="Copy Property Name">
                                            <Copy style={{ fontSize: '0.75rem' }} />
                                        </button>
                                    </div>
                                </td>
                                <td>
                                    <div className="d-flex align-items-center justify-content-start">
                                        <span className="text-truncate me-2">{v}</span>
                                        <button className="btn btn-link btn-sm p-0 text-muted" onClick={() => copyToClipboard(v)} title="Copy Value">
                                            <Copy style={{ fontSize: '0.75rem' }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <>

            <div className="d-flex flex-column gap-2 shadow-sm mb-3 p-3 rounded bg-body-tertiary">
                {
                    pairs.length > 0 && pairs.map((pair, index) => (
                        <div key={index} className="d-flex gap-2">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Property Name"
                                value={pair.key}
                                onChange={(e) => handlePairChange(index, 'key', e.target.value.toUpperCase())}
                            />
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Value"
                                value={pair.value}
                                onChange={(e) => handlePairChange(index, 'value', e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger border-0"
                                onClick={() => handleRemovePair(index)}
                                title="Remove Property"
                            >
                                <Trash />
                            </button>
                        </div>
                    ))
                }

                {
                    pairs.length == 0 && (
                        <span className='text-center flex-fill text-muted small'>No Property is set for this component</span>

                    )
                }

                <button
                    type="button"
                    className="btn btn-sm btn-link align-self-end text-decoration-none "
                    onClick={handleAddPair}
                >
                    Add Property
                </button>
            </div>


            <div className="form-text text-center small">
                NOTE: Empty keys will be ignored.
            </div>
        </>
    );
};

export default KeyValueEditor;
