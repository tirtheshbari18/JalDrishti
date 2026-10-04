/**
 * JalDrishti AI & Machine Learning Predictive Failure & Anomaly Engine
 * Simplified and easy to understand for village committees and engineers
 */

window.AiEngine = {
  modelsData: null,
  chainageChart: null,

  async init() {
    await this.fetchModelsData();
    this.renderChainageChart();
  },

  async fetchModelsData() {
    try {
      const res = await fetch('/api/ai/predictive-models');
      const json = await res.json();
      if (json.success && json.data) {
        this.modelsData = json.data;
        this.renderModelsCards(json.data.models);
      }
    } catch (e) {
      console.warn('AI models fetch error:', e);
    }
  },

  renderModelsCards(models) {
    const container = document.getElementById('aiModelsContainer');
    if (!container || !models) return;

    // Friendly plain-language mapping for rural water staff
    const friendlyMap = {
      'MDL-ANOMALY-01': {
        title: 'Pipe Leak & Rupture Guard',
        titleHi: 'पाइपलाइन रिसाव सुरक्षा गार्ड',
        icon: '💧',
        desc: 'Monitors underground water pressure to pinpoint pipe fractures in < 2 seconds before roads flood.'
      },
      'MDL-PRED-PUMP-02': {
        title: 'Pump Motor Health Guard',
        titleHi: 'पंप मोटर स्वास्थ्य गार्ड',
        icon: '⚙️',
        desc: 'Tracks motor temperature and vibration to warn 36 hours before motor bearings seize or burn out.'
      },
      'MDL-CHLORINE-03': {
        title: 'Clean Water Chlorine Guard',
        titleHi: 'क्लोरीन शुद्धता गार्ड',
        icon: '🧪',
        desc: 'Predicts if chlorine dissipates at distant tail-end households, preventing contaminated water.'
      },
      'MDL-LPCD-FORECAST': {
        title: '55 LPCD Fair Share Equalizer',
        titleHi: 'समान जल वितरण गार्ड',
        icon: '⚖️',
        desc: 'Detects illegal suction booster pumps to guarantee every home gets their fair 55 LPCD supply.'
      }
    };

    container.innerHTML = models.map(m => {
      const isHigh = m.currentRiskLevel.includes('CRITICAL') || m.currentRiskLevel.includes('ELEVATED') || m.currentRiskLevel.includes('DEFICIENCY');
      const meta = friendlyMap[m.id] || {
        title: m.name,
        icon: '🤖',
        desc: m.target
      };

      return `
        <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <span class="badge ${isHigh ? 'badge-danger' : 'badge-success'}">${isHigh ? '⚠️ Alert Triggered' : '● Operational'}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;">${m.id}</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <span style="font-size:1.3rem;">${meta.icon}</span>
              <div style="font-weight:700; font-size:0.98rem; color:var(--text-primary); line-height:1.2;">
                ${meta.title}
              </div>
            </div>

            <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.4;">
              ${meta.desc}
            </div>
          </div>

          <div>
            <!-- Simple Health Meter -->
            <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:var(--radius-sm); margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.78rem;">
              <span style="color:var(--text-muted);">AI Accuracy Score:</span>
              <strong style="color:var(--status-functional); font-size:0.9rem;">${m.precision}% (F1: ${m.f1Score}%)</strong>
            </div>

            <!-- Current Live Status -->
            <div style="font-size:0.8rem; padding:8px 10px; border-radius:var(--radius-sm); background:${isHigh ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; border:1px solid ${isHigh ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'};">
              <div style="font-weight:700; color:${isHigh ? '#fca5a5' : '#6ee7b7'}; margin-bottom:2px;">
                ${isHigh ? '⚠️ Attention Needed' : '✅ Everything Safe'}
              </div>
              <div style="font-size:0.75rem; color:var(--text-secondary);">
                ${m.currentRiskLevel}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderChainageChart() {
    const canvas = document.getElementById('hydraulicGradientChart');
    if (!canvas) return;

    if (this.chainageChart) {
      this.chainageChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const chainagePoints = ['0m (Tank)', '150m', '300m', '340m (Leak)', '450m', '600m', '800m', '1000m (Tail)'];
    const isBurst = document.getElementById('tickerAnomalyScore')?.textContent.includes('HIGH') || false;

    const normalGradient = [15.0, 14.2, 13.5, 13.1, 12.4, 11.2, 9.8, 8.5];
    const burstGradient = [15.0, 14.1, 13.2, 5.4, 4.2, 3.1, 1.8, 0.4];

    this.chainageChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chainagePoints,
        datasets: [
          {
            label: 'Normal Healthy Water Pressure (Meters Head)',
            data: normalGradient,
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: isBurst ? '🚨 Current Pressure Drop (Leak at Chainage 340m)' : 'Current Pressure in Pipeline',
            data: isBurst ? burstGradient : normalGradient,
            borderColor: isBurst ? '#ef4444' : '#10b981',
            backgroundColor: isBurst ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2.5,
            fill: true,
            pointRadius: [3, 3, 3, 7, 3, 3, 3, 3],
            pointBackgroundColor: isBurst ? '#ef4444' : '#10b981',
            tension: 0.25
          },
          {
            label: 'JJM Minimum Required Pressure (7.0m Head)',
            data: [7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 7.0],
            borderColor: 'rgba(245, 158, 11, 0.7)',
            borderWidth: 1.5,
            borderDash: [2, 2],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.raw} m head pressure`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          y: { 
            grid: { color: 'rgba(255,255,255,0.05)' }, 
            ticks: { color: '#64748b' },
            title: { display: true, text: 'Water Pressure (Meters Head)', color: '#94a3b8' }
          }
        }
      }
    });
  }
};
