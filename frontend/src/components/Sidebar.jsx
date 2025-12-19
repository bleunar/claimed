import React from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { Offcanvas } from 'react-bootstrap';
import RoleBasedContent from './ComponentProtector';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/img/claims-name-white.png'
import LogoShrinked from '../assets/img/logo-transparent.svg'

const Sidebar = ({ isOpen, isMobile, options, onClose, onToggle }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate()

    const linkStyle = ({ isActive }) => ({
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        justifyContent: !isOpen && !isMobile ? 'center' : 'flex-start',
        height: '50px',
        fontWeight: isActive ? "600" : "400",
        transition: "all ease-in-out 1s"
    });

    const isOptionActive = (option) => {
        const path = option.path;
        const currentPath = location.pathname;
        if (option.end) {
            return currentPath === path || currentPath === `${path}/`;
        }
        return currentPath.startsWith(path);
    };

    const NavItems = () => (
        <ul className="nav nav-pills flex-column mb-auto">
            {options.map((option, index) => {
                const isActive = isOptionActive(option);
                return (
                    <RoleBasedContent key={index} allowedRoles={option.requiredRoles}>
                        <li className="nav-item">
                            <Link
                                to={option.path}
                                style={linkStyle({ isActive })}
                                className={isActive ? "bg-secondary text-dark" : "bg-primary text-light"}
                                onClick={isMobile ? onClose : undefined}
                                title={!isOpen && !isMobile ? option.name : ''}
                            >
                                <span className="fs-5">{option.icon}</span>
                                {(isOpen || isMobile) && <span className="ms-3">{option.name}</span>}
                            </Link>
                        </li>
                    </RoleBasedContent>
                );
            })}
        </ul>
    );

    if (isMobile) {
        return (
            <Offcanvas show={isOpen} onHide={onClose} className="text-white" style={{ backgroundColor: "#006633", maxWidth: "250px" }}>
                <Offcanvas.Header closeButton closeVariant="white">
                    <Offcanvas.Title>Menu</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body className='p-0'>
                    <NavItems />
                </Offcanvas.Body>
            </Offcanvas>
        );
    }

    const sidebarStyle = {
        width: isOpen ? '220px' : '80px',
        transition: 'width 0.3s',
        overflow: 'hidden',
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 1000,
        color: '#fff',
        whiteSpace: 'nowrap'
    };


    return (
        <div style={sidebarStyle} className="d-flex flex-column flex-shrink-0 bg-primary">
            <div onClick={() => navigate("/dashboard")} className={`d-flex align-items-center justify-content-center w-100 mb-md-0 text-decoration-none bg-primary ${!isOpen ? 'justify-content-center' : 'me-md-auto'}`} style={{ height: '67px' }}>
                <img className="fs-4" style={{ height: '36px' }} src={isOpen ? Logo : LogoShrinked} />
            </div>
            <NavItems />
            <div className="mt-auto">
                <div className="pt-3 pb-3 d-flex justify-content-center">
                    <div
                        onClick={onToggle}
                        className="d-flex align-items-center justify-content-center"
                        style={{ width: '30px', height: '30px', cursor: 'pointer'}}
                        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
