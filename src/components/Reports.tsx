import React, { useState, useMemo } from 'react';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { generateStationExcelReport, generateDistrictExcelReport } from '../utils/excelGenerator';
import {
    FileText,
    Download,
    BarChart3,
    PieChart,
    Building2,
    TrendingUp,
    Users,
    Scale,
    AlertTriangle,
    Loader2,
    FileSpreadsheet,
} from 'lucide-react';


export const Reports: React.FC = () => {
    const { cases } = useCases();
    const { user, hasRole } = useAuth();
    const [selectedStation, setSelectedStation] = useState<string>(user?.policeStation || 'all');
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [reportPeriod, setReportPeriod] = useState<'all' | 'weekly' | 'monthly'>('all');

    // Get unique police stations
    const policeStations = [...new Set(cases.map((c) => c.policeStation))];

    // Get date range based on period
    const getDateRange = (period: 'all' | 'weekly' | 'monthly') => {
        const now = new Date();
        if (period === 'weekly') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return { start: weekAgo, end: now };
        } else if (period === 'monthly') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return { start: monthAgo, end: now };
        }
        return null;
    };

    // Filter cases based on selection and period
    const filteredCases = useMemo(() => {
        let result = cases;

        // Filter by station
        if (selectedStation !== 'all') {
            result = result.filter((c) => c.policeStation === selectedStation);
        }

        // Filter by period
        const dateRange = getDateRange(reportPeriod);
        if (dateRange) {
            result = result.filter((c) => {
                const caseDate = new Date(c.createdAt || c.dateOfChargeSheet || '');
                return caseDate >= dateRange.start && caseDate <= dateRange.end;
            });
        }

        return result;
    }, [cases, selectedStation, reportPeriod]);

    // Calculate statistics
    const stats = useMemo(() => {
        const total = filteredCases.length;
        const pending = filteredCases.filter((c) => !c.judgmentResult).length;
        const convicted = filteredCases.filter(
            (c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly'
        ).length;
        const acquitted = filteredCases.filter((c) => c.judgmentResult === 'Acquitted').length;
        const disposed = convicted + acquitted;
        const convictionRate = disposed > 0 ? Math.round((convicted / disposed) * 100) : 0;

        return { total, pending, convicted, acquitted, disposed, convictionRate };
    }, [filteredCases]);

    // Station-wise statistics for SP
    const stationStats = useMemo(() => {
        return policeStations.map((station) => {
            const stationCases = cases.filter((c) => c.policeStation === station);
            const total = stationCases.length;
            const pending = stationCases.filter((c) => !c.judgmentResult).length;
            const convicted = stationCases.filter(
                (c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly'
            ).length;
            const acquitted = stationCases.filter((c) => c.judgmentResult === 'Acquitted').length;
            const disposed = convicted + acquitted;
            const convictionRate = disposed > 0 ? Math.round((convicted / disposed) * 100) : 0;

            return { station, total, pending, convicted, acquitted, disposed, convictionRate };
        });
    }, [cases, policeStations]);

    // Get period label for report
    const getPeriodLabel = () => {
        if (reportPeriod === 'weekly') return 'Weekly Report (Last 7 Days)';
        if (reportPeriod === 'monthly') return 'Monthly Report (Last 30 Days)';
        return 'All Time Report';
    };

    const handleDownloadReport = async (type: 'station' | 'district' | 'weekly' | 'monthly') => {
        setIsGenerating(type);

        // Small delay for UI feedback
        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
            if (type === 'district') {
                generateDistrictExcelReport(cases, stationStats);
            } else if (type === 'weekly' || type === 'monthly') {
                // Set period and generate
                const period = type;
                const dateRange = getDateRange(period);
                let periodCases = cases;

                if (dateRange) {
                    periodCases = cases.filter((c) => {
                        const caseDate = new Date(c.createdAt || c.dateOfChargeSheet || '');
                        return caseDate >= dateRange.start && caseDate <= dateRange.end;
                    });
                }

                if (selectedStation !== 'all') {
                    periodCases = periodCases.filter((c) => c.policeStation === selectedStation);
                }

                const periodStats = {
                    total: periodCases.length,
                    pending: periodCases.filter((c) => !c.judgmentResult).length,
                    convicted: periodCases.filter((c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly').length,
                    acquitted: periodCases.filter((c) => c.judgmentResult === 'Acquitted').length,
                    convictionRate: 0,
                };
                const disposed = periodStats.convicted + periodStats.acquitted;
                periodStats.convictionRate = disposed > 0 ? Math.round((periodStats.convicted / disposed) * 100) : 0;

                const stationName = selectedStation === 'all' ? 'All Stations' : selectedStation;
                const periodLabel = period === 'weekly' ? ' - Weekly (Last 7 Days)' : ' - Monthly (Last 30 Days)';
                generateStationExcelReport(periodCases, stationName + periodLabel, periodStats);
            } else {
                const stationName = selectedStation === 'all' ? 'All Stations' : selectedStation;
                generateStationExcelReport(filteredCases, stationName, stats);
            }
        } catch (error) {
            console.error('Error generating Excel:', error);
            alert('Failed to generate Excel. Please try again.');
        }

        setIsGenerating(null);
    };

    // Custom date range state
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    // Generate custom date range report
    const handleCustomDateReport = async () => {
        if (!customStartDate || !customEndDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(customStartDate) > new Date(customEndDate)) {
            alert('Start date cannot be after end date');
            return;
        }

        setIsGenerating('custom');

        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end day

            let customCases = cases.filter((c) => {
                const caseDate = new Date(c.createdAt || c.dateOfChargeSheet || '');
                return caseDate >= startDate && caseDate <= endDate;
            });

            if (selectedStation !== 'all') {
                customCases = customCases.filter((c) => c.policeStation === selectedStation);
            }

            const customStats = {
                total: customCases.length,
                pending: customCases.filter((c) => !c.judgmentResult).length,
                convicted: customCases.filter((c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly').length,
                acquitted: customCases.filter((c) => c.judgmentResult === 'Acquitted').length,
                convictionRate: 0,
            };
            const disposed = customStats.convicted + customStats.acquitted;
            customStats.convictionRate = disposed > 0 ? Math.round((customStats.convicted / disposed) * 100) : 0;

            const stationName = selectedStation === 'all' ? 'All Stations' : selectedStation;
            const dateLabel = ` (${new Date(customStartDate).toLocaleDateString('en-IN')} to ${new Date(customEndDate).toLocaleDateString('en-IN')})`;
            generateStationExcelReport(customCases, stationName + dateLabel, customStats);
        } catch (error) {
            console.error('Error generating custom date report:', error);
            alert('Failed to generate Excel. Please try again.');
        }

        setIsGenerating(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
                    <p className="text-gray-600">View statistics and download Excel reports</p>
                </div>

                {hasRole(['SP']) && (
                    <select
                        value={selectedStation}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Stations (District)</option>
                        {policeStations.map((station) => (
                            <option key={station} value={station}>
                                {station}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <FileText size={24} className="text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                    <p className="text-sm text-gray-600">Total Cases</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <AlertTriangle size={24} className="text-yellow-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <Scale size={24} className="text-gray-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.disposed}</p>
                    <p className="text-sm text-gray-600">Disposed</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <Users size={24} className="text-green-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.convicted}</p>
                    <p className="text-sm text-gray-600">Convicted</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <Users size={24} className="text-red-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.acquitted}</p>
                    <p className="text-sm text-gray-600">Acquitted</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <TrendingUp size={24} className="text-purple-500 mb-2" />
                    <p className="text-2xl font-bold text-gray-800">{stats.convictionRate}%</p>
                    <p className="text-sm text-gray-600">Conviction Rate</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conviction Rate Chart */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <PieChart size={20} className="mr-2 text-blue-600" />
                        Case Outcomes
                    </h2>
                    <div className="flex items-center justify-center py-8">
                        {/* Simple CSS Pie Chart */}
                        <div className="relative w-48 h-48">
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    background: `conic-gradient(
                    #22c55e 0% ${stats.disposed > 0 ? (stats.convicted / stats.disposed) * 100 : 0}%,
                    #ef4444 ${stats.disposed > 0 ? (stats.convicted / stats.disposed) * 100 : 0}% 100%
                  )`,
                                }}
                            />
                            <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-800">{stats.convictionRate}%</p>
                                    <p className="text-xs text-gray-500">Conviction Rate</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center space-x-6 mt-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-600">Convicted ({stats.convicted})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-gray-600">Acquitted ({stats.acquitted})</span>
                        </div>
                    </div>
                </div>

                {/* Station Comparison (SP only) */}
                {hasRole(['SP']) && (
                    <div className="bg-white rounded-xl shadow-sm p-5">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <BarChart3 size={20} className="mr-2 text-blue-600" />
                            Station Comparison
                        </h2>
                        <div className="space-y-3">
                            {stationStats.map((stationData) => (
                                <div key={stationData.station} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-700 truncate">{stationData.station}</span>
                                        <span className="text-gray-500">
                                            {stationData.pending} pending / {stationData.total} total
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                        <div className="flex h-full">
                                            <div
                                                className="bg-green-500"
                                                style={{
                                                    width: `${stationData.total > 0 ? (stationData.convicted / stationData.total) * 100 : 0}%`,
                                                }}
                                            />
                                            <div
                                                className="bg-red-500"
                                                style={{
                                                    width: `${stationData.total > 0 ? (stationData.acquitted / stationData.total) * 100 : 0}%`,
                                                }}
                                            />
                                            <div
                                                className="bg-yellow-400"
                                                style={{
                                                    width: `${stationData.total > 0 ? (stationData.pending / stationData.total) * 100 : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center space-x-4 mt-6 text-xs">
                            <div className="flex items-center space-x-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <span className="text-gray-600">Convicted</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-gray-600">Acquitted</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                <span className="text-gray-600">Pending</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Download Reports */}
            <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <FileSpreadsheet size={20} className="mr-2 text-green-600" />
                    Download Excel Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => handleDownloadReport('station')}
                        disabled={isGenerating !== null}
                        className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating === 'station' ? (
                            <Loader2 size={24} className="text-blue-600 animate-spin" />
                        ) : (
                            <Building2 size={24} className="text-blue-600" />
                        )}
                        <div className="text-left">
                            <p className="font-medium text-gray-800">Station Report</p>
                            <p className="text-sm text-gray-500">
                                {selectedStation === 'all' ? 'All stations' : selectedStation}
                            </p>
                        </div>
                    </button>

                    {/* Weekly Report */}
                    <button
                        onClick={() => handleDownloadReport('weekly')}
                        disabled={isGenerating !== null}
                        className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating === 'weekly' ? (
                            <Loader2 size={24} className="text-green-600 animate-spin" />
                        ) : (
                            <BarChart3 size={24} className="text-green-600" />
                        )}
                        <div className="text-left">
                            <p className="font-medium text-gray-800">Weekly Report</p>
                            <p className="text-sm text-gray-500">Last 7 days</p>
                        </div>
                    </button>

                    {/* Monthly Report */}
                    <button
                        onClick={() => handleDownloadReport('monthly')}
                        disabled={isGenerating !== null}
                        className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating === 'monthly' ? (
                            <Loader2 size={24} className="text-orange-600 animate-spin" />
                        ) : (
                            <TrendingUp size={24} className="text-orange-600" />
                        )}
                        <div className="text-left">
                            <p className="font-medium text-gray-800">Monthly Report</p>
                            <p className="text-sm text-gray-500">Last 30 days</p>
                        </div>
                    </button>

                    {hasRole(['SP']) && (
                        <button
                            onClick={() => handleDownloadReport('district')}
                            disabled={isGenerating !== null}
                            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating === 'district' ? (
                                <Loader2 size={24} className="text-purple-600 animate-spin" />
                            ) : (
                                <FileText size={24} className="text-purple-600" />
                            )}
                            <div className="text-left">
                                <p className="font-medium text-gray-800">District Report</p>
                                <p className="text-sm text-gray-500">All stations overview</p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Custom Date Range Section */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center">
                        <Scale size={18} className="mr-2 text-teal-600" />
                        Custom Date Range Report
                    </h3>
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">From Date</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">To Date</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                        <button
                            onClick={handleCustomDateReport}
                            disabled={isGenerating !== null || !customStartDate || !customEndDate}
                            className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGenerating === 'custom' ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Download size={18} />
                            )}
                            <span>Generate Report</span>
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Select a date range to generate a report for cases registered between those dates.
                    </p>
                </div>
            </div>
        </div>
    );
};
