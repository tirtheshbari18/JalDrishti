/**
 * JalDrishti Telemetry Stream & Real-time Sensor Monitoring Engine
 */

window.TelemetryStream = {
  intervalId: null,
  latestData: null,

  init() {
    this.fetchLiveTelemetry();
    this.intervalId = setInterval(() => this.fetchLiveTelemetry(), 4000);
  },

  async fetchLiveTelemetry() {
    try {
      const res = await fetch('/api/telemetry/live');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        this.latestData = json.data;
        this.updateUI(json.data);
      }
    } catch (e) {
      console.warn('Telemetry sync error:', e);
    }
  },

  updateUI(data) {
    const { oht, waterQuality, sourcePump, aiDiagnostics } = data;

    // Header Quick Status
    const headStatus = document.getElementById('headerQuickStatus');
    if (headStatus) {
      if (aiDiagnostics.systemAnomalyScore > 0.5) {
        headStatus.textContent = 'Anomaly Detected!';
        headStatus.parentElement.style.color = 'var(--status-critical)';
      } else {
        headStatus.textContent = `${aiDiagnostics.fhtcCompliancePercent || 96.5}% Taps Active`;
        headStatus.parentElement.style.color = 'var(--status-functional)';
      }
    }

    // Top Ticker / Banner Updates
    const tickOht = document.getElementById('tickerOhtLevel');
    if (tickOht) tickOht.textContent = `${oht.waterLevelPercent}% (${(oht.currentVolumeLiters/1000).toFixed(0)}k L)`;

    const banOht = document.getElementById('bannerOhtText');
    if (banOht) banOht.textContent = `${oht.waterLevelPercent}% (${(oht.currentVolumeLiters/1000).toFixed(0)}k L)`;

    const tickFlow = document.getElementById('tickerFlowRate');
    if (tickFlow) tickFlow.textContent = `In: ${oht.inflowRateLPS} / Out: ${oht.outflowRateLPS} LPS`;

    const tickPress = document.getElementById('tickerPressure');
    if (tickPress) tickPress.textContent = `${oht.headPressureBar} Bar`;

    const banPress = document.getElementById('bannerPressureText');
    if (banPress) banPress.textContent = `${oht.headPressureBar} Bar (${oht.headPressureBar >= 0.7 ? 'Safe' : 'Low'})`;

    const tickCl = document.getElementById('tickerChlorine');
    if (tickCl) {
      tickCl.textContent = `${waterQuality.residualChlorinePpm} ppm`;
      tickCl.className = `ticker-value ${waterQuality.residualChlorinePpm < 0.2 ? 'highlight-crit' : 'highlight-good'}`;
    }

    const banCl = document.getElementById('bannerChlorineText');
    if (banCl) {
      banCl.textContent = `${waterQuality.residualChlorinePpm} ppm (${waterQuality.residualChlorinePpm >= 0.2 ? 'Safe' : 'Low'})`;
      banCl.style.color = waterQuality.residualChlorinePpm >= 0.2 ? 'var(--status-functional)' : 'var(--status-critical)';
    }

    const tickAnomaly = document.getElementById('tickerAnomalyScore');
    if (tickAnomaly) {
      const score = aiDiagnostics.systemAnomalyScore;
      tickAnomaly.textContent = score > 0.5 ? `HIGH (${score})` : `NORMAL (${score})`;
      tickAnomaly.className = `ticker-value ${score > 0.5 ? 'highlight-crit' : 'highlight-good'}`;
    }

    // Animated Overhead Tank (OHT) Widget
    const tankWaterEl = document.getElementById('ohtWaterLevelVisual');
    if (tankWaterEl) {
      tankWaterEl.style.height = `${oht.waterLevelPercent}%`;
    }

    const ohtVolText = document.getElementById('ohtCurrentVolume');
    if (ohtVolText) ohtVolText.textContent = `${Number(oht.currentVolumeLiters).toLocaleString('en-IN')} L`;

    const ohtPercentText = document.getElementById('ohtPercentText');
    if (ohtPercentText) ohtPercentText.textContent = `${oht.waterLevelPercent}%`;

    const ohtHeadBar = document.getElementById('ohtHeadBar');
    if (ohtHeadBar) ohtHeadBar.textContent = `${oht.headPressureBar} Bar (${(oht.headPressureBar * 10.197).toFixed(1)} m)`;

    // Water Quality Indicators
    const clGauge = document.getElementById('wqChlorineGauge');
    if (clGauge) {
      clGauge.textContent = `${waterQuality.residualChlorinePpm} mg/L`;
      clGauge.style.color = waterQuality.residualChlorinePpm >= 0.2 ? 'var(--status-functional)' : 'var(--status-critical)';
    }

    const turbGauge = document.getElementById('wqTurbidityGauge');
    if (turbGauge) {
      turbGauge.textContent = `${waterQuality.turbidityNTU} NTU`;
      turbGauge.style.color = waterQuality.turbidityNTU <= 2.0 ? 'var(--status-functional)' : 'var(--status-critical)';
    }

    const phGauge = document.getElementById('wqPhGauge');
    if (phGauge) phGauge.textContent = `${waterQuality.ph}`;

    const tdsGauge = document.getElementById('wqTdsGauge');
    if (tdsGauge) tdsGauge.textContent = `${waterQuality.tdsPpm} ppm`;

    // Source Borewell Motor Health
    const pumpVibEl = document.getElementById('pumpVibText');
    if (pumpVibEl) {
      pumpVibEl.textContent = `${sourcePump.vibrationMMs} mm/s`;
      pumpVibEl.style.color = sourcePump.vibrationMMs > 4.0 ? 'var(--status-critical)' : 'var(--status-functional)';
    }

    const pumpTempEl = document.getElementById('pumpTempText');
    if (pumpTempEl) pumpTempEl.textContent = `${sourcePump.bearingTempCelsius} °C`;

    const pumpCurrentEl = document.getElementById('pumpCurrentText');
    if (pumpCurrentEl) pumpCurrentEl.textContent = `${sourcePump.motorCurrentAmps} A`;
  },

  updateLanguage() {
    if (this.latestData) this.updateUI(this.latestData);
  }
};
