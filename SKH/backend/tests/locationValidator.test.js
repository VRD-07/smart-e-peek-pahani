const { validateLocation } = require('../src/services/validation/locationValidator');
const {
  DEFAULT_NEAR_BOUNDARY_METERS,
} = require('../src/services/validation/constants');

// A square parcel centred on (lat, lng), `offset` degrees to a side from centre.
const squareGat = (lat, lng, offset) => ({
  type: 'Polygon',
  coordinates: [[
    [lng - offset, lat - offset], // Bottom Left
    [lng + offset, lat - offset], // Bottom Right
    [lng + offset, lat + offset], // Top Right
    [lng - offset, lat + offset], // Top Left
    [lng - offset, lat - offset], // Close Loop
  ]],
});

// Roughly 94m to a side — an ordinary smallholding, and big enough that the full
// 15m review band applies rather than being capped by the parcel-size rule.
const ORDINARY_GAT = squareGat(19.9040, 74.4975, 0.00045);

// The demo Gats 101-105 are only ~27m to a side. They exist to be geographically
// distinct on a map, not to be realistic parcels, and they are the case the
// parcel-size cap is there to protect.
const TINY_GAT = squareGat(19.901255644016928, 74.4939745930154, 0.00013);

const METRES_PER_DEGREE_LAT = 110900;

// A point `metres` south of the parcel's northern edge, on its centre meridian —
// i.e. that far inside the boundary. Approximate by design: the assertions below
// check ranges, because the exact figure is Turf's geodesic answer, not ours.
const insideNorthEdge = (boundary, metres) => {
  const ring = boundary.coordinates[0];
  const northLat = ring[2][1];
  const centreLng = (ring[0][0] + ring[1][0]) / 2;
  return {
    latitude: northLat - metres / METRES_PER_DEGREE_LAT,
    longitude: centreLng,
  };
};

const centreOf = (boundary) => {
  const ring = boundary.coordinates[0];
  return {
    latitude: (ring[0][1] + ring[2][1]) / 2,
    longitude: (ring[0][0] + ring[1][0]) / 2,
  };
};

const originalThreshold = process.env.NEAR_BOUNDARY_THRESHOLD_METERS;

beforeEach(() => {
  // Never inherit a developer's local .env — every test states its own policy.
  delete process.env.NEAR_BOUNDARY_THRESHOLD_METERS;
});

afterAll(() => {
  if (originalThreshold === undefined) {
    delete process.env.NEAR_BOUNDARY_THRESHOLD_METERS;
  } else {
    process.env.NEAR_BOUNDARY_THRESHOLD_METERS = originalThreshold;
  }
});

describe('locationValidator — well inside the Gat', () => {
  it('1. should PASS a point at the centre of the parcel', () => {
    const result = validateLocation(centreOf(ORDINARY_GAT), ORDINARY_GAT);

    expect(result.status).toBe('PASS');
    expect(result.insideGat).toBe(true);
    expect(result.distanceFromBoundary).toBeGreaterThan(40);
  });

  it('2. should PASS a point 20m inside the edge — past the review band', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 20), ORDINARY_GAT);

    expect(result.status).toBe('PASS');
    expect(result.distanceFromBoundary).toBeGreaterThan(19);
    expect(result.distanceFromBoundary).toBeLessThan(21);
  });

  it('3. should report the review band it applied even on a PASS', () => {
    const result = validateLocation(centreOf(ORDINARY_GAT), ORDINARY_GAT);

    // Recorded on the clean path too, so a later audit can tell whether a
    // submission was nowhere near the band or only just clear of it.
    expect(result.reviewBufferMeters).toBeCloseTo(DEFAULT_NEAR_BOUNDARY_METERS, 5);
  });

  it('4. should attach no reason code to a clean pass', () => {
    const result = validateLocation(centreOf(ORDINARY_GAT), ORDINARY_GAT);

    expect(result.reasonCode).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });
});

