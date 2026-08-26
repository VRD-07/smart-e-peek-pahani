const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Gat = require('../src/models/Gat');
const Farmer = require('../src/models/Farmer');
const { seed, GAT_COORDS } = require('../scripts/seedDemoGats');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  await Gat.deleteMany({});
  await Farmer.deleteMany({});
});

describe('Phase 7 - Demo Gat Seeding Verification', () => {

  it('should seed 6 demo gats and verify cross-gat constraints', async () => {
    // 1. Run Seeder
    await seed(true); // skipConnect = true

    // 2. Verify 6 Gats exist
    const gats = await Gat.find({}).sort({ gatNumber: 1 });
    expect(gats.length).toBe(GAT_COORDS.length);

    // 3. Verify Farmer has an association per Gat
    const farmer = await Farmer.findOne({ phoneNumber: '1234567890' });
    expect(farmer).toBeDefined();
    expect(farmer.associatedGats.length).toBe(GAT_COORDS.length);

    // 4. Verify each Gat center is inside its own polygon and has proper format
    for (const gat of gats) {
      expect(gat._id).toBeDefined();
      expect(gat.gatNumber).toBeDefined();
      expect(gat.center).toBeDefined();
      expect(gat.boundary).toBeDefined();
      expect(gat.cropTypes).toBeDefined();

      const { latitude, longitude } = gat.center;

      // Use MongoDB geospatial query to verify the center is inside the boundary
      const containsCenter = await Gat.findOne({
        _id: gat._id,
        boundary: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            }
          }
        }
      });
      expect(containsCenter).toBeDefined();
      expect(containsCenter._id.toString()).toBe(gat._id.toString());
    }

    // 5. Verify Cross-Gat rules
    // Gat A does not contain Gat B's center
    const gatA = gats.find(g => g.gatNumber === '101');
    const gatB = gats.find(g => g.gatNumber === '102');

    const gatAContainsGatBCenter = await Gat.findOne({
      _id: gatA._id,
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [gatB.center.longitude, gatB.center.latitude]
          }
        }
      }
    });

    expect(gatAContainsGatBCenter).toBeNull();

    const gatBContainsGatACenter = await Gat.findOne({
      _id: gatB._id,
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [gatA.center.longitude, gatA.center.latitude]
          }
        }
      }
    });

    expect(gatBContainsGatACenter).toBeNull();

    // Verify every center falls ONLY into its own Gat
    for (const coord of GAT_COORDS) {
      const intersectingGats = await Gat.find({
        boundary: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [coord.lng, coord.lat]
            }
          }
        }
      });

      // Should exactly match 1 Gat (itself) and no others
      expect(intersectingGats.length).toBe(1);
      expect(intersectingGats[0].gatNumber).toBe(coord.id);
    }
  });

  it('should be idempotent', async () => {
    await seed(true);
    await seed(true); // run twice

    const gatsCount = await Gat.countDocuments();
    expect(gatsCount).toBe(GAT_COORDS.length); // should not duplicate

    const farmer = await Farmer.findOne({ phoneNumber: '1234567890' });
    expect(farmer.associatedGats.length).toBe(GAT_COORDS.length); // array should not duplicate
  });
});
