const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createFarmer, getFarmer, getMe } = require('../controllers/farmerController');

router.post('/', protect, createFarmer);
router.get('/me', protect, getMe);
router.get('/:id', protect, getFarmer);

module.exports = router;
