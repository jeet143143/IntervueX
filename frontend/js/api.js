/**
 * API Service — Fetch wrapper for backend calls (Enhanced)
 * Supports: Career Guidance, Webhooks, Enhanced Interview/Resume endpoints
 */
const API = (() => {
  const BASE_URL = window.location.origin + '/api';

  /**
   * Generic fetch wrapper with error handling
   */
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Don't set Content-Type for FormData (let browser set boundary)
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  return {
    // Interview endpoints
    startInterview: (formData) => request('/interview/start', {
      method: 'POST',
      body: formData  // FormData — browser sets Content-Type with boundary automatically
    }),

    nextQuestion: (sessionId) => request('/interview/next-question', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    }),

    evaluateAnswer: (sessionId, questionNumber, answer, responseTimeSeconds = 0, fillerWordsClient = 0) => request('/interview/evaluate', {
      method: 'POST',
      body: JSON.stringify({ sessionId, questionNumber, answer, responseTimeSeconds, fillerWordsClient })
    }),

    completeInterview: (sessionId) => request('/interview/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    }),

    getSession: (sessionId) => request(`/interview/${sessionId}`),

    // Resume endpoints
    uploadResume: (formData) => request('/resume/upload', {
      method: 'POST',
      body: formData
    }),

    getResumeAnalysis: (id) => request(`/resume/${id}`),

    // Dashboard endpoints
    getDashboard: (email) => request(`/dashboard/${encodeURIComponent(email)}`),
    getTrends: (email) => request(`/dashboard/${encodeURIComponent(email)}/trends`),

    // Career Guidance endpoints
    getCareerGuidance: (message, email) => request('/career/guidance', {
      method: 'POST',
      body: JSON.stringify({ message, email })
    }),

    getCareerTopics: () => request('/career/topics'),

    // Health check
    health: () => request('/health')
  };
})();
