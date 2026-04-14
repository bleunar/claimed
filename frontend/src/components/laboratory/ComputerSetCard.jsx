import React, { useState } from 'react';
import { getComponentIcon } from '../../utils/componentIcons';
import { getComponentStatusVariant } from '../../utils/statusColors';

const ComputerSetCard = ({ set, components, onView }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showMobilePreview, setShowMobilePreview] = useState(false);

    const getStatusColor = (status) => {
        return `text-${getComponentStatusVariant(status)}`;
    }

    const goodCount = components.filter(c => c.status === 'good').length;
    const badCount = components.filter(c => c.status === 'bad').length;
    const maintCount = components.filter(c => c.status === 'maintenance').length;
    const missingCount = components.filter(c => c.status === 'missing').length;
    const totalCount = goodCount + badCount + maintCount + missingCount

    return (
        <div className="col p-0">
            <div
                className={`card h-100 position-relative border-0 rounded-0 overflow-hidden shadow-sm p-hover hover-shadow ${set.status === 'active' ? 'bg-gradient-primary' : 'bg-gradient-maintenance'}`}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => onView(set)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => { setIsHovered(false); setShowMobilePreview(false); }}
            >
                <div className="card-body text-center d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '150px' }}>
                    <h5 className="card-title fw-bold mb-0">{set.set_name}</h5>
                    <div className="d-flex gap-1 flex-wrap justify-content-center">
                        <span className={`d-none badge text-capitalize ${set.status === 'active' ? 'bg-success' : 'bg-warning'} mt-2`}>
                            {set.status}
                        </span>

                        {set.status === 'active' ? (
                            // 1. Check if ALL components are Good
                            totalCount === goodCount ? (
                                <span className="badge bg-success rounded-pill mt-2" title={`${goodCount} Good Components`}>
                                    {goodCount} Operational
                                </span>
                            ) :
                                // 2. Check if ALL components are Bad
                                totalCount === badCount ? (
                                    <span className="badge bg-warning rounded-pill mt-2" title={`${badCount} Bad Components`}>
                                        {badCount} Bad
                                    </span>
                                ) :
                                    // 3. Check if ALL components are Maintenance
                                    totalCount === maintCount ? (
                                        <span className="badge bg-info rounded-pill mt-2" title={`${maintCount} Maintenance Components`}>
                                            {maintCount} Maintenance
                                        </span>
                                    ) :
                                        // 4. Check if ALL components are Missing
                                        totalCount === missingCount ? (
                                            <span className="badge bg-danger rounded-pill mt-2" title={`${missingCount} Missing Components`}>
                                                {missingCount} Missing
                                            </span>
                                        ) : (
                                            // 5. Mixed Status: Show individual badges
                                            <>
                                                {goodCount > 0 && <span className="badge bg-success rounded-pill mt-2 me-1" title={`${goodCount} Good Components`}>{goodCount}</span>}
                                                {badCount > 0 && <span className="badge bg-warning rounded-pill mt-2 me-1" title={`${badCount} Bad Components`}>{badCount}</span>}
                                                {maintCount > 0 && <span className="badge bg-info rounded-pill mt-2 me-1" title={`${maintCount} Maintenance Components`}>{maintCount}</span>}
                                                {missingCount > 0 && <span className="badge bg-danger rounded-pill mt-2 me-1" title={`${missingCount} Missing Components`}>{missingCount}</span>}
                                            </>
                                        )
                        ) : (
                            <span className="badge bg-info rounded-pill mt-2" title="Computer Under Maintenance">Under Maintenance</span>
                        )}
                    </div>

                    <div
                        className="position-absolute top-0 start-0 w-100 h-100 p-3 d-none d-md-flex flex-wrap align-items-center justify-content-center bg-gradient-primary-hovered "
                        style={{
                            opacity: (isHovered) ? 0.98 : 0,
                            transition: 'opacity 0.4s',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}
                    >
                        <div className='d-flex flex-wrap justify-content-center c-hover'>
                            {components.map(comp => (
                                <div key={comp.id} className={`m-1 fs-5 ${comp.status == 'good' ? 'text-white' : getStatusColor(comp.status) }`} title={`${comp.brand_name} (${comp.status})`}>
                                    {getComponentIcon(comp.component_type)}
                                </div>
                            ))}
                        </div>
                        {components.length === 0 && <span className="text-muted small">No components</span>}
                    </div>
                </div>


            </div>
        </div>
    );
};

export default ComputerSetCard;
