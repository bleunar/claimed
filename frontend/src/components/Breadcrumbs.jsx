import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { House, ChevronRight } from 'react-bootstrap-icons';

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);

    const nameMap = {
        'dashboard': <span><House className="mb-1" /> Home</span>,
        'accounts': 'Accounts',
        'laboratories': 'Laboratories',
        'locations': 'Locations',
        'components': 'PC Components',
        'profile': 'My Profile',
        'departments': 'Departments'
    };

    return (
        <div className="border-bottom my-2 pb-2 px-2">
            <style>
                {`
                    .breadcrumb-item + .breadcrumb-item::before {
                        content: none;
                    }
                `}
            </style>
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb p-0 m-0 rounded align-items-center">
                    {pathnames.map((value, index) => {
                        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const isLast = index === pathnames.length - 1;
                        const displayName = nameMap[value] || value;

                        return (
                            <li
                                className={`breadcrumb-item d-flex align-items-center ${isLast ? 'active' : ''}`}
                                key={to}
                                aria-current={isLast ? 'page' : undefined}
                            >
                                {index > 0 && <ChevronRight className="mx-1 text-muted" size={12} />}
                                {isLast ? (
                                    displayName
                                ) : (
                                    <Link to={to} className="text-decoration-none text-body">
                                        {displayName}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
};

export default Breadcrumbs;