/**
 * AI Prompt Templates — Enhanced Edition
 * Structured prompts for Groq API (LLaMA model) to ensure consistent JSON responses
 * Includes: Question Generation, Evaluation with Hireability Score, Weakness Targeting,
 * Pressure Mode, Enhanced Resume Analysis, Career Guidance, and Company PYQs
 */

/**
 * Generate an interview question based on company, role, difficulty, and candidate profile
 */
function questionPrompt(company, role, difficulty, previousQuestions = [], candidateProfile = {}, options = {}) {
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

  // Weakness Targeting mode
  let weaknessContext = '';
  if (options.weaknessTargeting && options.identifiedWeaknesses && options.identifiedWeaknesses.length > 0) {
    weaknessContext = `\n\n🔴 WEAKNESS TARGETING MODE ACTIVE 🔴
The candidate has shown weakness in these areas: ${options.identifiedWeaknesses.join(', ')}
You MUST ask a question that specifically targets one of these weak areas.
Ask a deeper, scenario-based question that tests their understanding of the weak topic.
Make the question more challenging to probe the depth of their knowledge gap.
Example: If weak in "OOP", ask "Design a real-world system using SOLID principles" instead of "What is OOP?"`;
  }

  // Pressure mode context
  let pressureContext = '';
  if (options.mode === 'pressure') {
    pressureContext = `\n\n⚡ PRESSURE SIMULATION MODE ⚡
This is a high-pressure interview simulation. Your questions should be:
- More challenging and multi-part
- Include time pressure hints like "In 2 minutes, explain..."
- Ask follow-up probes within the question itself
- Be more demanding in expectations
- Add scenario constraints like "You have 30 minutes to design..."
- Questions should feel intense but fair, simulating a real high-stakes interview`;
  }

  // PYQ mode context
  let pyqContext = '';
  if (options.mode === 'pyq') {
    pyqContext = `\n\n📋 PYQ (PREVIOUS YEAR QUESTIONS) MODE 📋
You MUST ask questions that are directly inspired by or identical to actual questions asked in ${company} interviews.
Draw heavily from the PYQ patterns provided above.
These should be realistic, company-specific questions that candidates have actually faced.`;
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
${weaknessContext}
${pressureContext}
${pyqContext}
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
  "category": "technical|behavioral|system-design|coding|resume-based|hr|oop|dsa|dbms|os|networking",
  "hint": "A subtle hint to guide the candidate",
  "expectedTimeMinutes": 2
}

Do not include any text outside the JSON object.`;
}

/**
 * Evaluate a candidate's answer — Enhanced with Hireability metrics
 */
function evaluationPrompt(question, answer, company, role, options = {}) {
  let pressureNote = '';
  if (options.mode === 'pressure') {
    pressureNote = `\n\nNOTE: This is a PRESSURE MODE interview. Be stricter in your evaluation.
Score more critically — only give 8+ scores for truly exceptional answers.
In the real world, interviewers under time pressure expect concise, precise answers.`;
  }

  return `You are a senior interviewer at ${company} evaluating a candidate's answer for a ${role} position.

Question: "${question}"

Candidate's Answer: "${answer}"
${pressureNote}

Evaluate this answer thoroughly across FIVE dimensions. Score each from 0-10 where:
- 0-3: Poor
- 4-5: Below Average
- 6-7: Good
- 8-9: Very Good
- 10: Exceptional

Also identify the SPECIFIC knowledge areas where the candidate showed weakness.

Respond with ONLY a JSON object in this exact format:
{
  "clarity": <number 0-10>,
  "accuracy": <number 0-10>,
  "communication": <number 0-10>,
  "confidence": <number 0-10>,
  "responseQuality": <number 0-10>,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "weaknessCategories": ["OOP", "DSA", "SystemDesign", "DBMS", "OS", "Networking", "Coding", "Communication", "Behavioral"],
  "improvedAnswer": "A model answer that would score 9-10 in all categories",
  "fillerWordEstimate": <number of filler words like um, uh, like, you know detected>,
  "confidenceNotes": "Brief note on the candidate's apparent confidence level"
}

IMPORTANT for weaknessCategories: Only include categories where the candidate showed ACTUAL weakness.
Choose from: OOP, DSA, SystemDesign, DBMS, OS, Networking, Coding, Communication, Behavioral, ProblemSolving.
If the answer is generally good, return an empty array for weaknessCategories.

Be specific in strengths and weaknesses. The improved answer should be comprehensive but concise.
Do not include any text outside the JSON object.`;
}

/**
 * Analyze a resume for ATS compatibility — Enhanced version
 */
function resumeAnalysisPrompt(resumeText, targetRole = 'Software Engineer') {
  return `You are an expert ATS (Applicant Tracking System) analyzer, career coach, and resume optimization specialist.

Analyze the following resume for a ${targetRole} position:

---
${resumeText}
---

Provide a COMPREHENSIVE analysis including:
1. An ATS compatibility score (0-100)
2. Missing keywords important for a ${targetRole} role
3. Specific improvement suggestions
4. Current strengths
5. Keyword optimization with placement suggestions
6. Enhanced/rewritten bullet points for key achievements
7. Personalized interview questions that an interviewer might ask based on this resume
8. Per-section scores

Respond with ONLY a JSON object in this exact format:
{
  "atsScore": <number 0-100>,
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "strengths": ["strength 1", "strength 2"],
  "keywordOptimization": [
    {"keyword": "Docker", "importance": "high", "suggestedPlacement": "Add to Skills section and mention in project descriptions"},
    {"keyword": "CI/CD", "importance": "medium", "suggestedPlacement": "Include in experience bullet points"}
  ],
  "enhancedBullets": [
    "Engineered a microservices architecture serving 10K+ daily users, reducing API latency by 40% through Redis caching",
    "Led migration from monolithic to event-driven architecture, improving system reliability to 99.9% uptime"
  ],
  "personalizedQuestions": [
    "Tell me about the most challenging project mentioned in your resume",
    "How did you handle scalability in your [specific project]?",
    "What design patterns did you use in your [specific project]?"
  ],
  "sectionScores": {
    "contactInfo": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "skills": <0-100>,
    "projects": <0-100>,
    "formatting": <0-100>
  }
}

Be specific and actionable. Include at least 3 items for each array and 3 keyword optimizations.
Enhanced bullets should be powerful, metric-driven rewrites of weak bullet points found in the resume.
Personalized questions should reference specific items from the resume.
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

/**
 * Weakness Targeting — Generate a question targeting identified weak areas
 */
function weaknessTargetingPrompt(weakCategories, company, role, difficulty, previousQuestions = []) {
  const prevList = previousQuestions.length > 0
    ? `\nDo NOT repeat these: ${previousQuestions.slice(-5).join('; ')}`
    : '';

  return `You are a senior interviewer at ${company} for a ${role} position.
Difficulty: ${difficulty}.

The candidate has demonstrated WEAKNESS in these technical areas: ${weakCategories.join(', ')}

Your job is to ask a DEEP, SCENARIO-BASED question targeting their weakest area.
This is NOT a basic definition question. You must test their UNDERSTANDING.

Examples of deep questions by category:
- OOP: "Design a parking lot system using SOLID principles. Walk me through your class hierarchy."
- DSA: "Given a stream of integers, design a data structure that supports median finding in O(log n)"
- SystemDesign: "Design a real-time notification system that handles 1M concurrent users"
- DBMS: "Your query on a 100M row table is taking 30 seconds. Walk me through your debugging process"
- OS: "Explain how a deadlock can occur in a dining philosophers scenario and how to prevent it"
${prevList}

Respond with ONLY a JSON object:
{
  "question": "Your deep, scenario-based question targeting their weakness",
  "category": "${weakCategories[0] || 'technical'}",
  "hint": "A subtle hint to guide them",
  "targetedWeakness": "${weakCategories[0] || 'general'}",
  "expectedTimeMinutes": 3
}

Do not include any text outside the JSON object.`;
}

/**
 * Hireability Score — Final assessment prompt
 */
function hireabilityPrompt(interviewSummary, company, role) {
  return `You are the FINAL ROUND decision maker at ${company} for a ${role} position.

Here is the complete interview summary:
${interviewSummary}

Based on all the questions, answers, and evaluations above, provide a FINAL HIREABILITY ASSESSMENT.

Consider:
1. Technical Knowledge Depth (30%) — How deep is their understanding?
2. Communication Skills (20%) — Can they explain complex concepts clearly?
3. Confidence Level (15%) — Do they sound sure or hesitant?
4. Response Quality (20%) — Are answers structured, complete, and relevant?
5. Problem-Solving Ability (15%) — Can they think through problems logically?

Respond with ONLY a JSON object:
{
  "hireabilityScore": <0-100>,
  "verdict": "Strong Hire|Hire|Lean Hire|Lean No Hire|No Hire",
  "summary": "2-3 sentence overall assessment",
  "topStrengths": ["strength 1", "strength 2", "strength 3"],
  "criticalGaps": ["gap 1", "gap 2"],
  "recommendation": "Specific advice for the candidate to improve their chances",
  "breakdown": {
    "technicalKnowledge": <0-100>,
    "communication": <0-100>,
    "confidence": <0-100>,
    "responseQuality": <0-100>,
    "problemSolving": <0-100>
  }
}

Be honest and constructive. This should feel like real hiring feedback.
Do not include any text outside the JSON object.`;
}

/**
 * Career Guidance — AI Career Counselor
 */
function careerGuidancePrompt(userMessage, context = {}) {
  let contextStr = '';
  if (context.resumeText) {
    contextStr += `\nCandidate's Resume:\n${context.resumeText.substring(0, 2000)}`;
  }
  if (context.interviewHistory) {
    contextStr += `\nInterview History: ${context.interviewHistory}`;
  }
  if (context.weakAreas) {
    contextStr += `\nIdentified Weak Areas: ${context.weakAreas.join(', ')}`;
  }
  if (context.avgScore) {
    contextStr += `\nAverage Interview Score: ${context.avgScore}/10`;
  }

  return `You are an expert AI Career Counselor and Mentor. You help candidates with:
- Career path planning and roadmaps
- Skill gap analysis and learning recommendations
- Industry trends and job market insights
- Interview preparation strategies
- Resume and personal branding advice
- Salary negotiation tips
- Transition guidance (career switching)
- Upskilling recommendations with specific resources

${contextStr ? `\nCANDIDATE CONTEXT:${contextStr}` : ''}

The candidate says: "${userMessage}"

Provide helpful, actionable, and personalized career guidance. Be encouraging but honest.
If they ask about learning resources, suggest specific platforms, courses, or books.
If they ask about career paths, provide a realistic roadmap with timelines.

Respond with ONLY a JSON object:
{
  "response": "Your detailed career guidance response (can be multiple paragraphs, use \\n for line breaks)",
  "actionItems": ["actionable step 1", "actionable step 2", "actionable step 3"],
  "resources": [
    {"name": "Resource name", "type": "course|book|platform|article", "url": "https://..."}
  ],
  "relatedTopics": ["topic1", "topic2"]
}

Do not include any text outside the JSON object.`;
}

/**
 * Generate pressure mode time constraints
 */
function getPressureTimeLimit(difficulty) {
  switch (difficulty) {
    case 'Easy': return 120; // 2 minutes
    case 'Medium': return 180; // 3 minutes  
    case 'Hard': return 240; // 4 minutes
    default: return 180;
  }
}

module.exports = {
  questionPrompt,
  evaluationPrompt,
  resumeAnalysisPrompt,
  followUpPrompt,
  weaknessTargetingPrompt,
  hireabilityPrompt,
  careerGuidancePrompt,
  getPressureTimeLimit
};
