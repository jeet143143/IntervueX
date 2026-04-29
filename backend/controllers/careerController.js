const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const aiService = require('../services/aiService');

/**
 * Career Guidance — AI Career Counselor
 * POST /api/career/guidance
 */
exports.getGuidance = async (req, res) => {
  try {
    const { message, email } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build context from user's data
    const context = {};

    if (email) {
      // Get latest resume
      const latestResume = await Resume.findOne({ userEmail: email })
        .sort({ analyzedAt: -1 });
      if (latestResume && latestResume.extractedText) {
        context.resumeText = latestResume.extractedText;
      }

      // Get interview history summary
      const interviews = await Interview.find({
        userEmail: email,
        status: 'completed'
      }).sort({ completedAt: -1 }).limit(10);

      if (interviews.length > 0) {
        const avgScore = interviews.reduce((sum, i) => sum + i.overallScore, 0) / interviews.length;
        context.avgScore = Math.round(avgScore * 10) / 10;

        // Collect all identified weaknesses
        const allWeaknesses = new Set();
        interviews.forEach(i => {
          if (i.identifiedWeaknesses) {
            i.identifiedWeaknesses.forEach(w => allWeaknesses.add(w));
          }
        });
        context.weakAreas = [...allWeaknesses];

        context.interviewHistory = `${interviews.length} interviews completed. Companies: ${[...new Set(interviews.map(i => i.company))].join(', ')}. Roles: ${[...new Set(interviews.map(i => i.role))].join(', ')}.`;
      }
    }

    // Get AI guidance
    const guidance = await aiService.getCareerGuidance(message, context);

    res.json({
      guidance: {
        response: guidance.response,
        actionItems: guidance.actionItems,
        resources: guidance.resources,
        relatedTopics: guidance.relatedTopics
      }
    });
  } catch (error) {
    console.error('Career guidance error:', error);
    res.status(500).json({ error: 'Failed to generate career guidance' });
  }
};

/**
 * Get career guidance suggestions (pre-built topics)
 * GET /api/career/topics
 */
exports.getTopics = async (req, res) => {
  const topics = [
    { id: 'roadmap', label: '🗺️ Career Roadmap', prompt: 'Create a 6-month career roadmap for me to become a better software engineer' },
    { id: 'skills', label: '🛠️ Skill Gap Analysis', prompt: 'Analyze my skill gaps and suggest what I should learn next' },
    { id: 'resume', label: '📄 Resume Strategy', prompt: 'Give me a complete strategy to make my resume stand out for FAANG companies' },
    { id: 'salary', label: '💰 Salary Negotiation', prompt: 'How should I negotiate salary for a software engineering role?' },
    { id: 'transition', label: '🔄 Career Transition', prompt: 'I want to transition to a new tech role. What steps should I take?' },
    { id: 'interview', label: '🎯 Interview Strategy', prompt: 'Give me a complete interview preparation strategy for the next 30 days' },
    { id: 'freelance', label: '💼 Freelancing', prompt: 'How can I start freelancing as a software developer? What platforms and strategies should I use?' },
    { id: 'startup', label: '🚀 Startup vs Corporate', prompt: 'Should I join a startup or a big tech company? Help me decide based on my profile' },
    { id: 'higher-studies', label: '🎓 Higher Studies', prompt: 'Should I pursue a Master\'s degree? What are the pros and cons for my career?' },
    { id: 'portfolio', label: '🌐 Portfolio Building', prompt: 'Help me build a portfolio that impresses recruiters and hiring managers' }
  ];

  res.json({ topics });
};
