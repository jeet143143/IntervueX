const pdfParse = require('pdf-parse');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');

/**
 * Upload and analyze a resume — Enhanced with keyword optimization + question generation
 * POST /api/resume/upload
 */
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { email, targetRole } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Extract text from PDF buffer
    const pdfData = await pdfParse(req.file.buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(400).json({
        error: 'Could not extract sufficient text from the PDF. Make sure it is not an image-based PDF.'
      });
    }

    const role = targetRole || 'Software Engineer';

    // Analyze with AI — Enhanced analysis
    const analysis = await aiService.analyzeResume(extractedText, role);

    // Save to database
    const resume = new Resume({
      userEmail: email,
      fileName: req.file.originalname,
      extractedText: extractedText.substring(0, 5000), // Truncate for storage
      analysis,
      targetRole: role
    });

    await resume.save();

    res.status(201).json({
      id: resume._id,
      fileName: resume.fileName,
      analysis: resume.analysis,
      analyzedAt: resume.analyzedAt
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
};

/**
 * Get a specific resume analysis
 * GET /api/resume/:id
 */
exports.getAnalysis = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume analysis not found' });
    }

    res.json({
      id: resume._id,
      fileName: resume.fileName,
      analysis: resume.analysis,
      analyzedAt: resume.analyzedAt
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};

/**
 * Get all resume analyses for a user
 * GET /api/resume/user/:email
 */
exports.getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userEmail: req.params.email })
      .sort({ analyzedAt: -1 })
      .select('-extractedText'); // Don't send full text to client

    res.json(resumes);
  } catch (error) {
    console.error('Get user resumes error:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
};
