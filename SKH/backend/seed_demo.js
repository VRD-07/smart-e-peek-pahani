const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  const Gat = mongoose.model('Gat', new mongoose.Schema({}, {strict:false}));
  let gat = await Gat.findOne();
  if(!gat) {
    gat = await Gat.create({gatNumber:'123', village:'Pune', district:'Pune', cropTypes:['soybean', 'cotton'], boundary:{type:'Polygon', coordinates:[]}, center:{latitude:19, longitude:73}});
  }
  const Farmer = mongoose.model('Farmer', new mongoose.Schema({}, {strict:false}));
  await Farmer.updateOne({phoneNumber:'1234567890'}, {$set: {name:'Test Farmer', phoneNumber:'1234567890', preferredLanguage:'en', selectedGatId: gat._id}}, {upsert:true});
  console.log('Seeded');
  process.exit(0);
});
