const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ''
  },
  analysis: {
    atsScore: { type: Number, min: 0, max: 100, default: 0 },
    missingKeywords: [String],
    suggestions: [String],
    strengths: [String],
    // Enhanced fields
    keywordOptimization: [{
      keyword: String,
      importance: { type: String, enum: ['high', 'medium', 'low'] },
      suggestedPlacement: String
    }],
    enhancedBullets: [String], // AI-rewritten bullet points
    personalizedQuestions: [String], // Generated interview questions from resume
    sectionScores: {
      contactInfo: { type: Number, min: 0, max: 100, default: 0 },
      experience: { type: Number, min: 0, max: 100, default: 0 },
      education: { type: Number, min: 0, max: 100, default: 0 },
      skills: { type: Number, min: 0, max: 100, default: 0 },
      projects: { type: Number, min: 0, max: 100, default: 0 },
      formatting: { type: Number, min: 0, max: 100, default: 0 }
    }
  },
  targetRole: {
    type: String,
    default: 'Software Engineer'
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resume', resumeSchema);
