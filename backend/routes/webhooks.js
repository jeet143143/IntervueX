const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// n8n webhook endpoints
router.post('/interview-completed', webhookController.interviewCompleted);
router.post('/resume-analyzed', webhookController.resumeAnalyzed);
router.post('/user-report', webhookController.userReport);
router.get('/health', webhookController.webhookHealth);

module.exports = router;
