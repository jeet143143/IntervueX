/**
 * Interview Session Logic — Video Call Mode
 * Handles camera/mic, AI avatar speech, speech-to-text answer capture,
 * and the full question → answer → evaluation flow
 */
const Interview = (() => {
  // State
  let selectedRole = null;
  let selectedCompany = null;
  let selectedDifficulty = null;
  let selectedMode = 'normal'; // normal | pressure | pyq
  let currentSessionId = null;
  let currentQuestionNumber = 0;
  let currentHint = '';
  let timerInterval = null;
  let timerSeconds = 0;
  let candidateResumeFile = null;
  let currentTimeLimit = 0; // pressure mode countdown
  let fillerWordCount = 0;
  let questionStartTime = 0;

  // Filler words to detect
  const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'right', 'so yeah', 'i mean'];

  // Media state
  let mediaStream = null;
  let isCameraOn = true;
  let isMicOn = true;
  let isNotepadOpen = false;

  /**
   * Initialize setup and interview event listeners
   */
  function init() {
    // --- SETUP SECTION ---
    initOptionSelectors();
    initModeSelector();
    initCandidateProfile();

    document.getElementById('btn-begin-interview').addEventListener('click', startInterview);
    document.getElementById('btn-back-setup').addEventListener('click', () => {
      App.navigateTo('landing');
      resetSetup();
    });

    // --- INTERVIEW CONTROLS ---
    document.getElementById('btn-submit-answer').addEventListener('click', submitAnswer);
    document.getElementById('btn-hint').addEventListener('click', toggleHint);
    document.getElementById('hint-close-btn').addEventListener('click', toggleHint);
    document.getElementById('btn-next-question').addEventListener('click', nextQuestion);
    document.getElementById('btn-end-interview').addEventListener('click', endInterview);
    document.getElementById('btn-end-interview-eval').addEventListener('click', endInterview);

    // Camera & Mic toggles
    document.getElementById('btn-toggle-mic').addEventListener('click', toggleMic);
    document.getElementById('btn-toggle-camera').addEventListener('click', toggleCamera);

    // Notepad
    document.getElementById('btn-toggle-notepad').addEventListener('click', toggleNotepad);
    document.getElementById('notepad-close').addEventListener('click', toggleNotepad);
    document.getElementById('notepad-clear').addEventListener('click', clearNotepad);
    initNotepad();

    // --- RESULTS SECTION ---
    document.getElementById('btn-new-interview').addEventListener('click', () => {
      resetSetup();
      App.navigateTo('setup');
    });
    document.getElementById('btn-to-dashboard').addEventListener('click', () => {
      App.navigateTo('dashboard');
    });

    // Initialize Speech module
    Speech.init();

    // Speech callbacks — link avatar speaking animation
    Speech.onSpeakStart(() => {
      Avatar.setSpeaking(true);
      const status = document.getElementById('interviewer-status');
      if (status) status.classList.add('visible');
    });

    Speech.onSpeakEnd(() => {
      Avatar.setSpeaking(false);
      const status = document.getElementById('interviewer-status');
      if (status) status.classList.remove('visible');
    });
  }

  // ===================== SETUP =====================
  function initOptionSelectors() {
    // Role selection
    document.querySelectorAll('#role-options .option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectOption('role-options', btn);
        const customWrapper = document.getElementById('custom-role-wrapper');
        if (btn.dataset.value === 'other') {
          customWrapper.classList.remove('hidden');
          document.getElementById('custom-role-input').focus();
          selectedRole = document.getElementById('custom-role-input').value.trim() || null;
        } else {
          customWrapper.classList.add('hidden');
          document.getElementById('custom-role-input').value = '';
          selectedRole = btn.dataset.value;
        }
        checkSetupReady();
      });
    });

    // Custom role input — update on typing
    document.getElementById('custom-role-input').addEventListener('input', (e) => {
      selectedRole = e.target.value.trim() || null;
      checkSetupReady();
    });

    // Company selection
    document.querySelectorAll('#company-options .option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectOption('company-options', btn);
        const customWrapper = document.getElementById('custom-company-wrapper');
        if (btn.dataset.value === 'other') {
          customWrapper.classList.remove('hidden');
          document.getElementById('custom-company-input').focus();
          selectedCompany = document.getElementById('custom-company-input').value.trim() || null;
        } else {
          customWrapper.classList.add('hidden');
          document.getElementById('custom-company-input').value = '';
          selectedCompany = btn.dataset.value;
        }
        checkSetupReady();
      });
    });

    // Custom company input — update on typing
    document.getElementById('custom-company-input').addEventListener('input', (e) => {
      selectedCompany = e.target.value.trim() || null;
      checkSetupReady();
    });

    // Difficulty selection
    document.querySelectorAll('#difficulty-options .option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectOption('difficulty-options', btn);
        selectedDifficulty = btn.dataset.value;
        checkSetupReady();
      });
    });
  }

  function selectOption(groupId, selectedBtn) {
    const group = document.getElementById(groupId);
    group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    selectedBtn.classList.add('selected');
    Animations.buttonPress(selectedBtn);
  }

  // ===================== MODE SELECTOR =====================
  function initModeSelector() {
    document.querySelectorAll('#mode-options .option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectOption('mode-options', btn);
        selectedMode = btn.dataset.value || 'normal';
        checkSetupReady();
      });
    });
    // Default to 'normal'
    const defaultBtn = document.querySelector('#mode-options .option-btn[data-value="normal"]');
    if (defaultBtn) {
      defaultBtn.classList.add('selected');
    }
  }

  // ===================== FILLER WORD DETECTION =====================
  function countFillerWords(text) {
    if (!text) return 0;
    const lower = text.toLowerCase();
    let count = 0;
    FILLER_WORDS.forEach(filler => {
      const regex = new RegExp('\\b' + filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      const matches = lower.match(regex);
      if (matches) count += matches.length;
    });
    return count;
  }

  // ===================== CANDIDATE PROFILE =====================
  function initCandidateProfile() {
    const uploadZone = document.getElementById('setup-resume-zone');
    const fileInput = document.getElementById('setup-resume-input');
    const removeBtn = document.getElementById('setup-resume-remove');

    // Click to upload
    uploadZone.addEventListener('click', (e) => {
      if (e.target.closest('.setup-upload-remove')) return;
      fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleResumeFile(fileInput.files[0]);
      }
    });

    // Drag & drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleResumeFile(e.dataTransfer.files[0]);
      }
    });

    // Remove resume
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      candidateResumeFile = null;
      fileInput.value = '';
      uploadZone.classList.remove('uploaded');
      document.getElementById('setup-upload-content').classList.remove('hidden');
      document.getElementById('setup-upload-success').classList.add('hidden');
      checkSetupReady();
    });

    // Listen to required text inputs for real-time validation
    document.getElementById('candidate-university').addEventListener('input', checkSetupReady);
    document.getElementById('candidate-passout-year').addEventListener('input', checkSetupReady);
  }

  function handleResumeFile(file) {
    if (file.type !== 'application/pdf') {
      Animations.showToast('Please upload a PDF file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Animations.showToast('File too large. Max 5MB allowed.', 'error');
      return;
    }

    candidateResumeFile = file;

    const zone = document.getElementById('setup-resume-zone');
    zone.classList.add('uploaded');
    document.getElementById('setup-upload-content').classList.add('hidden');
    document.getElementById('setup-upload-success').classList.remove('hidden');
    document.getElementById('setup-resume-filename').textContent = file.name;

    checkSetupReady();
    Animations.showToast('Resume uploaded ✓', 'success');
  }

  function checkSetupReady() {
    const btn = document.getElementById('btn-begin-interview');
    const hint = document.getElementById('setup-hint');

    const university = document.getElementById('candidate-university').value.trim();
    const passoutYear = document.getElementById('candidate-passout-year').value.trim();

    const hasSelections = selectedRole && selectedCompany && selectedDifficulty;
    const hasProfile = candidateResumeFile && university && passoutYear;

    if (hasSelections && hasProfile) {
      btn.disabled = false;
      hint.textContent = `Ready! ${selectedRole} at ${selectedCompany} (${selectedDifficulty})`;
      hint.style.color = 'var(--accent-success)';
    } else {
      btn.disabled = true;
      const missing = [];
      if (!selectedRole) missing.push('role');
      if (!selectedCompany) missing.push('company');
      if (!selectedDifficulty) missing.push('difficulty');
      if (!candidateResumeFile) missing.push('resume');
      if (!university) missing.push('university');
      if (!passoutYear) missing.push('passout year');
      hint.textContent = `Please fill: ${missing.join(', ')}`;
      hint.style.color = '';
    }
  }

  // ===================== START INTERVIEW =====================
  async function startInterview() {
    if (!selectedRole || !selectedCompany || !selectedDifficulty) return;
    if (!candidateResumeFile) {
      Animations.showToast('Please upload your resume first', 'error');
      return;
    }

    Animations.showLoading('Setting up your interview room...');

    try {
      // Request camera and microphone
      await requestMedia();

      // Build FormData with resume + profile + interview settings
      const user = App.getUser();
      const formData = new FormData();
      formData.append('resume', candidateResumeFile);
      formData.append('email', user.email);
      formData.append('name', user.name);
      formData.append('role', selectedRole);
      formData.append('company', selectedCompany);
      formData.append('difficulty', selectedDifficulty);
      formData.append('mode', selectedMode);
      formData.append('university', document.getElementById('candidate-university').value.trim());
      formData.append('passoutYear', document.getElementById('candidate-passout-year').value.trim());

      // Optional fields
      const dob = document.getElementById('candidate-dob').value;
      const experience = document.getElementById('candidate-experience').value;
      const currentCompanyVal = document.getElementById('candidate-company').value.trim();
      if (dob) formData.append('dob', dob);
      if (experience) formData.append('experience', experience);
      if (currentCompanyVal) formData.append('currentCompany', currentCompanyVal);

      // Call API to start interview
      const data = await API.startInterview(formData);

      currentSessionId = data.sessionId;
      currentQuestionNumber = data.questionNumber;
      currentHint = data.hint || '';

      // Set candidate name & initial
      const candidateName = user.name || 'You';
      document.getElementById('candidate-name-label').textContent = candidateName;
      document.getElementById('candidate-initial').textContent = candidateName.charAt(0).toUpperCase();

      // Update header badges
      document.getElementById('interview-company').textContent = selectedCompany;
      document.getElementById('interview-role').textContent = selectedRole;
      document.getElementById('interview-difficulty').textContent = selectedDifficulty;
      document.getElementById('question-counter').textContent = `Q${currentQuestionNumber}`;

      // Reset UI
      document.getElementById('answer-input').value = '';
      document.getElementById('evaluation-card').classList.add('hidden');
      document.getElementById('question-hint').classList.add('hidden');
      document.getElementById('transcript-final').textContent = '';
      document.getElementById('transcript-interim').textContent = '';

      Animations.hideLoading();

      // Navigate to interview
      App.navigateTo('interview');

      // Initialize avatar after section is visible
      setTimeout(() => {
        const avatarCanvas = document.getElementById('avatar-canvas');
        Avatar.init(avatarCanvas);

      // Show the question text
        document.getElementById('question-text').textContent = data.question;

        // Set time limit for pressure mode
        currentTimeLimit = data.timeLimitSeconds || 0;

        // Speak a welcome + the question
        const greeting = selectedMode === 'pressure'
          ? `Welcome to your high-pressure ${selectedCompany} interview. Time is limited. Let's begin.`
          : `Hello! Welcome to your ${selectedCompany} interview for the ${selectedRole} position. Let's begin.`;
        Avatar.setExpression('happy');

        Speech.speak(greeting).then(() => {
          Avatar.setExpression('neutral');
          return Speech.speak(data.question);
        }).then(() => {
          startListeningForAnswer();
          startTimer();
          questionStartTime = Date.now();
          fillerWordCount = 0;
        });
      }, 500);

    } catch (error) {
      Animations.hideLoading();
      Animations.showToast('Failed to start interview: ' + error.message, 'error');
    }
  }

  // ===================== MEDIA =====================
  async function requestMedia() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const video = document.getElementById('candidate-video');
      video.srcObject = mediaStream;
      video.style.display = 'block';
      document.getElementById('candidate-no-video').classList.add('hidden');
      isCameraOn = true;
      isMicOn = true;

    } catch (err) {
      console.warn('Media access denied:', err);
      // Try audio only
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isCameraOn = false;
        isMicOn = true;
        document.getElementById('candidate-video').style.display = 'none';
        document.getElementById('candidate-no-video').classList.remove('hidden');
      } catch (audioErr) {
        console.warn('Audio access also denied:', audioErr);
        Animations.showToast('Camera/mic access denied. You can still type answers.', 'error');
        isCameraOn = false;
        isMicOn = false;
      }
    }

    updateMediaIcons();
  }

  function toggleCamera() {
    if (!mediaStream) return;
    const videoTracks = mediaStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    isCameraOn = !isCameraOn;
    videoTracks.forEach(track => { track.enabled = isCameraOn; });

    const video = document.getElementById('candidate-video');
    const noVideo = document.getElementById('candidate-no-video');

    if (isCameraOn) {
      video.style.display = 'block';
      noVideo.classList.add('hidden');
    } else {
      video.style.display = 'none';
      noVideo.classList.remove('hidden');
    }

    updateMediaIcons();
  }

  function toggleMic() {
    isMicOn = !isMicOn;

    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => { track.enabled = isMicOn; });
    }

    if (isMicOn) {
      startListeningForAnswer();
    } else {
      Speech.stopListening();
      document.getElementById('mic-indicator').classList.remove('active');
      document.getElementById('speech-transcript').classList.remove('active');
    }

    updateMediaIcons();
  }

  function updateMediaIcons() {
    // Mic icons
    document.getElementById('mic-icon-on').style.display = isMicOn ? 'block' : 'none';
    document.getElementById('mic-icon-off').style.display = isMicOn ? 'none' : 'block';
    document.getElementById('btn-toggle-mic').classList.toggle('active', !isMicOn);

    // Camera icons
    document.getElementById('cam-icon-on').style.display = isCameraOn ? 'block' : 'none';
    document.getElementById('cam-icon-off').style.display = isCameraOn ? 'none' : 'block';
    document.getElementById('btn-toggle-camera').classList.toggle('active', !isCameraOn);
  }

  // ===================== SPEECH-TO-TEXT =====================
  function startListeningForAnswer() {
    if (!isMicOn) return;

    document.getElementById('mic-indicator').classList.add('active');
    document.getElementById('speech-transcript').classList.add('active');

    Speech.startListening((finalText, interimText) => {
      document.getElementById('transcript-final').textContent = finalText;
      document.getElementById('transcript-interim').textContent = interimText;
      // Also save to the hidden textarea
      document.getElementById('answer-input').value = finalText + interimText;
    });
  }

  function stopListeningForAnswer() {
    const finalAnswer = Speech.stopListening();
    document.getElementById('mic-indicator').classList.remove('active');

    // Capture whatever is in the transcript
    const accumulated = document.getElementById('answer-input').value.trim() || finalAnswer;
    return accumulated;
  }

  // ===================== SUBMIT ANSWER =====================
  async function submitAnswer() {
    // Stop listening and get transcript
    const answer = stopListeningForAnswer();

    if (!answer || answer.length < 5) {
      Animations.showToast('Please speak or provide a longer answer before submitting', 'error');
      // Resume listening
      startListeningForAnswer();
      return;
    }

    stopTimer();
    Animations.showLoading('Evaluating your answer...');

    // Calculate response time and filler words
    const responseTimeSeconds = Math.round((Date.now() - questionStartTime) / 1000);
    const fullAnswer = getFullAnswer();
    const detectedFillers = countFillerWords(fullAnswer);
    fillerWordCount += detectedFillers;

    try {
      const data = await API.evaluateAnswer(currentSessionId, currentQuestionNumber, fullAnswer, responseTimeSeconds, detectedFillers);
      const eval_ = data.evaluation;

      Animations.hideLoading();

      // Show evaluation overlay
      const evalCard = document.getElementById('evaluation-card');
      evalCard.classList.remove('hidden');

      // Animate score rings
      Animations.animateScoreRing('ring-clarity-fill', eval_.clarity);
      Animations.animateScoreRing('ring-accuracy-fill', eval_.accuracy);
      Animations.animateScoreRing('ring-communication-fill', eval_.communication);

      Animations.animateCounter(document.getElementById('score-clarity'), eval_.clarity);
      Animations.animateCounter(document.getElementById('score-accuracy'), eval_.accuracy);
      Animations.animateCounter(document.getElementById('score-communication'), eval_.communication);

      // Show confidence & quality if available
      const confEl = document.getElementById('score-confidence');
      const qualEl = document.getElementById('score-responseQuality');
      if (confEl) {
        Animations.animateScoreRing('ring-confidence-fill', eval_.confidence || 0);
        Animations.animateCounter(confEl, eval_.confidence || 0);
      }
      if (qualEl) {
        Animations.animateScoreRing('ring-quality-fill', eval_.responseQuality || 0);
        Animations.animateCounter(qualEl, eval_.responseQuality || 0);
      }

      // Show filler word count
      const fillerEl = document.getElementById('eval-filler-count');
      if (fillerEl) fillerEl.textContent = detectedFillers;

      // Show response time
      const timeEl = document.getElementById('eval-response-time');
      if (timeEl) timeEl.textContent = `${responseTimeSeconds}s`;

      // Show weakness targeting indicator
      const weakTargetEl = document.getElementById('eval-weakness-target');
      if (weakTargetEl && eval_.weaknessCategories && eval_.weaknessCategories.length > 0) {
        weakTargetEl.classList.remove('hidden');
        weakTargetEl.querySelector('.weakness-cats').textContent = eval_.weaknessCategories.join(', ');
      }

      // Strengths
      const strengthsList = document.getElementById('eval-strengths');
      strengthsList.innerHTML = '';
      eval_.strengths.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        strengthsList.appendChild(li);
      });

      // Weaknesses
      const weaknessesList = document.getElementById('eval-weaknesses');
      weaknessesList.innerHTML = '';
      eval_.weaknesses.forEach(w => {
        const li = document.createElement('li');
        li.textContent = w;
        weaknessesList.appendChild(li);
      });

      // Improved answer
      document.getElementById('eval-improved').textContent = eval_.improvedAnswer;

      // Avatar provides brief verbal feedback
      Avatar.setExpression('thinking');
      const avgScore = ((eval_.clarity + eval_.accuracy + eval_.communication) / 3).toFixed(1);
      let feedback;
      if (avgScore >= 7) {
        feedback = "Great answer! You demonstrated strong understanding. Let me review the detailed scores.";
        Avatar.setExpression('happy');
      } else if (avgScore >= 5) {
        feedback = "Good effort. There are some areas to improve. Check the feedback below.";
      } else {
        feedback = "Let's look at the feedback together. There are key areas we can work on.";
      }
      Speech.speak(feedback);

    } catch (error) {
      Animations.hideLoading();
      Animations.showToast('Failed to evaluate: ' + error.message, 'error');
      startListeningForAnswer();
    }
  }

  // ===================== NEXT QUESTION =====================
  async function nextQuestion() {
    // Hide evaluation overlay
    document.getElementById('evaluation-card').classList.add('hidden');

    Animations.showLoading('Preparing next question...');

    try {
      const data = await API.nextQuestion(currentSessionId);

      currentQuestionNumber = data.questionNumber;
      currentHint = data.hint || '';

      // Update UI
      document.getElementById('question-counter').textContent = `Q${currentQuestionNumber}`;
      document.getElementById('answer-input').value = '';
      document.getElementById('transcript-final').textContent = '';
      document.getElementById('transcript-interim').textContent = '';
      document.getElementById('question-hint').classList.add('hidden');

      // Clear notepad for next question
      document.getElementById('notepad-editor').value = '';
      updateLineNumbers();

      Animations.hideLoading();

      // Show question text
      document.getElementById('question-text').textContent = data.question;

      // Update time limit for pressure mode
      currentTimeLimit = data.timeLimitSeconds || 0;

      // Show weakness targeting badge if active
      const weakBadge = document.getElementById('weakness-target-badge');
      if (weakBadge) {
        if (data.isWeaknessTargeted) {
          weakBadge.classList.remove('hidden');
          weakBadge.textContent = '🎯 Targeting: ' + (data.identifiedWeaknesses || []).join(', ');
        } else {
          weakBadge.classList.add('hidden');
        }
      }

      // Avatar speaks the question
      Avatar.setExpression('neutral');
      const intro = currentQuestionNumber <= 2
        ? "Here's your next question."
        : "Moving on.";

      await Speech.speak(intro);
      await Speech.speak(data.question);

      startListeningForAnswer();
      startTimer();
      questionStartTime = Date.now();
      fillerWordCount = 0;

    } catch (error) {
      Animations.hideLoading();
      Animations.showToast('Failed to get next question: ' + error.message, 'error');
    }
  }

  // ===================== END INTERVIEW =====================
  async function endInterview() {
    stopTimer();
    stopListeningForAnswer();
    Speech.stopSpeaking();

    // Stop media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    Avatar.destroy();

    Animations.showLoading('Calculating your results...');

    try {
      const data = await API.completeInterview(currentSessionId);
      Animations.hideLoading();

      // Populate results
      document.getElementById('overall-score-value').textContent = '0';
      document.getElementById('result-company').textContent = data.company;
      document.getElementById('result-role').textContent = data.role;
      document.getElementById('result-questions-count').textContent = `${data.totalQuestions} Questions`;

      const score = data.overallScore;
      let label = 'Needs Improvement';
      if (score >= 8) label = 'Excellent Performance! 🌟';
      else if (score >= 6) label = 'Good Performance! 👍';
      else if (score >= 4) label = 'Average — Keep Practicing';
      document.getElementById('overall-score-label').textContent = label;

      // Hireability Score
      const hireEl = document.getElementById('hireability-score-value');
      if (hireEl) {
        Animations.animateCounter(hireEl, data.hireabilityScore || 0, 2, 0);
      }
      const hireRing = document.getElementById('hireability-ring-fill');
      if (hireRing) {
        const circumference = 60 * 2 * Math.PI;
        hireRing.style.strokeDasharray = circumference;
        hireRing.style.strokeDashoffset = circumference;
        const offset = circumference - ((data.hireabilityScore || 0) / 100) * circumference;
        gsap.to(hireRing, { strokeDashoffset: offset, duration: 2, ease: 'power2.out', delay: 0.5 });
        hireRing.style.stroke = (data.hireabilityScore || 0) >= 70 ? 'var(--accent-success)' :
          (data.hireabilityScore || 0) >= 40 ? 'var(--accent-warning)' : 'var(--accent-danger)';
      }

      // Hireability Assessment
      const assessEl = document.getElementById('hireability-assessment');
      if (assessEl && data.hireabilityAssessment) {
        assessEl.classList.remove('hidden');
        document.getElementById('hire-verdict').textContent = data.hireabilityAssessment.verdict || '';
        document.getElementById('hire-summary').textContent = data.hireabilityAssessment.summary || '';
        document.getElementById('hire-recommendation').textContent = data.hireabilityAssessment.recommendation || '';

        const strengthsEl = document.getElementById('hire-strengths');
        if (strengthsEl && data.hireabilityAssessment.topStrengths) {
          strengthsEl.innerHTML = data.hireabilityAssessment.topStrengths.map(s => `<li>${s}</li>`).join('');
        }
        const gapsEl = document.getElementById('hire-gaps');
        if (gapsEl && data.hireabilityAssessment.criticalGaps) {
          gapsEl.innerHTML = data.hireabilityAssessment.criticalGaps.map(g => `<li>${g}</li>`).join('');
        }
      }

      // Filler words & response time analytics
      const fillerTotal = document.getElementById('result-filler-words');
      if (fillerTotal) fillerTotal.textContent = data.totalFillerWords || 0;
      const avgTime = document.getElementById('result-avg-response-time');
      if (avgTime) avgTime.textContent = (data.averageResponseTime || 0) + 's';
      const weakList = document.getElementById('result-weakness-list');
      if (weakList && data.identifiedWeaknesses && data.identifiedWeaknesses.length > 0) {
        weakList.innerHTML = data.identifiedWeaknesses.map(w => `<span class="weakness-chip">${w}</span>`).join('');
      }

      App.navigateTo('results');

      setTimeout(() => {
        const overallRing = document.getElementById('overall-ring-fill');
        if (overallRing) {
          const circumference = 70 * 2 * Math.PI;
          overallRing.style.strokeDasharray = circumference;
          overallRing.style.strokeDashoffset = circumference;
          const offset = circumference - (score / 10) * circumference;
          gsap.to(overallRing, {
            strokeDashoffset: offset,
            duration: 2,
            ease: 'power2.out',
            delay: 0.5
          });
        }
        Animations.animateCounter(document.getElementById('overall-score-value'), score, 2);
      }, 300);

      // Populate questions
      const container = document.getElementById('results-questions');
      container.innerHTML = '';
      data.questions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'result-question-card glass-card';
        const scores = q.scores;
        const getClass = (s) => s >= 7 ? 'good' : s >= 5 ? 'average' : 'poor';
        card.innerHTML = `
          <h4>Question ${q.questionNumber}</h4>
          <p class="rq-question">${q.question}</p>
          <div class="rq-answer">${q.answer || '<em>No answer provided</em>'}</div>
          ${scores ? `
            <div class="rq-scores">
              <div class="rq-score-item">
                <span class="rq-score-value ${getClass(scores.clarity)}">${scores.clarity}</span>
                <span class="rq-score-label">Clarity</span>
              </div>
              <div class="rq-score-item">
                <span class="rq-score-value ${getClass(scores.accuracy)}">${scores.accuracy}</span>
                <span class="rq-score-label">Accuracy</span>
              </div>
              <div class="rq-score-item">
                <span class="rq-score-value ${getClass(scores.communication)}">${scores.communication}</span>
                <span class="rq-score-label">Communication</span>
              </div>
              <div class="rq-score-item">
                <span class="rq-score-value ${getClass(scores.average)}">${scores.average}</span>
                <span class="rq-score-label">Average</span>
              </div>
            </div>
          ` : '<p class="empty-state">Not evaluated</p>'}
        `;
        container.appendChild(card);
        gsap.fromTo(card,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, delay: 0.2 + index * 0.1, ease: 'power2.out' }
        );
      });

    } catch (error) {
      Animations.hideLoading();
      Animations.showToast('Failed to complete interview: ' + error.message, 'error');
    }
  }

  // ===================== HINT =====================
  function toggleHint() {
    const hintEl = document.getElementById('question-hint');
    const hintText = document.getElementById('hint-text');
    if (hintEl.classList.contains('hidden')) {
      hintText.textContent = currentHint || 'No hint available for this question.';
      hintEl.classList.remove('hidden');
    } else {
      hintEl.classList.add('hidden');
    }
  }

  // ===================== NOTEPAD =====================
  function initNotepad() {
    const editor = document.getElementById('notepad-editor');
    const lineNumbers = document.getElementById('notepad-line-numbers');

    // Update line numbers on input
    editor.addEventListener('input', () => {
      updateLineNumbers();
      updateCursorInfo();
    });

    // Sync scroll between editor and line numbers
    editor.addEventListener('scroll', () => {
      lineNumbers.scrollTop = editor.scrollTop;
    });

    // Track cursor position
    editor.addEventListener('click', updateCursorInfo);
    editor.addEventListener('keyup', updateCursorInfo);

    // Tab key support
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });
  }

  function updateLineNumbers() {
    const editor = document.getElementById('notepad-editor');
    const lineNumbers = document.getElementById('notepad-line-numbers');
    const lines = editor.value.split('\n');
    const count = Math.max(lines.length, 1);

    lineNumbers.innerHTML = '';
    for (let i = 1; i <= count; i++) {
      const span = document.createElement('span');
      span.textContent = i;
      lineNumbers.appendChild(span);
    }
  }

  function updateCursorInfo() {
    const editor = document.getElementById('notepad-editor');
    const pos = editor.selectionStart;
    const text = editor.value.substring(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    document.getElementById('notepad-info').textContent = `Ln ${line}, Col ${col}`;
  }

  function toggleNotepad() {
    const panel = document.getElementById('notepad-panel');
    const btn = document.getElementById('btn-toggle-notepad');
    isNotepadOpen = !isNotepadOpen;

    if (isNotepadOpen) {
      panel.classList.remove('hidden');
      btn.classList.add('active');
      // Animate slide in
      gsap.fromTo(panel,
        { height: 0, opacity: 0 },
        { height: 260, opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      // Focus editor
      setTimeout(() => {
        document.getElementById('notepad-editor').focus();
      }, 300);
    } else {
      btn.classList.remove('active');
      gsap.to(panel, {
        height: 0,
        opacity: 0,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          panel.classList.add('hidden');
          panel.style.height = '';
          panel.style.opacity = '';
        }
      });
    }
  }

  function clearNotepad() {
    const editor = document.getElementById('notepad-editor');
    editor.value = '';
    updateLineNumbers();
    updateCursorInfo();
    editor.focus();
  }

  /**
   * Combine spoken answer + notepad code into a single answer string
   */
  function getFullAnswer() {
    const spokenAnswer = document.getElementById('answer-input').value.trim();
    const code = document.getElementById('notepad-editor').value.trim();
    const lang = document.getElementById('notepad-lang').value;

    let fullAnswer = spokenAnswer;

    if (code) {
      fullAnswer += `\n\n[Code (${lang})]:\n${code}`;
    }

    return fullAnswer;
  }

  // ===================== TIMER =====================
  function startTimer() {
    timerSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();

      // Pressure mode auto-submit
      if (currentTimeLimit > 0 && timerSeconds >= currentTimeLimit) {
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.classList.add('timer-expired');
        Animations.showToast('⏰ Time\'s up! Auto-submitting...', 'error');
        submitAnswer();
      }
      // Pressure mode warning at 75% time
      if (currentTimeLimit > 0 && timerSeconds === Math.floor(currentTimeLimit * 0.75)) {
        Animations.showToast('⚠️ 25% time remaining!', 'error');
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function updateTimerDisplay() {
    const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const s = (timerSeconds % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('timer-display');
    timerEl.textContent = currentTimeLimit > 0
      ? `${m}:${s} / ${Math.floor(currentTimeLimit/60).toString().padStart(2,'0')}:${(currentTimeLimit%60).toString().padStart(2,'0')}`
      : `${m}:${s}`;
  }

  // ===================== RESET =====================
  function resetSetup() {
    selectedRole = null;
    selectedCompany = null;
    selectedDifficulty = null;
    selectedMode = 'normal';
    currentSessionId = null;
    currentQuestionNumber = 0;
    candidateResumeFile = null;
    currentTimeLimit = 0;
    fillerWordCount = 0;
    questionStartTime = 0;
    stopTimer();

    // Stop media
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-begin-interview').disabled = true;
    document.getElementById('setup-hint').textContent = 'Please select a role, company, difficulty and fill your profile to continue';
    document.getElementById('setup-hint').style.color = '';

    // Reset custom role/company inputs
    document.getElementById('custom-role-input').value = '';
    document.getElementById('custom-role-wrapper').classList.add('hidden');
    document.getElementById('custom-company-input').value = '';
    document.getElementById('custom-company-wrapper').classList.add('hidden');

    // Reset candidate profile fields
    document.getElementById('candidate-university').value = '';
    document.getElementById('candidate-passout-year').value = '';
    document.getElementById('candidate-dob').value = '';
    document.getElementById('candidate-experience').value = '';
    document.getElementById('candidate-company').value = '';

    // Reset resume upload zone
    const uploadZone = document.getElementById('setup-resume-zone');
    if (uploadZone) {
      uploadZone.classList.remove('uploaded');
      document.getElementById('setup-upload-content').classList.remove('hidden');
      document.getElementById('setup-upload-success').classList.add('hidden');
      document.getElementById('setup-resume-input').value = '';
    }
  }

  return { init };
})();
