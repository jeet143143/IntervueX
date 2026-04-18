const { v4: uuidv4 } = require('uuid');
const Interview = require('../models/Interview');
const User = require('../models/User');
const aiService = require('../services/aiService');
const pdfParse = require('pdf-parse');

/**
 * Start a new interview session
 * POST /api/interview/start
 * Accepts multipart/form-data with optional resume PDF
 */
exports.startInterview = async (req, res) => {
  try {
    const { email, name, role, company, difficulty, university, passoutYear, dob, experience, currentCompany } = req.body;

    // Validate required fields
    if (!email || !role || !company || !difficulty) {
      return res.status(400).json({
        error: 'Missing required fields: email, role, company, difficulty'
      });
    }

    // Upsert user
    await User.findOneAndUpdate(
      { email },
      { email, name: name || email.split('@')[0] },
      { upsert: true, new: true }
    );

    // Build candidate profile
    const candidateProfile = {
      university: university || '',
      passoutYear: passoutYear ? parseInt(passoutYear) : null,
      dob: dob || '',
      experience: experience ? parseFloat(experience) : 0,
      currentCompany: currentCompany || '',
      resumeText: ''
    };

    // Extract resume text if PDF was uploaded
    if (req.file && req.file.buffer) {
      try {
        const pdfData = await pdfParse(req.file.buffer);
        candidateProfile.resumeText = pdfData.text || '';
        console.log(`📄 Resume extracted: ${candidateProfile.resumeText.length} chars`);
      } catch (pdfErr) {
        console.warn('PDF parse warning:', pdfErr.message);
        // Continue without resume text — don't fail the interview
      }
    }

    // Generate first question with candidate context
    const questionData = await aiService.generateQuestion(
      company, role, difficulty, [], candidateProfile
    );

    // Create interview session
    const sessionId = uuidv4();
    const interview = new Interview({
      sessionId,
      userEmail: email,
      role,
      company,
      difficulty,
      candidateProfile,
      questions: [{
        question: questionData.question,
        questionNumber: 1,
        askedAt: new Date()
      }],
      status: 'in-progress'
    });

    await interview.save();

    res.status(201).json({
      sessionId,
      questionNumber: 1,
      question: questionData.question,
      category: questionData.category,
      hint: questionData.hint,
      totalQuestions: 0
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
};

/**
 * Get the next question
 * POST /api/interview/next-question
 */
exports.nextQuestion = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview session already completed' });
    }

    // Collect previous questions to avoid repeats
    const previousQuestions = interview.questions.map(q => q.question);

    // Generate next question with candidate context
    const questionData = await aiService.generateQuestion(
      interview.company,
      interview.role,
      interview.difficulty,
      previousQuestions,
      interview.candidateProfile || {}
    );

    const questionNumber = interview.questions.length + 1;

    // Add question to session
    interview.questions.push({
      question: questionData.question,
      questionNumber,
      askedAt: new Date()
    });

    await interview.save();

    res.json({
      sessionId,
      questionNumber,
      question: questionData.question,
      category: questionData.category,
      hint: questionData.hint,
      totalQuestions: interview.questions.length
    });
  } catch (error) {
    console.error('Next question error:', error);
    res.status(500).json({ error: 'Failed to generate next question' });
  }
};

/**
 * Evaluate an answer
 * POST /api/interview/evaluate
 */
exports.evaluateAnswer = async (req, res) => {
  try {
    const { sessionId, questionNumber, answer } = req.body;

    if (!sessionId || !questionNumber || !answer) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, questionNumber, answer'
      });
    }

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Find the question
    const questionDoc = interview.questions.find(q => q.questionNumber === questionNumber);
    if (!questionDoc) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Evaluate with AI
    const evaluation = await aiService.evaluateAnswer(
      questionDoc.question,
      answer,
      interview.company,
      interview.role
    );

    // Update question with answer and evaluation
    questionDoc.answer = answer;
    questionDoc.evaluation = evaluation;
    questionDoc.answeredAt = new Date();

    await interview.save();

    res.json({
      sessionId,
      questionNumber,
      evaluation: {
        clarity: evaluation.clarity,
        accuracy: evaluation.accuracy,
        communication: evaluation.communication,
        averageScore: Math.round(((evaluation.clarity + evaluation.accuracy + evaluation.communication) / 3) * 10) / 10,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvedAnswer: evaluation.improvedAnswer
      }
    });
  } catch (error) {
    console.error('Evaluate answer error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
};

/**
 * Complete an interview session
 * POST /api/interview/complete
 */
exports.completeInterview = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const interview = await Interview.findOne({ sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Calculate overall score
    interview.overallScore = interview.calculateOverallScore();
    interview.status = 'completed';
    interview.completedAt = new Date();

    await interview.save();

    // Build summary
    const questionSummaries = interview.questions.map(q => ({
      questionNumber: q.questionNumber,
      question: q.question,
      answer: q.answer,
      scores: q.evaluation ? {
        clarity: q.evaluation.clarity,
        accuracy: q.evaluation.accuracy,
        communication: q.evaluation.communication,
        average: Math.round(((q.evaluation.clarity + q.evaluation.accuracy + q.evaluation.communication) / 3) * 10) / 10
      } : null,
      strengths: q.evaluation?.strengths || [],
      weaknesses: q.evaluation?.weaknesses || []
    }));

    res.json({
      sessionId,
      status: 'completed',
      overallScore: interview.overallScore,
      role: interview.role,
      company: interview.company,
      difficulty: interview.difficulty,
      totalQuestions: interview.questions.length,
      questions: questionSummaries
    });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ error: 'Failed to complete interview' });
  }
};

/**
 * Get session details
 * GET /api/interview/:sessionId
 */
exports.getSession = async (req, res) => {
  try {
    const interview = await Interview.findOne({ sessionId: req.params.sessionId });
    if (!interview) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(interview);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};
