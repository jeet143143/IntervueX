/**
 * Career Guidance Module
 * AI-powered career counselor with context-aware guidance
 */
const CareerGuidance = (() => {
  let chatHistory = [];
  let isLoading = false;

  function init() {
    const btnBack = document.getElementById('btn-back-career');
    const btnSend = document.getElementById('career-send-btn');
    const input = document.getElementById('career-input');

    btnBack.addEventListener('click', () => {
      App.navigateTo('landing');
    });

    btnSend.addEventListener('click', sendMessage);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Load topic suggestions
    loadTopics();
  }

  async function loadTopics() {
    try {
      const data = await API.getCareerTopics();
      const container = document.getElementById('career-topics');
      container.innerHTML = '';

      data.topics.forEach((topic, i) => {
        const chip = document.createElement('button');
        chip.className = 'career-topic-chip';
        chip.textContent = topic.label;
        chip.addEventListener('click', () => {
          document.getElementById('career-input').value = topic.prompt;
          sendMessage();
        });
        container.appendChild(chip);

        // Animate in
        gsap.fromTo(chip,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.3, delay: i * 0.05, ease: 'back.out(1.5)' }
        );
      });
    } catch (error) {
      console.warn('Failed to load career topics:', error);
    }
  }

  async function sendMessage() {
    if (isLoading) return;

    const input = document.getElementById('career-input');
    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message to chat
    addChatMessage('user', message);

    // Show loading
    isLoading = true;
    const loadingId = addLoadingMessage();

    try {
      const user = App.getUser();
      const data = await API.getCareerGuidance(message, user?.email);
      const guidance = data.guidance;

      // Remove loading
      removeLoadingMessage(loadingId);

      // Add AI response
      addChatMessage('ai', guidance.response, {
        actionItems: guidance.actionItems,
        resources: guidance.resources,
        relatedTopics: guidance.relatedTopics
      });

      // Store in history
      chatHistory.push({ role: 'user', content: message });
      chatHistory.push({ role: 'ai', content: guidance.response });

    } catch (error) {
      removeLoadingMessage(loadingId);
      addChatMessage('ai', 'I apologize, but I encountered an error generating guidance. Please try again.');
      Animations.showToast('Career guidance error: ' + error.message, 'error');
    }

    isLoading = false;
  }

  function addChatMessage(role, content, extras = {}) {
    const container = document.getElementById('career-chat-messages');
    const msg = document.createElement('div');
    msg.className = `career-msg career-msg-${role}`;

    let html = '';

    if (role === 'user') {
      html = `
        <div class="career-msg-avatar">👤</div>
        <div class="career-msg-content">
          <p>${escapeHtml(content)}</p>
        </div>`;
    } else {
      // Format AI response with markdown-like rendering
      const formattedContent = formatAIResponse(content);

      html = `
        <div class="career-msg-avatar">🤖</div>
        <div class="career-msg-content">
          <div class="career-ai-response">${formattedContent}</div>`;

      // Action items
      if (extras.actionItems && extras.actionItems.length > 0) {
        html += `<div class="career-action-items">
          <h4>📋 Action Items</h4>
          <ul>${extras.actionItems.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
        </div>`;
      }

      // Resources
      if (extras.resources && extras.resources.length > 0) {
        html += `<div class="career-resources">
          <h4>📚 Recommended Resources</h4>
          <div class="career-resource-list">
            ${extras.resources.map(r => `
              <a href="${r.url || '#'}" target="_blank" rel="noopener" class="career-resource-item">
                <span class="resource-type">${getResourceIcon(r.type)}</span>
                <span class="resource-name">${escapeHtml(r.name)}</span>
              </a>`).join('')}
          </div>
        </div>`;
      }

      // Related topics
      if (extras.relatedTopics && extras.relatedTopics.length > 0) {
        html += `<div class="career-related">
          <span class="related-label">Related:</span>
          ${extras.relatedTopics.map(t =>
            `<button class="career-related-chip" onclick="document.getElementById('career-input').value='Tell me more about ${t}'">${t}</button>`
          ).join('')}
        </div>`;
      }

      html += `</div>`;
    }

    msg.innerHTML = html;
    container.appendChild(msg);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Animate in
    gsap.fromTo(msg,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
    );
  }

  function addLoadingMessage() {
    const container = document.getElementById('career-chat-messages');
    const id = 'loading-' + Date.now();
    const msg = document.createElement('div');
    msg.className = 'career-msg career-msg-ai career-msg-loading';
    msg.id = id;
    msg.innerHTML = `
      <div class="career-msg-avatar">🤖</div>
      <div class="career-msg-content">
        <div class="career-typing">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function formatAIResponse(text) {
    // Basic markdown-like formatting
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function getResourceIcon(type) {
    const icons = {
      'course': '🎓',
      'book': '📖',
      'platform': '🌐',
      'article': '📰',
      'video': '🎥',
      'tool': '🛠️'
    };
    return icons[type] || '📎';
  }

  return { init };
})();
