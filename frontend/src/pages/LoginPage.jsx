import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../components/modals/ForgotPasswordModal';
import { Eye, EyeSlash } from 'react-bootstrap-icons';

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
        <div className="container vh-100">
            <div className="row justify-content-center align-items-center h-100">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">Login</div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Password</label>
                                    <div className="input-group">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            className="btn btn-primary"
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeSlash /> : <Eye />}
                                        </button>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <button type="submit" className="btn btn-primary">Login</button>
                                    <button
                                        type="button"
                                        className="btn btn-link text-decoration-none"
                                        onClick={() => setShowForgotModal(true)}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <ForgotPasswordModal show={showForgotModal} onHide={() => setShowForgotModal(false)} />
        </div>
    );
};

export default LoginPage;
