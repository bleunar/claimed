import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

import loginBg from '../assets/img/login_bg.png';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            toast.error('Invalid credentials');
        }
    };

    return (
        <div
            className="container-fluid vh-100 d-flex align-items-center justify-content-center"
            style={{
                backgroundImage: `url(${loginBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="col-md-4 col-sm-8 col-10">
                <div
                    className="card border-0 shadow-lg"
                    style={{
                        background: 'rgba(255, 255, 255, 0.75)', // Light frosted glass
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                >
                    <div className="card-header bg-transparent border-bottom-0 text-center pt-4 pb-2">
                        <h3 className="mb-0 fw-bold text-primary">Login</h3>
                    </div>
                    <div className="card-body p-4">
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Email</label>
                                <input
                                    type="email"
                                    className="form-control bg-light border-0"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-semibold">Password</label>
                                <div className="input-group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control bg-light border-0"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button
                                        className="btn btn-light border-0"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeSlash /> : <Eye />}
                                    </button>
                                </div>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <button
                                    type="button"
                                    className="btn btn-link text-decoration-none p-0"
                                    onClick={() => setShowForgotModal(true)}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                            <div className="d-grid">
                                <button type="submit" className="btn btn-primary py-2 fw-bold">Sign In</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <ForgotPasswordModal show={showForgotModal} onHide={() => setShowForgotModal(false)} />
        </div>
    );
};

export default LoginPage;
