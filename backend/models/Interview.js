const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  clarity: { type: Number, min: 0, max: 10, default: 0 },
  accuracy: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  confidence: { type: Number, min: 0, max: 10, default: 0 },
  responseQuality: { type: Number, min: 0, max: 10, default: 0 },
  strengths: [String],
  weaknesses: [String],
  improvedAnswer: { type: String, default: '' },
  weaknessCategories: [String], // e.g., ['OOP', 'System Design', 'DSA']
  fillerWordsDetected: { type: Number, default: 0 },
  responseTimeSeconds: { type: Number, default: 0 }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  evaluation: { type: evaluationSchema, default: () => ({}) },
  questionNumber: { type: Number, required: true },
  category: { type: String, default: 'general' },
  isWeaknessTargeted: { type: Boolean, default: false },
  isFollowUp: { type: Boolean, default: false },
  askedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date },
  timeLimitSeconds: { type: Number, default: 0 } // 0 = no limit
}, { _id: true });

const candidateProfileSchema = new mongoose.Schema({
  resumeText: { type: String, default: '' },
  university: { type: String, default: '' },
  passoutYear: { type: Number },
  dob: { type: String, default: '' },
  experience: { type: Number, default: 0 },
  currentCompany: { type: String, default: '' }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  role: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  mode: {
    type: String,
    enum: ['normal', 'pressure', 'pyq'],
    default: 'normal'
  },
  candidateProfile: { type: candidateProfileSchema, default: () => ({}) },
  questions: [questionSchema],
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  },
  overallScore: {
    type: Number,
    default: 0
  },
  hireabilityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  hireabilityBreakdown: {
    technicalKnowledge: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    responseQuality: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 }
  },
  identifiedWeaknesses: [String], // Accumulated weakness categories
  totalFillerWords: { type: Number, default: 0 },
  averageResponseTime: { type: Number, default: 0 },
  language: { type: String, default: 'en' },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Calculate overall score from all question evaluations
interviewSchema.methods.calculateOverallScore = function () {
  const evaluated = this.questions.filter(q => q.evaluation && q.evaluation.clarity > 0);
  if (evaluated.length === 0) return 0;

  const totalScore = evaluated.reduce((sum, q) => {
    return sum + (q.evaluation.clarity + q.evaluation.accuracy + q.evaluation.communication) / 3;
  }, 0);

  return Math.round((totalScore / evaluated.length) * 10) / 10;
};

// Calculate Hireability Score (0-100)
interviewSchema.methods.calculateHireabilityScore = function () {
  const evaluated = this.questions.filter(q => q.evaluation && q.evaluation.clarity > 0);
  if (evaluated.length === 0) return { score: 0, breakdown: {} };

  const avgOf = (field) => {
    const vals = evaluated.map(q => q.evaluation[field] || 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const techScore = avgOf('accuracy');
  const commScore = avgOf('communication');
  const confScore = avgOf('confidence');
  const qualScore = avgOf('responseQuality');
  const clarityScore = avgOf('clarity');

  // Weighted formula
  const weights = {
    technicalKnowledge: 0.30,
    communication: 0.20,
    confidence: 0.15,
    responseQuality: 0.20,
    problemSolving: 0.15
  };

  const breakdown = {
    technicalKnowledge: Math.round(techScore * 10),
    communication: Math.round(commScore * 10),
    confidence: Math.round(confScore * 10),
    responseQuality: Math.round(qualScore * 10),
    problemSolving: Math.round(clarityScore * 10)
  };

  const hireScore = Math.round(
    breakdown.technicalKnowledge * weights.technicalKnowledge +
    breakdown.communication * weights.communication +
    breakdown.confidence * weights.confidence +
    breakdown.responseQuality * weights.responseQuality +
    breakdown.problemSolving * weights.problemSolving
  );

  return { score: Math.min(100, Math.max(0, hireScore)), breakdown };
};

// Identify weakness categories from evaluations
interviewSchema.methods.identifyWeaknesses = function () {
  const weakCategories = {};
  this.questions.forEach(q => {
    if (q.evaluation && q.evaluation.weaknessCategories) {
      q.evaluation.weaknessCategories.forEach(cat => {
        weakCategories[cat] = (weakCategories[cat] || 0) + 1;
      });
    }
  });
  // Return categories sorted by frequency
  return Object.entries(weakCategories)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
};

module.exports = mongoose.model('Interview', interviewSchema);
