/**
 * App Controller — Main SPA router, auth integration, and initialization
 */
const App = (() => {
  // Section mapping
  const SECTIONS = {
    landing: 'landing-section',
    setup: 'setup-section',
    interview: 'interview-section',
    results: 'results-section',
    resume: 'resume-section',
    dashboard: 'dashboard-section',
    help: 'help-section'
  };

  let currentSection = 'auth';

  /**
   * Initialize the application
   */
  async function init() {
    // Initialize Three.js scene
    ThreeScene.init();

    // Initialize all modules
    Landing.init();
    Interview.init();
    ResumeAnalyzer.init();
    Dashboard.init();

    // Initialize tilt effects
    setTimeout(() => Animations.initTiltEffects(), 500);

    // Nav bar links (desktop)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const target = link.dataset.nav;
        if (target) navigateTo(target);
      });
    });

    // Mobile hamburger menu
    initMobileNav();

    // Help back button
    document.getElementById('btn-back-help').addEventListener('click', () => {
      navigateTo('landing');
    });

    // Initialize Auth — check for existing session
    const hasSession = await Auth.init();
    if (hasSession) {
      const user = Auth.getUser();
      showAppAfterAuth(user);
    }

    console.log('🎯 IntervueX initialized');
  }

  /**
   * Called after successful auth (login/signup or session restore)
   */
  function showAppAfterAuth(user) {
    // Hide auth section
    const authSection = document.getElementById('auth-section');
    authSection.classList.add('hidden');
    authSection.style.display = 'none';

    // Show nav
    const nav = document.getElementById('app-nav');
    nav.classList.remove('hidden');
    document.getElementById('nav-user-name').textContent = user.name;
    document.getElementById('nav-user-avatar').textContent = user.name.charAt(0).toUpperCase();

    // Sync mobile nav user info
    syncMobileUserInfo(user);

    // Show landing
    const landingSection = document.getElementById('landing-section');
    landingSection.classList.remove('hidden');
    landingSection.style.display = '';
    landingSection.style.opacity = '1';
    currentSection = 'landing';

    animateLandingEntrance();
  }

  /**
   * Animate the landing page entrance
   */
  function animateLandingEntrance() {
    const elements = [
      '.hero-badge',
      '.hero-title',
      '.hero-subtitle',
      '.hero-actions',
      '.hero-stats'
    ];

    elements.forEach((selector, i) => {
      const el = document.querySelector(selector);
      if (el) {
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.7, delay: 0.3 + i * 0.15, ease: 'power2.out' }
        );
      }
    });
  }

  /**
   * Navigate to a section
   */
  function navigateTo(sectionName) {
    if (!SECTIONS[sectionName]) return;
    if (sectionName === currentSection) return;

    const fromId = SECTIONS[currentSection];
    const toId = SECTIONS[sectionName];

    // Camera transition based on section
    const cameraPositions = {
      landing: 400,
      setup: 350,
      interview: 300,
      results: 300,
      resume: 350,
      dashboard: 380,
      help: 400
    };

    ThreeScene.transitionCamera(cameraPositions[sectionName] || 400);

    Animations.transitionSection(fromId, toId, () => {
      // Post-transition actions
      if (sectionName === 'dashboard') {
        Dashboard.load();
      }
      // Re-init tilt effects for new section
      setTimeout(() => Animations.initTiltEffects(), 300);
    });

    currentSection = sectionName;

    // Update nav active state (desktop)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === sectionName);
    });

    // Update nav active state (mobile)
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === sectionName);
    });
  }

  /**
   * Require user to be logged in — always returns user from Auth
   */
  function requireUser(callback) {
    if (Auth.isLoggedIn()) {
      callback();
    }
  }

  /**
   * Get current user
   */
  function getUser() {
    return Auth.getUser();
  }

  /**
   * Initialize mobile navigation hamburger menu
   */
  function initMobileNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const mobileDropdown = document.getElementById('nav-mobile-dropdown');

    if (!hamburger || !mobileDropdown) return;

    // Toggle hamburger
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileDropdown.classList.toggle('open');
    });

    // Mobile nav links
    mobileDropdown.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const target = link.dataset.nav;
        if (target) {
          navigateTo(target);
          closeMobileNav();
        }
      });
    });

    // Mobile logout
    const logoutMobile = document.getElementById('btn-logout-mobile');
    if (logoutMobile) {
      logoutMobile.addEventListener('click', () => {
        closeMobileNav();
        Auth.logout();
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileDropdown.contains(e.target)) {
        closeMobileNav();
      }
    });
  }

  /**
   * Close mobile navigation dropdown
   */
  function closeMobileNav() {
    const hamburger = document.getElementById('nav-hamburger');
    const mobileDropdown = document.getElementById('nav-mobile-dropdown');
    if (hamburger) hamburger.classList.remove('active');
    if (mobileDropdown) mobileDropdown.classList.remove('open');
  }

  /**
   * Sync mobile nav user info
   */
  function syncMobileUserInfo(user) {
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const mobileName = document.getElementById('mobile-user-name');
    if (mobileAvatar) mobileAvatar.textContent = user.name.charAt(0).toUpperCase();
    if (mobileName) mobileName.textContent = user.name;
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    navigateTo,
    requireUser,
    getUser,
    closeMobileNav,
    syncMobileUserInfo
  };
})();
