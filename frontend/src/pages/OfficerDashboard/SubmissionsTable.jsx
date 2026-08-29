import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, RefreshCw, X } from 'lucide-react';
import api from '../../services/api';
import { RELIEF_META, statusMeta } from './statusMeta';

const COLUMNS = [
  { key: 'farmer', label: 'Farmer', sortable: false },
  { key: 'gat', label: 'Gat', sortable: false },
  { key: 'crop', label: 'Declared crop', sortable: false },
  { key: 'source', label: 'Channel', sortable: false },
  { key: 'status', label: 'Outcome', sortable: true },
  { key: 'createdAt', label: 'Submitted', sortable: true },
];

// An override is only meaningful on a filing the gate did not settle, or one an
// officer already settled the other way. Approving something already VALID, or a
// filing still queued for validation, would be a no-op with a confusing audit trail.
const CAN_APPROVE = ['REVIEW', 'INVALID'];
const CAN_REJECT = ['REVIEW', 'VALID'];

const SortIcon = ({ active, order }) => {
  if (!active) return null;
  return order === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5" />
    : <ArrowDown className="w-3.5 h-3.5" />;
};

export const SubmissionsTable = ({ submissions, loading, sortBy, sortOrder, onSort, onReviewed }) => {
  // Which row is mid-request, and the error from the last failed one. Kept local
  // to the table: the dashboard's own error banner is about loading the list.
  const [pendingId, setPendingId] = useState(null);
  const [overrideError, setOverrideError] = useState(null);

  const handleOverride = async (submissionId, status) => {
    setPendingId(submissionId);
    setOverrideError(null);

    try {
      await api.patch(`/submissions/${submissionId}/status`, { status });
      // Re-reads the list through the dashboard's existing loader, so the table,
      // the status counts and the map all move together.
      if (onReviewed) await onReviewed();
    } catch (err) {
      setOverrideError(
        err.response?.status === 403
          ? 'This account is not authorised to override submission outcomes.'
          : err.response?.data?.message || 'Could not record the decision. Please try again.'
      );
    } finally {
      setPendingId(null);
    }
  };

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
      {overrideError && (
        <div className="m-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {overrideError}
        </div>
      )}

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
            <th scope="col" className="px-4 py-3 font-semibold">Decision</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {submissions.map((sub) => {
            const meta = statusMeta(sub.status);
            const reasons = sub.validationResultId?.reasons || [];
            const matches = sub.calamityMatches || [];
            const busy = pendingId === sub._id;

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

                    {/* Duplicate Photo Detection Flag */}
                    {sub.validationResultId?.checks?.duplicate?.status === 'REVIEW' && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                        title={`Matched with prior submission ${sub.validationResultId?.checks?.duplicate?.matchedSubmissionId || ''}`}
                      >
                        <span>⚠️ Duplicate Photo</span>
                        {sub.validationResultId?.checks?.duplicate?.similarity && (
                          <span className="text-[10px] opacity-80">
                            ({Math.round(sub.validationResultId.checks.duplicate.similarity * 100)}%)
                          </span>
                        )}
                      </span>
                    )}

                    {/* Marks the outcome as a person's decision rather than the
                        gate's, which is the whole point of keeping reviewedBy. */}
                    {sub.reviewedAt && (
                      <span className="text-[11px] text-gray-400">
                        Officer decision · {new Date(sub.reviewedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-700 max-w-xs space-y-1">
                  {sub.validationResultId?.checks?.duplicate?.status === 'REVIEW' && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2 rounded-lg text-[11px] space-y-0.5">
                      <p className="font-bold flex items-center gap-1 text-amber-800">
                        <span>🚨 संशयित नक्कल (Suspected Duplicate)</span>
                      </p>
                      <p className="text-[10.5px]">
                        समान फोटो यापूर्वी <strong>गट {sub.validationResultId.checks.duplicate.matchedGatNumber}</strong> वर फोन <strong>{sub.validationResultId.checks.duplicate.matchedFarmerPhone}</strong> द्वारे सबमिट केला गेला आहे.
                      </p>
                      {sub.validationResultId.checks.duplicate.matchedSubmissionId && (
                        <p className="text-[10px] text-amber-700 font-mono">
                          मूळ नोंदणी ID: #{String(sub.validationResultId.checks.duplicate.matchedSubmissionId).slice(-6)}
                        </p>
                      )}
                    </div>
                  )}
                  {reasons.length > 0 ? (
                    <div>{reasons.filter(r => !r.toLowerCase().includes('duplicate')).join('; ') || (sub.validationResultId?.checks?.duplicate?.status === 'REVIEW' ? '' : '—')}</div>
                  ) : (
                    sub.validationResultId?.checks?.duplicate?.status === 'REVIEW' ? null : '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {CAN_APPROVE.includes(sub.status) && (
                      <button
                        onClick={() => handleOverride(sub._id, 'VALID')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
                        title="Record this filing as verified"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    )}

                    {CAN_REJECT.includes(sub.status) && (
                      <button
                        onClick={() => handleOverride(sub._id, 'REJECTED')}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
                        title="Record this filing as rejected"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    )}

                    {busy && <RefreshCw className="w-3.5 h-3.5 text-gray-400 animate-spin" />}

                    {!CAN_APPROVE.includes(sub.status) && !CAN_REJECT.includes(sub.status) && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
