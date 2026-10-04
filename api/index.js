const path = require('path');
const fs = require('fs');
const url = require('url');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Helper to read JSON data safely
function readJSON(filename) {
  try {
    const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err.message);
    return null;
  }
}

function writeJSON(filename, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err.message);
    return false;
  }
}

// In-memory simulation states (resets on cold start — expected for serverless)
let simulatedAnomaly = {
  isBurstActive: false,
  isChlorineLow: false,
  isLowPressureSimulated: false,
  burstLocation: 'South Ward Tail Line (SEG-04, Chainage 340m)',
  burstSeverity: 0
};

module.exports = function handler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const jsonResponse = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const getBody = (callback) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(null, parsed);
      } catch (e) {
        callback(e, null);
      }
    });
  };

  // Strip /api prefix for matching
  const route = pathname.replace(/^\/api/, '') || '/';

  // 1. GET /api/schemes
  if (route === '/schemes' && req.method === 'GET') {
    const data = readJSON('schemes.json');
    return data ? jsonResponse(200, { success: true, data }) : jsonResponse(500, { success: false, error: 'Failed to read schemes' });
  }

  // 2. GET /api/fhtcs
  if (route === '/fhtcs' && req.method === 'GET') {
    const fhtcData = readJSON('fhtc_database.json');
    if (!fhtcData) return jsonResponse(500, { success: false, error: 'Failed to read FHTC data' });

    if (simulatedAnomaly.isBurstActive) {
      fhtcData.fhtcs = fhtcData.fhtcs.map(f => {
        if (f.fhtcId === 'FHTC-RJ-JAI-009' || f.fhtcId === 'FHTC-RJ-JAI-010') {
          return { ...f, status: 'Defunct', flowRateLPM: 0.0, terminalPressureBar: 0.02, terminalHeadMeters: 0.20, aiHealthScore: 10, aiNote: 'CRITICAL: Upstream pipeline burst detected (SEG-04). Water loss ~420 L/hr.' };
        }
        return f;
      });
      fhtcData.pipelineSegments = fhtcData.pipelineSegments.map(seg => {
        if (seg.segmentId === 'SEG-04') return { ...seg, status: 'CRITICAL BURST DETECTED', leakageProbabilityPercent: 96, flowRateLPS: 0.2 };
        return seg;
      });
    }
    if (simulatedAnomaly.isChlorineLow) {
      fhtcData.fhtcs = fhtcData.fhtcs.map(f => ({ ...f, chlorineMgL: Math.max(0.04, Number((f.chlorineMgL * 0.25).toFixed(2))), aiHealthScore: Math.min(f.aiHealthScore, 55), aiNote: 'WARNING: Sub-critical residual chlorine (< 0.2 mg/L). Microbial vulnerability!' }));
    }
    return jsonResponse(200, { success: true, data: fhtcData });
  }

  // 3. GET /api/telemetry/live
  if (route === '/telemetry/live' && req.method === 'GET') {
    const now = new Date();
    const secondOffset = now.getSeconds();
    const noise = Math.sin(secondOffset / 10) * 0.05;
    let ohtLevel = 78.4 + Math.sin(secondOffset / 8) * 1.5;
    let headPressure = 1.48 + noise;
    let chlorine = simulatedAnomaly.isChlorineLow ? 0.08 : (0.42 + noise * 0.2);
    let turbidity = simulatedAnomaly.isBurstActive ? 3.8 : (1.1 + Math.abs(noise));
    let pumpVibration = 1.8 + Math.abs(Math.sin(secondOffset / 5)) * 0.4;
    let gridFlowLPS = simulatedAnomaly.isBurstActive ? 11.4 : (7.2 + noise * 2);

    return jsonResponse(200, {
      success: true,
      data: {
        timestamp: now.toISOString(),
        schemeId: 'JJM-RJ-0492-RAMPUR',
        oht: { capacityLiters: 125000, currentVolumeLiters: Math.round(125000 * (ohtLevel / 100)), waterLevelPercent: Number(ohtLevel.toFixed(1)), headPressureBar: Number(headPressure.toFixed(2)), inflowRateLPS: Number((8.9 + noise).toFixed(2)), outflowRateLPS: Number(gridFlowLPS.toFixed(2)) },
        waterQuality: { residualChlorinePpm: Number(chlorine.toFixed(2)), turbidityNTU: Number(turbidity.toFixed(1)), ph: Number((7.35 + noise * 0.1).toFixed(2)), tdsPpm: Math.round(215 + noise * 10), status: chlorine < 0.2 ? 'Sub-standard Chlorine' : (turbidity > 2.0 ? 'High Turbidity' : 'Safe') },
        sourcePump: { status: 'Running', motorCurrentAmps: Number((21.2 + noise * 2).toFixed(1)), vibrationMMs: Number(pumpVibration.toFixed(2)), bearingTempCelsius: Number((48.5 + noise * 3).toFixed(1)), powerConsumptionKW: 7.4 },
        aiDiagnostics: { systemAnomalyScore: simulatedAnomaly.isBurstActive ? 0.94 : (simulatedAnomaly.isChlorineLow ? 0.82 : 0.08), leakageIndex: simulatedAnomaly.isBurstActive ? 'CRITICAL (Sector 4)' : 'NORMAL (< 4%)', hydraulicEquilibrium: simulatedAnomaly.isBurstActive ? 'DISRUPTED' : 'STABLE', fhtcCompliancePercent: simulatedAnomaly.isBurstActive ? 87.5 : 96.5 }
      }
    });
  }

  // 4. GET /api/alerts
  if (route === '/alerts' && req.method === 'GET') {
    const alerts = readJSON('alerts.json') || [];
    return jsonResponse(200, { success: true, count: alerts.length, data: alerts });
  }

  // 5. POST /api/alerts/:id/resolve
  if (route.startsWith('/alerts/') && route.endsWith('/resolve') && req.method === 'POST') {
    const id = route.split('/')[2];
    let alerts = readJSON('alerts.json') || [];
    alerts = alerts.map(a => a.id === id ? { ...a, isResolved: true, status: 'Resolved by Field Engineer', resolvedAt: new Date().toISOString() } : a);
    writeJSON('alerts.json', alerts);
    return jsonResponse(200, { success: true, message: `Alert ${id} resolved successfully.` });
  }

  // 6. GET /api/grievances
  if (route === '/grievances' && req.method === 'GET') {
    const grievances = readJSON('grievances.json') || [];
    return jsonResponse(200, { success: true, count: grievances.length, data: grievances });
  }

  // 7. POST /api/grievances
  if (route === '/grievances' && req.method === 'POST') {
    getBody((err, payload) => {
      if (err) return jsonResponse(400, { success: false, error: 'Invalid JSON body' });
      const grievances = readJSON('grievances.json') || [];
      const newId = `GRV-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      let detectedFault = 'General pipeline pressure fluctuation';
      let priority = 'P2 - High';
      let slaHours = 48;
      const desc = (payload.description || '').toLowerCase();
      if (desc.includes('burst') || desc.includes('no water') || desc.includes('leak') || desc.includes('फूट') || desc.includes('सूखा')) { priority = 'P1 - Critical'; slaHours = 24; detectedFault = 'Major supply disruption or pipeline fracture in consumer sector'; }
      else if (desc.includes('turbid') || desc.includes('dirty') || desc.includes('smell') || desc.includes('गंदा')) { priority = 'P2 - High'; slaHours = 24; detectedFault = 'Turbidity/Water Quality violation (Requires FTK validation)'; }

      const newGrievance = {
        id: newId, fhtcId: payload.fhtcId || 'FHTC-RJ-JAI-008', consumerName: payload.consumerName || 'Citizen Resident',
        hindiName: payload.hindiName || payload.consumerName || 'नागरिक', phone: payload.phone || '+91 98000 00000',
        village: payload.village || 'Rampur', ward: payload.ward || 'Ward 2', sujalGaonId: payload.sujalGaonId || 'SG-RJ-JAI-1042',
        category: payload.category || 'Supply Disruption', categoryHindi: payload.categoryHindi || 'पानी की आपूर्ति में बाधा',
        description: payload.description || '', descriptionHindi: payload.descriptionHindi || payload.description || '',
        photoUrl: payload.photoUrl || 'assets/complaints/user_upload.jpg', hasVoiceNote: Boolean(payload.hasVoiceNote),
        voiceDuration: payload.voiceDuration || '0:15', voiceTranscript: payload.voiceTranscript || 'आवाज संदेश रिकॉर्ड किया गया',
        coordinates: payload.coordinates || [26.9850, 75.8520], priority, status: 'Registered',
        assignedTo: 'Sunita Meena (Jal Sahiya) & VWSC Rampur', createdAt: new Date().toISOString(), slaHours,
        aiAnalysis: { confidence: 0.92, detectedFault, recommendedAction: 'Assigned to VWSC emergency roster. SMS dispatch alert triggered to pump operator.' }
      };
      grievances.unshift(newGrievance);
      writeJSON('grievances.json', grievances);
      return jsonResponse(201, { success: true, message: 'Grievance registered and AI triage complete.', data: newGrievance });
    });
    return;
  }

  // 8. POST /api/grievances/:id/status
  if (route.startsWith('/grievances/') && route.endsWith('/status') && req.method === 'POST') {
    const id = route.split('/')[2];
    getBody((err, payload) => {
      let grievances = readJSON('grievances.json') || [];
      let updated = null;
      grievances = grievances.map(g => {
        if (g.id === id) { updated = { ...g, status: payload.status || 'Resolved', resolutionNote: payload.note || 'Resolved and verified by Gram Panchayat Jal Sahiya.', resolvedAt: new Date().toISOString() }; return updated; }
        return g;
      });
      writeJSON('grievances.json', grievances);
      return jsonResponse(200, { success: true, data: updated });
    });
    return;
  }

  // 9. GET /api/ai/predictive-models
  if (route === '/ai/predictive-models' && req.method === 'GET') {
    return jsonResponse(200, {
      success: true,
      data: {
        models: [
          { id: 'MDL-ANOMALY-01', name: 'Hydraulic Wavelet & Isolation Forest Anomaly Engine', version: 'v3.2.4', target: 'Pipe burst, clandestine pump suction, valve jamming', precision: 96.8, recall: 94.2, f1Score: 95.5, currentRiskLevel: simulatedAnomaly.isBurstActive ? 'CRITICAL (0.94)' : 'NOMINAL (0.06)' },
          { id: 'MDL-PRED-PUMP-02', name: 'LSTM Multi-Variate Degradation Predictor', version: 'v2.1.0', target: 'Motor bearing burnout, impeller cavitation, dry run', precision: 92.4, recall: 89.6, f1Score: 91.0, currentRiskLevel: 'ELEVATED (Vibration 4.8 mm/s on Borewell #1)' },
          { id: 'MDL-CHLORINE-03', name: 'First-Order Chlorine Decay Kinetic Model', version: 'v1.8.2', target: 'Microbial breakthrough, residual chlorine dissipation at tail ends', precision: 97.5, recall: 95.1, f1Score: 96.3, currentRiskLevel: simulatedAnomaly.isChlorineLow ? 'HIGH DEFICIENCY (0.08 ppm)' : 'SAFE (0.38 ppm)' },
          { id: 'MDL-LPCD-FORECAST', name: 'Prophet Demand Forecasting & Equity Distribution Optimizer', version: 'v2.4.0', target: '55 LPCD service delivery assurance for all socio-economic wards', precision: 94.0, recall: 93.5, f1Score: 93.7, currentRiskLevel: 'BALANCED (Average 57.2 LPCD)' }
        ],
        hydraulicLocalization: { burstPinpoint: simulatedAnomaly.isBurstActive ? { segment: 'SEG-04 (South Ward)', chainageMeters: 340, lat: 26.9830, lng: 75.8518, leakageLossLPH: 420, confidence: 0.94 } : null }
      }
    });
  }

  // 10. POST /api/simulate/chaos
  if (route === '/simulate/chaos' && req.method === 'POST') {
    getBody((err, payload) => {
      const eventType = payload.event;
      if (eventType === 'burst') {
        simulatedAnomaly.isBurstActive = true;
        let alerts = readJSON('alerts.json') || [];
        if (!alerts.find(a => a.id === 'ALT-AI-2026-904')) {
          alerts.unshift({ id: 'ALT-AI-2026-904', type: 'Pipeline Burst / Major Leakage', typeHindi: 'मुख्य पाइपलाइन फटने / भारी रिसाव की चेतावनी', severity: 'CRITICAL', village: 'Rampur GP', location: 'South Ward Tail Line (SEG-04, Chainage 340m)', timestamp: new Date().toISOString(), aiModel: 'Hydraulic Gradient Wavelet & Flow Mass Balance', confidence: 94.6, metrics: { upstreamFlowLPS: 3.4, downstreamFlowLPS: 0.6, headLossSurgeBar: 0.65, estimatedWaterLossRateLPH: 420, affectedFHTCCount: 14 }, diagnosis: 'Rapid hydraulic depression detected downstream of Node 4 with mass-balance divergence exceeding 78%. Rupture confirmed.', action: 'Immediate isolation of Sluice Valve #2. Work order auto-dispatched.', status: 'Active Unacknowledged', isResolved: false });
          writeJSON('alerts.json', alerts);
        }
        return jsonResponse(200, { success: true, message: 'Simulated pipeline burst in Sector 4! AI detected within 1.2s.', simulatedAnomaly });
      } else if (eventType === 'chlorine_drop') {
        simulatedAnomaly.isChlorineLow = true;
        return jsonResponse(200, { success: true, message: 'Simulated residual chlorine drop! WQEWS alert triggered.', simulatedAnomaly });
      } else if (eventType === 'reset') {
        simulatedAnomaly.isBurstActive = false;
        simulatedAnomaly.isChlorineLow = false;
        simulatedAnomaly.isLowPressureSimulated = false;
        return jsonResponse(200, { success: true, message: 'Reset grid state to optimal functionality.', simulatedAnomaly });
      } else {
        return jsonResponse(400, { success: false, error: 'Unknown event type' });
      }
    });
    return;
  }

  // 11. GET /api/imis/status
  if (route === '/imis/status' && req.method === 'GET') {
    const imisData = readJSON('imis_sync_log.json');
    return jsonResponse(200, { success: true, data: imisData });
  }

  // 12. POST /api/imis/sync-now
  if (route === '/imis/sync-now' && req.method === 'POST') {
    const imisData = readJSON('imis_sync_log.json') || { recentSyncLogs: [] };
    const nowIso = new Date().toISOString();
    const newBatch = { batchId: `BATCH-${Date.now().toString().slice(-8)}`, timestamp: nowIso, recordsCount: 1050, status: 'SUCCESS (HTTP 200 OK)', latencyMs: Math.floor(250 + Math.random() * 150), payloadSummary: 'Real-time telemetry, 340 FHTC statuses, Sujal Gaon Har Ghar Jal verification payload pushed to JJM National Data Portal.' };
    imisData.recentSyncLogs.unshift(newBatch);
    imisData.imisConfig.lastSuccessfulSync = nowIso;
    imisData.imisConfig.totalBatchesProcessed += 1;
    writeJSON('imis_sync_log.json', imisData);
    return jsonResponse(200, { success: true, message: 'Synchronized with JJM-IMIS National Gateway successfully.', syncResult: newBatch });
  }

  // 13. GET /api/export/compliance-report
  if (route === '/export/compliance-report' && req.method === 'GET') {
    const schemes = readJSON('schemes.json');
    const fhtcs = readJSON('fhtc_database.json');
    const imis = readJSON('imis_sync_log.json');
    const report = {
      title: 'Jal Jeevan Mission - FHTC Functionality & Sustainability Audit Report',
      generatedAt: new Date().toISOString(),
      governingBody: 'Ministry of Jal Shakti, Department of Drinking Water and Sanitation',
      nationalSummary: schemes.summary, focusGramPanchayat: schemes.focusGramPanchayats[0],
      totalFHTCsAudited: fhtcs.fhtcs.length, averageDeliveredLPCD: 57.2,
      serviceBenchmarkStandard: '55 LPCD Potable Water with >= 7m Terminal Pressure (BIS 10500)',
      sujalGaonCertification: imis.sujalGaonRegistry[0],
      fhtcBreakdown: fhtcs.fhtcs.map(f => ({ id: f.fhtcId, headOfFamily: f.consumerName, ward: f.wardNumber, lpcd: f.lpcd, pressureBar: f.terminalPressureBar, chlorinePpm: f.chlorineMgL, status: f.status }))
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="JJM_FHTC_Functionality_Audit_Report.json"' });
    return res.end(JSON.stringify(report, null, 2));
  }

  // 14. GET /api/solar-energy
  if (route === '/solar-energy' && req.method === 'GET') {
    const now = new Date();
    const hour = now.getHours();
    let solarMultiplier = 0;
    if (hour >= 6 && hour <= 18) solarMultiplier = Math.sin(((hour - 6) / 12) * Math.PI);
    const solarGenerationKW = Number((14.5 * solarMultiplier + (Math.random() * 0.4)).toFixed(2));
    const pumpDrawKW = 7.4;
    return jsonResponse(200, {
      success: true,
      data: {
        schemeId: 'JJM-RJ-0492-RAMPUR', solarArrayCapacityKW: 18.0, currentSolarOutputKW: solarGenerationKW, pumpDemandKW: pumpDrawKW, netGridFlowKW: Number((solarGenerationKW - pumpDrawKW).toFixed(2)),
        batteryStorage: { capacityKWh: 30.0, currentChargeKWh: 24.6, socPercent: 82.0, status: solarGenerationKW > pumpDrawKW ? 'Charging (Solar)' : 'Standby / Floating' },
        dailyMetrics: { totalSolarGeneratedKWh: 86.4, totalPumpEnergyConsumedKWh: 58.2, gridExportedKWh: 28.2, carbonOffsetKgCO2: 70.8, dailyElectricityBillSavingsRupees: 692.00, cumulativeCO2SavedTons: 18.4 },
        aiOptimizer: { mode: 'Smart Solar-First Pump Schedule', solarWindowRecommendation: 'Optimal pumping window: 10:00 - 15:30 IST (Zero Grid Cost)', savingsForecastAnnualRupees: 252000 }
      }
    });
  }

  // 15. POST /api/hydraulic/simulate-valve
  if (route === '/hydraulic/simulate-valve' && req.method === 'POST') {
    getBody((err, payload) => {
      const valveId = payload.valveId || 'VALVE-02';
      const throttlePercent = Number(payload.throttlePercent) || 70;
      const ward2Pressure = 0.85 + (throttlePercent / 100) * 0.45;
      const ward3Pressure = 1.10 - (throttlePercent / 100) * 0.15;
      return jsonResponse(200, { success: true, valveId, throttlePercent, recomputedHydraulics: { ward1HeadMeters: Number((1.45 * 10.197).toFixed(1)), ward2HeadMeters: Number((ward2Pressure * 10.197).toFixed(1)), ward3HeadMeters: Number((ward3Pressure * 10.197).toFixed(1)), equitabilityIndex: 0.94, statusMessage: `Valve ${valveId} throttled to ${throttlePercent}%. Tail-end head elevated to ${Number((ward2Pressure * 10.197).toFixed(1))}m.` } });
    });
    return;
  }

  // 16. POST /api/broadcast/send
  if (route === '/broadcast/send' && req.method === 'POST') {
    getBody((err, payload) => {
      const channel = payload.channel || 'whatsapp';
      const ward = payload.targetWard || 'All Wards';
      const message = payload.message || 'जल जीवन मिशन - आवश्यक सूचना';
      const dispatchLog = { broadcastId: `BC-${Date.now().toString().slice(-6)}`, channel, ward, message, recipientCount: ward === 'All Wards' ? 340 : 112, deliveredCount: ward === 'All Wards' ? 336 : 110, deliveryRatePercent: 98.8, dispatchedAt: new Date().toISOString(), sarpanchApproval: 'Approved by Smt. Kamla Devi (Sarpanch)' };
      return jsonResponse(200, { success: true, message: `Broadcast message sent to ${dispatchLog.deliveredCount} households via ${channel.toUpperCase()}!`, data: dispatchLog });
    });
    return;
  }

  // 17. GET /api/sujal-gaon/certificate
  if (route === '/sujal-gaon/certificate' && req.method === 'GET') {
    return jsonResponse(200, {
      success: true,
      data: {
        certificateNumber: 'JJM/SG/RJ/2026/0492', sujalGaonId: 'SG-RJ-JAI-1042', village: 'Rampur', gramPanchayat: 'Rampur Gram Panchayat', block: 'Amer', district: 'Jaipur', state: 'Rajasthan', certificationStatus: 'CERTIFIED HAR GHAR JAL VILLAGE',
        fourPillarsAudit: { pillar1_Quantity: '57.2 LPCD Delivered (100% compliant with >= 55 LPCD norm)', pillar2_Quality: '100% Potable (Tested safe under BIS 10500 by NABL Lab & FTKs)', pillar3_Regularity: '348 Days/Year Consistent Supply (Norm: >= 300 days)', pillar4_Sustainability: 'Active VWSC Committee, 92% Water User Tariff Recovery' },
        auditAgency: 'Quality Council of India (QCI) & Third-Party Inspection Team', gramSabhaResolutionDate: '2025-11-15', qrVerificationHash: '0x8f4d92a10b7e53c48001d99ef87b003a',
        signatories: [{ name: 'Smt. Kamla Devi', designation: 'Sarpanch, Rampur Gram Panchayat' }, { name: 'Shri R. K. Sharma', designation: 'Executive Engineer, DWSM Jaipur' }, { name: 'Smt. Sunita Meena', designation: 'Jal Sahiya Coordinator' }]
      }
    });
  }

  // 18. GET /api/water-balance
  if (route === '/water-balance' && req.method === 'GET') {
    const isBurst = simulatedAnomaly.isBurstActive;
    const systemInputVolume = 110000;
    const realLosses = isBurst ? 14200 : 4200;
    const apparentLosses = 1800;
    const totalLosses = realLosses + apparentLosses;
    const authorizedConsumption = systemInputVolume - totalLosses;
    const billedAuthorized = Math.round(authorizedConsumption * 0.94);
    const nrwPercentage = Number(((totalLosses / systemInputVolume) * 100).toFixed(1));
    return jsonResponse(200, { success: true, data: { auditPeriod: 'Current Operational Day (24-Hour Cycle)', systemInputVolumeLPD: systemInputVolume, authorizedConsumptionLPD: authorizedConsumption, billedAuthorizedLPD: billedAuthorized, unbilledAuthorizedLPD: authorizedConsumption - billedAuthorized, waterLossesLPD: totalLosses, realLossesLPD: realLosses, apparentLossesLPD: apparentLosses, nrwPercentage, nrwBenchmarkGrade: nrwPercentage < 10 ? 'A1 - Outstanding (JJM Best Practice)' : nrwPercentage < 15 ? 'A2 - Compliant' : 'B - Action Required', economicSavingsRupeesPerMonth: isBurst ? 8500 : 21600, iwaMatrix: { ownSourcesPumpingLPD: 110000, treatedWaterLPD: 110000, transmissionDeliveryLPD: systemInputVolume - (isBurst ? 8000 : 1200), distributionEndUseLPD: authorizedConsumption } } });
  }

  // 19. GET /api/weather-demand
  if (route === '/weather-demand' && req.method === 'GET') {
    return jsonResponse(200, {
      success: true,
      data: {
        imdStation: 'Jaipur Rural Automated Weather Station (IMD-AWS-492)',
        currentWeather: { temperatureC: 38.4, feelsLikeC: 40.1, humidityPercent: 26, windSpeedKmh: 14.2, solarRadiationWm2: 890, uvIndex: 9.2, condition: 'Clear & Sunny (Heatwave Advisory)', heatwaveAlertLevel: 'Amber' },
        forecast7Days: [
          { day: 'Today', tempC: 38.4, rainfallMm: 0, lpcdDemand: 57.2, surgePercent: 0, recommendation: 'Standard 2-shift solar pumping' },
          { day: 'Tomorrow', tempC: 39.8, rainfallMm: 0, lpcdDemand: 60.1, surgePercent: 5.1, recommendation: 'Increase afternoon storage buffer' },
          { day: 'Wed', tempC: 41.5, rainfallMm: 0, lpcdDemand: 64.2, surgePercent: 12.2, recommendation: 'Heatwave Alert: Pre-pump 15k L in solar window' },
          { day: 'Thu', tempC: 40.8, rainfallMm: 0, lpcdDemand: 62.5, surgePercent: 9.3, recommendation: 'Maintain elevated OHT head >= 1.5 Bar' },
          { day: 'Fri', tempC: 37.2, rainfallMm: 2, lpcdDemand: 56.0, surgePercent: -2.1, recommendation: 'Nominal supply schedule' },
          { day: 'Sat', tempC: 35.0, rainfallMm: 14, lpcdDemand: 51.5, surgePercent: -10.0, recommendation: 'Monsoon inflow: reduce pump runtime by 45m' },
          { day: 'Sun', tempC: 34.2, rainfallMm: 8, lpcdDemand: 52.0, surgePercent: -9.1, recommendation: 'Rainwater harvesting recharge active' }
        ],
        aiPrescriptiveRecommendation: 'IMD heatwave alert on Wednesday (41.5°C). AI recommends pre-filling Rampur OHT to 95% between 11:00-14:00 using surplus solar power to maintain >= 55 LPCD across all 340 homes without grid tariff cost.'
      }
    });
  }

  // 20. GET /api/iot-nodes
  if (route === '/iot-nodes' && req.method === 'GET') {
    const iotNodes = [
      { id: 'NODE-PT-01', name: 'OHT Tank Base Pressure', type: 'Pressure Transducer', protocol: 'LoRaWAN 865 MHz', battery: 94, rssi: -72, status: 'Online', lastPingSec: 3, calibrationDaysLeft: 184 },
      { id: 'NODE-PT-02', name: 'Ward 1 Header Pressure', type: 'Pressure Transducer', protocol: 'LoRaWAN 865 MHz', battery: 88, rssi: -79, status: 'Online', lastPingSec: 4, calibrationDaysLeft: 184 },
      { id: 'NODE-PT-03', name: 'Ward 2 Tail-End Pressure', type: 'Pressure Transducer', protocol: 'LoRaWAN 865 MHz', battery: 82, rssi: -88, status: simulatedAnomaly.isLowPressureSimulated ? 'Warning' : 'Online', lastPingSec: 2, calibrationDaysLeft: 96 },
      { id: 'NODE-PT-04', name: 'Ward 3 School Standpost', type: 'Pressure Transducer', protocol: 'LoRaWAN 865 MHz', battery: 91, rssi: -75, status: 'Online', lastPingSec: 5, calibrationDaysLeft: 184 },
      { id: 'NODE-ACOUST-05', name: 'Sector 4 Acoustic Wavelet Sensor', type: 'Transient Acoustic', protocol: '4G NB-IoT', battery: 100, rssi: -66, status: simulatedAnomaly.isBurstActive ? 'Critical Alert' : 'Online', lastPingSec: 1, calibrationDaysLeft: 310 },
      { id: 'NODE-WQ-01', name: 'OHT Discharge WQMS Sonde', type: 'Multi-parameter Sonde', protocol: 'RS-485 Modbus', battery: 100, rssi: -60, status: 'Online', lastPingSec: 2, calibrationDaysLeft: 42 },
      { id: 'NODE-WQ-02', name: 'Tail Standpost Chlorine Analyzer', type: 'Colorimetric Chlorine', protocol: 'LoRaWAN 865 MHz', battery: 89, rssi: -84, status: simulatedAnomaly.isChlorineLow ? 'Warning' : 'Online', lastPingSec: 4, calibrationDaysLeft: 58 },
      { id: 'NODE-LV-01', name: 'OHT Tank Ultrasonic Depth Radar', type: 'Level Radar', protocol: 'LoRaWAN 865 MHz', battery: 96, rssi: -71, status: 'Online', lastPingSec: 3, calibrationDaysLeft: 240 },
      { id: 'NODE-FM-01', name: 'Deep Well Inflow Magmeter', type: 'Electromagnetic Flow', protocol: 'Modbus RTU', battery: 100, rssi: -64, status: 'Online', lastPingSec: 2, calibrationDaysLeft: 215 },
      { id: 'NODE-VALVE-01', name: 'Ward 1 Motorized Sluice Valve', type: 'Smart Actuator', protocol: 'LoRaWAN Actuator', battery: 87, rssi: -78, status: 'Online', lastPingSec: 6, calibrationDaysLeft: 365 },
      { id: 'NODE-VALVE-02', name: 'Ward 2 Motorized Sluice Valve', type: 'Smart Actuator', protocol: 'LoRaWAN Actuator', battery: 85, rssi: -86, status: 'Online', lastPingSec: 5, calibrationDaysLeft: 365 },
      { id: 'NODE-SOLAR-01', name: '18 kW Solar MPPT Gateway', type: 'Solar Telemetry', protocol: 'Modbus TCP / WiFi', battery: 100, rssi: -62, status: 'Online', lastPingSec: 1, calibrationDaysLeft: 720 }
    ];
    return jsonResponse(200, { success: true, summary: { totalNodes: iotNodes.length, onlineNodes: iotNodes.filter(n => n.status === 'Online').length, warningNodes: iotNodes.filter(n => n.status !== 'Online').length, gatewayUptime: '99.96%', totalPacketsReceived: 218450, packetLossRate: '0.04%' }, nodes: iotNodes });
  }

  // 21. POST /api/ai/jal-doot-query
  if (route === '/ai/jal-doot-query' && req.method === 'POST') {
    getBody((err, payload) => {
      const q = (payload.query || '').trim().toLowerCase();
      const lang = payload.language || 'hi';
      let replyHi = '', replyEn = '', suggestedAction = null;

      if (q.includes('पानी') || q.includes('water') || q.includes('हाल') || q.includes('status') || q.includes('सप्लाई')) {
        replyHi = 'नमस्ते! आज रामपुर ग्राम पंचायत में पानी की स्थिति बहुत अच्छी है। 340 में से 328 नल सुचारू हैं और औसत 56.8 लीटर प्रति व्यक्ति प्रतिदिन पानी मिल रहा है।';
        replyEn = 'Hello! The water supply in Rampur Gram Panchayat is optimal today. 328 of 340 household taps are fully functional, delivering an average of 56.8 LPCD.';
        suggestedAction = { type: 'switchTab', tab: 'dashboard', label: '📊 डैशबोर्ड देखें (View Dashboard)' };
      } else if (q.includes('पीने') || q.includes('safe') || q.includes('शुद्ध') || q.includes('quality') || q.includes('क्लोरीन') || q.includes('chlorine')) {
        const cl = simulatedAnomaly.isChlorineLow ? '0.08 ppm (चेतावनी: बहुत कम)' : '0.38 ppm (सुरक्षित)';
        replyHi = `रामपुर का पेयजल BIS 10500 मानकों के अनुसार 100% शुद्ध और सुरक्षित है। वर्तमान में क्लोरीन का स्तर ${cl} है।`;
        replyEn = `Drinking water in Rampur satisfies BIS 10500 standards. Residual chlorine is at ${simulatedAnomaly.isChlorineLow ? '0.08 ppm (Warning)' : '0.38 ppm (Safe)'}.`;
        suggestedAction = { type: 'switchTab', tab: 'wqms', label: '🧪 जल गुणवत्ता देखें (View WQMS)' };
      } else if (q.includes('लीक') || q.includes('leak') || q.includes('burst') || q.includes('टूटा') || q.includes('पाइप')) {
        replyHi = simulatedAnomaly.isBurstActive ? 'सावधान! सेक्टर 4 में पाइपलाइन में रिसाव का पता चला है। एआई ने तुरंत चेतावनी जारी की है।' : 'फिलहाल मुख्य पाइपलाइनों में कोई गंभीर रिसाव नहीं है।';
        replyEn = simulatedAnomaly.isBurstActive ? 'Alert! A pipeline rupture has been detected in Sector 4. AI has raised an alert.' : 'Currently no active pipeline bursts are detected.';
        suggestedAction = { type: 'switchTab', tab: 'ai', label: '🧠 एआई वेवलेट देखें (View AI Wavelet)' };
      } else if (q.includes('सोलर') || q.includes('solar') || q.includes('बिजली') || q.includes('बचत')) {
        replyHi = 'रामपुर का 18 किलोवाट सोलर पीवी प्लांट आज पूरी क्षमता से काम कर रहा है! आज ₹692 की बिजली बचत हुई।';
        replyEn = 'Rampur's 18 kW Solar PV array is at peak efficiency, saving ₹692 in grid electricity today.';
        suggestedAction = { type: 'switchTab', tab: 'solar', label: '☀️ सोलर ग्रिड देखें (View Solar Grid)' };
      } else if (q.includes('सर्टिफिकेट') || q.includes('certificate') || q.includes('सुजल') || q.includes('sujal') || q.includes('हर घर जल')) {
        replyHi = 'रामपुर ग्राम पंचायत को "प्रमाणित हर घर जल सुजल गांव" (ID: SG-RJ-JAI-1042) का दर्जा प्राप्त है।';
        replyEn = 'Rampur is a certified "Har Ghar Jal Sujal Gaon" (ID: SG-RJ-JAI-1042), scoring 96.8/100 on the 4 Pillars Audit.';
        suggestedAction = { type: 'openCertificate', label: '🏅 प्रमाण पत्र देखें (View Certificate)' };
      } else {
        replyHi = 'मैं जलदृष्टि AI जल-दूत हूँ! आप मुझसे जल आपूर्ति, पानी की शुद्धता, सोलर बचत, पाइप लीकेज या हर घर जल प्रमाण पत्र के बारे में कुछ भी पूछ सकते हैं।';
        replyEn = 'I am Jal-Doot, your AI drinking water assistant! Ask me about water supply, potability, solar savings, leaks, or Har Ghar Jal certification.';
        suggestedAction = { type: 'switchTab', tab: 'dashboard', label: '📊 डैशबोर्ड देखें' };
      }

      return jsonResponse(200, { success: true, query: payload.query, language: lang, reply: lang === 'hi' ? replyHi : replyEn, replyBilingual: { hi: replyHi, en: replyEn }, suggestedAction });
    });
    return;
  }

  // 22. POST /api/community/endorse-audit
  if (route === '/community/endorse-audit' && req.method === 'POST') {
    getBody((err, payload) => {
      const endorserName = payload.endorserName || 'Gram Sabha Member';
      const role = payload.role || 'Village Resident';
      return jsonResponse(200, { success: true, message: `सामाजिक अंकेक्षण सफलतापूर्वक दर्ज किया गया! धन्यवाद ${endorserName}। (Social audit endorsement successfully recorded!)`, endorsement: { id: `SA-RJ-${Date.now().toString().slice(-6)}`, endorserName, role, timestamp: new Date().toISOString(), fourPillarsAffirmed: true, verificationHash: '0x' + Math.random().toString(16).slice(2, 10) } });
    });
    return;
  }

  // Not matched
  return jsonResponse(404, { success: false, error: 'API route not found' });
};
