import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { Scanner } from '@yudiel/react-qr-scanner';
import { UpcScan, XCircle, Camera } from 'react-bootstrap-icons';

/**
 * BarcodeScanner - A reusable barcode/QR code scanner component
 * 
 * @param {function} onScan - Callback function when a code is scanned (receives scanned value)
 * @param {string} buttonText - Text to display on the trigger button (default: "Scan")
 * @param {string} buttonVariant - Bootstrap button variant (default: "outline-primary")
 * @param {boolean} buttonIconOnly - If true, shows only icon without text
 * @param {string} className - Additional CSS classes for the button
 */
const BarcodeScanner = ({
    onScan,
    buttonText = "Scan",
    buttonVariant = "",
    buttonIconOnly = false,
    className = ""
}) => {
    const [showScanner, setShowScanner] = useState(false);
    const [error, setError] = useState(null);
    const [lastScanned, setLastScanned] = useState(null);

    const handleScan = (result) => {
        if (result && result.length > 0) {
            const scannedValue = result[0].rawValue;
            setLastScanned(scannedValue);

            if (onScan) {
                onScan(scannedValue);
            }

            // Close scanner after successful scan
            setShowScanner(false);
        }
    };

    const handleError = (err) => {
        console.error('Scanner error:', err);
        setError('Camera access denied or not available. Please ensure you have granted camera permissions and are using HTTPS.');
    };

    const openScanner = () => {
        setError(null);
        setLastScanned(null);
        setShowScanner(true);
    };

    return (
        <>
            <Button
                variant={buttonVariant}
                onClick={openScanner}
                className={className}
                title="Scan barcode or QR code"
                tabIndex={-1}
            >
                <UpcScan />
                {!buttonIconOnly && <span className="ms-2">{buttonText}</span>}
            </Button>

            <Modal
                show={showScanner}
                onHide={() => setShowScanner(false)}
                centered
                size="md"
                style={{ zIndex: 1300 }}
            >
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <Camera /> Scan Barcode / QR Code
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {error ? (
                        <Alert variant="danger" className="m-3">
                            <XCircle className="me-2" />
                            {error}
                        </Alert>
                    ) : (
                        <div className="scanner-container" style={{ position: 'relative', overflow: 'hidden' }}>
                            <Scanner
                                onScan={handleScan}
                                onError={handleError}
                                formats={[
                                    'qr_code',
                                    'code_128',
                                    'code_39',
                                    'code_93',
                                    'ean_13',
                                    'ean_8',
                                    'upc_a',
                                    'upc_e',
                                    'itf',
                                    'codabar'
                                ]}
                                allowMultiple={false}
                                scanDelay={50}
                                styles={{
                                    container: {
                                        width: '100%',
                                        paddingTop: '75%',
                                        position: 'relative'
                                    },
                                    video: {
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    },
                                    finderBorder: 50
                                }}
                            />
                            <style>{`
                                .scanner-container > div > svg,
                                .scanner-container svg[class*="finder"],
                                .scanner-container svg[class*="viewfinder"],
                                .scanner-container > div > div > svg {
                                    position: absolute !important;
                                    top: 50% !important;
                                    left: 50% !important;
                                    transform: translate(-50%, -50%) !important;
                                    width: 200px !important;
                                    height: 200px !important;
                                }
                                .scanner-container > div > div:last-child {
                                    position: absolute !important;
                                    top: 50% !important;
                                    left: 50% !important;
                                    transform: translate(-50%, -50%) !important;
                                }
                            `}</style>
                        </div>
                    )}
                    <div className="p-3 text-center text-muted small">
                        Position the barcode within the frame. Scanning will happen automatically.
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowScanner(false)}>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default BarcodeScanner;
