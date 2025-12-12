import React from 'react';
import { List, Person, PersonCircle, X } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ onToggleSidebar, sideBarToggled }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className={`navbar navbar-expand-lg p-0 sticky-top navbar-frosted shadow`} style={{ height: '7vh' }}>
            <div className="container-fluid pe-0">
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
                                <div className={`me-2 fw-bold mb-0 text-body`} style={{ fontSize: '0.95rem' }}>{user?.name}</div>
                                <div className={`me-2 text-body`} style={{ fontSize: '0.75rem' }}>{user?.email}</div>
                            </div>

                            {user?.profile_picture ? (
                                <img src={`/api/accounts/${user.id}/picture?t=${user._picTimestamp || ''}`} alt="profile" style={{ objectFit: 'cover', height: '7vh', width: "7vh" }} />
                            ) : (
                                <div className='p-2 bg-dark-subtle' style={{ height: '7vh', width: '7vh' }}>

                                    <Person className="text-primary h-100 w-100" />
                                </div>
                            )}
                        </a>
                        <ul className={`dropdown-menu dropdown-menu-end dropdown-menu-${theme}`} aria-labelledby="dropdownUser1">
                            <li><Link className="dropdown-item" to="/dashboard/profile">Profile</Link></li>
                            <li><hr className="dropdown-divider" /></li>
                            <li><button className="dropdown-item" onClick={logout}>Sign out</button></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
