const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const upload = require('../middleware/upload');

// Upload and analyze resume (PDF)
router.post('/upload', upload.single('resume'), resumeController.uploadResume);

// Get a specific resume analysis
router.get('/:id', resumeController.getAnalysis);

// Get all resume analyses for a user
router.get('/user/:email', resumeController.getUserResumes);

module.exports = router;
