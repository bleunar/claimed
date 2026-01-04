import React, { useState } from 'react';
import { Collapse } from 'react-bootstrap';
import {
    BoxArrowInRight, BoxArrowLeft, KeyFill, EnvelopeFill,
    PersonBadge, ShieldCheck, PersonDash, PersonCheck,
    Trash, PersonGear, PersonFill, ChevronDown, ChevronRight,
    GlobeAmericas, Clock, ArrowRight,
    GlobeAmericasFill,
    ArrowClockwise
} from 'react-bootstrap-icons';

// Action icon mapping
const ACTION_ICONS = {
    login: BoxArrowInRight,
    logout: BoxArrowLeft,
    password_reset: KeyFill,
    password_changed: KeyFill,
    email_updated: EnvelopeFill,
    school_id_updated: PersonBadge,
    role_changed: ShieldCheck,
    suspended: PersonDash,
    activated: PersonCheck,
    deleted: Trash,
    restored: ArrowClockwise,
    profile_updated: PersonGear
};

// Action labels
const ACTION_LABELS = {
    login: 'Logged In',
    logout: 'Logged Out',
    password_reset: 'Password reset via email',
    password_changed: 'Password Changed',
    email_updated: 'Email Updated',
    school_id_updated: 'School ID Updated',
    role_changed: 'Role Changed',
    suspended: 'Account Suspended',
    activated: 'Account Activated',
    deleted: 'Account Deleted',
    restored: 'Account Restored',
    profile_updated: 'Profile Updated'
};

// Action colors
const ACTION_COLORS = {
    login: 'success',
    logout: 'secondary',
    password_reset: 'success',
    password_changed: 'success',
    email_updated: 'info',
    school_id_updated: 'info',
    role_changed: 'primary',
    suspended: 'danger',
    activated: 'success',
    deleted: 'danger',
    restored: 'success',
    profile_updated: 'primary'
};

// Get date key for grouping
const getDateKey = (dateString) => {
    const date = new Date(dateString);
    return date.toDateString();
};

// Get date label for section headers
const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

// Relative time formatter
const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

// Full timestamp formatter
const getFullTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

// Group activities by date
const groupByDate = (activities) => {
    const groups = {};
    activities.forEach(activity => {
        const key = getDateKey(activity.created_at);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(activity);
    });
    return groups;
};

// Check if activity has details to show
const hasExpandableDetails = (activity) => {
    return activity.ip_address || (activity.details && Object.keys(activity.details).length > 0);
};

