const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  clarity: { type: Number, min: 0, max: 10, default: 0 },
  accuracy: { type: Number, min: 0, max: 10, default: 0 },
  communication: { type: Number, min: 0, max: 10, default: 0 },
  strengths: [String],
  weaknesses: [String],
  improvedAnswer: { type: String, default: '' }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  evaluation: { type: evaluationSchema, default: () => ({}) },
  questionNumber: { type: Number, required: true },
  askedAt: { type: Date, default: Date.now },
  answeredAt: { type: Date }
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

module.exports = mongoose.model('Interview', interviewSchema);
