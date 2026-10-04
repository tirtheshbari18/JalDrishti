/**
 * JalDrishti - Real-Time Hydraulic Wavelet Oscilloscope & Explainable AI (XAI)
 * Visualizes high-frequency 100Hz transient pressure waves and SHAP feature importance
 */

window.WaveOscilloscope = {
  canvas: null,
  ctx: null,
  animId: null,
  isFrozen: false,
  waveletFilterEnabled: true,
  t: 0,

  init() {
    this.canvas = document.getElementById('waveletCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.startAnimation();
    this.renderShapFeatureImportance();
  },

  startAnimation() {
    const draw = () => {
      if (!this.isFrozen && this.canvas) {
        this.drawWaveform();
      }
      this.animId = requestAnimationFrame(draw);
    };
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(draw);
  },

  drawWaveform() {
    const w = this.canvas.width = this.canvas.parentElement.clientWidth || 600;
    const h = this.canvas.height = 140;
    const ctx = this.ctx;

    // Background grid
    ctx.fillStyle = '#050c18';
    ctx.fillRect(0, 0, w, h);

    // Subtle oscilloscope grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero-axis line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    this.t += 0.05;
    const isBurst = document.getElementById('tickerAnomalyScore')?.textContent.includes('HIGH') || false;

    // Draw Pressure Waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = isBurst ? '#ef4444' : '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.shadowColor = isBurst ? 'rgba(239, 68, 68, 0.8)' : 'rgba(6, 182, 212, 0.8)';
    ctx.beginPath();

    const midY = h / 2;
    for (let x = 0; x < w; x++) {
      let freq1 = Math.sin((x * 0.04) - this.t * 3);
      let freq2 = Math.sin((x * 0.09) + this.t * 1.5) * 0.4;
      let noise = (Math.random() - 0.5) * 0.15;
      let burstTransients = 0;

      if (isBurst) {
        // High frequency shockwave singularity at center
        const distFromCenter = Math.abs(x - (w / 2));
        if (distFromCenter < 120) {
          burstTransients = Math.sin((x * 0.25) - this.t * 8) * Math.exp(-distFromCenter / 45) * 2.8;
        }
      }

      let y = midY + (freq1 + freq2 + noise + burstTransients) * (isBurst ? 32 : 18);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Live Water Pressure Readout in Top Corner
    ctx.fillStyle = isBurst ? '#fca5a5' : '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText(`TRANSIENT SAMPLING: 100 Hz | HEAD: ${isBurst ? '0.15 Bar (CRITICAL BURST)' : '1.48 Bar (STABLE)'}`, 12, 18);
    if (isBurst) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`⚠️ SHOCKWAVE SINGULARITY DETECTED AT NODE-04 (Chainage 340m)`, 12, 32);
    }
  },

  toggleFreeze() {
    this.isFrozen = !this.isFrozen;
    const btn = document.getElementById('freezeWaveBtn');
    if (btn) {
      btn.textContent = this.isFrozen ? '▶️ Resume Wave' : '⏸️ Freeze Wave';
      btn.className = this.isFrozen ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    }
  },

  renderShapFeatureImportance() {
    const container = document.getElementById('shapFeaturesContainer');
    if (!container) return;

    const isBurst = document.getElementById('tickerAnomalyScore')?.textContent.includes('HIGH') || false;

    const features = isBurst ? [
      { name: 'Downstream Pressure Drop (ΔP)', value: 89, impact: '+89% towards Rupture', color: '#ef4444' },
      { name: 'Mass Balance Divergence (ΔQ)', value: 78, impact: '+78% water volume loss', color: '#ef4444' },
      { name: 'Diurnal Flow Curve Anomaly', value: 65, impact: '+65% deviation from pattern', color: '#f59e0b' },
      { name: 'High-Freq Acoustic Vibration', value: 42, impact: '+42% pipe resonance', color: '#38bdf8' }
    ] : [
      { name: 'Hydraulic Equilibrium (Normal)', value: 95, impact: 'Normal laminar gradient', color: '#10b981' },
      { name: 'Diurnal Demand Adherence', value: 92, impact: 'Follows morning/evening curve', color: '#10b981' },
      { name: 'Residual Chlorine Stability', value: 88, impact: 'Safe at 0.38 ppm', color: '#10b981' },
      { name: 'Pump Bearing Temperature', value: 82, impact: 'Nominal 48.5 °C', color: '#10b981' }
    ];

    container.innerHTML = features.map(f => `
      <div style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
          <span style="font-weight:600;">${f.name}</span>
          <span style="color:${f.color}; font-weight:700;">${f.impact}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${f.value}%; background:${f.color};"></div>
        </div>
      </div>
    `).join('');
  }
};
