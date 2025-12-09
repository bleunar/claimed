import React from 'react';
import { Breadcrumb } from 'react-bootstrap';
import { useLocation, Link } from 'react-router-dom';
import { House, HouseFill } from 'react-bootstrap-icons';

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);

    const nameMap = {
        'dashboard': <House />,
        'accounts': 'Accounts',
        'laboratories': 'Laboratories',
        'components': 'Components',
        'activities': 'Activity Logs',
        'profile': 'My Account',
        'lab-resources': 'Lab Resources'
    };

    return (
        <div className="container-fluid bg-body-secondary shadow-sm rounded mx-0 mt-2">
            <Breadcrumb className="p-0 m-0 rounded" style={{ '--bs-breadcrumb-divider': "'/'" }}>
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;
                    const displayName = nameMap[value] || value;

                    return isLast ? (
                        <Breadcrumb.Item active key={to}>
                            {displayName}
                        </Breadcrumb.Item>
                    ) : (
                        <Breadcrumb.Item linkAs={Link} linkProps={{ to }} key={to}>
                            {displayName}
                        </Breadcrumb.Item>
                    );
                })}
            </Breadcrumb>
        </div>
    );
};

export default Breadcrumbs;
