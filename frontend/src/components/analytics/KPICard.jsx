import { useState } from 'react';
import { Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const KPICard = ({ title, value, icon, color = 'primary', trend, link }) => {
    const navigate = useNavigate();
    const [isHovered, setHovered] = useState(false)

    const handleClick = () => {
        if (link) {
            navigate(link);
        }
    };

    return (
        <div className='col p-1'>
            <Card
                className={`h-100 border-2 border hover-raised shadow-sm ${link ? 'cursor-pointer' : ''} ${isHovered ? "bg-primary-subtle" : " bg-body-secondary"}`}
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{ transition: "150ms ease-in-out" }}
                title={`View ${title}`}
            >
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            {
                                value !== undefined && value !== null ? (
                                    <>
                                        <div className="h3 mb-1 fw-bold text-gray-800">{value}</div>
                                        <div className="text-uppercase text-muted small mb-0">{title}</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="placeholder-glow mb-1">
                                            <span className="placeholder d-block rounded" style={{ width: '60px', height: '28px' }}></span>
                                        </div>
                                        <div className="placeholder-glow">
                                            <span className="placeholder d-block rounded" style={{ width: '100px', height: '14px' }}></span>
                                        </div>
                                    </>
                                )
                            }
                            {trend && (
                                <div className={`mt-2 mb-0 text-xs font-weight-bold text-${trend.direction === 'up' ? 'success' : 'danger'}`}>
                                    <span className="me-1">
                                        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
                                    </span>
                                    <span className="text-muted">{trend.label}</span>
                                </div>
                            )}
                        </div>
                        <div className={`fs-1 opacity-75 d-none d-md-inline`}>
                            {value !== undefined && value !== null ? (
                                <span className={`text-${color}`}>{icon}</span>
                            ) : (
                                <div className="placeholder-glow">
                                    <span className="placeholder rounded" style={{ width: '40px', height: '40px', display: 'inline-block' }}></span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default KPICard;

