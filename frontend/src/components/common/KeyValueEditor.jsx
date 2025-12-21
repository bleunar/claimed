import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash, ExclamationCircle, Copy, Exclamation } from 'react-bootstrap-icons';
import toast from 'react-hot-toast';
import { SUGGESTED_KEYS_BY_TYPE, DEFAULT_KEYS } from '../../utils/componentTypes';

const KeyValueEditor = ({ properties, onChange, readOnly = false, setPropertiesModal = () => { }, showInfo = false, componentType = null }) => {
    // Properties object to array of {key, value}
    const [pairs, setPairs] = useState([]);
    const [focusedKeyIndex, setFocusedKeyIndex] = useState(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRefs = useRef({});

    // Get suggested keys based on component type
    const SUGGESTED_KEYS = componentType && SUGGESTED_KEYS_BY_TYPE[componentType]
        ? SUGGESTED_KEYS_BY_TYPE[componentType]
        : DEFAULT_KEYS;

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

    const toggleModalReadOnly = () => {
        setPropertiesModal("mode", readOnly ? "edit" : 'view')
    }

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

    // Find duplicate keys - returns set of keys that appear more than once
    const getDuplicateKeys = () => {
        const keyCount = {};
        pairs.forEach(p => {
            const trimmedKey = p.key.trim().toUpperCase();
            if (trimmedKey) {
                keyCount[trimmedKey] = (keyCount[trimmedKey] || 0) + 1;
            }
        });
        return new Set(Object.keys(keyCount).filter(k => keyCount[k] > 1));
    };

    const duplicateKeys = getDuplicateKeys();
    const hasDuplicates = duplicateKeys.size > 0;

    // Notify parent of validation status whenever duplicates change
    useEffect(() => {
        setPropertiesModal('valid', !hasDuplicates);
    }, [hasDuplicates]);

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
            return <div className="text-muted small fst-italic text-center my-3">No properties defined for this component. <span className='text-primary fst-normal cursor-pointer' onClick={() => toggleModalReadOnly()}>Add One</span></div>;
        }
        return (
            <>
                <div className="">

                    <div className="d-flex justify-content-end mb-2">
                        <div className="btn btn-sm btn-primary" onClick={() => toggleModalReadOnly()}>Edit Properties</div>
                    </div>

                    <div className="table-responsive mb-3">
                        <table className="table table-sm border table-striped mb-0">
                            <thead>
                                <tr className='border-bottom'>
                                    <th className='px-2 text-center border-end' style={{ width: "50%" }}>Property</th>
                                    <th className='px-2 text-center' style={{ width: "50%" }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(properties).map(([k, v]) => (
                                    <tr key={k}>
                                        <td className="fw-medium border-end" style={{ width: "50%" }}>
                                            <div className="d-flex align-items-center justify-content-start px-2 cursor-pointer" onClick={() => copyToClipboard(k)} title={k}>
                                                <span className="text-truncate me-2">{k}</span>
                                                <button className="btn btn-link btn-sm p-0 text-muted" title="Click to copy the key">
                                                    <Copy style={{ fontSize: '0.75rem' }} />
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ width: "50%" }}>
                                            <div className="d-flex align-items-center justify-content-start px-2 cursor-pointer" onClick={() => v ? copyToClipboard(v) : toast(`${k} has no value`)} title={v}>
                                                <span className="text-truncate me-2">{v}</span>
                                                {
                                                    v ? (
                                                        <button className="btn btn-link btn-sm p-0 text-muted" title="Click to copy the value">
                                                            <Copy style={{ fontSize: '0.75rem' }} />
                                                        </button>
                                                    ) : (
                                                        <span className='text-muted small fst-italic'>N/A</span>
                                                    )
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="mb-2 d-flex justify-content-end">
                <button
                    type="button"
                    className="btn btn-sm btn-link"
                    onClick={handleAddPair}
                >
                    Add Property
                </button>
            </div>

            {hasDuplicates && (
                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2">
                    <Exclamation size="32px" />
                    <span>Duplicate property names detected.</span>
                </div>
            )}

            <div style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'visible' }} className="position-relative">
                <div className="d-flex flex-column gap-2 shadow-sm p-2" style={{ paddingBottom: '160px' }}>
                    {
                        pairs.length > 0 && pairs.map((pair, index) => {
                            const isDuplicate = duplicateKeys.has(pair.key.trim().toUpperCase());
                            return (
                                <div key={index} className={`d-flex gap-2 p-1 rounded bg-body-tertiary ${isDuplicate ? 'border border-danger' : 'invinsible-border'}`}>
                                    <div className="position-relative flex-fill">
                                        <input
                                            ref={el => inputRefs.current[index] = el}
                                            type="text"
                                            className={`form-control form-control-sm`}
                                            placeholder="Property Name"
                                            value={pair.key}
                                            onFocus={(e) => {
                                                const rect = e.target.getBoundingClientRect();
                                                setDropdownPosition({
                                                    top: rect.bottom + window.scrollY,
                                                    left: rect.left + window.scrollX,
                                                    width: rect.width
                                                });
                                                setFocusedKeyIndex(index);
                                            }}
                                            onBlur={() => setTimeout(() => setFocusedKeyIndex(null), 150)}
                                            onChange={(e) => handlePairChange(index, 'key', e.target.value.toUpperCase())}
                                        />

                                        {/* Bootstrap Dropdown Suggestions - Fixed position */}
                                        {focusedKeyIndex === index && SUGGESTED_KEYS.filter(s =>
                                            !pair.key || s.toLowerCase().includes(pair.key.toLowerCase())
                                        ).length > 0 && (
                                                <div
                                                    className="dropdown-menu show shadow"
                                                    style={{
                                                        position: 'fixed',
                                                        top: dropdownPosition.top,
                                                        left: dropdownPosition.left,
                                                        width: dropdownPosition.width,
                                                        maxHeight: '150px',
                                                        overflowY: 'auto',
                                                        zIndex: 9999
                                                    }}
                                                >
                                                    {SUGGESTED_KEYS
                                                        .filter(s => !pair.key || s.toLowerCase().includes(pair.key.toLowerCase()))
                                                        .map((suggestion) => (
                                                            <button
                                                                key={suggestion}
                                                                type="button"
                                                                className="dropdown-item small py-1"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handlePairChange(index, 'key', suggestion);
                                                                    setFocusedKeyIndex(null);
                                                                }}
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                    </div>

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
                            );
                        })
                    }

                    {
                        pairs.length == 0 && (
                            <span className='text-center flex-fill text-muted small'>No Property is set for this component</span>
                        )
                    }
                </div >

                {
                    showInfo && (
                        <div className="form-text text-center small">
                            NOTE: Empty keys will be ignored.
                        </div>
                    )
                }
            </div >
        </>
    );
};

export default KeyValueEditor;
