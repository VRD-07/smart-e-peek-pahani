import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Phone, RefreshCw, Smartphone } from 'lucide-react';
import api from '../../services/api';

/**
 * Which channel reached each farmer in the current reminder cycle.
 *
 * The reminder ladder tries WhatsApp first, falls back to SMS if nothing comes
 * back within its window, then places an automated voice call. This block is how
 * an officer sees where that got to.
 *
 * `Reached` is confirmed delivery. `Attempted` is sends, confirmed or not, and is
 * shown alongside because most sends sit unconfirmed for a while — a row of zeroes
 * under Reached would otherwise read as though nothing had gone out at all.
 */
const CHANNEL_META = [
  {
    key: 'WHATSAPP',
    label: 'WhatsApp',
    Icon: MessageCircle,
    dot: 'bg-emerald-500',
    hint: 'Tried first — richest message and the cheapest to send.',
  },
  {
    key: 'SMS',
    label: 'SMS',
    Icon: Smartphone,
    dot: 'bg-sky-500',
    hint: 'Shortened plain-text fallback for a handset with no WhatsApp.',
  },
  {
    key: 'VOICE',
    label: 'Voice call',
    Icon: Phone,
    dot: 'bg-violet-500',
    hint: 'Automated call playing a pre-recorded Marathi message.',
  },
];

export const ReachStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/notifications/escalation-stats');
      setStats(response.data.data);
    } catch {
      setError('Unable to load reminder reach figures.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cycleLabel = stats?.cycles?.length
    ? stats.cycles
      .map((cycle) => `${cycle.season} ${cycle.year} · ${cycle.offsetDays}-day reminder`)
      .join(', ')
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Reminder reach</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {cycleLabel || 'No reminder cycle is running.'}
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh reminder reach"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!error && stats && stats.total === 0 && (
        <p className="text-sm text-gray-500">
          No reminders have gone out for this cycle yet.
        </p>
      )}

      {!error && stats && stats.total > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {CHANNEL_META.map(({ key, label, Icon, dot, hint }) => (
              <div
                key={key}
                className="p-3 rounded-xl border border-gray-100 bg-gray-50/60"
                title={hint}
              >
                <div className="text-xs font-medium mb-1 flex items-center gap-1.5 text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </div>
                <div className="text-2xl font-bold text-gray-900">{stats.reached[key] ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {stats.attempted[key] ?? 0} attempted
                </div>
              </div>
            ))}

            <div
              className="p-3 rounded-xl border border-gray-100 bg-gray-50/60"
              title="Still working down the ladder — sent, but no confirmation back yet."
            >
              <div className="text-xs font-medium mb-1 flex items-center gap-1.5 text-gray-500">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Awaiting confirmation
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {stats.unreached} reached on no channel
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Counted across {stats.total} farmer{stats.total === 1 ? '' : 's'} in this cycle.
            The figure under each channel is confirmed delivery; a message the carrier has
            accepted but the handset has not confirmed shows as awaiting confirmation, not as
            reached. Farmers no channel reached are reported as such rather than folded into
            the totals.
          </p>
        </>
      )}
    </div>
  );
};
