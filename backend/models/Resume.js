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
    strengths: [String]
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Resume', resumeSchema);
