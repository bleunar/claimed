import React from 'react';
import { Card } from 'react-bootstrap';

const KPICard = ({ title, value, icon, color = 'primary', trend }) => {
    return (
        <div className='col p-2'>
            <Card className={`h-100  bg-body-tertiary border-2 border-${color} shadow`}>
                <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <div className="text-uppercase text-muted small mb-1">{title}</div>
                            <div className="h3 mb-0 fw-bold text-gray-800">{value}</div>
                            {trend && (
                                <div className={`mt-2 mb-0 text-xs font-weight-bold text-${trend.direction === 'up' ? 'success' : 'danger'}`}>
                                    <span className="me-1">
                                        {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
                                    </span>
                                    <span className="text-muted">{trend.label}</span>
                                </div>
                            )}
                        </div>
                        <div className={`text-${color} fs-1 opacity-50`}>
                            {icon}
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default KPICard;