describe('locationValidator — inside the Gat but within the review band', () => {
  it('5. should REVIEW a point 8m inside the edge, with reason code NEAR_BOUNDARY', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

    expect(result.status).toBe('REVIEW');
    expect(result.reasonCode).toBe('NEAR_BOUNDARY');
  });

  it('6. should REVIEW a point 3m inside the edge', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 3), ORDINARY_GAT);

    expect(result.status).toBe('REVIEW');
    expect(result.reasonCode).toBe('NEAR_BOUNDARY');
  });

  it('7. should still report insideGat: true — the geofence passed, the confidence did not', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

    // This matters for the officer view: a near-boundary filing is not the same
    // thing as a filing from outside the Gat, and must not be shown as one.
    expect(result.insideGat).toBe(true);
    expect(result.distanceFromBoundary).toBeGreaterThan(0);
  });

  it('8. should quantify both the distance and the band in the reason', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

    expect(result.reason).toContain('8.0m');
    expect(result.reason).toContain('15.0m review band');
  });

  it('9. should record the review band that was actually applied', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

    expect(result.reviewBufferMeters).toBeCloseTo(DEFAULT_NEAR_BOUNDARY_METERS, 5);
    expect(result.distanceFromBoundary).toBeLessThan(result.reviewBufferMeters);
  });

  it('10. should treat the band edge as exclusive', () => {
    const location = insideNorthEdge(ORDINARY_GAT, 8);
    const reviewed = validateLocation(location, ORDINARY_GAT);
    expect(reviewed.status).toBe('REVIEW');

    // Shrink the band to exactly this point's distance. A submission sitting on
    // the band edge is outside the band, not in it.
    process.env.NEAR_BOUNDARY_THRESHOLD_METERS = String(reviewed.distanceFromBoundary);
    expect(validateLocation(location, ORDINARY_GAT).status).toBe('PASS');
  });

  it('11. should claim nothing about intent in the reason it gives an officer', () => {
    const { reason } = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

    // The check cannot tell a farmer standing at the edge of their own field
    // from someone standing just over the line, so the copy must not imply it.
    for (const word of ['fraud', 'spoof', 'fake', 'suspicious', 'invalid', 'reject']) {
      expect(reason.toLowerCase()).not.toContain(word);
    }
  });
});

describe('locationValidator — outside the Gat', () => {
  it('12. should FAIL a point just outside the edge, as before', () => {
    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, -3), ORDINARY_GAT);

    expect(result.status).toBe('FAIL');
    expect(result.insideGat).toBe(false);
    expect(result.distanceFromBoundary).toBeGreaterThan(0);
  });

  it('13. should FAIL a point in a different village entirely', () => {
    const result = validateLocation({ latitude: 19.2, longitude: 74.2 }, ORDINARY_GAT);

    expect(result.status).toBe('FAIL');
    expect(result.insideGat).toBe(false);
  });

  it('14. should never route an outside point to REVIEW', () => {
    for (const metresOutside of [1, 5, 12, 40]) {
      const result = validateLocation(
        insideNorthEdge(ORDINARY_GAT, -metresOutside),
        ORDINARY_GAT
      );
      expect(result.status).toBe('FAIL');
      expect(result.reasonCode).toBeUndefined();
    }
  });
});

