import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { OFFICER_STORAGE_KEY } from './statusMeta';

export const OfficerLogin = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!employeeId || !password) {
      setError('Please enter your employee ID and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/officer/login', { employeeId, password });
      const { token, officer } = response.data.data;

      localStorage.setItem('smart_e_peek_token', token);
      localStorage.setItem(OFFICER_STORAGE_KEY, JSON.stringify(officer));

      window.location.href = '/officer';
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid employee ID or password.');
      } else if (err.response?.status === 400) {
        setError('Please enter your employee ID and password.');
      } else {
        setError('Unable to connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex bg-primary-500 p-3 rounded-xl mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900">Officer Login</h2>
        <p className="mt-2 text-sm text-gray-500">
          Review crop submissions across every farmer and Gat in your jurisdiction.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                Employee ID
              </label>
              <div className="mt-1">
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  autoComplete="username"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g. OFFICER001"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <p className="mt-6 text-xs text-gray-400 text-center">
            Demo account: seed one with <code>node scripts/seedDemoOfficer.js</code>.
            Production deployments would federate officer identity with the state
            revenue-department directory.
          </p>
        </div>
      </div>
    </div>
  );
};
