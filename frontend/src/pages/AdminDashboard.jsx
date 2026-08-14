import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Filter, RefreshCw } from 'lucide-react';
import { StatusBadge, Button } from '../components/common';
import { db } from '../storage/db';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Fetch synced data from local DB
      const localData = await db.submissions.where('status').equals('SYNCED').toArray();
      const localPending = await db.submissions.where('status').equals('SYNC_PENDING').toArray();

      const formattedLocal = localData.map(item => ({
        id: item.id,
        name: item.data.name,
        crop: item.data.crop,
        status: item.validationStatus || 'SYNCED',
        date: item.syncDate
      }));

      const formattedPending = localPending.map(item => ({
        id: item.id,
        name: item.data.name,
        crop: item.data.crop,
        status: 'SYNC_PENDING',
        date: new Date(item.timestamp).toISOString()
      }));

      setSubmissions([...formattedLocal, ...formattedPending]);
      setLoading(false);
    };
    loadData();
  }, []);

  const stats = {
    total: submissions.length,
    valid: submissions.filter(s => s.status === 'PASS').length,
    invalid: submissions.filter(s => s.status === 'FAIL').length,
    review: submissions.filter(s => s.status === 'REVIEW').length,
    pending: submissions.filter(s => s.status === 'SYNC_PENDING').length,
  };

  const filteredSubmissions = filter === 'ALL'
    ? submissions
    : submissions.filter(s => s.status === filter);

  return (
    <div className="flex flex-col flex-1 p-4 max-w-2xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <Button variant="outline" onClick={() => navigate('/')} className="w-auto px-4 py-2">
          <Home className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-gray-500 text-sm font-medium mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
          <div className="text-green-700 text-sm font-medium mb-1">Valid</div>
          <div className="text-2xl font-bold text-green-700">{stats.valid}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
          <div className="text-red-700 text-sm font-medium mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-700">{stats.invalid}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
          <div className="text-amber-700 text-sm font-medium mb-1">Review</div>
          <div className="text-2xl font-bold text-amber-700">{stats.review}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-900">Recent Submissions</h3>
          <select
            className="text-sm border border-gray-200 rounded-lg py-1.5 pl-3 pr-8 focus:ring-primary-500 focus:border-primary-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PASS">Passed</option>
            <option value="FAIL">Failed</option>
            <option value="REVIEW">Needs Review</option>
            <option value="SYNC_PENDING">Sync Pending</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No submissions found.</div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div>
                    <h4 className="font-medium text-gray-900">{sub.name}</h4>
                    <p className="text-xs text-gray-500">{sub.crop} • {new Date(sub.date).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
