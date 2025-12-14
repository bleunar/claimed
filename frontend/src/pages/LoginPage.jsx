import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { Eye, EyeSlash, ShieldLock, Cpu, Motherboard, Globe, Wifi } from 'react-bootstrap-icons';

import loginBg from '../assets/img/login_bg.png';
import logo from '../assets/img/claims-name-white.png'
import pui from '../assets/img/pui.png'
import pui_full from '../assets/img/pui_full.png'
import cite from '../assets/img/pui_cite.jpg'

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            if (!err?.response) {
                toast.error('Unable to connect to the server. Please check your network connection.');
            } else if (err.response.status === 401) {
                toast.error('Invalid email or password');
            } else if (err.response.status === 403) {
                toast.error('Your account has been suspended. Please contact the administrator.');
            } else {
                toast.error('An unexpected error occurred. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div
            className="container-fluid d-flex align-items-center justify-content-center"
            data-bs-theme='light'
            style={{
                backgroundImage: `url(${loginBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                height: "100dvh"
            }}
        >
            <div className="container">
                <div className="mb-4">
                    <div className="d-flex justify-content-center">
                        <img
                            src={logo}
                            alt="logo"
                            style={{
                                width: 'auto',
                                height: '48px',
                            }}
                        />
                    </div>

                    <div
                        className="text-center text-light"
                        style={{
                            fontSize: '0.8rem'
                        }}>
                        Computer Laboratory Inventory and Management System
                    </div>
                </div>

                <div className="row p-0 d-flex justify-content-center">
                    <div
                        className="col-12 col-md-8 col-xl-6 card border-0 shadow bg-body px-0"
                        style={{
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                        }}
                    >
                        <div className="card-header">
                            <div className="h4 mb-0 mt-1 text-center">Login</div>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control bg-body-secondary rounded bg-primary-subtle border border-primary"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label">Password</label>
                                    <div className="input-group bg-body-secondary rounded border bg-primary-subtle border-primary">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control border-0 bg-transparent"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={isLoading}
                                        />
                                        <button
                                            className="btn border-0"
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => setShowPassword(!showPassword)}
                                            disabled={isLoading}
                                        >
                                            {showPassword ? <EyeSlash /> : <Eye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-end gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-link text-decoration-none p-0"
                                        onClick={() => setShowForgotModal(true)}
                                        disabled={isLoading}
                                    >
                                        Forgot Password?
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            </>
                                        ) : 'Login'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <ForgotPasswordModal show={showForgotModal} onHide={() => setShowForgotModal(false)} />

            {/* Tech Logos Placeholder */}
            <div className="fixed-bottom p-4">
                <div className="d-flex justify-content-center gap-4 ">
                    <img src={pui} alt='phinma ui logo' height={40} />
                    <img src={pui_full} alt='phinma ui full logo' height={40} />
                    <img src={cite} alt='phinma ui cite logo' height={40} />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
