const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const pointToLineDistance = require('@turf/point-to-line-distance').default;
const polygonToLine = require('@turf/polygon-to-line').default;
const { point, polygon } = require('@turf/helpers');

const validateLocation = (location, gatBoundary) => {
  if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return {
      status: 'FAIL',
      insideGat: false,
      reason: 'Missing or invalid coordinates'
    };
  }

  if (location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) {
    return {
      status: 'FAIL',
      insideGat: false,
      reason: 'Coordinates out of bounds'
    };
  }

  try {
    // GeoJSON uses [longitude, latitude]
    const pt = point([location.longitude, location.latitude]);
    const poly = polygon(gatBoundary.coordinates);

    const isInside = booleanPointInPolygon(pt, poly);

    const line = polygonToLine(poly);
    const distanceToBoundary = pointToLineDistance(pt, line, { units: 'meters' });

    return {
      status: isInside ? 'PASS' : 'FAIL',
      insideGat: isInside,
      distanceFromBoundary: distanceToBoundary
    };
  } catch (err) {
    return {
      status: 'FAIL',
      insideGat: false,
      reason: 'Invalid polygon boundary or point'
    };
  }
};

module.exports = { validateLocation };
