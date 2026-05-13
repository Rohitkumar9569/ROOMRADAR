const express = require('express');
const { trackUsageEvent } = require('../controllers/usageController');

const router = express.Router();

router.post('/event', trackUsageEvent);

module.exports = router;
