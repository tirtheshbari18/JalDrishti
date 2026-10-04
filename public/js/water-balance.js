/**
 * JalDrishti (जलदृष्टि) - IWA Standard Water Balance & Non-Revenue Water (NRW) Matrix
 * Audits total inflow vs authorized household consumption vs physical pipeline losses.
 */

window.WaterBalance = (function() {
  let balanceChart = null;

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/water-balance');
      const data = await res.json();
      if (!data.success) return;

      const audit = data.data;

      // Update KPIs
      const nrwVal = document.getElementById('wbNrwPercent');
      if (nrwVal) {
        nrwVal.textContent = `${audit.nrwPercentage}%`;
        nrwVal.style.color = audit.nrwPercentage < 10 ? 'var(--status-functional)' : 'var(--status-critical)';
      }

      const gradeEl = document.getElementById('wbBenchmarkGrade');
      if (gradeEl) gradeEl.textContent = audit.nrwBenchmarkGrade;

      const billedEl = document.getElementById('wbBilledVolume');
      if (billedEl) billedEl.textContent = `${(audit.billedAuthorizedLPD / 1000).toFixed(1)}k L (${Math.round((audit.billedAuthorizedLPD / audit.systemInputVolumeLPD) * 100)}%)`;

      const realLossEl = document.getElementById('wbRealLosses');
      if (realLossEl) realLossEl.textContent = `${(audit.realLossesLPD / 1000).toFixed(1)}k L`;

      const savingsEl = document.getElementById('wbMonthlySavings');
      if (savingsEl) savingsEl.textContent = `₹${audit.economicSavingsRupeesPerMonth.toLocaleString('en-IN')}`;

      renderChart(audit);
    } catch (e) {
      console.warn('Failed to load water balance data:', e);
    }
  }

  function renderChart(audit) {
    const ctx = document.getElementById('waterBalanceFlowChart');
    if (!ctx) return;

    if (balanceChart) {
      balanceChart.destroy();
    }

    balanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Total Inflow (110k L)',
          'Authorized Billed (97.7k L)',
          'Public / School (6.2k L)',
          'Meter Drift / Apparent (1.8k L)',
          'Pipe Physical Leaks (4.2k L)'
        ],
        datasets: [{
          label: 'Daily Litres (LPD)',
          data: [
            audit.systemInputVolumeLPD,
            audit.billedAuthorizedLPD,
            audit.unbilledAuthorizedLPD,
            audit.apparentLossesLPD,
            audit.realLossesLPD
          ],
          backgroundColor: [
            'rgba(2, 132, 199, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(6, 182, 212, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            audit.realLossesLPD > 8000 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(249, 115, 22, 0.85)'
          ],
          borderColor: [
            '#38bdf8',
            '#10b981',
            '#06b6d4',
            '#f59e0b',
            audit.realLossesLPD > 8000 ? '#ef4444' : '#f97316'
          ],
          borderWidth: 1.5,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 28, 46, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function(context) {
                const percent = ((context.parsed.y / audit.systemInputVolumeLPD) * 100).toFixed(1);
                return `${context.parsed.y.toLocaleString()} Litres/day (${percent}% of Total Inflow)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 }
            }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: val => (val / 1000) + 'k L'
            }
          }
        }
      }
    });
  }

  return {
    init: fetchAndRender,
    refresh: fetchAndRender
  };
})();
