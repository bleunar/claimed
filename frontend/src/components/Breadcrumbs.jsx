import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { House } from 'react-bootstrap-icons';

const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);

    const nameMap = {
        'dashboard': <span><House className="mb-1" /> Home</span>,
        'accounts': 'Accounts',
        'laboratories': 'Laboratories',
        'components': 'PC Components',
        'profile': 'My Account'
    };

    return (
        <div className="border-bottom py-2">
            <nav aria-label="breadcrumb">
                <ol
                    className="breadcrumb p-0 m-0 rounded"
                    style={{ '--bs-breadcrumb-divider': "'>'" }}
                >
                    {pathnames.map((value, index) => {
                        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                        const isLast = index === pathnames.length - 1;
                        const displayName = nameMap[value] || value;

                        return isLast ? (
                            <li
                                className="breadcrumb-item active"
                                aria-current="page"
                                key={to}
                            >
                                {displayName}
                            </li>
                        ) : (
                            <li className="breadcrumb-item" key={to}>
                                <Link to={to} className="text-decoration-none">
                                    {displayName}
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </div>
    );
};

export default Breadcrumbs;