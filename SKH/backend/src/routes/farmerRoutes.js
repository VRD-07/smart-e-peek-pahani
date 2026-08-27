const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createFarmer,
  getFarmer,
  getMe,
  createPlanting,
  getPlantings,
  getGatHistory,
} = require('../controllers/farmerController');

router.post('/', protect, createFarmer);
router.get('/me', protect, getMe);
router.post('/plantings', protect, createPlanting);
router.get('/plantings', protect, getPlantings);
router.get('/gats/:gatId/history', protect, getGatHistory);
router.get('/:id', protect, getFarmer);

module.exports = router;
