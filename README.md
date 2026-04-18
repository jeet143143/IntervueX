# IntervueX — AI-Powered Interview Preparation Platform

🎯 **IntervueX** is a full-stack AI interview coaching platform that simulates realistic mock interviews with an AI interviewer avatar. It personalizes questions based on your resume, education, and target company.

## ✨ Features

- 🤖 **AI Mock Interviews** — Realistic video-call style interviews with an AI avatar
- 🎤 **Voice Answers** — Speak naturally with real-time speech-to-text transcription
- 📄 **Resume-Powered Questions** — Upload your resume for personalized interview questions
- 🏢 **Company-Specific PYQs** — Questions follow Google, Amazon, Meta, Microsoft, Apple patterns
- 📊 **Smart Evaluation** — AI scores clarity, accuracy & communication with detailed feedback
- 📈 **Dashboard** — Track your progress and score trends over time
- 📑 **Resume Analyzer** — ATS compatibility scoring with improvement suggestions
- 💻 **Code Notepad** — Built-in code editor for coding questions

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI**: Groq API (LLaMA 3.3 70B)
- **Libraries**: Three.js (3D), GSAP (animations), Chart.js (dashboard), Web Speech API

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account
- Groq API key

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/IntervueX.git
cd IntervueX

# Install dependencies
cd backend && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and Groq API key

# Start the server
npm start
```

Visit `http://localhost:3000`

## 📦 Deployment

Deployed on [Vercel](https://vercel.com). Environment variables (`MONGODB_URI`, `GROQ_API_KEY`, `JWT_SECRET`) must be configured in Vercel project settings.

## 👨‍💻 Author

**Jeet Senapati**

## 📄 License

This project is licensed under the MIT License.
