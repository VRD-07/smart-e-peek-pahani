require('dotenv').config();

const mongoose = require('mongoose');
const Farmer = require('./src/models/Farmer');
const Gat = require('./src/models/Gat');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('MongoDB connected');

  const gat = await Gat.create({
    gatNumber: 'TEST-GAT-001',
    village: 'Test Village',
    district: 'Ahilyanagar',
    cropTypes: ['soybean', 'cotton'],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [74.10, 19.10],
        [74.15, 19.10],
        [74.15, 19.15],
        [74.10, 19.15],
        [74.10, 19.10]
      ]]
    },
    center: {
      latitude: 19.125,
      longitude: 74.125
    }
  });

  console.log('Gat created:', gat._id);

  const farmer = await Farmer.create({
    name: 'Test Farmer',
    phoneNumber: 'whatsapp:+919272556195',
    preferredLanguage: 'mr',
    selectedGatId: gat._id
  });

  console.log('Farmer created:', farmer._id);
  console.log('Selected Gat:', farmer.selectedGatId);

  await mongoose.disconnect();
}

main().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
