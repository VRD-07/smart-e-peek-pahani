/**
 * Simple Ray-Casting algorithm to check if a point is inside a polygon.
 *
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @param {Object} boundary - GeoJSON Polygon boundary of the Gat
 * @returns {boolean} True if point is inside polygon
 */
export const isPointInPolygon = (lat, lng, boundary) => {
  if (!boundary || boundary.type !== 'Polygon' || !boundary.coordinates || !boundary.coordinates[0]) {
    return false; // Invalid boundary
  }

  const polygon = boundary.coordinates[0]; // array of [longitude, latitude]
  const x = lng;
  const y = lat;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

// Metres per degree of latitude. Constant enough at this scale; longitude is
// scaled by cos(latitude) at the point being measured.
const METERS_PER_DEGREE_LAT = 111320;

/**
 * Shortest distance in metres from a point to a line segment, both in degrees.
 *
 * An equirectangular projection around the point being measured: degrees are
 * converted to metres, then it is plain 2D geometry. Over the few kilometres this
 * is ever asked about the error is well under a percent — far below the precision
 * the answer is printed at — and it keeps the PWA bundle free of a geospatial
 * library. The backend does the authoritative version with Turf.
 */
const distanceToSegmentMeters = (lat, lng, [aLng, aLat], [bLng, bLat]) => {
  const scaleLng = Math.cos((lat * Math.PI) / 180) * METERS_PER_DEGREE_LAT;

  const px = (lng - aLng) * scaleLng;
  const py = (lat - aLat) * METERS_PER_DEGREE_LAT;
  const sx = (bLng - aLng) * scaleLng;
  const sy = (bLat - aLat) * METERS_PER_DEGREE_LAT;

  const segmentLengthSquared = sx * sx + sy * sy;

  // A degenerate segment (repeated vertex) collapses to point-to-point.
  const t = segmentLengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (px * sx + py * sy) / segmentLengthSquared));

  const dx = px - t * sx;
  const dy = py - t * sy;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Distance in metres from a point to the nearest edge of a Gat polygon.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Object} boundary - GeoJSON Polygon
 * @returns {number|null} metres, or null if the boundary is unusable
 */
export const distanceToBoundaryMeters = (lat, lng, boundary) => {
  if (!boundary || boundary.type !== 'Polygon' || !boundary.coordinates || !boundary.coordinates[0]) {
    return null;
  }

  const ring = boundary.coordinates[0];
  if (ring.length < 2) return null;

  let nearest = Infinity;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const d = distanceToSegmentMeters(lat, lng, ring[j], ring[i]);
    if (d < nearest) nearest = d;
  }

  return Number.isFinite(nearest) ? nearest : null;
};

// Above this, switch to kilometres. Mirrors backend src/utils/distance.js — the
// same rule has to hold on both sides so the website and the WhatsApp reply do not
// quote the same submission differently.
const KM_THRESHOLD_METERS = 1000;

/**
 * Prints a distance for someone standing in a field: kilometres to one decimal
 * above a kilometre, whole metres below it. Never more precision than the GPS fix
 * that produced the number could justify.
 *
 * @param {number} meters
 * @returns {string} e.g. '5.2 km', '240 m'
 */
export const formatDistance = (meters) => {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) return '-';

  if (meters >= KM_THRESHOLD_METERS) {
    // Trailing '.0' trimmed: '5 km' reads better than '5.0 km'.
    const km = Number.parseFloat((meters / 1000).toFixed(1));
    return `${km} km`;
  }

  return `${Math.round(meters)} m`;
};

/**
 * Validates the device location against the selected Gat's boundary and accuracy threshold.
 *
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @param {number} accuracy - Device GPS accuracy in meters
 * @param {Object} gat - The currently selected Gat object
 * @returns {Object} Validation result { status, isValid, message, distanceFromBoundary }
 */
export const validateGatLocation = (lat, lng, accuracy, gat) => {
  // 1. Check Accuracy Threshold
  if (accuracy > 50) {
    return {
      status: 'POOR_ACCURACY',
      isValid: false,
      message: 'GPS accuracy is too low. Please wait or move to an open area.'
    };
  }

  // 2. Check Boundary
  if (!gat || !gat.boundary) {
    return {
      status: 'OUTSIDE',
      isValid: false,
      message: 'Selected Gat boundary is invalid or missing.'
    };
  }

  const inside = isPointInPolygon(lat, lng, gat.boundary);

  if (!inside) {
    // "Outside the selected field" on its own does not tell a farmer whether they
    // are in the next furrow or the next village — and only one of those is worth
    // walking back for. The distance is what separates a drifted GPS fix from the
    // wrong Gat having been picked off the list.
    const distanceFromBoundary = distanceToBoundaryMeters(lat, lng, gat.boundary);

    return {
      status: 'OUTSIDE',
      isValid: false,
      distanceFromBoundary,
      message: distanceFromBoundary === null
        ? `You appear to be outside the selected field. Move closer to Gat ${gat.gatNumber} and try again.`
        : `You are approximately ${formatDistance(distanceFromBoundary)} away from your registered field `
          + `boundary (Gat ${gat.gatNumber}). File again while standing in your field, or select the correct Gat.`
    };
  }

  // 3. Valid
  return {
    status: 'VALID',
    isValid: true,
    message: 'Location Verified'
  };
};
