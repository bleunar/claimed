import React from 'react';
import { List, Person, PersonCircle, X } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileImage from './common/ProfileImage';

const Navbar = ({ onToggleSidebar, sideBarToggled }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className={`navbar navbar-expand-lg p-2 sticky-top navbar-frosted shadow`} style={{ height: '67px' }}>
            <div className="container-fluid p-0">
                <div className="d-flex align-items-center d-md-none">
                    <div className="btn p-0">
                        {
                            sideBarToggled ? (
                                <X className='display-5' onClick={onToggleSidebar} />
                            ) : (
                                <List className='display-5' onClick={onToggleSidebar} />
                            )
                        }
                    </div>
                </div>

                <div className="ms-auto d-flex align-items-center">
                    <div className="dropdown">
                        <a href="#" className="d-flex align-items-center text-decoration-none rounded-circle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                            <div className="text-end me-1">
                                <div className={`p me-2 fw-bold mb-0 text-body`}>{user?.name}</div>
                                <div className={`small me-2 text-body`}>{user?.email}</div>
                            </div>

                            <ProfileImage
                                src={user?.profile_picture ? `${import.meta.env.VITE_API_URL}/accounts/${user.id}/picture?t=${user._picTimestamp || ''}` : null}
                                size="48px"
                                shape="circle"
                            />
                        </a>
                        <ul className={`dropdown-menu dropdown-menu-end dropdown-menu-${theme}`} aria-labelledby="dropdownUser1">
                            <li><Link className="dropdown-item" to="/dashboard/profile">Profile</Link></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><button className="dropdown-item" onClick={logout}>Logout</button></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
