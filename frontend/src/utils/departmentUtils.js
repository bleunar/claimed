export const DEPARTMENT_TYPES = [
    { value: 'it', label: 'IT Department' },
    { value: 'education', label: 'Education' },
    { value: 'office', label: 'Office' }
];

export const getDepartmentTypeLabel = (type) => {
    const found = DEPARTMENT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
};
