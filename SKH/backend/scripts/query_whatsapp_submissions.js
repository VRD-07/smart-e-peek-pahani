const mongoose = require('mongoose');
const Submission = require('../src/models/Submission');
const Farmer = require('../src/models/Farmer');
const env = require('../src/config/env');

async function findSubmissions() {
  try {
    await mongoose.connect(env.mongoUri);
    console.log('Connected to DB');

    const farmer = await Farmer.findOne({ phoneNumber: 'whatsapp:+919272556195' });
    if (!farmer) {
      console.log('Farmer not found');
      process.exit(0);
    }
    console.log('Farmer ID:', farmer._id);

    const submissions = await Submission.find({ farmerId: farmer._id }).sort({ createdAt: -1 }).limit(3);
    console.log('Found Submissions:', submissions.length);

    submissions.forEach(sub => {
      console.log('--- Submission ---');
      console.log('_id:', sub._id);
      console.log('source:', sub.source);
      console.log('status:', sub.status);
      console.log('crop:', sub.crop);
      console.log('location:', sub.location);
      console.log('clientSubmissionId:', sub.clientSubmissionId);
      console.log('validationResultId:', sub.validationResultId ? sub.validationResultId._id : 'null');
      console.log('createdAt:', sub.createdAt);
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

findSubmissions();
