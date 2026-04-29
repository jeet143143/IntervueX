const express = require('express');
const router = express.Router();
const careerController = require('../controllers/careerController');

// Get career guidance from AI counselor
router.post('/guidance', careerController.getGuidance);

// Get pre-built career topics
router.get('/topics', careerController.getTopics);

module.exports = router;
