import React, { useState, useEffect } from 'react';
import { Search, Hdd, PcDisplay, Keyboard, Mouse, Webcam, Tools, Cpu } from 'react-bootstrap-icons';
import api from '../api/axios';
import Pagination from '../components/Pagination';

const LabResourcesPage = () => {
    const [activeTab, setActiveTab] = useState('sets'); // 'sets' or 'components'
    const [laboratories, setLaboratories] = useState([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [search, setSearch] = useState('');
    const [labFilter, setLabFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
        // The fetchData() function is not defined.
        // The existing debounced useEffect already handles fetching data based on activeTab and selectedLab.
        // So, this useEffect primarily ensures the page resets when these filters change.
        // The data fetch will be triggered by the debounced useEffect if selectedLab or activeTab changes.
    }, [activeTab, selectedLab]); // Using selectedLab as it's the actual state for lab filtering

    useEffect(() => {
        // Debounce search or trigger on button click? Let's trigger on effect for now with debounce if needed, 
        // or just simple effect on query change.
        const delayDebounceFn = setTimeout(() => {
            if (activeTab === 'sets') {
                fetchComputerSets();
            } else {
                fetchComponents();
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, selectedLab, activeTab]);

    const fetchLaboratories = async () => {
        try {
            const response = await api.get('/laboratories/');
            setLaboratories(response.data);
        } catch (err) {
            console.error("Failed to fetch laboratories", err);
        }
    };

    const fetchComputerSets = async () => {
        setLoading(true);
        try {
            let url = '/computer-sets/?';
            if (selectedLab) url += `laboratory_id=${selectedLab}&`;
            if (searchQuery) url += `search=${searchQuery}`;

            const response = await api.get(url);
            setResults(response.data);
        } catch (err) {
            console.error("Failed to fetch computer sets", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    // Get current items
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = results.slice(indexOfFirstItem, indexOfLastItem); // Changed 'items' to 'results'

    // Change page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const fetchComponents = async () => {
        setLoading(true);
        try {
            let url = '/components/?';
            if (searchQuery) url += `search=${searchQuery}`;

            const response = await api.get(url);
            setResults(response.data);
        } catch (err) {
            console.error("Failed to fetch components", err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2>Lab Resources Management</h2>

            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'sets' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('sets'); setSearchQuery(''); setResults([]); }}
                    >
                        Computer Sets
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'components' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('components'); setSearchQuery(''); setResults([]); }}
                    >
                        Components
                    </button>
                </li>
            </ul>

            <div className="row mb-4">
                {activeTab === 'sets' && (
                    <div className="col-md-4">
                        <select
                            className="form-select"
                            value={selectedLab}
                            onChange={(e) => setSelectedLab(e.target.value)}
                        >
                            <option value="">All Laboratories</option>
                            {laboratories.map(lab => (
                                <option key={lab.id} value={lab.id}>{lab.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="col-md-8">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={activeTab === 'sets' ? "Search by Set Name..." : "Search by Brand or Serial Number..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center">Loading...</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            {activeTab === 'sets' ? (
                                <tr>
                                    <th>Set Name</th>
                                    <th>Status</th>
                                    <th>Created At</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>Type</th>
                                    <th>Brand</th>
                                    <th>Serial Number</th>
                                    <th>Status</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {currentItems.length > 0 ? (
                                currentItems.map(item => (
                                    <tr key={item.id}>
                                        {activeTab === 'sets' ? (
                                            <>
                                                <td>{item.set_name}</td>
                                                <td>
                                                    <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{item.component_type}</td>
                                                <td>{item.brand_name}</td>
                                                <td>{item.serial_number || '-'}</td>
                                                <td>
                                                    <span className={`badge ${item.status === 'good' ? 'bg-success' : 'bg-secondary'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="text-center">No results found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                itemsPerPage={itemsPerPage}
                totalItems={results.length}
                paginate={paginate}
                currentPage={currentPage}
            />
        </div>
    );
};

export default LabResourcesPage;
