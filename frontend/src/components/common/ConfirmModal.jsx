import React from 'react';
import { Modal, Button } from 'react-bootstrap';

/**
 * ConfirmModal - A reusable confirmation dialog component
 * 
 * Usage:
 * 1. Add state: const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', resolve: null });
 * 
 * 2. Create helper function:
 *    const showConfirm = (title, message, options = {}) => {
 *        return new Promise((resolve) => {
 *            setConfirmModal({ show: true, title, message, resolve, ...options });
 *        });
 *    };
 * 
 * 3. Create result handler:
 *    const handleConfirmResult = (result) => {
 *        if (confirmModal.resolve) confirmModal.resolve(result);
 *        setConfirmModal(prev => ({ ...prev, show: false, resolve: null }));
 *    };
 * 
 * 4. Use in JSX:
 *    <ConfirmModal config={confirmModal} onResult={handleConfirmResult} />
 * 
 * 5. Call: if (await showConfirm('Title', 'Message')) { // confirmed }
 */
const ConfirmModal = ({
    config,
    onResult,
    size = 'sm',
    centered = true,
    zIndex = 1260,
    backdrop = 'static'
}) => {
    const {
        show = false,
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmVariant = 'primary',
        cancelVariant = 'secondary',
        showCancel = true,
        icon = null
    } = config || {};

    return (
        <Modal
            show={show}
            onHide={() => onResult(false)}
            size={size}
            centered={centered}
            style={{ zIndex }}
            backdrop={backdrop}
            backdropClassName="stacked-modal-backdrop"
        >
            <Modal.Header closeButton>
                <Modal.Title className="d-flex align-items-center gap-2">
                    {icon}
                    {title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ whiteSpace: 'pre-line' }}>
                {message}
            </Modal.Body>
            <Modal.Footer>
                {showCancel && (
                    <Button variant={cancelVariant} onClick={() => onResult(false)}>
                        {cancelText}
                    </Button>
                )}
                <Button variant={confirmVariant} onClick={() => onResult(true)}>
                    {confirmText}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

/**
 * Hook for using ConfirmModal easily
 * 
 * Usage:
 * const { confirmModal, showConfirm, handleConfirmResult } = useConfirmModal();
 * 
 * // In JSX:
 * <ConfirmModal config={confirmModal} onResult={handleConfirmResult} />
 * 
 * // To use:
 * if (await showConfirm('Delete?', 'Are you sure?')) { // delete }
 */
export const useConfirmModal = () => {
    const [confirmModal, setConfirmModal] = React.useState({
        show: false,
        title: '',
        message: '',
        resolve: null
    });

    const showConfirm = (title, message, options = {}) => {
        return new Promise((resolve) => {
            setConfirmModal({
                show: true,
                title,
                message,
                resolve,
                ...options
            });
        });
    };

    const handleConfirmResult = (result) => {
        if (confirmModal.resolve) {
            confirmModal.resolve(result);
        }
        setConfirmModal(prev => ({ ...prev, show: false, resolve: null }));
    };

    return { confirmModal, showConfirm, handleConfirmResult };
};

export default ConfirmModal;
