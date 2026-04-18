const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interviewController');
const upload = require('../middleware/upload');

// Start a new interview session (with optional resume upload)
router.post('/start', upload.single('resume'), interviewController.startInterview);

// Get next question for a session
router.post('/next-question', interviewController.nextQuestion);

// Evaluate an answer
router.post('/evaluate', interviewController.evaluateAnswer);

// Complete an interview session
router.post('/complete', interviewController.completeInterview);

// Get session details
router.get('/:sessionId', interviewController.getSession);

module.exports = router;
