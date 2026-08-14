const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGats, getGatById } = require('../controllers/gatController');

router.get('/', protect, getGats);
router.get('/:id', protect, getGatById);

module.exports = router;