// Activity Item Component
const ActivityItem = ({ activity, showIpAddress = false }) => {
    const [expanded, setExpanded] = useState(false);
    const IconComponent = ACTION_ICONS[activity.action] || PersonGear;
    const label = ACTION_LABELS[activity.action] || activity.action;
    const color = ACTION_COLORS[activity.action] || 'secondary';
    const canExpand = (showIpAddress && activity.ip_address);

    const handleClick = () => {
        if (canExpand) setExpanded(!expanded);
    };

    return (
        <div className={`py-2 border-bottom ${canExpand ? 'cursor-pointer' : ''}`}>
            {/* Main Row */}
            <div
                className="d-flex align-items-center"
                onClick={handleClick}
                style={{ cursor: canExpand ? 'pointer' : 'default' }}
            >
                {/* Icon */}
                <div className="bg-transparent d-flex align-items-center justify-content-center flex-shrink-0 ms-1">
                    <IconComponent className={`text-${color}`} size={16} />
                </div>

                {/* Content */}
                <div className="ms-2 flex-grow-1 d-flex justify-content-between align-items-center">
                    <span className="fw-semibold small">{label}</span>
                    <span className="text-muted small">{getRelativeTime(activity.created_at)}</span>
                </div>
            </div>

            {/* Expanded Details */}
            <Collapse in={expanded && canExpand}>
                <div>
                    <div className="ms-4 ps-3 border-start border-2 border-claims-primary-subtle">
                        {/* Activity-specific details */}
                        {activity.details && (
                            <div className="mt-2">
                                {/* Role Changed */}
                                {activity.action === 'role_changed' && activity.details.old_role && (
                                    <div className="d-flex align-items-center small bg-body-secondary rounded px-2 py-1">
                                        <span className="badge bg-secondary-subtle text-secondary text-capitalize">
                                            {activity.details.old_role.replace('_', ' ')}
                                        </span>
                                        <ArrowRight size={12} className="mx-2 text-muted" />
                                        <span className="badge bg-claims-primary-subtle text-claims-primary text-capitalize">
                                            {activity.details.new_role?.replace('_', ' ')}
                                        </span>
                                    </div>
                                )}

                                {/* Email Updated */}
                                {activity.action === 'email_updated' && activity.details.new_email && (
                                    <div className="small bg-body-secondary rounded px-2 py-1">
                                        <span className="text-muted">New email: </span>
                                        <code className="text-info">{activity.details.new_email}</code>
                                    </div>
                                )}

                                {/* Profile Updated */}
                                {activity.action === 'profile_updated' && (
                                    <div className="small bg-body-secondary rounded px-2 py-1">
                                        {activity.details.name && (
                                            <div><span className="text-muted">Name:</span> {activity.details.name}</div>
                                        )}
                                        {activity.details.school_id && (
                                            <div><span className="text-muted">School ID:</span> {activity.details.school_id}</div>
                                        )}
                                        {activity.details.birth_date && (
                                            <div><span className="text-muted">Birth Date:</span> {activity.details.birth_date}</div>
                                        )}
                                        {activity.details.gender && (
                                            <div><span className="text-muted">Gender:</span> <span className="text-capitalize">{activity.details.gender}</span></div>
                                        )}
                                        {activity.details.department && (
                                            <div><span className="text-muted">Department:</span> {activity.details.department}</div>
                                        )}
                                        {activity.details.password_changed && (
                                            <div className="text-warning">Password was changed</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}


                        <div className={`d-flex mt-2 justify-content-${showIpAddress && activity.ip_address ? "between" : "end"} `}>
                            {/* IP Address - only for admin/head roles */}
                            {showIpAddress && activity.ip_address && (
                                <div className="text-muted small mb-1">
                                    <GlobeAmericasFill size={12} className="me-2" />
                                    {activity.ip_address}
                                </div>
                            )}

                            {/* Timestamp */}
                            <div className="text-muted small mb-1">
                                {getFullTimestamp(activity.created_at)}
                            </div>
                        </div>
                    </div>
                </div>
            </Collapse>
        </div>
    );
};

const ActivityTimeline = ({ activities, loading, maxItems = 20, userRole = '' }) => {
    const showIpAddress = ['admin', 'it_head', 'lab_head'].includes(userRole);
    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-claims-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-4 text-muted">
                <PersonFill size={32} className="mb-2 opacity-50" />
                <p className="mb-0">No recent activity</p>
            </div>
        );
    }

    const displayActivities = activities.slice(0, maxItems);
    const groupedActivities = groupByDate(displayActivities);
    const dateKeys = Object.keys(groupedActivities);

    // Track which date sections are open (Today is open by default)
    const [openSections, setOpenSections] = useState(() => {
        const initial = {};
        dateKeys.forEach(key => {
            initial[key] = getDateLabel(key) === 'Today';
        });
        return initial;
    });

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="activity-timeline">
            {dateKeys.map((dateKey, groupIndex) => (
                <div key={dateKey}>
                    {/* Date Header - Clickable */}
                    <div
                        className={`d-flex align-items-center justify-content-between text-muted small fw-semibold py-2 text-uppercase border-bottom border-${openSections[dateKey] ? 3 : 1}`}
                        onClick={() => toggleSection(dateKey)}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className=''>{getDateLabel(dateKey)}</span>
                        {openSections[dateKey] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </div>

                    {/* Collapsible Activities */}
                    <Collapse in={openSections[dateKey]}>
                        <div>
                            <div className='mb-3'>
                                {groupedActivities[dateKey].map((activity) => (
                                    <ActivityItem key={activity.id} activity={activity} showIpAddress={showIpAddress} />
                                ))}
                            </div>
                        </div>
                    </Collapse>
                </div>
            ))}
        </div>
    );
};

export default ActivityTimeline;


