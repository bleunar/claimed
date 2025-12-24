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
                                        <div className="h3 mb-1 placeholder-glow">
                                            <span className="placeholder col-6"></span>
                                        </div>
                                        <div className="small mb-0 placeholder-glow">
                                            <span className="placeholder col-8"></span>
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
                        <div className={`text-${color} fs-1 opacity-75 d-none d-md-inline`}>
                            {icon}
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default KPICard;

