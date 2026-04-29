const { v4: uuidv4 } = require('uuid');
const Interview = require('../models/Interview');
const User = require('../models/User');
const aiService = require('../services/aiService');
const pdfParse = require('pdf-parse');

/**
 * Start a new interview session
 * POST /api/interview/start
 * Accepts multipart/form-data with optional resume PDF
 * Supports modes: normal, pressure, pyq
 */
exports.startInterview = async (req, res) => {
  try {
    const { email, name, role, company, difficulty, university, passoutYear, dob, experience, currentCompany, mode } = req.body;

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

    // Determine interview mode
    const interviewMode = ['normal', 'pressure', 'pyq'].includes(mode) ? mode : 'normal';

    // Generate first question with candidate context and mode
    const questionData = await aiService.generateQuestion(
      company, role, difficulty, [], candidateProfile,
      { mode: interviewMode }
    );

    // Determine time limit for pressure mode
    const timeLimit = interviewMode === 'pressure'
      ? aiService.getPressureTimeLimit(difficulty)
      : 0;

    // Create interview session
    const sessionId = uuidv4();
    const interview = new Interview({
      sessionId,
      userEmail: email,
      role,
      company,
      difficulty,
      mode: interviewMode,
      candidateProfile,
      questions: [{
        question: questionData.question,
        questionNumber: 1,
        category: questionData.category,
        isWeaknessTargeted: false,
        timeLimitSeconds: timeLimit,
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
      totalQuestions: 0,
      mode: interviewMode,
      timeLimitSeconds: timeLimit,
      expectedTimeMinutes: questionData.expectedTimeMinutes || 2
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: 'Failed to start interview session' });
  }
};

/**
 * Get the next question
 * POST /api/interview/next-question
 * Supports weakness targeting after 3+ questions
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

    // Determine if we should activate weakness targeting
    // After 3+ answered questions, if weaknesses are identified, target them every other question
    const answeredCount = interview.questions.filter(q => q.answer && q.answer.length > 0).length;
    const identifiedWeaknesses = interview.identifyWeaknesses();
    const shouldTargetWeakness = answeredCount >= 3 &&
      identifiedWeaknesses.length > 0 &&
      answeredCount % 2 === 0; // Every other question

    // Generate next question with candidate context and targeting
    const questionData = await aiService.generateQuestion(
      interview.company,
      interview.role,
      interview.difficulty,
      previousQuestions,
      interview.candidateProfile || {},
      {
        mode: interview.mode,
        weaknessTargeting: shouldTargetWeakness,
        identifiedWeaknesses
      }
    );

    const questionNumber = interview.questions.length + 1;
    const timeLimit = interview.mode === 'pressure'
      ? aiService.getPressureTimeLimit(interview.difficulty)
      : 0;

    // Add question to session
    interview.questions.push({
      question: questionData.question,
      questionNumber,
      category: questionData.category,
      isWeaknessTargeted: questionData.isWeaknessTargeted || false,
      timeLimitSeconds: timeLimit,
      askedAt: new Date()
    });

    // Update identified weaknesses on interview
    interview.identifiedWeaknesses = identifiedWeaknesses;

    await interview.save();

    res.json({
      sessionId,
      questionNumber,
      question: questionData.question,
      category: questionData.category,
      hint: questionData.hint,
      totalQuestions: interview.questions.length,
      isWeaknessTargeted: questionData.isWeaknessTargeted || false,
      timeLimitSeconds: timeLimit,
      expectedTimeMinutes: questionData.expectedTimeMinutes || 2,
      identifiedWeaknesses: shouldTargetWeakness ? identifiedWeaknesses.slice(0, 3) : []
    });
  } catch (error) {
    console.error('Next question error:', error);
    res.status(500).json({ error: 'Failed to generate next question' });
  }
};

/**
 * Evaluate an answer — Enhanced with confidence, response quality, weakness tracking
 * POST /api/interview/evaluate
 */
exports.evaluateAnswer = async (req, res) => {
  try {
    const { sessionId, questionNumber, answer, responseTimeSeconds, fillerWordsClient } = req.body;

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

    // Evaluate with AI — pass mode for stricter evaluation in pressure mode
    const evaluation = await aiService.evaluateAnswer(
      questionDoc.question,
      answer,
      interview.company,
      interview.role,
      { mode: interview.mode }
    );

    // Add client-side data
    evaluation.responseTimeSeconds = responseTimeSeconds || 0;
    if (fillerWordsClient) {
      evaluation.fillerWordsDetected = Math.max(evaluation.fillerWordsDetected, fillerWordsClient);
    }

    // Update question with answer and evaluation
    questionDoc.answer = answer;
    questionDoc.evaluation = evaluation;
    questionDoc.answeredAt = new Date();

    // Update interview-level weakness tracking
    if (evaluation.weaknessCategories && evaluation.weaknessCategories.length > 0) {
      const existing = new Set(interview.identifiedWeaknesses || []);
      evaluation.weaknessCategories.forEach(cat => existing.add(cat));
      interview.identifiedWeaknesses = [...existing];
    }

    // Update filler word total
    interview.totalFillerWords = (interview.totalFillerWords || 0) + (evaluation.fillerWordsDetected || 0);

    await interview.save();

    const avgScore = Math.round(((evaluation.clarity + evaluation.accuracy + evaluation.communication) / 3) * 10) / 10;

    res.json({
      sessionId,
      questionNumber,
      evaluation: {
        clarity: evaluation.clarity,
        accuracy: evaluation.accuracy,
        communication: evaluation.communication,
        confidence: evaluation.confidence,
        responseQuality: evaluation.responseQuality,
        averageScore: avgScore,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        weaknessCategories: evaluation.weaknessCategories,
        improvedAnswer: evaluation.improvedAnswer,
        fillerWordsDetected: evaluation.fillerWordsDetected,
        confidenceNotes: evaluation.confidenceNotes,
        responseTimeSeconds: evaluation.responseTimeSeconds
      },
      identifiedWeaknesses: interview.identifiedWeaknesses
    });
  } catch (error) {
    console.error('Evaluate answer error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
};

/**
 * Complete an interview session — Enhanced with Hireability Score
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

    // Calculate Hireability Score
    const hireability = interview.calculateHireabilityScore();
    interview.hireabilityScore = hireability.score;
    interview.hireabilityBreakdown = hireability.breakdown;

    // Calculate average response time
    const answeredQuestions = interview.questions.filter(q => q.answeredAt && q.askedAt);
    if (answeredQuestions.length > 0) {
      const totalTime = answeredQuestions.reduce((sum, q) => {
        return sum + (new Date(q.answeredAt) - new Date(q.askedAt)) / 1000;
      }, 0);
      interview.averageResponseTime = Math.round(totalTime / answeredQuestions.length);
    }

    interview.status = 'completed';
    interview.completedAt = new Date();

    // Generate AI Hireability assessment
    let hireabilityAssessment = null;
    try {
      hireabilityAssessment = await aiService.generateHireabilityScore(interview);
      // Update with AI-generated score
      interview.hireabilityScore = hireabilityAssessment.hireabilityScore;
      interview.hireabilityBreakdown = hireabilityAssessment.breakdown;
    } catch (hireErr) {
      console.warn('Hireability generation warning:', hireErr.message);
      // Continue with calculated score
    }

    await interview.save();

    // Build summary
    const questionSummaries = interview.questions.map(q => ({
      questionNumber: q.questionNumber,
      question: q.question,
      answer: q.answer,
      category: q.category,
      isWeaknessTargeted: q.isWeaknessTargeted,
      scores: q.evaluation ? {
        clarity: q.evaluation.clarity,
        accuracy: q.evaluation.accuracy,
        communication: q.evaluation.communication,
        confidence: q.evaluation.confidence,
        responseQuality: q.evaluation.responseQuality,
        average: Math.round(((q.evaluation.clarity + q.evaluation.accuracy + q.evaluation.communication) / 3) * 10) / 10
      } : null,
      strengths: q.evaluation?.strengths || [],
      weaknesses: q.evaluation?.weaknesses || [],
      weaknessCategories: q.evaluation?.weaknessCategories || [],
      fillerWordsDetected: q.evaluation?.fillerWordsDetected || 0
    }));

    res.json({
      sessionId,
      status: 'completed',
      overallScore: interview.overallScore,
      hireabilityScore: interview.hireabilityScore,
      hireabilityBreakdown: interview.hireabilityBreakdown,
      hireabilityAssessment: hireabilityAssessment ? {
        verdict: hireabilityAssessment.verdict,
        summary: hireabilityAssessment.summary,
        topStrengths: hireabilityAssessment.topStrengths,
        criticalGaps: hireabilityAssessment.criticalGaps,
        recommendation: hireabilityAssessment.recommendation
      } : null,
      role: interview.role,
      company: interview.company,
      difficulty: interview.difficulty,
      mode: interview.mode,
      totalQuestions: interview.questions.length,
      totalFillerWords: interview.totalFillerWords,
      averageResponseTime: interview.averageResponseTime,
      identifiedWeaknesses: interview.identifiedWeaknesses,
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
