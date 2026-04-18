/**
 * AI Prompt Templates
 * Structured prompts for Groq API (LLaMA model) to ensure consistent JSON responses
 */

/**
 * Generate an interview question based on company, role, difficulty, and candidate profile
 */
function questionPrompt(company, role, difficulty, previousQuestions = [], candidateProfile = {}) {
  const companyStyles = {
    'Google': 'Focus on data structures, algorithms, and problem-solving. Ask questions that test analytical thinking and optimization skills. Google values clean code, scalability, and "Googleyness" (intellectual humility, collaborative thinking).',
    'Amazon': 'Focus on behavioral questions using the STAR method (Situation, Task, Action, Result) and Leadership Principles (Customer Obsession, Ownership, Bias for Action, Dive Deep). Include questions about scalability and system design.',
    'Meta': 'Focus on coding challenges, system design, and product sense. Ask questions about building scalable systems, move-fast culture, and making product decisions with data.',
    'Microsoft': 'Focus on coding fundamentals, system design, and collaborative problem-solving. Ask about design patterns, software engineering best practices, and growth mindset.',
    'Apple': 'Focus on attention to detail, user experience thinking, and technical depth. Ask questions that combine creativity with engineering. Apple values passion for products.',
    'Generic': 'Ask a well-rounded interview question covering either technical skills, problem-solving, or behavioral aspects.'
  };

  // Company-specific PYQ (Previous Year Question) patterns
  const companyPYQs = {
    'Google': `Common Google PYQ patterns to draw from:
- "Design a system that..." (e.g., URL shortener, web crawler, rate limiter)
- "Given an array/string/tree, find..." (algorithmic problems)
- "Tell me about a time you had to work with ambiguous requirements"
- "How would you improve Google Maps/Search/Gmail?"
- "Estimate how many..." (Fermi estimation questions)
- "Write a function to..." (LeetCode medium/hard style)`,
    'Amazon': `Common Amazon PYQ patterns to draw from:
- "Tell me about a time when you went above and beyond for a customer" (Customer Obsession)
- "Describe a situation where you took ownership of a problem" (Ownership)
- "Design a scalable e-commerce order processing system"
- "How would you handle a situation where your manager disagreed with you?"
- "Tell me about a time you made a decision with incomplete data" (Bias for Action)
- "Design Amazon's recommendation system"`,
    'Meta': `Common Meta PYQ patterns to draw from:
- "Design Facebook News Feed / Instagram Stories"
- "How would you detect fake accounts at scale?"
- "Given a large dataset, how would you..." (data-intensive problems)
- "Tell me about a product you'd build to improve social connection"
- "Write code to solve..." (focus on optimal time/space complexity)
- "How would you measure the success of a new feature?"`,
    'Microsoft': `Common Microsoft PYQ patterns to draw from:
- "Design a cloud-based file storage system"
- "How would you architect a real-time collaboration tool?"
- "Implement a data structure that supports..." (LRU cache, trie, etc.)
- "Tell me about a challenging bug you debugged"
- "How would you improve Microsoft Teams/Office?"
- "Design an API for..." (API design questions)`,
    'Apple': `Common Apple PYQ patterns to draw from:
- "How would you redesign the Apple Watch notification system?"
- "Walk me through how you'd build an offline-first mobile app"
- "Tell me about a product you love and how you'd improve it"
- "Implement a thread-safe data structure..."
- "How would you optimize battery performance for a feature?"
- "Design a system for securely syncing data across devices"`,
    'Generic': `Common interview question patterns:
- "Tell me about yourself and your experience"
- "Design a system for..." (system design)
- "Write a function to..." (coding)
- "Tell me about a challenging project you worked on"
- "What's your greatest technical achievement?"
- "How do you handle disagreements in a team?"`
  };

  const style = companyStyles[company] || companyStyles['Generic'];
  const pyqs = companyPYQs[company] || companyPYQs['Generic'];

  const prevList = previousQuestions.length > 0
    ? `\n\nDo NOT repeat these previously asked questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  // Build candidate context from profile
  let candidateContext = '';
  if (candidateProfile && Object.keys(candidateProfile).length > 0) {
    const parts = [];

    if (candidateProfile.resumeText) {
      // Truncate resume to key content (first 2000 chars)
      const resumeSummary = candidateProfile.resumeText.substring(0, 2000);
      parts.push(`CANDIDATE RESUME (use this to ask relevant questions about their projects, skills, and experience):\n---\n${resumeSummary}\n---`);
    }

    if (candidateProfile.university) {
      parts.push(`University: ${candidateProfile.university}`);
    }
    if (candidateProfile.passoutYear) {
      parts.push(`Graduation Year: ${candidateProfile.passoutYear}`);
    }
    if (candidateProfile.experience) {
      parts.push(`Years of Experience: ${candidateProfile.experience}`);
    }
    if (candidateProfile.currentCompany) {
      parts.push(`Current/Previous Company: ${candidateProfile.currentCompany}`);
    }
    if (candidateProfile.dob) {
      parts.push(`Date of Birth: ${candidateProfile.dob}`);
    }

    if (parts.length > 0) {
      candidateContext = `\n\nCANDIDATE PROFILE:\n${parts.join('\n')}\n\nIMPORTANT: Use the candidate's resume, education, and experience to personalize your questions. Ask about specific projects, technologies, or experiences mentioned in their resume. If they are a fresher (0 experience or recent graduate), focus more on academic projects, internships, and foundational concepts. If they are experienced, ask about real-world scenarios from their work.`;
    }
  }

  return `You are a senior interviewer at ${company} conducting a REALISTIC interview for a ${role} position.
Difficulty level: ${difficulty}.

${style}

${pyqs}

CORE TECHNICAL TOPICS — The MAJORITY of your questions should come from these areas:
- **OOP**: 4 pillars (Encapsulation, Abstraction, Inheritance, Polymorphism), SOLID principles, design patterns
- **Data Structures**: Arrays, LinkedLists, Trees, Graphs, HashMaps, Stacks, Queues, Heaps, Tries
- **Algorithms**: Sorting, Searching, Dynamic Programming, Recursion, Greedy, BFS/DFS, Two Pointers, Sliding Window
- **System Design**: Scalability, Load Balancing, Caching, Database Sharding, Microservices, API Design, CAP Theorem
- **DBMS**: SQL vs NoSQL, Normalization, Indexing, Transactions, ACID properties, Joins
- **OS**: Processes vs Threads, Deadlocks, Memory Management, Scheduling algorithms, Virtual Memory
- **Networking**: TCP/UDP, HTTP/HTTPS, REST vs GraphQL, DNS, WebSockets, OSI Model
- **Coding Problems**: Write a function to..., Implement a class that..., Optimize this algorithm...
- **Role-specific**: For frontend (React, DOM, CSS), backend (APIs, auth, databases), DevOps (CI/CD, Docker, K8s), etc.

HR / BEHAVIORAL — Only ask these OCCASIONALLY (about 1 in every 5 questions):
- Question 1 should be "Tell me about yourself" or a brief introduction question
- After that, ask HR questions only every 4th-5th question (e.g., Q5, Q9)
- Examples: strengths/weaknesses, why this company, conflict resolution, career goals, failure stories
${candidateContext}
${prevList}

Ask exactly ONE interview question. The question should be:
1. Appropriate for the ${difficulty} difficulty level
2. Relevant to the ${role} position at ${company}
3. STRONGLY PREFER core technical/CS fundamental questions (OOP, DSA, System Design, DBMS, coding problems)
4. If candidate profile/resume is provided, ask about specific technologies or projects from their resume
5. Only ask HR/behavioral questions for Q1 (introduction) and then sparingly every 4-5 questions
6. Ask questions that test real knowledge — e.g., "What are the 4 pillars of OOP?", "Explain how HashMap works internally", "Design a URL shortener"

Respond with ONLY a JSON object in this exact format:
{
  "question": "Your interview question here",
  "category": "technical|behavioral|system-design|coding|resume-based|hr",
  "hint": "A subtle hint to guide the candidate"
}

Do not include any text outside the JSON object.`;
}

