import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import {
    Search,
    Eye,
    Edit,
    Calendar,
    FileText,
    Filter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

export const SearchCases: React.FC = () => {
    const navigate = useNavigate();
    const { cases } = useCases();
    const { user, hasRole } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStation, setFilterStation] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Get unique police stations
    const policeStations = [...new Set(cases.map((c) => c.policeStation))];

    // Filter cases based on user role
    let visibleCases = cases;
    if (user?.role === 'Writer' || user?.role === 'SHO') {
        // Writers and SHOs see only their station's cases
        visibleCases = cases.filter((c) => c.policeStation === user.policeStation);
    }

    // Apply search and filters
    const filteredCases = visibleCases.filter((c) => {
        const matchesSearch =
            !searchQuery ||
            c.crimeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.accusedNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.investigatingOfficer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.courtName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStation =
            filterStation === 'all' || c.policeStation === filterStation;

        const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'pending' && !c.judgmentResult) ||
            (filterStatus === 'convicted' && (c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly')) ||
            (filterStatus === 'acquitted' && c.judgmentResult === 'Acquitted');

        return matchesSearch && matchesStation && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCases = filteredCases.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Search Cases</h1>
                    <p className="text-gray-600">Find and view case details</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Crime No, Accused, IO, Court..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Police Station Filter (SP only) */}
                    {hasRole(['SP']) && (
                        <div className="flex items-center space-x-2">
                            <Filter size={18} className="text-gray-500" />
                            <select
                                value={filterStation}
                                onChange={(e) => {
                                    setFilterStation(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Stations</option>
                                {policeStations.map((station) => (
                                    <option key={station} value={station}>
                                        {station}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="convicted">Convicted</option>
                        <option value="acquitted">Acquitted</option>
                    </select>
                </div>

                <div className="text-sm text-gray-600">
                    Showing {paginatedCases.length} of {filteredCases.length} cases
                </div>
            </div>

            {/* Cases Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Crime No</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Police Station</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sections</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Court</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Next Hearing</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedCases.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">No cases found</p>
                                        <p className="text-sm">Try adjusting your search or filters</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCases.map((caseItem) => (
                                    <tr key={caseItem.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-blue-700">{caseItem.crimeNumber}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{caseItem.policeStation}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                                                {caseItem.sectionsOfLaw}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{caseItem.courtName}</td>
                                        <td className="px-4 py-3">
                                            {caseItem.nextHearingDate ? (
                                                <span className="inline-flex items-center text-sm">
                                                    <Calendar size={14} className="mr-1 text-gray-400" />
                                                    {new Date(caseItem.nextHearingDate).toLocaleDateString('en-IN')}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-sm">Not set</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {caseItem.judgmentResult ? (
                                                <span
                                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${caseItem.judgmentResult === 'Convicted'
                                                            ? 'bg-green-100 text-green-800'
                                                            : caseItem.judgmentResult === 'Acquitted'
                                                                ? 'bg-gray-100 text-gray-800'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                        }`}
                                                >
                                                    {caseItem.judgmentResult}
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center space-x-1">
                                                <button
                                                    onClick={() => navigate(`/case/${caseItem.id}`)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {hasRole(['Writer', 'SHO']) && (
                                                    <button
                                                        onClick={() => navigate(`/case/edit/${caseItem.id}`)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                        title="Edit Case"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} />
                            <span>Previous</span>
                        </button>
                        <span className="text-sm text-gray-600">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span>Next</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
