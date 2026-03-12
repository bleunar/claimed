// Documentation metadata and filtering logic

const documentationFiles = [
    {
        id: 'user-guide',
        title: 'General User Guide',
        fileName: 'user-guide.md',
        allowedRoles: ['admin', 'it_head', 'lab_head', 'it_technician', 'department_head', 'department_staff', 'department_assistant', 'lab_assistant'],
        category: 'General'
    },
    {
        id: 'staff-guide',
        title: 'Staff & Management Guide',
        fileName: 'staff-guide.md',
        allowedRoles: ['admin', 'it_head', 'it_technician', 'lab_head', 'department_head'],
        category: 'Management'
    },
    {
        id: 'admin-guide',
        title: 'Administrator Guide',
        fileName: 'admin-guide.md',
        allowedRoles: ['admin'],
        category: 'Administration'
    }
];

export const getAvailableDocumentation = (userRole) => {
    return documentationFiles.filter(doc => doc.allowedRoles.includes(userRole));
};

export const getDocById = (id) => {
    return documentationFiles.find(doc => doc.id === id);
};

export default documentationFiles;
