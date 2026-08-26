const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const pointToLineDistance = require('@turf/point-to-line-distance').default;
const polygonToLine = require('@turf/polygon-to-line').default;
const { point, polygon } = require('@turf/helpers');
const {
  BOUNDARY_BUFFER_PARCEL_FRACTION,
  LOCATION_REASON_CODES,
  nearBoundaryThreshold,
} = require('./constants');

/**
 * Distance in metres from the middle of the parcel to its nearest edge — a proxy
 * for "how big is this plot", used only to keep the review band proportionate.
 *
 * The mean of the ring's vertices, not a true area centroid. For the rectangular
 * survey parcels this system works with the two coincide, and for an awkward
 * shape it still answers the only question being asked: is this plot small enough
 * that a 15m band would swallow it?
 */
const parcelHalfWidth = (poly, line) => {
  const ring = poly.geometry.coordinates[0];
  // The ring is closed, so the last vertex repeats the first.
  const vertices = ring.slice(0, -1);
  if (vertices.length === 0) return null;

  const lng = vertices.reduce((sum, c) => sum + c[0], 0) / vertices.length;
  const lat = vertices.reduce((sum, c) => sum + c[1], 0) / vertices.length;

  return pointToLineDistance(point([lng, lat]), line, { units: 'meters' });
};

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

    if (!isInside) {
      return {
        status: 'FAIL',
        insideGat: false,
        distanceFromBoundary: distanceToBoundary
      };
    }

    // Inside the Gat, but how far inside? The point-in-polygon test is a hard
    // yes/no on a boundary drawn to survey precision, applied to a coordinate
    // from a phone that is accurate to several metres. Near the edge the two are
    // not comparable, so the honest answer is not "approved" — it is "a person
    // should look at this".
    //
    // This is a routing rule, not a detection one. It cannot tell a farmer
    // standing legitimately at the edge of their own field from someone standing
    // just over the line, and it does not claim to. It stops the system from
    // asserting a difference the measurement cannot support.
    const reviewBuffer = Math.min(
      nearBoundaryThreshold(),
      // A parcel too small or too odd to measure gets the flat threshold rather
      // than an accidental zero, which would disable the check silently.
      (parcelHalfWidth(poly, line) ?? Infinity) * BOUNDARY_BUFFER_PARCEL_FRACTION
    );

    if (distanceToBoundary < reviewBuffer) {
      return {
        status: 'REVIEW',
        insideGat: true,
        distanceFromBoundary: distanceToBoundary,
        reasonCode: LOCATION_REASON_CODES.NEAR_BOUNDARY,
        reviewBufferMeters: reviewBuffer,
        reason: `Inside Gat but ${distanceToBoundary.toFixed(1)}m from the boundary `
          + `(within the ${reviewBuffer.toFixed(1)}m review band)`
      };
    }

    return {
      status: 'PASS',
      insideGat: true,
      distanceFromBoundary: distanceToBoundary,
      reviewBufferMeters: reviewBuffer
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
