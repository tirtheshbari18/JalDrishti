/**
 * JalDrishti - Interactive Hydraulic Valve Matrix & What-If Flow Simulator
 */

window.ValveMatrix = {
  valves: [
    { id: 'VALVE-01', name: 'Main Feeder Sluice (Node 1)', throttle: 100, status: 'OPEN' },
    { id: 'VALVE-02', name: 'South Ward Tail Branch (Node 4)', throttle: 70, status: 'THROTTLED' },
    { id: 'VALVE-03', name: 'East Secondary Standpost Loop', throttle: 90, status: 'OPEN' }
  ],

  init() {
    this.renderValves();
  },

  renderValves() {
    const container = document.getElementById('valveMatrixContainer');
    if (!container) return;

    container.innerHTML = this.valves.map(v => `
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:var(--radius-md); margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <div>
            <strong style="font-size:0.86rem; color:var(--text-primary);">${v.name}</strong>
            <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">${v.id}</div>
          </div>
          <span class="badge ${v.throttle > 50 ? 'badge-success' : 'badge-warning'}" id="badge-${v.id}">
            ${v.throttle}% OPEN
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <input type="range" min="0" max="100" value="${v.throttle}" 
                 style="flex:1; accent-color:var(--water-electric); cursor:pointer;"
                 oninput="window.ValveMatrix.onThrottleChange('${v.id}', this.value)"
                 onchange="window.ValveMatrix.commitThrottle('${v.id}', this.value)">
          <span style="font-weight:700; font-size:0.82rem; min-width:36px; text-align:right;" id="val-${v.id}">
            ${v.throttle}%
          </span>
        </div>
      </div>
    `).join('');
  },

  onThrottleChange(valveId, val) {
    const valText = document.getElementById(`val-${valveId}`);
    if (valText) valText.textContent = `${val}%`;
    const badge = document.getElementById(`badge-${valveId}`);
    if (badge) {
      badge.textContent = `${val}% OPEN`;
      badge.className = `badge ${val > 50 ? 'badge-success' : val > 10 ? 'badge-warning' : 'badge-danger'}`;
    }
  },

  async commitThrottle(valveId, val) {
    try {
      const res = await fetch('/api/hydraulic/simulate-valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valveId, throttlePercent: Number(val) })
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.recomputedHydraulics.statusMessage, 'success', 'Hydraulic Rebalance');
        SoundFX.playSuccess();
        // Update valve record
        const v = this.valves.find(x => x.id === valveId);
        if (v) v.throttle = Number(val);
        // If GIS map has active layers, pulse update
        if (window.GisMap) {
          window.GisMap.renderPipelines();
        }
      }
    } catch (e) {
      showToast('Hydraulic valve simulation failed.', 'danger');
    }
  }
};
