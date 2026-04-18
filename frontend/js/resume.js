/**
 * Resume Analyzer Logic
 * Handles PDF upload, drag-and-drop, API calls, and displaying analysis
 */
const ResumeAnalyzer = (() => {
  let selectedFile = null;

  function init() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('resume-file-input');
    const btnAnalyze = document.getElementById('btn-analyze-resume');
    const btnRemove = document.getElementById('btn-remove-file');
    const btnBack = document.getElementById('btn-back-resume');

    // Click to browse
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Remove file
    btnRemove.addEventListener('click', removeFile);

    // Analyze button
    btnAnalyze.addEventListener('click', analyzeResume);

    // Back button
    btnBack.addEventListener('click', () => {
      App.navigateTo('landing');
    });
  }

  /**
   * Handle file selection
   */
  function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
      Animations.showToast('Please select a PDF file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      Animations.showToast('File size must be under 5MB', 'error');
      return;
    }

    selectedFile = file;

    // Update UI
    document.getElementById('upload-zone').style.display = 'none';
    const selectedEl = document.getElementById('upload-selected');
    selectedEl.classList.remove('hidden');
    document.getElementById('selected-file-name').textContent = file.name;
    document.getElementById('btn-analyze-resume').disabled = false;

    Animations.showToast('File selected: ' + file.name, 'success');
  }

  /**
   * Remove selected file
   */
  function removeFile() {
    selectedFile = null;
    document.getElementById('upload-zone').style.display = '';
    document.getElementById('upload-selected').classList.add('hidden');
    document.getElementById('resume-file-input').value = '';
    document.getElementById('btn-analyze-resume').disabled = true;
  }

  /**
   * Upload and analyze resume
   */
  async function analyzeResume() {
    if (!selectedFile) return;

    const user = App.getUser();
    const targetRole = document.getElementById('resume-target-role').value;

    Animations.showLoading('Analyzing your resume...');

    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      formData.append('email', user.email);
      formData.append('targetRole', targetRole);

      const data = await API.uploadResume(formData);
      const analysis = data.analysis;

      Animations.hideLoading();

      // Show results
      const resultsEl = document.getElementById('resume-results');
      resultsEl.classList.remove('hidden');
      Animations.showElement(resultsEl, 'slideUp');

      // ATS Score ring
      const atsRingFill = document.getElementById('ats-ring-fill');
      if (atsRingFill) {
        const circumference = 60 * 2 * Math.PI;
        atsRingFill.style.strokeDasharray = circumference;
        atsRingFill.style.strokeDashoffset = circumference;

        const offset = circumference - (analysis.atsScore / 100) * circumference;

        // Color based on score
        if (analysis.atsScore >= 70) {
          atsRingFill.style.stroke = 'var(--accent-success)';
        } else if (analysis.atsScore >= 50) {
          atsRingFill.style.stroke = 'var(--accent-warning)';
        } else {
          atsRingFill.style.stroke = 'var(--accent-danger)';
        }

        gsap.to(atsRingFill, {
          strokeDashoffset: offset,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.3
        });
      }

      // ATS Score counter
      Animations.animateCounter(
        document.getElementById('ats-score-value'),
        analysis.atsScore,
        1.5,
        0
      );

      // Score label
      let label = 'Needs significant improvement';
      if (analysis.atsScore >= 80) label = 'Excellent ATS compatibility! 🌟';
      else if (analysis.atsScore >= 60) label = 'Good — minor improvements needed';
      else if (analysis.atsScore >= 40) label = 'Fair — several areas to improve';
      document.getElementById('ats-score-label').textContent = label;

      // Strengths
      const strengthsList = document.getElementById('resume-strengths');
      strengthsList.innerHTML = '';
      analysis.strengths.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        strengthsList.appendChild(li);
      });

      // Missing keywords
      const keywordsEl = document.getElementById('resume-keywords');
      keywordsEl.innerHTML = '';
      analysis.missingKeywords.forEach(k => {
        const chip = document.createElement('span');
        chip.className = 'keyword-chip';
        chip.textContent = k;
        keywordsEl.appendChild(chip);
      });

      // Suggestions
      const suggestionsList = document.getElementById('resume-suggestions');
      suggestionsList.innerHTML = '';
      analysis.suggestions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        suggestionsList.appendChild(li);
      });

      // Scroll to results
      resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (error) {
      Animations.hideLoading();
      Animations.showToast('Failed to analyze resume: ' + error.message, 'error');
    }
  }

  return { init };
})();