describe('locationValidator — the band is capped by parcel size', () => {
  it('15. should PASS the centre of a ~27m demo Gat instead of reviewing it', () => {
    const result = validateLocation(centreOf(TINY_GAT), TINY_GAT);

    // Its centre is only ~13.6m from the edge. A flat 15m band would put every
    // honest filing on the demo Gats under review, which is not caution — it is
    // a check an officer would learn to rubber-stamp.
    expect(result.status).toBe('PASS');
    expect(result.distanceFromBoundary).toBeLessThan(DEFAULT_NEAR_BOUNDARY_METERS);
  });

  it('16. should shrink the band on a small parcel rather than the parcel escaping the rule', () => {
    const result = validateLocation(centreOf(TINY_GAT), TINY_GAT);

    expect(result.reviewBufferMeters).toBeGreaterThan(0);
    expect(result.reviewBufferMeters).toBeLessThan(DEFAULT_NEAR_BOUNDARY_METERS);
  });

  it('17. should still REVIEW a point 5m inside a small parcel', () => {
    const result = validateLocation(insideNorthEdge(TINY_GAT, 5), TINY_GAT);

    expect(result.status).toBe('REVIEW');
    expect(result.reasonCode).toBe('NEAR_BOUNDARY');
  });

  it('18. should keep the cap in force however high the configured threshold goes', () => {
    process.env.NEAR_BOUNDARY_THRESHOLD_METERS = '1000';

    const result = validateLocation(centreOf(TINY_GAT), TINY_GAT);

    expect(result.status).toBe('PASS');
    expect(result.reviewBufferMeters).toBeLessThan(DEFAULT_NEAR_BOUNDARY_METERS);
  });
});

describe('locationValidator — configuring the threshold', () => {
  it('19. should widen the band when NEAR_BOUNDARY_THRESHOLD_METERS is raised', () => {
    const location = insideNorthEdge(ORDINARY_GAT, 20);
    const atDefault = validateLocation(location, ORDINARY_GAT);
    expect(atDefault.status).toBe('PASS');

    process.env.NEAR_BOUNDARY_THRESHOLD_METERS = '30';
    const result = validateLocation(location, ORDINARY_GAT);

    expect(result.status).toBe('REVIEW');
    // Wider than the default, but still short of the configured 30m, because
    // this parcel's own size caps it. Both halves of the policy are in play.
    expect(result.reviewBufferMeters).toBeGreaterThan(atDefault.reviewBufferMeters);
    expect(result.reviewBufferMeters).toBeLessThan(30);
  });

  it('20. should disable the check entirely at 0', () => {
    process.env.NEAR_BOUNDARY_THRESHOLD_METERS = '0';

    const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 1), ORDINARY_GAT);

    // An explicit opt-out for a deployment with survey-grade GPS. Nothing inside
    // the Gat is reviewed, and nothing is silently reinterpreted either.
    expect(result.status).toBe('PASS');
    expect(result.reviewBufferMeters).toBe(0);
  });

  it.each(['', 'fifteen', 'NaN', '-5'])(
    '21. should fall back to the default for the unusable value %p',
    (value) => {
      process.env.NEAR_BOUNDARY_THRESHOLD_METERS = value;

      const result = validateLocation(insideNorthEdge(ORDINARY_GAT, 8), ORDINARY_GAT);

      // A typo in a deployment variable must not quietly switch the check off.
      expect(result.status).toBe('REVIEW');
      expect(result.reviewBufferMeters).toBeCloseTo(DEFAULT_NEAR_BOUNDARY_METERS, 5);
    }
  );
});

describe('locationValidator — malformed input still fails closed', () => {
  it('22. should FAIL a missing location', () => {
    const result = validateLocation(null, ORDINARY_GAT);

    expect(result.status).toBe('FAIL');
    expect(result.insideGat).toBe(false);
    expect(result.reason).toBe('Missing or invalid coordinates');
  });

  it('23. should FAIL non-numeric coordinates', () => {
    const result = validateLocation({ latitude: '19.9040', longitude: 74.4975 }, ORDINARY_GAT);

    expect(result.status).toBe('FAIL');
    expect(result.reason).toBe('Missing or invalid coordinates');
  });

  it('24. should FAIL out-of-range coordinates', () => {
    const result = validateLocation({ latitude: 100, longitude: 74.4975 }, ORDINARY_GAT);

    expect(result.status).toBe('FAIL');
    expect(result.reason).toBe('Coordinates out of bounds');
  });

  it('25. should FAIL a malformed boundary without throwing', () => {
    const result = validateLocation(centreOf(ORDINARY_GAT), { type: 'Polygon', coordinates: [] });

    expect(result.status).toBe('FAIL');
    expect(result.reason).toBe('Invalid polygon boundary or point');
  });
});
