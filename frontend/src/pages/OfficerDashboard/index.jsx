import { useCallback, useEffect, useState } from 'react';
import { LogOut, Map as MapIcon, RefreshCw, Table as TableIcon } from 'lucide-react';
import api from '../../services/api';
import { FilterBar } from './FilterBar';
import { ReachStats } from './ReachStats';
import { SubmissionsTable } from './SubmissionsTable';
import { SubmissionsMap } from './SubmissionsMap';
import { clearOfficerSession, getStoredOfficer, RELIEF_META, statusMeta } from './statusMeta';

const EMPTY_FILTERS = {
  status: '',
  gatId: '',
  district: '',
  from: '',
  to: '',
  reliefEligible: '',
};

const STAT_CARDS = ['VALID', 'REVIEW', 'INVALID', 'PENDING_VALIDATION'];

export const OfficerDashboard = () => {
  const officer = getStoredOfficer();

  const [submissions, setSubmissions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [reliefEligibleCount, setReliefEligibleCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [gats, setGats] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState('TABLE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { page, sortBy, sortOrder };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const response = await api.get('/submissions', { params });
      const data = response.data.data;

      setSubmissions(data.submissions);
      setStatusCounts(data.statusCounts || {});
      setReliefEligibleCount(data.reliefEligibleCount || 0);
      setPagination(data.pagination);
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This account is not authorised to view the officer dashboard.');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'One of the filters is invalid.');
      } else {
        setError('Unable to load submissions. Please try again.');
      }
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, sortBy, sortOrder]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // Gat list drives the Gat filter dropdown.
  useEffect(() => {
    api.get('/gats')
      .then((response) => setGats(response.data.data || []))
      .catch(() => setGats([]));
  }, []);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleSignOut = () => {
    clearOfficerSession();
    window.location.href = '/officer/login';
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Officer Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            {officer
              ? `${officer.name} • ${officer.employeeId} • ${officer.jurisdiction?.district || ''}`
              : 'All crop submissions across farmers and Gats'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSubmissions}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300 bg-white rounded-xl px-4 py-2 font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-sm font-medium mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
        </div>

        {STAT_CARDS.map((status) => {
          const meta = statusMeta(status);
          return (
            <button
              key={status}
              onClick={() => handleFilterChange('status', filters.status === status ? '' : status)}
              className={`p-4 rounded-xl border shadow-sm text-left transition-colors ${
                filters.status === status
                  ? 'border-gray-300 bg-gray-50 ring-2 ring-primary-500/30'
                  : 'border-gray-100 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-500">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                {meta.label}
              </div>
              <div className="text-2xl font-bold text-gray-900">{statusCounts[status] || 0}</div>
            </button>
          );
        })}

        {/* Relief eligibility is orthogonal to the outcome buckets, so it gets its
            own toggle rather than joining the status cards. */}
        <button
          onClick={() => handleFilterChange('reliefEligible', filters.reliefEligible === 'true' ? '' : 'true')}
          className={`p-4 rounded-xl border shadow-sm text-left transition-colors ${
            filters.reliefEligible === 'true'
              ? 'border-gray-300 bg-gray-50 ring-2 ring-primary-500/30'
              : 'border-gray-100 bg-white hover:bg-gray-50'
          }`}
          title="Verified filings whose field falls inside a declared calamity zone"
        >
          <div className="text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-500">
            <span className={`w-2 h-2 rounded-full ${RELIEF_META.dot}`} />
            Relief
          </div>
          <div className="text-2xl font-bold text-gray-900">{reliefEligibleCount}</div>
        </button>
      </div>

      {/* Outbound reminders, not submissions — its own block rather than another
          card in the grid above, because it counts farmers contacted rather than
          filings received. */}
      <ReachStats />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
          gats={gats}
        />

        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Submissions
            {pagination.total > 0 && (
              <span className="text-gray-400 font-normal text-sm ml-2">
                {pagination.total} total
              </span>
            )}
          </h3>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('TABLE')}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                view === 'TABLE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setView('MAP')}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                view === 'MAP' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>

        {error && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {view === 'TABLE' ? (
            <SubmissionsTable
              submissions={submissions}
              loading={loading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onReviewed={loadSubmissions}
            />
          ) : (
            <SubmissionsMap submissions={submissions} />
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 bg-white font-semibold text-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:border-gray-300 bg-white font-semibold text-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Outcomes are produced by the shared validation engine used by both the web app and the
        WhatsApp bot. Submissions marked <strong>Review</strong> need a human decision — no photo
        and GPS check can rule out every false claim, so flagged cases are surfaced rather than
        silently approved. <strong>Relief eligible</strong> means a verified filing's field falls
        inside a declared calamity zone and should be assessed for relief — it is not an approved
        payout, and the decision stays with the revenue office.
      </p>
    </div>
  );
};
