import React, { useState, useEffect, useMemo } from 'react';
import Confetti from 'react-confetti';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { isBirthdayEnabled } from '../utils/effectsConfig';
import api from '../api/axios';

/**
 * Birthday messages - one will be picked at random
 * Use {name} for user's first name and {age} for their new age
 */
const BIRTHDAY_MESSAGES = [
    "You've successfully been updated to the best and latest version!",
    'Level Up! reached Level {age}!',
    'Version {age} Updated',
    '{name}: Season {age}',
];

/**
 * Calculate age from birth date
 */
const calculateAge = (birthDate) => {
    if (!birthDate) return '??';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

/**
 * Get a random birthday message with name and age substituted
 */
const getRandomMessage = (name, age) => {
    const index = Math.floor(Math.random() * BIRTHDAY_MESSAGES.length);
    return BIRTHDAY_MESSAGES[index]
        .replace(/{name}/g, name)
        .replace(/{age}/g, age);
};

/**
 * LocalStorage key for storing celebrated birthday tokens
 */
const BIRTHDAY_TOKENS_KEY = 'bday_tkns';

/**
 * Get the list of celebrated birthday tokens from localStorage
 */
const getCelebratedTokens = () => {
    try {
        const stored = localStorage.getItem(BIRTHDAY_TOKENS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Add a token to the celebrated list
 */
const addCelebratedToken = (token) => {
    const tokens = getCelebratedTokens();
    if (!tokens.includes(token)) {
        tokens.push(token);
        localStorage.setItem(BIRTHDAY_TOKENS_KEY, JSON.stringify(tokens));
    }
};

/**
 * Check if a token has already been celebrated
 */
const isTokenCelebrated = (token) => {
    const tokens = getCelebratedTokens();
    return tokens.includes(token);
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
    const [birthdayToken, setBirthdayToken] = useState(null);

    // Check if enabled via environment variable
    const configEnabled = isBirthdayEnabled();

    // Get first name for personalized greeting
    const firstName = user?.name?.split(' ')[0] || 'there';
    const userAge = calculateAge(user?.birth_date);

    // Pick a random message once when user data is available
    const birthdayMessage = useMemo(
        () => getRandomMessage(firstName, userAge),
        [firstName, userAge]
    );

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

    // Check if it's the user's birthday and fetch token to verify celebration status
    useEffect(() => {
        // Don't proceed if not enabled
        if (!configEnabled) return;
        if (!user?.id || !user?.birth_date) return;
        if (!isBirthdayToday(user.birth_date)) return;

        // Fetch birthday token from backend
        const checkBirthday = async () => {
            try {
                const response = await api.get('/auth/birthday-token');
                const { token } = response.data;

                setBirthdayToken(token);

                // Check if already celebrated
                if (!isTokenCelebrated(token)) {
                    // Delay slightly to ensure page is loaded
                    setTimeout(() => {
                        setShowModal(true);
                        setShowConfetti(true);
                    }, 1000);
                }
            } catch (error) {
                console.error('Failed to fetch birthday token:', error);
            }
        };

        checkBirthday();
    }, [user?.id, user?.birth_date, configEnabled]);

    const handleClose = () => {
        // Mark as celebrated by storing the encrypted token
        if (birthdayToken) {
            addCelebratedToken(birthdayToken);
        }

        setShowModal(false);

        // Stop confetti after a short delay
        setTimeout(() => {
            setShowConfetti(false);
        }, 500);
    };

    // Don't render if config is disabled
    if (!configEnabled) {
        return null;
    }

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
                <Modal.Body className="text-center p-5">
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎂</div>
                    <h4 className="fw-bold mb-3">Happy Birthday {firstName}!</h4>
                    <p className="text-muted mb-4">
                        {birthdayMessage}
                    </p>
                    <Button variant="primary" onClick={handleClose}>
                        Confirm
                    </Button>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default BirthdayGreeting;
