/**
 * JalDrishti - Solar Micro-Grid & Pump Energy Optimization Controller
 * Maximizes green solar power and minimizes Gram Panchayat electricity tariffs
 */

window.SolarGrid = {
  data: null,
  solarChart: null,

  async init() {
    await this.fetchSolarData();
    this.renderSolarChart();
  },

  async fetchSolarData() {
    try {
      const res = await fetch('/api/solar-energy');
      const json = await res.json();
      if (json.success && json.data) {
        this.data = json.data;
        this.updateUI(json.data);
      }
    } catch (e) {
      console.warn('Solar data error:', e);
    }
  },

  updateUI(d) {
    // Current Solar Generation
    const solGen = document.getElementById('solarCurrentOutput');
    if (solGen) solGen.textContent = `${d.currentSolarOutputKW} kW`;

    // Pump Demand
    const pmpDem = document.getElementById('solarPumpDemand');
    if (pmpDem) pmpDem.textContent = `${d.pumpDemandKW} kW`;

    // Net Grid Flow
    const netFlow = document.getElementById('solarNetGridFlow');
    if (netFlow) {
      netFlow.textContent = `${Math.abs(d.netGridFlowKW)} kW`;
      const isExport = d.netGridFlowKW >= 0;
      netFlow.style.color = isExport ? 'var(--status-functional)' : 'var(--status-warning)';
      const label = document.getElementById('solarNetFlowLabel');
      if (label) label.textContent = isExport ? 'Net Solar Exported to Grid' : 'Net Power Drawn from Grid';
    }

    // Battery Storage
    const batSoc = document.getElementById('solarBatterySoc');
    if (batSoc) batSoc.textContent = `${d.batteryStorage.socPercent}% (${d.batteryStorage.currentChargeKWh} kWh)`;

    const batBar = document.getElementById('solarBatteryBar');
    if (batBar) batBar.style.width = `${d.batteryStorage.socPercent}%`;

    // Financial & Environmental Savings
    const co2Offset = document.getElementById('solarCo2Offset');
    if (co2Offset) co2Offset.textContent = `${d.dailyMetrics.carbonOffsetKgCO2} kg CO2`;

    const savingsRupees = document.getElementById('solarBillSavings');
    if (savingsRupees) savingsRupees.textContent = `₹${d.dailyMetrics.dailyElectricityBillSavingsRupees.toFixed(2)}`;

    const cummCo2 = document.getElementById('solarCumulativeCo2');
    if (cummCo2) cummCo2.textContent = `${d.dailyMetrics.cumulativeCO2SavedTons} Tons`;
  },

  renderSolarChart() {
    const canvas = document.getElementById('solarGenerationChart');
    if (!canvas) return;

    if (this.solarChart) this.solarChart.destroy();

    const ctx = canvas.getContext('2d');
    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const solarGeneration = [0.8, 5.2, 14.1, 17.8, 15.6, 6.4, 0.5, 0.0];
    const pumpConsumption = [7.4, 7.4, 7.4, 7.4, 7.4, 7.4, 0.0, 0.0];

    this.solarChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Solar PV Output (kW)',
            data: solarGeneration,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fbbf24',
            pointRadius: 4
          },
          {
            label: 'Pump Motor Load (7.4 kW)',
            data: pumpConsumption,
            borderColor: '#06b6d4',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
          y: { 
            grid: { color: 'rgba(255,255,255,0.05)' }, 
            ticks: { color: '#64748b' },
            title: { display: true, text: 'Power (kW)', color: '#94a3b8' }
          }
        }
      }
    });
  }
};
