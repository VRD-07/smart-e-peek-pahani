/**
 * Printing a distance for someone standing in a field.
 *
 * Turf gives metres at float precision. "5183.4471948m outside the boundary" is
 * true and useless; a farmer needs to know whether they are in the wrong corner of
 * the right field or in the wrong village. So: kilometres to one decimal above a
 * kilometre, whole metres below it, and never more precision than the GPS fix that
 * produced the number could justify.
 *
 * The unit word is translated but the digits are not — Devanagari numerals are
 * accepted as input (see services/survey/areaUnits) but Marathi SMS and WhatsApp
 * traffic in this region is written with ASCII digits.
 */

// Above this, switch to kilometres.
const KM_THRESHOLD_METERS = 1000;

const UNITS = {
  mr: { km: 'किमी', m: 'मीटर' },
  hi: { km: 'किमी', m: 'मीटर' },
  en: { km: 'km', m: 'm' },
};

/**
 * @param {number} meters
 * @param {string} [language] - 'mr' | 'hi' | 'en'. Falls back to Marathi, the default.
 * @returns {string} e.g. '5.2 किमी', '240 मीटर', '5.2 km'
 */
function formatDistance(meters, language = 'mr') {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) return '-';

  const units = UNITS[language] || UNITS.mr;

  if (meters >= KM_THRESHOLD_METERS) {
    // One decimal, trailing '.0' trimmed: '5 किमी' reads better than '5.0 किमी'.
    const km = Number.parseFloat((meters / 1000).toFixed(1));
    return `${km} ${units.km}`;
  }

  return `${Math.round(meters)} ${units.m}`;
}

module.exports = {
  KM_THRESHOLD_METERS,
  formatDistance,
};
