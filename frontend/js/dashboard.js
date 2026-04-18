/**
 * Dashboard Logic
 * Loads user stats, renders charts, shows recent sessions and weak areas
 */
const Dashboard = (() => {
  let trendsChart = null;
  let categoryChart = null;

  function init() {
    document.getElementById('btn-back-dashboard').addEventListener('click', () => {
      App.navigateTo('landing');
    });
  }

  /**
   * Load and render dashboard data
   */
  async function load() {
    const user = App.getUser();
    if (!user) return;

    try {
      const [dashData, trendsData] = await Promise.all([
        API.getDashboard(user.email),
        API.getTrends(user.email)
      ]);

      renderStats(dashData.stats);
      renderTrendsChart(trendsData.trends);
      renderCategoryChart(dashData.stats.categoryScores);
      renderWeakAreas(dashData.stats.topWeaknesses);
      renderRecentSessions(dashData.recentSessions);

    } catch (error) {
      console.error('Dashboard load error:', error);
      Animations.showToast('Failed to load dashboard data', 'error');
    }
  }

  /**
   * Render stat cards with animated counters
   */
  function renderStats(stats) {
    const totalEl = document.getElementById('dash-total-interviews');
    const questionsEl = document.getElementById('dash-total-questions');
    const avgEl = document.getElementById('dash-avg-score');

    Animations.animateCounter(totalEl, stats.totalInterviews, 1, 0);
    Animations.animateCounter(questionsEl, stats.totalQuestions, 1, 0);
    Animations.animateCounter(avgEl, stats.averageScore, 1.5);
  }

  /**
   * Render score trends line chart
   */
  function renderTrendsChart(trends) {
    const ctx = document.getElementById('trends-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (trendsChart) trendsChart.destroy();

    if (trends.length === 0) {
      // Show empty state
      ctx.parentElement.innerHTML = '<h3>Score Trends</h3><p class="empty-state">Complete interviews to see your progress over time</p>';
      return;
    }

    const labels = trends.map((t, i) => `Session ${i + 1}`);
    const overallScores = trends.map(t => t.overallScore);
    const clarityScores = trends.map(t => t.categoryScores.clarity);
    const accuracyScores = trends.map(t => t.categoryScores.accuracy);
    const commScores = trends.map(t => t.categoryScores.communication);

    trendsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Overall',
            data: overallScores,
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#00d4ff',
            pointRadius: 4
          },
          {
            label: 'Clarity',
            data: clarityScores,
            borderColor: '#00e88f',
            borderWidth: 1.5,
            tension: 0.4,
            borderDash: [5, 5],
            pointRadius: 2
          },
          {
            label: 'Accuracy',
            data: accuracyScores,
            borderColor: '#7b61ff',
            borderWidth: 1.5,
            tension: 0.4,
            borderDash: [5, 5],
            pointRadius: 2
          },
          {
            label: 'Communication',
            data: commScores,
            borderColor: '#ff6bdf',
            borderWidth: 1.5,
            tension: 0.4,
            borderDash: [5, 5],
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 10,
            grid: {
              color: 'rgba(255, 255, 255, 0.04)'
            },
            ticks: {
              color: 'rgba(240, 240, 255, 0.5)',
              font: { family: 'Inter' }
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.02)'
            },
            ticks: {
              color: 'rgba(240, 240, 255, 0.5)',
              font: { family: 'Inter' }
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: 'rgba(240, 240, 255, 0.7)',
              font: { family: 'Inter', size: 12 },
              usePointStyle: true,
              padding: 20
            }
          }
        }
      }
    });
  }

  /**
   * Render category breakdown radar chart
   */
  function renderCategoryChart(scores) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Clarity', 'Technical Accuracy', 'Communication'],
        datasets: [{
          label: 'Average Scores',
          data: [scores.clarity, scores.accuracy, scores.communication],
          backgroundColor: 'rgba(0, 212, 255, 0.15)',
          borderColor: '#00d4ff',
          borderWidth: 2,
          pointBackgroundColor: ['#00d4ff', '#7b61ff', '#ff6bdf'],
          pointRadius: 5,
          pointBorderWidth: 2,
          pointBorderColor: '#0a0a1f'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            grid: {
              color: 'rgba(255, 255, 255, 0.06)'
            },
            angleLines: {
              color: 'rgba(255, 255, 255, 0.06)'
            },
            pointLabels: {
              color: 'rgba(240, 240, 255, 0.7)',
              font: { family: 'Inter', size: 12 }
            },
            ticks: {
              color: 'rgba(240, 240, 255, 0.4)',
              backdropColor: 'transparent',
              font: { family: 'Inter', size: 10 }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  /**
   * Render weak areas list
   */
  function renderWeakAreas(weaknesses) {
    const container = document.getElementById('weak-areas-list');
    container.innerHTML = '';

    if (!weaknesses || weaknesses.length === 0) {
      container.innerHTML = '<p class="empty-state">No weak areas identified yet</p>';
      return;
    }

    weaknesses.forEach((w, i) => {
      const item = document.createElement('div');
      item.className = 'weak-area-item';
      item.innerHTML = `
        <span class="wa-text">${w.weakness}</span>
        <span class="wa-count">${w.occurrences}x</span>
      `;
      container.appendChild(item);

      gsap.fromTo(item,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, delay: i * 0.1, ease: 'power2.out' }
      );
    });
  }

  /**
   * Render recent sessions list
   */
  function renderRecentSessions(sessions) {
    const container = document.getElementById('sessions-list');
    container.innerHTML = '';

    if (!sessions || sessions.length === 0) {
      container.innerHTML = '<p class="empty-state">No interviews yet. Start one to track your progress!</p>';
      return;
    }

    sessions.forEach((s, i) => {
      const item = document.createElement('div');
      item.className = 'session-item';

      const date = new Date(s.completedAt || s.createdAt);
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const scoreClass = s.overallScore >= 7 ? 'good' : s.overallScore >= 5 ? 'average' : 'poor';

      item.innerHTML = `
        <div class="session-info">
          <span class="session-company">${s.company}</span>
          <span class="session-role">${s.role} · ${s.difficulty}</span>
        </div>
        <div style="text-align: right;">
          <span class="session-score rq-score-value ${scoreClass}">${s.overallScore}/10</span>
          <span class="session-date">${dateStr}</span>
        </div>
      `;

      container.appendChild(item);

      gsap.fromTo(item,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, delay: i * 0.08, ease: 'power2.out' }
      );
    });
  }

  return { init, load };
})();
