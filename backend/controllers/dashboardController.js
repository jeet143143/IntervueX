const Interview = require('../models/Interview');

/**
 * Get dashboard data for a user — Enhanced with Hireability and analytics
 * GET /api/dashboard/:email
 */
exports.getDashboard = async (req, res) => {
  try {
    const { email } = req.params;

    // Get all interviews for this user
    const interviews = await Interview.find({ userEmail: email })
      .sort({ createdAt: -1 });

    // Calculate stats
    const completed = interviews.filter(i => i.status === 'completed');
    const totalInterviews = completed.length;
    const totalQuestions = completed.reduce((sum, i) => sum + i.questions.length, 0);

    // Average overall score
    const avgScore = totalInterviews > 0
      ? Math.round((completed.reduce((sum, i) => sum + i.overallScore, 0) / totalInterviews) * 10) / 10
      : 0;

    // Average hireability score
    const avgHireability = totalInterviews > 0
      ? Math.round(completed.reduce((sum, i) => sum + (i.hireabilityScore || 0), 0) / totalInterviews)
      : 0;

    // Score breakdown by category
    const categoryScores = { clarity: 0, accuracy: 0, communication: 0, confidence: 0, responseQuality: 0 };
    let evaluatedCount = 0;

    completed.forEach(interview => {
      interview.questions.forEach(q => {
        if (q.evaluation && q.evaluation.clarity > 0) {
          categoryScores.clarity += q.evaluation.clarity;
          categoryScores.accuracy += q.evaluation.accuracy;
          categoryScores.communication += q.evaluation.communication;
          categoryScores.confidence += (q.evaluation.confidence || 5);
          categoryScores.responseQuality += (q.evaluation.responseQuality || 5);
          evaluatedCount++;
        }
      });
    });

    if (evaluatedCount > 0) {
      categoryScores.clarity = Math.round((categoryScores.clarity / evaluatedCount) * 10) / 10;
      categoryScores.accuracy = Math.round((categoryScores.accuracy / evaluatedCount) * 10) / 10;
      categoryScores.communication = Math.round((categoryScores.communication / evaluatedCount) * 10) / 10;
      categoryScores.confidence = Math.round((categoryScores.confidence / evaluatedCount) * 10) / 10;
      categoryScores.responseQuality = Math.round((categoryScores.responseQuality / evaluatedCount) * 10) / 10;
    }

    // Identify weak areas (categories below 6)
    const weakAreas = [];
    if (categoryScores.clarity < 6 && evaluatedCount > 0) weakAreas.push('Clarity');
    if (categoryScores.accuracy < 6 && evaluatedCount > 0) weakAreas.push('Technical Accuracy');
    if (categoryScores.communication < 6 && evaluatedCount > 0) weakAreas.push('Communication');
    if (categoryScores.confidence < 6 && evaluatedCount > 0) weakAreas.push('Confidence');
    if (categoryScores.responseQuality < 6 && evaluatedCount > 0) weakAreas.push('Response Quality');

    // Collect common weaknesses from evaluations
    const weaknessMap = {};
    completed.forEach(interview => {
      interview.questions.forEach(q => {
        if (q.evaluation?.weaknesses) {
          q.evaluation.weaknesses.forEach(w => {
            weaknessMap[w] = (weaknessMap[w] || 0) + 1;
          });
        }
      });
    });

    const topWeaknesses = Object.entries(weaknessMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([weakness, count]) => ({ weakness, occurrences: count }));

    // Collect identified weakness categories
    const weaknessCategoryMap = {};
    completed.forEach(interview => {
      (interview.identifiedWeaknesses || []).forEach(cat => {
        weaknessCategoryMap[cat] = (weaknessCategoryMap[cat] || 0) + 1;
      });
    });
    const topWeaknessCategories = Object.entries(weaknessCategoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, occurrences: count }));

    // Filler words total
    const totalFillerWords = completed.reduce((sum, i) => sum + (i.totalFillerWords || 0), 0);
    const avgFillerWords = totalInterviews > 0 ? Math.round(totalFillerWords / totalInterviews) : 0;

    // Average response time
    const avgResponseTime = totalInterviews > 0
      ? Math.round(completed.reduce((sum, i) => sum + (i.averageResponseTime || 0), 0) / totalInterviews)
      : 0;

    // Recent sessions (last 10)
    const recentSessions = completed.slice(0, 10).map(i => ({
      sessionId: i.sessionId,
      role: i.role,
      company: i.company,
      difficulty: i.difficulty,
      mode: i.mode,
      overallScore: i.overallScore,
      hireabilityScore: i.hireabilityScore || 0,
      questionsCount: i.questions.length,
      completedAt: i.completedAt,
      createdAt: i.createdAt
    }));

    res.json({
      stats: {
        totalInterviews,
        totalQuestions,
        averageScore: avgScore,
        averageHireability: avgHireability,
        categoryScores,
        weakAreas,
        topWeaknesses,
        topWeaknessCategories,
        totalFillerWords,
        avgFillerWords,
        avgResponseTime
      },
      recentSessions
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
};

/**
 * Get score trends over time
 * GET /api/dashboard/:email/trends
 */
exports.getTrends = async (req, res) => {
  try {
    const { email } = req.params;

    const interviews = await Interview.find({
      userEmail: email,
      status: 'completed'
    }).sort({ completedAt: 1 });

    const trends = interviews.map(i => ({
      sessionId: i.sessionId,
      company: i.company,
      role: i.role,
      mode: i.mode,
      overallScore: i.overallScore,
      hireabilityScore: i.hireabilityScore || 0,
      date: i.completedAt || i.createdAt,
      categoryScores: (() => {
        const evaluated = i.questions.filter(q => q.evaluation && q.evaluation.clarity > 0);
        if (evaluated.length === 0) return { clarity: 0, accuracy: 0, communication: 0, confidence: 0, responseQuality: 0 };
        return {
          clarity: Math.round((evaluated.reduce((s, q) => s + q.evaluation.clarity, 0) / evaluated.length) * 10) / 10,
          accuracy: Math.round((evaluated.reduce((s, q) => s + q.evaluation.accuracy, 0) / evaluated.length) * 10) / 10,
          communication: Math.round((evaluated.reduce((s, q) => s + q.evaluation.communication, 0) / evaluated.length) * 10) / 10,
          confidence: Math.round((evaluated.reduce((s, q) => s + (q.evaluation.confidence || 5), 0) / evaluated.length) * 10) / 10,
          responseQuality: Math.round((evaluated.reduce((s, q) => s + (q.evaluation.responseQuality || 5), 0) / evaluated.length) * 10) / 10
        };
      })()
    }));

    res.json({ trends });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to load trends' });
  }
};
