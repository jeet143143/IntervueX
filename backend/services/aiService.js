const Groq = require('groq-sdk');
const {
  questionPrompt, evaluationPrompt, resumeAnalysisPrompt, followUpPrompt,
  weaknessTargetingPrompt, hireabilityPrompt, careerGuidancePrompt, getPressureTimeLimit
} = require('../utils/prompts');

/**
 * AI Service — Groq API Integration (Enhanced)
 * Uses LLaMA model via Groq for fast inference
 * Features: Hireability Score, Weakness Targeting, Pressure Mode, Career Guidance
 */

let groq;

function getGroqClient() {
  if (!groq) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }
  return groq;
}

/**
 * Send a prompt to Groq and parse JSON response
 */
async function callGroq(prompt, maxTokens = 1024) {
  const client = getGroqClient();

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that always responds with valid JSON. Never include markdown code blocks, explanations, or any text outside the JSON object.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    // Try to extract JSON from response if wrapped in other text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error(`Failed to parse AI response: ${content.substring(0, 200)}`);
  }
}

/**
 * Generate an interview question
 * @param {string} company - Target company
 * @param {string} role - Job role
 * @param {string} difficulty - Easy/Medium/Hard
 * @param {string[]} previousQuestions - Previously asked questions to avoid repeats
 * @param {Object} candidateProfile - Candidate's resume and personal details
 * @param {Object} options - Additional options (mode, weaknessTargeting, identifiedWeaknesses)
 * @returns {Object} { question, category, hint, expectedTimeMinutes }
 */
async function generateQuestion(company, role, difficulty, previousQuestions = [], candidateProfile = {}, options = {}) {
  // If weakness targeting is active, use specialized prompt
  if (options.weaknessTargeting && options.identifiedWeaknesses && options.identifiedWeaknesses.length > 0) {
    const prompt = weaknessTargetingPrompt(
      options.identifiedWeaknesses, company, role, difficulty, previousQuestions
    );
    const result = await callGroq(prompt, 1500);
    return {
      question: result.question,
      category: result.category || result.targetedWeakness || 'technical',
      hint: result.hint || '',
      isWeaknessTargeted: true,
      expectedTimeMinutes: result.expectedTimeMinutes || 3
    };
  }

  const prompt = questionPrompt(company, role, difficulty, previousQuestions, candidateProfile, options);
  const result = await callGroq(prompt, 1500);

  if (!result.question) {
    throw new Error('AI response missing question field');
  }

  return {
    question: result.question,
    category: result.category || 'general',
    hint: result.hint || '',
    isWeaknessTargeted: false,
    expectedTimeMinutes: result.expectedTimeMinutes || 2
  };
}

/**
 * Evaluate a candidate's answer — Enhanced with confidence + response quality
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @param {string} company - Target company
 * @param {string} role - Job role
 * @param {Object} options - { mode }
 * @returns {Object} Enhanced evaluation
 */
async function evaluateAnswer(question, answer, company, role, options = {}) {
  const prompt = evaluationPrompt(question, answer, company, role, options);
  const result = await callGroq(prompt, 2000);

  return {
    clarity: Math.min(10, Math.max(0, Number(result.clarity) || 0)),
    accuracy: Math.min(10, Math.max(0, Number(result.accuracy) || 0)),
    communication: Math.min(10, Math.max(0, Number(result.communication) || 0)),
    confidence: Math.min(10, Math.max(0, Number(result.confidence) || 5)),
    responseQuality: Math.min(10, Math.max(0, Number(result.responseQuality) || 5)),
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    weaknessCategories: Array.isArray(result.weaknessCategories) ? result.weaknessCategories : [],
    improvedAnswer: result.improvedAnswer || '',
    fillerWordsDetected: Number(result.fillerWordEstimate) || 0,
    confidenceNotes: result.confidenceNotes || ''
  };
}

