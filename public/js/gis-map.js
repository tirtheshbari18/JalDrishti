/**
 * JalDrishti Interactive GIS Digital Twin & FHTC Network Map
 * Uses Leaflet for interactive geospatial rendering
 */

window.GisMap = {
  map: null,
  layers: {
    pipelines: null,
    fhtcs: null,
    infrastructure: null,
    burstMarker: null,
    grievances: null
  },
  filters: {
    showFunctional: true,
    showLowPressure: true,
    showDefunct: true,
    showPipelines: true,
    showGrievances: true
  },

  init() {
    const mapContainer = document.getElementById('gisMap');
    if (!mapContainer || this.map) return;

    // Centered at Rampur Gram Panchayat (Jaipur Rural)
    const rampurCenter = [26.9855, 75.8507];

    this.map = L.map('gisMap', {
      center: rampurCenter,
      zoom: 16,
      zoomControl: true
    });

    // Clean, readable, friendly citizen map tiles (Carto Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Jal Jeevan Mission GIS',
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    this.layers.pipelines = L.layerGroup().addTo(this.map);
    this.layers.fhtcs = L.layerGroup().addTo(this.map);
    this.layers.infrastructure = L.layerGroup().addTo(this.map);
    this.layers.burstMarker = L.layerGroup().addTo(this.map);
    this.layers.grievances = L.layerGroup().addTo(this.map);

    this.renderAll();
    this.setupFilterListeners();
  },

  invalidate() {
    if (this.map) {
      this.map.invalidateSize();
    }
  },

  renderAll() {
    if (!window.AppState.fhtcData) return;
    this.renderInfrastructure();
    this.renderPipelines();
    this.renderFhtcs();
    this.renderGrievances();
  },

  renderInfrastructure() {
    this.layers.infrastructure.clearLayers();
    const nodes = window.AppState.fhtcData.infrastructureNodes || [];

    nodes.forEach(node => {
      let iconHtml = '💧';
      let iconClass = 'kpi-icon-blue';

      if (node.type.includes('Source')) {
        iconHtml = '⚙️';
        iconClass = 'kpi-icon-purple';
      } else if (node.type.includes('Chlorin')) {
        iconHtml = '🧪';
        iconClass = 'kpi-icon-cyan';
      } else if (node.type.includes('Overhead')) {
        iconHtml = '🏛️';
        iconClass = 'kpi-icon-blue';
      } else if (node.type.includes('Valve')) {
        iconHtml = '🚰';
        iconClass = 'kpi-icon-amber';
      }

      const customIcon = L.divIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="background:rgba(10,25,47,0.9); border:2px solid var(--water-electric); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(56,189,248,0.5); font-size:14px;">${iconHtml}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(node.coordinates, { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family:var(--font-sans); color:#0f172a; min-width:200px;">
          <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px; color:#0284c7;">${node.name}</div>
          <div style="font-size:0.75rem; color:#64748b; margin-bottom:6px;">Type: <strong>${node.type}</strong></div>
          <div style="font-size:0.8rem; background:#f1f5f9; padding:6px; border-radius:6px;">
            Status: <span style="font-weight:700; color:#10b981;">${node.status}</span>
          </div>
        </div>
      `);
      this.layers.infrastructure.addLayer(marker);
    });
  },

  renderPipelines() {
    this.layers.pipelines.clearLayers();
    this.layers.burstMarker.clearLayers();

    const segments = window.AppState.fhtcData.pipelineSegments || [];

    segments.forEach(seg => {
      const isBurst = seg.leakageProbabilityPercent > 70;
      const color = isBurst ? '#ef4444' : (seg.leakageProbabilityPercent > 15 ? '#f59e0b' : '#06b6d4');
      const weight = seg.diameterMM > 100 ? 5 : 3;

      const polyline = L.polyline(seg.coordinates, {
        color: color,
        weight: weight,
        opacity: isBurst ? 0.95 : 0.75,
        dashArray: isBurst ? '6, 6' : null
      });

      polyline.bindTooltip(`
        <strong>${seg.name}</strong><br/>
        Dia: ${seg.diameterMM}mm (${seg.material})<br/>
        Flow: ${seg.flowRateLPS} LPS | Head Loss: ${seg.headLossMeters}m<br/>
        Leakage Risk: <strong style="color:${color};">${seg.leakageProbabilityPercent}%</strong>
      `, { sticky: true });

      this.layers.pipelines.addLayer(polyline);

      // If burst, add radar marker at the midpoint
      if (isBurst) {
        const midPoint = seg.coordinates[1] || seg.coordinates[0];
        const radarIcon = L.divIcon({
          className: 'radar-marker-wrap',
          html: `<div class="radar-pulse-marker" title="AI Pinpointed Burst!"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const burstM = L.marker(midPoint, { icon: radarIcon });
        burstM.bindPopup(`
          <div style="color:#0f172a; min-width:220px;">
            <div style="color:#ef4444; font-weight:800; font-size:1rem; margin-bottom:4px;">🚨 AI Burst Localization</div>
            <div style="font-size:0.8rem; margin-bottom:6px;">Segment: <strong>${seg.name}</strong></div>
            <div style="font-size:0.78rem; background:#fee2e2; padding:6px; border-radius:6px; color:#991b1b;">
              Water loss rate: <strong>~420 L/hr</strong><br/>
              Recommended: Close Valve #2
            </div>
          </div>
        `).openPopup();
        this.layers.burstMarker.addLayer(burstM);
      }
    });
  },

  renderFhtcs() {
    this.layers.fhtcs.clearLayers();
    const fhtcs = window.AppState.fhtcData.fhtcs || [];

    fhtcs.forEach(f => {
      // Filter logic
      if (f.status === 'Functional' && !this.filters.showFunctional) return;
      if (f.status === 'Low Pressure' && !this.filters.showLowPressure) return;
      if ((f.status === 'Defunct' || f.status === 'Intermittent') && !this.filters.showDefunct) return;

      let pinColor = '#10b981'; // Green Functional
      if (f.status === 'Low Pressure') pinColor = '#f59e0b'; // Amber Low Pressure
      if (f.status === 'Intermittent') pinColor = '#8b5cf6'; // Purple Intermittent
      if (f.status === 'Defunct') pinColor = '#ef4444'; // Red Defunct

      const circle = L.circleMarker(f.coordinates, {
        radius: 7,
        fillColor: pinColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85
      });

      circle.bindTooltip(`
        <strong>${f.consumerName}</strong> (${f.fhtcId})<br/>
        Service: <strong>${f.lpcd} LPCD</strong> | Pressure: <strong>${f.terminalHeadMeters}m</strong><br/>
        Status: <span style="color:${pinColor}; font-weight:700;">${f.status}</span>
      `, { sticky: true });

      circle.on('click', () => {
        window.inspectFhtc(f.fhtcId);
      });

      this.layers.fhtcs.addLayer(circle);
    });
  },

  renderGrievances() {
    this.layers.grievances.clearLayers();
    const grvs = window.AppState.grievancesData || [];

    grvs.forEach(g => {
      if (!g.coordinates) return;
      const grvIcon = L.divIcon({
        className: 'grv-pin',
        html: `<div style="background:#ef4444; color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; border:2px solid white; box-shadow:0 0 8px #ef4444;">⚠️</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const m = L.marker(g.coordinates, { icon: grvIcon });
      m.bindPopup(`
        <div style="color:#0f172a; min-width:200px;">
          <div style="font-weight:700; color:#ef4444;">Citizen Grievance: ${g.id}</div>
          <div style="font-size:0.8rem; margin:4px 0;"><strong>${g.consumerName}</strong> (${g.ward})</div>
          <div style="font-size:0.75rem; color:#475569;">Issue: ${g.category}</div>
          <div style="font-size:0.75rem; font-style:italic; margin-top:4px;">"${g.description}"</div>
        </div>
      `);
      this.layers.grievances.addLayer(m);
    });
  },

  setupFilterListeners() {
    const cbFunctional = document.getElementById('filterFunctional');
    if (cbFunctional) {
      cbFunctional.addEventListener('change', (e) => {
        this.filters.showFunctional = e.target.checked;
        this.renderFhtcs();
      });
    }

    const cbLowPress = document.getElementById('filterLowPressure');
    if (cbLowPress) {
      cbLowPress.addEventListener('change', (e) => {
        this.filters.showLowPressure = e.target.checked;
        this.renderFhtcs();
      });
    }

    const cbDefunct = document.getElementById('filterDefunct');
    if (cbDefunct) {
      cbDefunct.addEventListener('change', (e) => {
        this.filters.showDefunct = e.target.checked;
        this.renderFhtcs();
      });
    }

    const cbPipes = document.getElementById('filterPipelines');
    if (cbPipes) {
      cbPipes.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.map.addLayer(this.layers.pipelines);
        } else {
          this.map.removeLayer(this.layers.pipelines);
        }
      });
    }
  }
};
