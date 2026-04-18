/**
 * Landing Page Logic
 */
const Landing = (() => {

  function init() {
    const btnStartInterview = document.getElementById('btn-start-interview');
    const btnResumeAnalyzer = document.getElementById('btn-resume-analyzer');
    const btnDashboard = document.getElementById('btn-dashboard');

    // Start Interview → go to setup (user already logged in)
    btnStartInterview.addEventListener('click', () => {
      Animations.buttonPress(btnStartInterview);
      App.navigateTo('setup');
    });

    // Resume Analyzer
    btnResumeAnalyzer.addEventListener('click', () => {
      Animations.buttonPress(btnResumeAnalyzer);
      App.navigateTo('resume');
    });

    // Dashboard
    btnDashboard.addEventListener('click', () => {
      Animations.buttonPress(btnDashboard);
      App.navigateTo('dashboard');
    });
  }

  return { init };
})();
