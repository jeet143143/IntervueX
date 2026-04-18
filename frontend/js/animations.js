/**
 * GSAP Animations Module
 * Page transitions, typing effects, score animations, and UI micro-interactions
 */
const Animations = (() => {

  /**
   * Transition between sections with GSAP
   */
  function transitionSection(fromId, toId, callback) {
    const fromEl = document.getElementById(fromId);
    const toEl = document.getElementById(toId);

    if (!fromEl || !toEl) return;

    // Create transition glow effect
    const glow = document.createElement('div');
    glow.className = 'section-transition-glow';
    document.body.appendChild(glow);
    setTimeout(() => glow.remove(), 800);

    // Fade out current section
    gsap.to(fromEl, {
      opacity: 0,
      y: -30,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        fromEl.classList.add('hidden');
        fromEl.style.display = 'none';
        fromEl.style.opacity = '';
        fromEl.style.transform = '';

        // Show new section
        toEl.classList.remove('hidden');
        toEl.style.display = '';
        toEl.style.opacity = '0';

        // Fade in new section
        gsap.fromTo(toEl,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => {
              toEl.style.opacity = '';
              toEl.style.transform = '';
              // Animate children with stagger
              animateChildren(toEl);
              if (callback) callback();
            }
          }
        );
      }
    });
  }

  /**
   * Staggered entrance animation for section children
   */
  function animateChildren(parentEl) {
    const cards = parentEl.querySelectorAll('.glass-card, .stat-item, .hero-badge, .hero-title, .hero-subtitle, .hero-actions, .hero-stats');

    if (cards.length > 0) {
      gsap.fromTo(cards,
        { opacity: 0, y: 20, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out'
        }
      );
    }
  }

  /**
   * Typing animation for AI questions
   */
  function typeText(element, text, speed = 25) {
    return new Promise((resolve) => {
      element.innerHTML = '';
      const cursor = document.createElement('span');
      cursor.className = 'typing-cursor';

      let i = 0;
      element.appendChild(cursor);

      function type() {
        if (i < text.length) {
          // Insert character before cursor
          const char = document.createTextNode(text.charAt(i));
          element.insertBefore(char, cursor);
          i++;
          setTimeout(type, speed);
        } else {
          // Remove cursor after typing
          setTimeout(() => {
            cursor.remove();
            resolve();
          }, 500);
        }
      }

      type();
    });
  }

  /**
   * Animate score ring fill
   * @param {string} ringId - ID of the ring-fill circle element
   * @param {number} score - Score value (0-10)
   * @param {number} maxScore - Maximum score
   */
  function animateScoreRing(ringId, score, maxScore = 10) {
    const ring = document.getElementById(ringId);
    if (!ring) return;

    const circumference = parseFloat(ring.getAttribute('r')) * 2 * Math.PI;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;

    const offset = circumference - (score / maxScore) * circumference;

    gsap.to(ring, {
      strokeDashoffset: offset,
      duration: 1.5,
      ease: 'power2.out',
      delay: 0.3
    });
  }

  /**
   * Animated counter (e.g., score roll-up)
   */
  function animateCounter(element, targetValue, duration = 1.5, decimals = 1) {
    const obj = { value: 0 };

    gsap.to(obj, {
      value: targetValue,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = decimals > 0
          ? obj.value.toFixed(decimals)
          : Math.round(obj.value);
      }
    });
  }

  /**
   * Show element with animation
   */
  function showElement(element, animation = 'fadeIn') {
    element.classList.remove('hidden');

    switch (animation) {
      case 'fadeIn':
        gsap.fromTo(element,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        break;
      case 'scaleIn':
        gsap.fromTo(element,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }
        );
        break;
      case 'slideUp':
        gsap.fromTo(element,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );
        break;
    }
  }

  /**
   * Hide element with animation
   */
  function hideElement(element, animation = 'fadeOut') {
    return new Promise((resolve) => {
      gsap.to(element, {
        opacity: 0,
        y: animation === 'slideDown' ? 20 : 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          element.classList.add('hidden');
          element.style.opacity = '';
          element.style.transform = '';
          resolve();
        }
      });
    });
  }

  /**
   * Button press animation
   */
  function buttonPress(button) {
    gsap.timeline()
      .to(button, { scale: 0.95, duration: 0.1 })
      .to(button, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
  }

  /**
   * Toast notification
   */
  function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Loading state
   */
  function showLoading(text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const loaderText = document.getElementById('loader-text');
    if (overlay) {
      if (loaderText) loaderText.textContent = text;
      overlay.classList.remove('hidden');
      ThreeScene.setIntensity(0.8);
    }
  }

  function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      ThreeScene.setIntensity(0.2);
    }
  }

  /**
   * Hover tilt effect for cards (subtle 3D)
   */
  function initTiltEffects() {
    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -3;
        const rotateY = (x - centerX) / centerX * 3;

        gsap.to(card, {
          rotateX,
          rotateY,
          transformPerspective: 1000,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    });
  }

  return {
    transitionSection,
    animateChildren,
    typeText,
    animateScoreRing,
    animateCounter,
    showElement,
    hideElement,
    buttonPress,
    showToast,
    showLoading,
    hideLoading,
    initTiltEffects
  };
})();
