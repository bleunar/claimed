import React, { useState, useEffect, useMemo } from 'react';
import Confetti from 'react-confetti';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { isBirthdayEnabled } from '../utils/effectsConfig';
import api from '../api/axios';

/**
 * Birthday messages - one will be picked at random
 */
const BIRTHDAY_MESSAGES = [
    "Wishing you a day filled with love, laughter, and all your favorite things!",
    "May this year bring you endless joy and amazing adventures!",
    "Another year older, another year wiser, and still absolutely wonderful!",
    "Here's to a year of dreams coming true and goals being crushed!",
    "May your birthday be as bright and beautiful as your smile!",
    "Today is your day to shine—enjoy every moment of it!",
    "Cheers to you and the incredible person you are!",
    "May this birthday mark the beginning of your best chapter yet!",
    "You deserve all the happiness in the world today and always!",
    "Life is a gift, and so are you—happy birthday!",
    "Keep being amazing, and have the most wonderful birthday!",
    "Another trip around the sun, and you're still as awesome as ever!",
    "Here's to celebrating YOU and all the joy you bring to others!",
    "May your day be sweeter than cake and brighter than candles!",
    "You make the world a better place just by being in it. Happy birthday!",
];

/**
 * Get a random birthday message
 */
const getRandomMessage = () => {
    const index = Math.floor(Math.random() * BIRTHDAY_MESSAGES.length);
    return BIRTHDAY_MESSAGES[index];
};

/**
 * LocalStorage key for storing celebrated birthday tokens
 */
const BIRTHDAY_TOKENS_KEY = 'birthday_celebrated_tokens';

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

    // Pick a random message once when component mounts
    const birthdayMessage = useMemo(() => getRandomMessage(), []);

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
