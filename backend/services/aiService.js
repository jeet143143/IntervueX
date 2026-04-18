const Groq = require('groq-sdk');
const { questionPrompt, evaluationPrompt, resumeAnalysisPrompt, followUpPrompt } = require('../utils/prompts');

/**
 * AI Service - Groq API Integration
 * Uses LLaMA model via Groq for fast inference
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
 * @returns {Object} { question, category, hint }
 */
async function generateQuestion(company, role, difficulty, previousQuestions = [], candidateProfile = {}) {
  const prompt = questionPrompt(company, role, difficulty, previousQuestions, candidateProfile);
  const result = await callGroq(prompt, 1500);

  // Validate response structure
  if (!result.question) {
    throw new Error('AI response missing question field');
  }

  return {
    question: result.question,
    category: result.category || 'general',
    hint: result.hint || ''
  };
}

/**
 * Evaluate a candidate's answer
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @param {string} company - Target company
 * @param {string} role - Job role
 * @returns {Object} { clarity, accuracy, communication, strengths, weaknesses, improvedAnswer }
 */
async function evaluateAnswer(question, answer, company, role) {
  const prompt = evaluationPrompt(question, answer, company, role);
  const result = await callGroq(prompt, 1500);

  // Validate and sanitize scores
  return {
    clarity: Math.min(10, Math.max(0, Number(result.clarity) || 0)),
    accuracy: Math.min(10, Math.max(0, Number(result.accuracy) || 0)),
    communication: Math.min(10, Math.max(0, Number(result.communication) || 0)),
    strengths: Array.isArray(result.strengths) ? result.strengths : [],
    weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
    improvedAnswer: result.improvedAnswer || ''
  };
}

/**
 * Analyze a resume
 * @param {string} resumeText - Extracted resume text
 * @param {string} targetRole - Target job role
 * @returns {Object} { atsScore, missingKeywords, suggestions, strengths }
 */
async function analyzeResume(resumeText, targetRole) {
  // Truncate very long resumes to stay within token limits
  const truncatedText = resumeText.substring(0, 4000);
  const prompt = resumeAnalysisPrompt(truncatedText, targetRole);
  const result = await callGroq(prompt, 1500);

  return {
    atsScore: Math.min(100, Math.max(0, Number(result.atsScore) || 0)),
    missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    strengths: Array.isArray(result.strengths) ? result.strengths : []
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

module.exports = {
  generateQuestion,
  evaluateAnswer,
  analyzeResume,
  generateFollowUp
};
