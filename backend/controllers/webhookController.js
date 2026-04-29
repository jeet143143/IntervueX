const Interview = require('../models/Interview');
const Resume = require('../models/Resume');

/**
 * n8n Webhook Endpoints
 * These endpoints allow n8n to automate workflows:
 * - Resume processing triggers
 * - Interview completion notifications
 * - Feedback generation
 * - Reporting and analytics
 */

/**
 * Webhook: Interview completed
 * POST /api/webhooks/interview-completed
 * Called after an interview is completed — can trigger n8n workflows
 */
exports.interviewCompleted = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const interview = await Interview.findOne({ sessionId, status: 'completed' });
    if (!interview) {
      return res.status(404).json({ error: 'Completed interview not found' });
    }

    // Build webhook payload for n8n
    const payload = {
      event: 'interview_completed',
      timestamp: new Date().toISOString(),
      data: {
        sessionId: interview.sessionId,
        userEmail: interview.userEmail,
        company: interview.company,
        role: interview.role,
        difficulty: interview.difficulty,
        mode: interview.mode,
        overallScore: interview.overallScore,
        hireabilityScore: interview.hireabilityScore,
        hireabilityBreakdown: interview.hireabilityBreakdown,
        totalQuestions: interview.questions.length,
        totalFillerWords: interview.totalFillerWords,
        averageResponseTime: interview.averageResponseTime,
        identifiedWeaknesses: interview.identifiedWeaknesses,
        completedAt: interview.completedAt
      }
    };

    res.json(payload);
  } catch (error) {
    console.error('Webhook interview-completed error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Webhook: Resume analyzed
 * POST /api/webhooks/resume-analyzed
 * Returns resume analysis data for n8n processing
 */
exports.resumeAnalyzed = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'Missing resumeId' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const payload = {
      event: 'resume_analyzed',
      timestamp: new Date().toISOString(),
      data: {
        resumeId: resume._id,
        userEmail: resume.userEmail,
        fileName: resume.fileName,
        targetRole: resume.targetRole,
        atsScore: resume.analysis.atsScore,
        missingKeywords: resume.analysis.missingKeywords,
        suggestions: resume.analysis.suggestions,
        strengths: resume.analysis.strengths,
        sectionScores: resume.analysis.sectionScores,
        analyzedAt: resume.analyzedAt
      }
    };

    res.json(payload);
  } catch (error) {
    console.error('Webhook resume-analyzed error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Webhook: User analytics report
 * POST /api/webhooks/user-report
 * Generates a comprehensive user analytics payload for n8n email/report workflows
 */
exports.userReport = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const interviews = await Interview.find({ userEmail: email, status: 'completed' })
      .sort({ completedAt: -1 });

    const resumes = await Resume.find({ userEmail: email })
      .sort({ analyzedAt: -1 })
      .limit(5)
      .select('-extractedText');

    const totalInterviews = interviews.length;
    const avgScore = totalInterviews > 0
      ? Math.round((interviews.reduce((s, i) => s + i.overallScore, 0) / totalInterviews) * 10) / 10
      : 0;
    const avgHireability = totalInterviews > 0
      ? Math.round(interviews.reduce((s, i) => s + (i.hireabilityScore || 0), 0) / totalInterviews)
      : 0;

    // Aggregate weaknesses
    const weaknessMap = {};
    interviews.forEach(i => {
      (i.identifiedWeaknesses || []).forEach(w => {
        weaknessMap[w] = (weaknessMap[w] || 0) + 1;
      });
    });

    const payload = {
      event: 'user_report',
      timestamp: new Date().toISOString(),
      data: {
        email,
        totalInterviews,
        averageScore: avgScore,
        averageHireability: avgHireability,
        topWeaknesses: Object.entries(weaknessMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([w, c]) => ({ weakness: w, count: c })),
        recentInterviews: interviews.slice(0, 5).map(i => ({
          company: i.company,
          role: i.role,
          score: i.overallScore,
          hireability: i.hireabilityScore,
          date: i.completedAt
        })),
        resumeAnalyses: resumes.map(r => ({
          fileName: r.fileName,
          atsScore: r.analysis.atsScore,
          date: r.analyzedAt
        }))
      }
    };

    res.json(payload);
  } catch (error) {
    console.error('Webhook user-report error:', error);
    res.status(500).json({ error: 'Report generation failed' });
  }
};

/**
 * Health check for n8n webhook connection
 * GET /api/webhooks/health
 */
exports.webhookHealth = (req, res) => {
  res.json({
    status: 'ok',
    service: 'IntervueX Webhooks',
    timestamp: new Date().toISOString(),
    availableWebhooks: [
      'POST /api/webhooks/interview-completed',
      'POST /api/webhooks/resume-analyzed',
      'POST /api/webhooks/user-report'
    ]
  });
};
