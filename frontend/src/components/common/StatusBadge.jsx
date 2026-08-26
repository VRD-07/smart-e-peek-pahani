import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const config = {
    PASS: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, text: 'Validation Passed' },
    FAIL: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Validation Failed' },
    REVIEW: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Needs Review' },
    SYNC_PENDING: { color: 'bg-blue-100 text-blue-700', icon: Clock, text: 'Sync Pending' },
    // Backend Submission statuses (Officer Dashboard)
    VALID: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, text: 'Valid' },
    INVALID: { color: 'bg-red-100 text-red-700', icon: XCircle, text: 'Rejected' },
    PENDING_VALIDATION: { color: 'bg-gray-100 text-gray-700', icon: RefreshCw, text: 'Validating' },
    DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock, text: 'Draft' },
    SYNCED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle2, text: 'Synced' }
  };

  const current = config[status] || config.REVIEW;
  const Icon = current.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${current.color}`}>
      <Icon className="w-4 h-4" />
      {current.text}
    </div>
  );
};
