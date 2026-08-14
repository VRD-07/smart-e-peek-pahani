/**
 * Validates and normalizes raw location data from Twilio/WhatsApp payload.
 *
 * @param {string|number} rawLat - The raw latitude
 * @param {string|number} rawLon - The raw longitude
 * @returns {Object|null} - The normalized location object, or null if invalid
 */
function processLocation(rawLat, rawLon) {
  if (rawLat === undefined || rawLat === null || rawLon === undefined || rawLon === null) {
    return null;
  }

  // Strictly convert to Number, rejecting NaN or invalid strings
  // Number() handles empty string as 0, so we check for empty string explicitly if needed,
  // but let's just trim strings if they are strings.
  let latStr = typeof rawLat === 'string' ? rawLat.trim() : rawLat;
  let lonStr = typeof rawLon === 'string' ? rawLon.trim() : rawLon;

  if (latStr === '' || lonStr === '') return null;

  const lat = Number(latStr);
  const lon = Number(lonStr);

  if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
    return null;
  }

  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  return {
    latitude: lat,
    longitude: lon,
    source: "WHATSAPP",
    receivedAt: new Date().toISOString()
  };
}

module.exports = {
  processLocation
};
