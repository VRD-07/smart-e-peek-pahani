import { Filter, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'VALID', label: 'Valid' },
  { value: 'REVIEW', label: 'Needs review' },
  { value: 'INVALID', label: 'Rejected' },
  { value: 'PENDING_VALIDATION', label: 'Validating' },
];

const inputClass =
  'text-sm border border-gray-200 rounded-lg py-1.5 px-3 bg-white focus:ring-primary-500 focus:border-primary-500';

export const FilterBar = ({ filters, onChange, onReset, gats }) => {
  const set = (key) => (e) => onChange(key, e.target.value);

  const hasActiveFilter = ['status', 'gatId', 'district', 'from', 'to']
    .some((key) => filters[key]);

  return (
    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
        <Filter className="w-4 h-4" />
        Filters
      </div>

      <select className={inputClass} value={filters.status} onChange={set('status')} aria-label="Status">
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <select className={inputClass} value={filters.gatId} onChange={set('gatId')} aria-label="Gat">
        <option value="">All Gats</option>
        {gats.map((gat) => (
          <option key={gat._id} value={gat._id}>
            Gat {gat.gatNumber} — {gat.village}
          </option>
        ))}
      </select>

      <input
        className={inputClass}
        type="text"
        placeholder="District"
        value={filters.district}
        onChange={set('district')}
        aria-label="District"
      />

      <label className="text-sm text-gray-500 flex items-center gap-2">
        From
        <input className={inputClass} type="date" value={filters.from} onChange={set('from')} />
      </label>

      <label className="text-sm text-gray-500 flex items-center gap-2">
        To
        <input className={inputClass} type="date" value={filters.to} onChange={set('to')} />
      </label>

      {hasActiveFilter && (
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 ml-auto"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  );
};
