/**
 * Auth Module — Login / Signup / Session management
 */
const Auth = (() => {
  const TOKEN_KEY = 'interview_coach_token';
  const USER_KEY = 'interview_coach_user';
  let currentUser = null;

  function init() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchTab(target);
      });
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Signup form
    document.getElementById('signup-form').addEventListener('submit', handleSignup);

    // Logout button
    document.getElementById('btn-logout').addEventListener('click', logout);

    // Password visibility toggles
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.textContent = isPassword ? '🙈' : '👁️';
      });
    });

    // Try to restore session
    return restoreSession();
  }

  function switchTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.getElementById('login-form-container').style.display = tabName === 'login' ? 'block' : 'none';
    document.getElementById('signup-form-container').style.display = tabName === 'signup' ? 'block' : 'none';

    // Clear errors
    document.getElementById('login-error').textContent = '';
    document.getElementById('signup-error').textContent = '';
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('btn-login');

    errorEl.textContent = '';
    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      saveSession(data.token, data.user);
      onAuthSuccess(data.user);

    } catch (error) {
      errorEl.textContent = error.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    const errorEl = document.getElementById('signup-error');
    const btn = document.getElementById('btn-signup');

    errorEl.textContent = '';

    if (!name || !email || !password || !confirm) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }

    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.';
      return;
    }

    if (password !== confirm) {
      errorEl.textContent = 'Passwords do not match.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      saveSession(data.token, data.user);
      onAuthSuccess(data.user);

    } catch (error) {
      errorEl.textContent = error.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    currentUser = user;
  }

  async function restoreSession() {
    const token = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (!token || !savedUser) return false;

    try {
      currentUser = JSON.parse(savedUser);

      // Validate token with server
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        return true;
      } else {
        clearSession();
        return false;
      }
    } catch (e) {
      clearSession();
      return false;
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    currentUser = null;
  }

  function logout() {
    clearSession();

    // Close mobile nav if open
    if (typeof App !== 'undefined' && App.closeMobileNav) {
      App.closeMobileNav();
    }

    // Hide mobile dropdown
    const mobileDropdown = document.getElementById('nav-mobile-dropdown');
    if (mobileDropdown) mobileDropdown.classList.remove('open');

    // Show auth section, hide everything else
    document.querySelectorAll('.section').forEach(s => {
      s.classList.add('hidden');
      s.style.display = 'none';
      s.style.opacity = '0';
    });

    const authSection = document.getElementById('auth-section');
    authSection.classList.remove('hidden');
    authSection.style.display = '';
    authSection.style.opacity = '1';

    // Hide nav bar
    document.getElementById('app-nav').classList.add('hidden');

    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('signup-form').reset();
    document.getElementById('login-error').textContent = '';
    document.getElementById('signup-error').textContent = '';

    Animations.showToast('Logged out successfully', 'success');
  }

  function onAuthSuccess(user) {
    currentUser = user;

    // Hide auth section, show landing
    const authSection = document.getElementById('auth-section');
    authSection.classList.add('hidden');
    authSection.style.display = 'none';

    const landingSection = document.getElementById('landing-section');
    landingSection.classList.remove('hidden');
    landingSection.style.display = '';
    landingSection.style.opacity = '1';

    // Show nav bar
    document.getElementById('app-nav').classList.remove('hidden');
    document.getElementById('nav-user-name').textContent = user.name;

    // Sync mobile nav user info
    if (typeof App !== 'undefined' && App.syncMobileUserInfo) {
      App.syncMobileUserInfo(user);
    }

    Animations.showToast(`Welcome, ${user.name}! 🎉`, 'success');
  }

  function getUser() {
    return currentUser;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return !!currentUser && !!localStorage.getItem(TOKEN_KEY);
  }

  return {
    init,
    getUser,
    getToken,
    isLoggedIn,
    logout,
    onAuthSuccess
  };
})();
