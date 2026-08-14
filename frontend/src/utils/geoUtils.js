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

/**
 * Validates the device location against the selected Gat's boundary and accuracy threshold.
 *
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @param {number} accuracy - Device GPS accuracy in meters
 * @param {Object} gat - The currently selected Gat object
 * @returns {Object} Validation result { status, isValid, message }
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
    return {
      status: 'OUTSIDE',
      isValid: false,
      message: `You appear to be outside the selected field. Move closer to Gat ${gat.gatNumber} and try again.`
    };
  }

  // 3. Valid
  return {
    status: 'VALID',
    isValid: true,
    message: 'Location Verified'
  };
};
