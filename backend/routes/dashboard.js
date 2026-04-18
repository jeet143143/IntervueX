const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get dashboard data for a user
router.get('/:email', dashboardController.getDashboard);

// Get score trends over time
router.get('/:email/trends', dashboardController.getTrends);

module.exports = router;
