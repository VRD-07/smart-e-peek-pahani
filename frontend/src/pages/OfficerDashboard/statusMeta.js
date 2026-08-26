// Shared status presentation for the Officer Dashboard.
// Mirrors the backend's deterministic Green / Yellow / Red outcomes — every
// submission lands in exactly one of these buckets, never a vague score.
export const STATUS_META = {
  VALID: { label: 'Valid', color: '#16a34a', dot: 'bg-green-500', chip: 'bg-green-100 text-green-700' },
  REVIEW: { label: 'Review', color: '#d97706', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' },
  INVALID: { label: 'Rejected', color: '#dc2626', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700' },
  PENDING_VALIDATION: { label: 'Validating', color: '#2563eb', dot: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700' },
};

export const FALLBACK_STATUS_META = {
  label: 'Unknown',
  color: '#6b7280',
  dot: 'bg-gray-400',
  chip: 'bg-gray-100 text-gray-700',
};

export const statusMeta = (status) => STATUS_META[status] || FALLBACK_STATUS_META;

// Calamity-relief flag. Deliberately a separate dimension from the validation
// outcome above: a submission is Valid *and* may be relief-eligible, so this
// renders as its own badge rather than a sixth outcome colour.
export const RELIEF_META = {
  label: 'Relief eligible',
  color: '#7c3aed',
  dot: 'bg-violet-500',
  chip: 'bg-violet-100 text-violet-700',
};

export const OFFICER_STORAGE_KEY = 'smart_e_peek_officer';

export const getStoredOfficer = () => {
  try {
    const raw = localStorage.getItem(OFFICER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearOfficerSession = () => {
  localStorage.removeItem('smart_e_peek_token');
  localStorage.removeItem(OFFICER_STORAGE_KEY);
};