/**
 * Evaluate a candidate's answer
 */
function evaluationPrompt(question, answer, company, role) {
  return `You are a senior interviewer at ${company} evaluating a candidate's answer for a ${role} position.

Question: "${question}"

Candidate's Answer: "${answer}"

Evaluate this answer thoroughly. Score each dimension from 0-10 where:
- 0-3: Poor
- 4-5: Below Average
- 6-7: Good
- 8-9: Very Good
- 10: Exceptional

Respond with ONLY a JSON object in this exact format:
{
  "clarity": <number 0-10>,
  "accuracy": <number 0-10>,
  "communication": <number 0-10>,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "improvedAnswer": "A model answer that would score 9-10 in all categories"
}

Be specific in strengths and weaknesses. The improved answer should be comprehensive but concise.
Do not include any text outside the JSON object.`;
}

/**
 * Analyze a resume for ATS compatibility
 */
function resumeAnalysisPrompt(resumeText, targetRole = 'Software Engineer') {
  return `You are an expert ATS (Applicant Tracking System) analyzer and career coach.

Analyze the following resume for a ${targetRole} position:

---
${resumeText}
---

Evaluate the resume and provide:
1. An ATS compatibility score (0-100)
2. Missing keywords that are important for a ${targetRole} role
3. Specific improvement suggestions
4. Current strengths of the resume

Respond with ONLY a JSON object in this exact format:
{
  "atsScore": <number 0-100>,
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "strengths": ["strength 1", "strength 2"]
}

Be specific and actionable in your suggestions. Include at least 3 items for each array.
Do not include any text outside the JSON object.`;
}

/**
 * Generate a follow-up question based on the candidate's answer
 */
function followUpPrompt(originalQuestion, answer, company, role) {
  return `You are a senior interviewer at ${company} for a ${role} position.

You just asked: "${originalQuestion}"
The candidate answered: "${answer}"

Based on their answer, ask ONE follow-up question that digs deeper into their response or tests a related concept.

Respond with ONLY a JSON object in this exact format:
{
  "question": "Your follow-up question here",
  "category": "follow-up",
  "hint": "A subtle hint to guide the candidate"
}

Do not include any text outside the JSON object.`;
}

module.exports = {
  questionPrompt,
  evaluationPrompt,
  resumeAnalysisPrompt,
  followUpPrompt
};
