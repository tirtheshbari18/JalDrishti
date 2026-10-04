/**
 * JalDrishti Real-Time Scenario & Chaos Simulation Lab
 * Used for live demonstrations, stress testing, and evaluation
 */

window.ChaosSimulator = {
  init() {
    this.setupButtons();
  },

  setupButtons() {
    const btnBurst = document.getElementById('chaosTriggerBurst');
    if (btnBurst) {
      btnBurst.addEventListener('click', () => this.injectEvent('burst', '🚨 SIMULATION: Main Pipeline Burst in Sector 4!'));
    }

    const btnChlorine = document.getElementById('chaosTriggerChlorine');
    if (btnChlorine) {
      btnChlorine.addEventListener('click', () => this.injectEvent('chlorine_drop', '⚠️ SIMULATION: Residual Chlorine Dropped to 0.08 ppm!'));
    }

    const btnReset = document.getElementById('chaosTriggerReset');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.injectEvent('reset', '✅ Water Grid State Restored to Nominal Optimal!'));
    }
  },

  async injectEvent(eventType, msg) {
    try {
      const res = await fetch('/api/simulate/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventType })
      });

      const json = await res.json();
      if (json.success) {
        if (eventType === 'burst') {
          SoundFX.playAlertCritical();
          showToast(msg, 'danger', 'Emergency Anomaly Injected');
        } else if (eventType === 'chlorine_drop') {
          SoundFX.playAlertCritical();
          showToast(msg, 'warning', 'Water Quality Violation Injected');
        } else {
          SoundFX.playSuccess();
          showToast(msg, 'success', 'Grid Normalized');
        }

        // Refresh all app layers
        const fhtcRes = await fetch(`/api/fhtcs?gp=${window.AppState.selectedGP}`);
        const fhtcJson = await fhtcRes.json();
        if (fhtcJson.success) {
          window.AppState.fhtcData = fhtcJson.data;
          window.renderFhtcTable(fhtcJson.data.fhtcs);
          if (window.GisMap) window.GisMap.renderAll();
        }

        const alertsRes = await fetch('/api/alerts');
        const alertsJson = await alertsRes.json();
        if (alertsJson.success) {
          window.AppState.alertsData = alertsJson.data;
          window.renderAlertsList(alertsJson.data);
          const badge = document.getElementById('headerAlertsBadge');
          if (badge) badge.textContent = alertsJson.data.filter(a => !a.isResolved).length;
        }

        if (window.AiEngine) {
          window.AiEngine.renderChainageChart();
        }

        if (window.TelemetryStream) {
          window.TelemetryStream.fetchLiveTelemetry();
        }
      }
    } catch (e) {
      showToast('Simulation failed to trigger.', 'danger');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.ChaosSimulator.init();
});
