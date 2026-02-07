import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { CaseData } from '../types/Case';
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Calendar,
  FileText,
  Users,
  Scale,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  MapPin,
  AlertOctagon,
  CalendarDays,
  Target,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cases, deleteCase } = useCases();
  const { user, hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof CaseData>('nextHearingDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'today' | 'pending' | 'convicted' | 'acquitted'>('all');
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showStationBreakdown, setShowStationBreakdown] = useState(true);

  // Filter cases based on user role
  const visibleCases = useMemo(() => {
    if (user?.role === 'SP') {
      return cases; // SP sees all cases
    }
    // Writers and SHOs see only their station's cases
    return cases.filter((c) => c.policeStation === user?.policeStation);
  }, [cases, user]);

  const getDaysUntilHearing = (dateStr: string): number => {
    if (!dateStr) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hearingDate = new Date(dateStr);
    return Math.ceil((hearingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const isUrgent = (dateStr: string): boolean => {
    const days = getDaysUntilHearing(dateStr);
    return days >= 0 && days <= 3;
  };

  const isToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const today = new Date();
    const hearingDate = new Date(dateStr);
    return (
      today.getFullYear() === hearingDate.getFullYear() &&
      today.getMonth() === hearingDate.getMonth() &&
      today.getDate() === hearingDate.getDate()
    );
  };

  const urgentCases = useMemo(() => {
    return visibleCases.filter((c) => isUrgent(c.nextHearingDate));
  }, [visibleCases]);

  const todayCases = useMemo(() => {
    return visibleCases.filter((c) => isToday(c.nextHearingDate));
  }, [visibleCases]);

  // Cases filtered by selected station (for SP) - must be defined before filteredCases
  const stationFilteredCases = useMemo(() => {
    if (!selectedStation) return visibleCases;
    return visibleCases.filter((c) => c.policeStation === selectedStation);
  }, [visibleCases, selectedStation]);

  const filteredCases = useMemo(() => {
    // Start with station-filtered cases (or all visible cases if no station selected)
    let result = stationFilteredCases;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.crimeNumber.toLowerCase().includes(query) ||
          c.policeStation.toLowerCase().includes(query) ||
          c.accusedNames.toLowerCase().includes(query) ||
          c.investigatingOfficer.toLowerCase().includes(query) ||
          c.courtName.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filter) {
      case 'urgent':
        result = result.filter((c) => isUrgent(c.nextHearingDate));
        break;
      case 'today':
        result = result.filter((c) => isToday(c.nextHearingDate));
        break;
      case 'pending':
        result = result.filter((c) => !c.judgmentResult);
        break;
      case 'convicted':
        result = result.filter((c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly');
        break;
      case 'acquitted':
        result = result.filter((c) => c.judgmentResult === 'Acquitted');
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [stationFilteredCases, searchQuery, filter, sortField, sortOrder]);

  const handleSort = (field: keyof CaseData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = (id: string, crimeNumber: string) => {
    if (!hasRole(['SP'])) {
      alert('Only SP can delete cases.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete case ${crimeNumber}?`)) {
      deleteCase(id);
    }
  };

  const stats = useMemo(() => {
    return {
      total: visibleCases.length,
      pending: visibleCases.filter((c) => !c.judgmentResult).length,
      convicted: visibleCases.filter((c) => c.judgmentResult === 'Convicted' || c.judgmentResult === 'Partly').length,
      acquitted: visibleCases.filter((c) => c.judgmentResult === 'Acquitted').length,
      urgent: urgentCases.length,
      today: todayCases.length,
    };
  }, [visibleCases, urgentCases, todayCases]);

  // Station-wise breakdown for SP
  const stationBreakdown = useMemo(() => {
    if (user?.role !== 'SP') return [];

    const stationMap = new Map<string, { total: number; pending: number; urgent: number }>();

    cases.forEach((c) => {
      const station = c.policeStation || 'Unknown';
      const current = stationMap.get(station) || { total: 0, pending: 0, urgent: 0 };
      current.total++;
      if (!c.judgmentResult) current.pending++;
      if (isUrgent(c.nextHearingDate)) current.urgent++;
      stationMap.set(station, current);
    });

    return Array.from(stationMap.entries())
      .map(([station, data]) => ({ station, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [cases, user?.role]);

  // Overdue Cases (past hearing date, no judgment)
  const overdueCases = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return visibleCases.filter((c) => {
      if (!c.nextHearingDate || c.judgmentResult) return false;
      const hearingDate = new Date(c.nextHearingDate);
      return hearingDate < today;
    }).slice(0, 5); // Show top 5
  }, [visibleCases]);

  // Upcoming 7-day Hearings Calendar
  const upcomingHearings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const hearingsByDay = new Map<string, CaseData[]>();

    visibleCases.forEach((c) => {
      if (!c.nextHearingDate) return;
      const hearingDate = new Date(c.nextHearingDate);
      if (hearingDate >= today && hearingDate <= weekLater) {
        const dateKey = c.nextHearingDate;
        const existing = hearingsByDay.get(dateKey) || [];
        existing.push(c);
        hearingsByDay.set(dateKey, existing);
      }
    });

    return Array.from(hearingsByDay.entries())
      .map(([date, cases]) => ({ date, cases, count: cases.length }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [visibleCases]);

  const SortIcon = ({ field }: { field: keyof CaseData }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h1>
          <p className="text-gray-600">
            {user?.role === 'SP'
              ? t('dashboard.districtOverview')
              : `${user?.policeStation} ${t('dashboard.caseOverview')}`}
          </p>
        </div>
        {hasRole(['Writer', 'SHO']) && (
          <button
            onClick={() => navigate('/case/new')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition"
          >
            <Plus size={20} /> <span>Register New Case</span>
          </button>
        )}
      </div>

      {/* Urgent Alerts Banner */}
      {urgentCases.length > 0 && (
        <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 text-red-500 flex-shrink-0" size={24} />
            <div className="flex-1">
              <h3 className="font-bold text-red-800">⚠ {t('dashboard.urgentAlert')}</h3>
              <p className="text-red-700 text-sm">
                {urgentCases.length} {t('dashboard.urgentAlertDesc')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {urgentCases.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/case/${c.id}`)}
                    className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200 transition"
                  >
                    <Bell size={14} className="mr-1" />
                    {c.crimeNumber} - {new Date(c.nextHearingDate).toLocaleDateString('en-IN')}
                  </button>
                ))}
                {urgentCases.length > 5 && (
                  <span className="text-red-600 text-sm">+{urgentCases.length - 5} more</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => setFilter('all')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <FileText size={24} className={`mb-2 ${filter === 'all' ? 'text-white' : 'text-blue-500'}`} />
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-80">{t('dashboard.totalCases')}</p>
        </div>

        <div
          onClick={() => setFilter('urgent')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'urgent' ? 'bg-red-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <AlertTriangle size={24} className={`mb-2 ${filter === 'urgent' ? 'text-white' : 'text-red-500'}`} />
          <p className="text-2xl font-bold">{stats.urgent}</p>
          <p className="text-sm opacity-80">{t('dashboard.urgent3Days')}</p>
        </div>

        <div
          onClick={() => setFilter('today')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'today' ? 'bg-orange-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <Clock size={24} className={`mb-2 ${filter === 'today' ? 'text-white' : 'text-orange-500'}`} />
          <p className="text-2xl font-bold">{stats.today}</p>
          <p className="text-sm opacity-80">{t('dashboard.hearingsToday')}</p>
        </div>

        <div
          onClick={() => setFilter('pending')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <Calendar size={24} className={`mb-2 ${filter === 'pending' ? 'text-white' : 'text-yellow-500'}`} />
          <p className="text-2xl font-bold">{stats.pending}</p>
          <p className="text-sm opacity-80">{t('dashboard.pending')}</p>
        </div>

        <div
          onClick={() => setFilter('convicted')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'convicted' ? 'bg-green-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <Users size={24} className={`mb-2 ${filter === 'convicted' ? 'text-white' : 'text-green-500'}`} />
          <p className="text-2xl font-bold">{stats.convicted}</p>
          <p className="text-sm opacity-80">{t('dashboard.convicted')}</p>
        </div>

        <div
          onClick={() => setFilter('acquitted')}
          className={`cursor-pointer rounded-xl p-4 shadow-sm transition hover:shadow-md ${filter === 'acquitted' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800'
            }`}
        >
          <Scale size={24} className={`mb-2 ${filter === 'acquitted' ? 'text-white' : 'text-gray-500'}`} />
          <p className="text-2xl font-bold">{stats.acquitted}</p>
          <p className="text-sm opacity-80">{t('dashboard.acquitted')}</p>
        </div>
      </div>

      {/* Advanced SP Analytics - Overdue Cases, Upcoming Hearings (Above Station Breakdown) */}
      {user?.role === 'SP' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Cases */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertOctagon size={22} />
                <h3 className="font-semibold">Overdue Cases</h3>
              </div>
              {overdueCases.length > 0 && (
                <span className="bg-white text-red-600 px-2 py-1 rounded-full text-sm font-bold">{overdueCases.length}</span>
              )}
            </div>
            <div className="p-4">
              {overdueCases.length > 0 ? (
                <div className="space-y-2">
                  {overdueCases.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/case/${c.id}`)}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{c.crimeNumber}</p>
                        <p className="text-xs text-gray-500">{c.policeStation}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-600 font-medium">
                          {new Date(c.nextHearingDate).toLocaleDateString('en-IN')}
                        </p>
                        <p className="text-xs text-red-500">Overdue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Target size={32} className="mx-auto text-green-500 mb-2" />
                  <p className="text-green-600 text-sm font-medium">No overdue cases!</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming 7-Day Hearings */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white flex items-center space-x-3">
              <CalendarDays size={22} />
              <h3 className="font-semibold">Next 7 Days</h3>
            </div>
            <div className="p-4">
              {upcomingHearings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingHearings.slice(0, 5).map((day) => {
                    const date = new Date(day.date);
                    const isTodayDate = date.toDateString() === new Date().toDateString();
                    const dayName = isTodayDate ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' });

                    return (
                      <div key={day.date} className={`p-3 rounded-lg ${isTodayDate ? 'bg-purple-50 border-2 border-purple-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${isTodayDate ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              {dayName}
                            </span>
                            <span className="text-sm text-gray-600">
                              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">
                            {day.count} {day.count === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {day.cases.slice(0, 3).map((c) => (
                            <span
                              key={c.id}
                              onClick={() => navigate(`/case/${c.id}`)}
                              className="text-xs bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition"
                              title={`${c.crimeNumber} - ${c.policeStation}`}
                            >
                              {c.crimeNumber.substring(0, 12)}
                            </span>
                          ))}
                          {day.cases.length > 3 && (
                            <span className="text-xs text-gray-500">+{day.cases.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No hearings in next 7 days</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Station-wise Breakdown (SP Only) */}
      {user?.role === 'SP' && stationBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowStationBreakdown(!showStationBreakdown)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
          >
            <div className="flex items-center space-x-3">
              <Building2 size={24} />
              <div className="text-left">
                <h3 className="font-semibold text-lg">Station-wise Case Breakdown</h3>
                <p className="text-sm text-blue-100">{stationBreakdown.length} Police Stations</p>
              </div>
            </div>
            {showStationBreakdown ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {showStationBreakdown && (
            <div className="p-4">
              {/* Selected Station Info */}
              {selectedStation && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <MapPin size={18} className="text-blue-600" />
                    <span className="font-medium text-blue-800">Filtering: {selectedStation}</span>
                  </div>
                  <button
                    onClick={() => setSelectedStation(null)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {stationBreakdown.map((item) => (
                  <div
                    key={item.station}
                    onClick={() => setSelectedStation(selectedStation === item.station ? null : item.station)}
                    className={`cursor-pointer rounded-lg p-3 border-2 transition hover:shadow-md ${selectedStation === item.station
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <p className="font-medium text-gray-800 text-sm truncate" title={item.station}>
                      {item.station}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">{item.total}</span>
                      <div className="flex items-center space-x-2 text-xs">
                        {item.urgent > 0 && (
                          <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center">
                            <AlertTriangle size={10} className="mr-0.5" />
                            {item.urgent}
                          </span>
                        )}
                        <span className="text-gray-500">{item.pending} pending</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by Crime No, PS, Accused, IO, Court..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredCases.length} of {visibleCases.length} cases
        </div>
      </div>

      {/* Cases Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-semibold"
                  onClick={() => handleSort('crimeNumber')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Crime No</span>
                    <SortIcon field="crimeNumber" />
                  </div>
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-semibold"
                  onClick={() => handleSort('policeStation')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Police Station</span>
                    <SortIcon field="policeStation" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sections</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Court</th>
                <th
                  className="cursor-pointer px-4 py-3 text-left text-sm font-semibold"
                  onClick={() => handleSort('nextHearingDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Next Hearing</span>
                    <SortIcon field="nextHearingDate" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No cases found</p>
                    <p className="text-sm">Try adjusting your search or filter criteria</p>
                  </td>
                </tr>
              ) : (
                filteredCases.slice(0, 10).map((caseItem) => {
                  const urgent = isUrgent(caseItem.nextHearingDate);
                  const daysUntil = getDaysUntilHearing(caseItem.nextHearingDate);

                  return (
                    <tr
                      key={caseItem.id}
                      className={`transition hover:bg-gray-50 ${urgent ? 'bg-red-50' : ''
                        }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-blue-800">
                          {caseItem.crimeNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {caseItem.policeStation}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block max-w-[150px] truncate text-sm text-gray-600">
                          {caseItem.sectionsOfLaw}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {caseItem.courtName}
                      </td>
                      <td className="px-4 py-3">
                        {caseItem.nextHearingDate ? (
                          <div
                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${urgent
                              ? 'animate-pulse bg-red-100 text-red-800'
                              : daysUntil <= 7
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-700'
                              }`}
                          >
                            {urgent && <AlertTriangle size={14} className="mr-1" />}
                            {new Date(caseItem.nextHearingDate).toLocaleDateString('en-IN')}
                            {daysUntil >= 0 && (
                              <span className="ml-1 text-xs">
                                ({daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {caseItem.judgmentResult ? (
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${caseItem.judgmentResult === 'Convicted'
                              ? 'bg-green-100 text-green-800'
                              : caseItem.judgmentResult === 'Acquitted'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                              }`}
                          >
                            {caseItem.judgmentResult}
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            {caseItem.currentStageOfTrial || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => navigate(`/case/${caseItem.id}`)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {hasRole(['Writer', 'SHO']) && (
                            <button
                              onClick={() => navigate(`/case/edit/${caseItem.id}`)}
                              className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                              title="Edit Case"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {hasRole(['SP']) && (
                            <button
                              onClick={() => handleDelete(caseItem.id, caseItem.crimeNumber)}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              title="Delete Case"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredCases.length > 10 && (
          <div className="px-4 py-3 text-center border-t bg-gray-50">
            <button
              onClick={() => navigate('/search')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View all {filteredCases.length} cases →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
