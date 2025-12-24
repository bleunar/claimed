import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

/**
 * Generate a unique key for the current year's birthday celebration per user
 * Format: birthday_celebrated_USERID_YYYY (e.g., birthday_celebrated_abc123_2024)
 * This ensures each user has their own celebration tracking
 */
const getBirthdayCelebratedKey = (userId) => {
    const currentYear = new Date().getFullYear();
    return `birthday_celebrated_${userId}_${currentYear}`;
};

/**
 * Check if today matches the user's birthday (month and day)
 */
const isBirthdayToday = (birthDate) => {
    if (!birthDate) return false;

    const today = new Date();
    const birth = new Date(birthDate);

    return today.getMonth() === birth.getMonth() &&
        today.getDate() === birth.getDate();
};

const BirthdayGreeting = () => {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    // Get window dimensions for confetti
    useEffect(() => {
        const updateSize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Check if it's the user's birthday and hasn't been celebrated yet this year
    useEffect(() => {
        if (!user?.id || !user?.birth_date) return;

        const celebratedKey = getBirthdayCelebratedKey(user.id);
        const alreadyCelebrated = localStorage.getItem(celebratedKey) === 'true';

        if (isBirthdayToday(user.birth_date) && !alreadyCelebrated) {
            // Delay slightly to ensure page is loaded
            const timer = setTimeout(() => {
                setShowModal(true);
                setShowConfetti(true);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [user?.id, user?.birth_date]);

    const handleClose = () => {
        // Mark as celebrated for this year
        const celebratedKey = getBirthdayCelebratedKey(user.id);
        localStorage.setItem(celebratedKey, 'true');

        setShowModal(false);

        // Stop confetti after a short delay
        setTimeout(() => {
            setShowConfetti(false);
        }, 500);
    };

    // Get first name for personalized greeting
    const firstName = user?.name?.split(' ')[0] || 'there';

    return (
        <>
            {/* Confetti Effect */}
            {showConfetti && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10000 }}>
                    <Confetti
                        width={windowSize.width}
                        height={windowSize.height}
                        numberOfPieces={300}
                        recycle={showModal}
                        colors={['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3']}
                    />
                </div>
            )}

            {/* Birthday Modal */}
            <Modal
                show={showModal}
                onHide={handleClose}
                centered
                backdrop="static"
                style={{ zIndex: 10001 }}
            >
                <Modal.Body className="text-center py-5">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎂</div>
                    <h2 className="fw-bold mb-3">Happy Birthday, {firstName}! 🎉</h2>
                    <p className="text-muted mb-4">
                        Wishing you a fantastic day filled with joy, laughter, and wonderful memories!
                    </p>
                    <Button variant="primary" size="lg" onClick={handleClose}>
                        Thank You! 🥳
                    </Button>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default BirthdayGreeting;
