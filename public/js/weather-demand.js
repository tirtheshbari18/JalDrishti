/**
 * JalDrishti (जलदृष्टि) - AI Climate & Water Demand Forecaster
 * Integrates IMD Weather Satellite data with predictive household consumption modeling.
 */

window.WeatherDemand = (function() {
  let demandChart = null;
  let cachedData = null;
  let tempDelta = 0; // Interactive stress test modifier

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/weather-demand');
      const json = await res.json();
      if (!json.success) return;

      cachedData = json.data;
      updateUI();
    } catch (e) {
      console.warn('Weather demand load error:', e);
    }
  }

  function updateUI() {
    if (!cachedData) return;

    const weather = cachedData.currentWeather;
    const currentTemp = (weather.temperatureC + tempDelta).toFixed(1);

    // Weather Metrics
    const tempEl = document.getElementById('weatherCurrentTemp');
    if (tempEl) tempEl.textContent = `${currentTemp}°C`;

    const condEl = document.getElementById('weatherCondition');
    if (condEl) condEl.textContent = tempDelta > 3 ? 'Extreme Heatwave Warning' : weather.condition;

    const humidityEl = document.getElementById('weatherHumidity');
    if (humidityEl) humidityEl.textContent = `${weather.humidityPercent}%`;

    const solarRadEl = document.getElementById('weatherSolarRadiation');
    if (solarRadEl) solarRadEl.textContent = `${weather.solarRadiationWm2} W/m²`;

    const heatAlertEl = document.getElementById('weatherHeatwaveLevel');
    if (heatAlertEl) {
      if (tempDelta > 3 || weather.heatwaveAlertLevel === 'Amber') {
        heatAlertEl.textContent = 'Amber (Surge Expected)';
        heatAlertEl.className = 'badge badge-warning';
      } else {
        heatAlertEl.textContent = 'Normal';
        heatAlertEl.className = 'badge badge-success';
      }
    }

    const aiRecEl = document.getElementById('weatherAiRecommendation');
    if (aiRecEl) {
      if (tempDelta > 2) {
        aiRecEl.innerHTML = `⚠️ <strong>Climate Stress Alert (+${tempDelta}°C simulated):</strong> Peak household demand projected to reach <strong>${(57.2 + tempDelta * 1.8).toFixed(1)} LPCD</strong> (+${Math.round(tempDelta * 3.2)}% surge). AI automatically commands high-speed solar pumping to reserve 18,000 L extra buffer in Rampur OHT.`;
      } else {
        aiRecEl.innerHTML = `💡 <strong>AI Forecast:</strong> ${cachedData.aiPrescriptiveRecommendation}`;
      }
    }

    renderForecastChart();
  }

  function renderForecastChart() {
    const ctx = document.getElementById('weatherDemandForecastChart');
    if (!ctx || !cachedData) return;

    if (demandChart) {
      demandChart.destroy();
    }

    const forecast = cachedData.forecast7Days;
    const labels = forecast.map(f => f.day);
    const temps = forecast.map(f => Number((f.tempC + tempDelta).toFixed(1)));
    const demands = forecast.map(f => Number((f.lpcdDemand + (tempDelta * 1.5)).toFixed(1)));

    demandChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Predicted Water Demand (LPCD)',
            data: demands,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            yAxisID: 'y'
          },
          {
            label: 'Ambient Temperature (°C)',
            data: temps,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.35,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 28, 46, 0.95)',
            borderColor: 'rgba(56, 189, 248, 0.3)',
            borderWidth: 1,
            titleColor: '#38bdf8',
            bodyColor: '#f8fafc',
            callbacks: {
              afterBody: function(contexts) {
                const idx = contexts[0].dataIndex;
                return `Plan: ${forecast[idx].recommendation}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#38bdf8',
              font: { size: 10 },
              callback: val => `${val} LPCD`
            },
            title: {
              display: true,
              text: 'Demand (LPCD)',
              color: '#38bdf8',
              font: { size: 10 }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#f59e0b',
              font: { size: 10 },
              callback: val => `${val}°C`
            },
            title: {
              display: true,
              text: 'Temperature (°C)',
              color: '#f59e0b',
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

  function setTempDelta(val) {
    tempDelta = Number(val);
    const sliderValEl = document.getElementById('tempSliderVal');
    if (sliderValEl) sliderValEl.textContent = `${tempDelta >= 0 ? '+' : ''}${tempDelta}°C`;
    updateUI();
  }

  return {
    init: fetchAndRender,
    setTempDelta: setTempDelta
  };
})();
