import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { RELIEF_META, statusMeta } from './statusMeta';

const COLUMNS = [
  { key: 'farmer', label: 'Farmer', sortable: false },
  { key: 'gat', label: 'Gat', sortable: false },
  { key: 'crop', label: 'Declared crop', sortable: false },
  { key: 'source', label: 'Channel', sortable: false },
  { key: 'status', label: 'Outcome', sortable: true },
  { key: 'createdAt', label: 'Submitted', sortable: true },
];

const SortIcon = ({ active, order }) => {
  if (!active) return null;
  return order === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5" />
    : <ArrowDown className="w-3.5 h-3.5" />;
};

export const SubmissionsTable = ({ submissions, loading, sortBy, sortOrder, onSort }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No submissions match these filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} scope="col" className="px-4 py-3 font-semibold">
                {col.sortable ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className="flex items-center gap-1 hover:text-gray-800 uppercase tracking-wide"
                  >
                    {col.label}
                    <SortIcon active={sortBy === col.key} order={sortOrder} />
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th scope="col" className="px-4 py-3 font-semibold">Reasons</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {submissions.map((sub) => {
            const meta = statusMeta(sub.status);
            const reasons = sub.validationResultId?.reasons || [];
            const matches = sub.calamityMatches || [];

            return (
              <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{sub.farmerId?.name || '—'}</div>
                  <div className="text-xs text-gray-500">{sub.farmerId?.phoneNumber || '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">Gat {sub.gatId?.gatNumber || '—'}</div>
                  <div className="text-xs text-gray-500">
                    {sub.gatId?.village}{sub.gatId?.district ? `, ${sub.gatId.district}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-gray-700">
                  {sub.crop?.declaredCrop || '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    {sub.source === 'WHATSAPP' ? 'WhatsApp' : 'Web'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.chip}`}>
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>

                    {/* Relief eligibility is a second, independent dimension — a
                        filing can be Valid and also sit inside a declared zone. */}
                    {matches.length > 0 && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${RELIEF_META.chip}`}
                        title={matches.map((m) => m.calamityZone?.name).filter(Boolean).join('\n')}
                      >
                        <span className={`w-2 h-2 rounded-full ${RELIEF_META.dot}`} />
                        {RELIEF_META.label}
                        {matches.length > 1 && ` (${matches.length})`}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                  {reasons.length > 0 ? reasons.join('; ') : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