/**
 * Analyze a resume — Enhanced with keyword optimization + question generation
 * @param {string} resumeText - Extracted resume text
 * @param {string} targetRole - Target job role
 * @returns {Object} Enhanced analysis
 */
async function analyzeResume(resumeText, targetRole) {
  // Truncate very long resumes to stay within token limits
  const truncatedText = resumeText.substring(0, 4000);
  const prompt = resumeAnalysisPrompt(truncatedText, targetRole);
  const result = await callGroq(prompt, 3000);

  return {
    atsScore: Math.min(100, Math.max(0, Number(result.atsScore) || 0)),
    missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    keywordOptimization: Array.isArray(result.keywordOptimization) ? result.keywordOptimization : [],
    enhancedBullets: Array.isArray(result.enhancedBullets) ? result.enhancedBullets : [],
    personalizedQuestions: Array.isArray(result.personalizedQuestions) ? result.personalizedQuestions : [],
    sectionScores: result.sectionScores || {
      contactInfo: 0, experience: 0, education: 0, skills: 0, projects: 0, formatting: 0
    }
  };
}

/**
 * Generate a follow-up question
 */
async function generateFollowUp(originalQuestion, answer, company, role) {
  const prompt = followUpPrompt(originalQuestion, answer, company, role);
  const result = await callGroq(prompt);

  return {
    question: result.question,
    category: 'follow-up',
    hint: result.hint || ''
  };
}

/**
 * Generate Hireability Score — Final assessment
 * @param {Object} interview - Complete interview document
 * @returns {Object} Hireability assessment
 */
async function generateHireabilityScore(interview) {
  // Build interview summary
  const summary = interview.questions.map(q => {
    const evalStr = q.evaluation ? `
    Scores: Clarity=${q.evaluation.clarity}, Accuracy=${q.evaluation.accuracy}, Communication=${q.evaluation.communication}, Confidence=${q.evaluation.confidence || 'N/A'}, Quality=${q.evaluation.responseQuality || 'N/A'}
    Strengths: ${(q.evaluation.strengths || []).join(', ')}
    Weaknesses: ${(q.evaluation.weaknesses || []).join(', ')}` : 'Not evaluated';

    return `Q${q.questionNumber}: ${q.question}
    Answer: ${q.answer || 'No answer'}
    Evaluation: ${evalStr}`;
  }).join('\n\n');

  const prompt = hireabilityPrompt(summary, interview.company, interview.role);
  const result = await callGroq(prompt, 2000);

  return {
    hireabilityScore: Math.min(100, Math.max(0, Number(result.hireabilityScore) || 0)),
    verdict: result.verdict || 'Lean No Hire',
    summary: result.summary || '',
    topStrengths: Array.isArray(result.topStrengths) ? result.topStrengths : [],
    criticalGaps: Array.isArray(result.criticalGaps) ? result.criticalGaps : [],
    recommendation: result.recommendation || '',
    breakdown: result.breakdown || {
      technicalKnowledge: 0, communication: 0, confidence: 0,
      responseQuality: 0, problemSolving: 0
    }
  };
}

/**
 * Career Guidance — AI counselor response
 * @param {string} userMessage - User's question
 * @param {Object} context - Optional context (resume, interview history, etc.)
 * @returns {Object} Career guidance response
 */
async function getCareerGuidance(userMessage, context = {}) {
  const prompt = careerGuidancePrompt(userMessage, context);
  const result = await callGroq(prompt, 2000);

  return {
    response: result.response || 'I apologize, I could not generate a response. Please try again.',
    actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
    resources: Array.isArray(result.resources) ? result.resources : [],
    relatedTopics: Array.isArray(result.relatedTopics) ? result.relatedTopics : []
  };
}

module.exports = {
  generateQuestion,
  evaluateAnswer,
  analyzeResume,
  generateFollowUp,
  generateHireabilityScore,
  getCareerGuidance,
  getPressureTimeLimit
};
