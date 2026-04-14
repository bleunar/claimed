export const ACTIVITY_LABELS = {
    login: "Logged In",
    logout: "Logged Out",
    password_reset: "Password Reset",
    password_changed: "Password Changed",
    email_updated: "Email Updated",
    school_id_updated: "School ID Updated",
    role_changed: "Role Changed",
    suspended: "Account Suspended",
    activated: "Account Activated",
    deleted: "Account Deleted",
    restored: "Account Restored",
    profile_updated: "Profile Updated"
};

export const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export const formatDepartment = (deptName) => {
    return deptName || "Unassigned";
};
