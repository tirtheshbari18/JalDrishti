/**
 * Jal Samvad (जल संवाद) - Citizen Mobile Feedback & Grievance Portal
 */

window.CitizenPortal = {
  selectedCategory: 'No Water Supply',
  selectedCategoryHindi: 'पानी की आपूर्ति बंद',
  isRecordingVoice: false,
  voiceTimer: null,
  voiceSeconds: 0,
  uploadedPhotoData: null,

  init() {
    this.setupCategoryTiles();
    this.setupVoiceRecorder();
    this.setupPhotoUpload();
    this.setupFormSubmit();
  },

  setupCategoryTiles() {
    document.querySelectorAll('.category-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        this.selectedCategory = tile.dataset.categoryEn;
        this.selectedCategoryHindi = tile.dataset.categoryHi;

        // Auto populate sample description if empty
        const descArea = document.getElementById('grvDescInput');
        if (descArea && !descArea.value.trim()) {
          const defaults = {
            'No Water Supply': 'No water supply in tap for past 24 hours. Neighboring standposts are also dry.',
            'Low Pressure': 'Water pressure is extremely weak. Water trickles out very slowly.',
            'Turbid / Foul Water': 'Tap water is brownish and cloudy with heavy silt and chlorine smell.',
            'Pipeline Burst / Leakage': 'Underground distribution pipe is leaking heavily near the primary school lane.'
          };
          descArea.value = defaults[this.selectedCategory] || '';
        }
      });
    });
  },

  setupVoiceRecorder() {
    const recordBtn = document.getElementById('voiceRecordBtn');
    const timerText = document.getElementById('voiceTimerText');
    const transcriptBox = document.getElementById('voiceTranscriptBox');
    if (!recordBtn) return;

    recordBtn.addEventListener('click', () => {
      if (!this.isRecordingVoice) {
        // Start recording simulation
        this.isRecordingVoice = true;
        recordBtn.classList.add('recording');
        this.voiceSeconds = 0;
        recordBtn.innerHTML = '⏹️';
        if (timerText) timerText.textContent = 'Recording: 0:00';
        if (transcriptBox) transcriptBox.textContent = 'Listening to voice in Hindi / Regional dialect...';

        SoundFX.playBeep(600, 'sine', 0.1);

        this.voiceTimer = setInterval(() => {
          this.voiceSeconds++;
          const secFormatted = this.voiceSeconds < 10 ? `0${this.voiceSeconds}` : this.voiceSeconds;
          if (timerText) timerText.textContent = `Recording: 0:${secFormatted}`;

          if (this.voiceSeconds >= 6) {
            // Auto complete speech simulation
            this.stopVoiceRecording();
          }
        }, 1000);

      } else {
        this.stopVoiceRecording();
      }
    });
  },

  stopVoiceRecording() {
    this.isRecordingVoice = false;
    clearInterval(this.voiceTimer);
    const recordBtn = document.getElementById('voiceRecordBtn');
    const timerText = document.getElementById('voiceTimerText');
    const transcriptBox = document.getElementById('voiceTranscriptBox');

    if (recordBtn) {
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '🎤';
    }

    if (timerText) timerText.textContent = `Recorded: 0:${this.voiceSeconds < 10 ? '0' + this.voiceSeconds : this.voiceSeconds}`;

    // Simulated speech-to-text conversion for Indian rural dialects
    const sampleTranscripts = [
      'सरपंच जी नमस्ते, हमारे वार्ड 4 में पिछले दो दिनों से एक बूंद पानी नहीं आया। कृपया तुरंत जांच करवाएं।',
      'नल में बहुत कम दबाव आ रहा है, पानी बहुत धीरे टपक रहा है।',
      'पानी बहुत मटमैला आ रहा है, बच्चों को पीने में डर लग रहा है।'
    ];
    const pickedTranscript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];

    if (transcriptBox) {
      transcriptBox.innerHTML = `<strong>AI Speech-to-Text:</strong> "${pickedTranscript}"`;
    }

    showToast('Voice note processed and transcribed via Bhashini AI.', 'success', 'Voice Captured');
    SoundFX.playSuccess();
  },

  setupPhotoUpload() {
    const uploadZone = document.getElementById('photoUploadZone');
    const fileInput = document.getElementById('photoFileInput');
    const previewImg = document.getElementById('photoPreview');
    const sampleBtn = document.getElementById('useSamplePhotoBtn');

    if (uploadZone && fileInput) {
      uploadZone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            if (previewImg) {
              previewImg.src = re.target.result;
              previewImg.style.display = 'block';
            }
            this.uploadedPhotoData = re.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (sampleBtn && previewImg) {
      sampleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // SVG Data URL for simulated tap photo
        const svgSample = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="100%" height="100%" fill="%231e293b"/><text x="50%" y="40%" fill="%2338bdf8" font-size="14" font-family="sans-serif" text-anchor="middle">📷 Simulated FHTC Tap Evidence</text><text x="50%" y="65%" fill="%2394a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">Geo-tag: 26.9855 N, 75.8507 E</text><circle cx="150" cy="150" r="16" fill="%230284c7"/></svg>`;
        previewImg.src = svgSample;
        previewImg.style.display = 'block';
        this.uploadedPhotoData = svgSample;
        showToast('Simulated geotagged photo attached.', 'info');
      });
    }
  },

  setupFormSubmit() {
    const form = document.getElementById('citizenGrievanceForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fhtcId = document.getElementById('grvFhtcInput')?.value.trim() || 'FHTC-RJ-JAI-008';
      const consumerName = document.getElementById('grvNameInput')?.value.trim() || 'Ramesh Kumar (Villager)';
      const phone = document.getElementById('grvPhoneInput')?.value.trim() || '+91 98290 88711';
      const desc = document.getElementById('grvDescInput')?.value.trim() || 'Tap supply disrupted.';
      const transcriptBox = document.getElementById('voiceTranscriptBox');

      const payload = {
        fhtcId,
        consumerName,
        phone,
        village: 'Rampur',
        ward: 'Ward 2',
        sujalGaonId: 'SG-RJ-JAI-1042',
        category: this.selectedCategory,
        categoryHindi: this.selectedCategoryHindi,
        description: desc,
        hasVoiceNote: this.voiceSeconds > 0,
        voiceDuration: `0:${this.voiceSeconds < 10 ? '0' + this.voiceSeconds : this.voiceSeconds}`,
        voiceTranscript: transcriptBox ? transcriptBox.textContent : '',
        photoUrl: this.uploadedPhotoData || 'assets/complaints/user_upload.jpg',
        coordinates: [26.9850, 75.8520]
      };

      try {
        const res = await fetch('/api/grievances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (json.success) {
          showToast(`Grievance #${json.data.id} registered! Assigned to Jal Sahiya.`, 'success', 'Grievance Submitted');
          SoundFX.playSuccess();

          // Refresh grievances list
          const updated = await (await fetch('/api/grievances')).json();
          window.AppState.grievancesData = updated.data;
          this.renderGrievanceList(updated.data);

          // Reset form fields
          form.reset();
          const previewImg = document.getElementById('photoPreview');
          if (previewImg) previewImg.style.display = 'none';
          if (transcriptBox) transcriptBox.textContent = '';
        }
      } catch (err) {
        showToast('Error submitting grievance. Please try again.', 'danger');
      }
    });
  },

  renderGrievanceList(grievances) {
    const container = document.getElementById('grievancesListContainer');
    if (!container || !grievances) return;

    if (grievances.length === 0) {
      container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-muted);">No open grievances recorded.</div>`;
      return;
    }

    container.innerHTML = grievances.map(g => {
      const isResolved = g.status === 'Resolved';
      const isCritical = g.priority.includes('Critical');

      return `
        <div class="grievance-item-card" style="border-left: 4px solid ${isResolved ? 'var(--status-functional)' : (isCritical ? 'var(--status-critical)' : 'var(--status-warning)')};">
          <div class="grievance-top-row">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="grievance-id-tag">${g.id}</span>
              <span class="badge ${isResolved ? 'badge-success' : 'badge-danger'}">${g.status}</span>
              <span class="badge ${isCritical ? 'badge-danger' : 'badge-warning'}">${g.priority}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--text-muted);">
              SLA: <strong>${g.slaHours || 24} Hours</strong>
            </div>
          </div>

          <div>
            <div style="font-weight:700; font-size:0.95rem; margin-bottom:2px;">
              ${g.consumerName} <span style="font-size:0.8rem; font-weight:normal; color:var(--text-muted);">(${g.village}, ${g.ward})</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-highlight); font-weight:600; margin-bottom:4px;">
              ${g.category} / <span style="font-family:var(--font-hindi);">${g.categoryHindi || ''}</span>
            </div>
            <div style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:6px;">
              "${g.description}"
            </div>
            ${g.hasVoiceNote ? `
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:var(--radius-sm); font-size:0.74rem; color:var(--water-electric); margin-bottom:6px;">
                🎙️ Voice Note (${g.voiceDuration || '0:15'}) • <em>${g.voiceTranscript || ''}</em>
              </div>
            ` : ''}
          </div>

          <div class="grievance-ai-box">
            <div class="grievance-ai-title">🤖 AI Automated Triage (${Math.round((g.aiAnalysis?.confidence || 0.9) * 100)}% Confidence)</div>
            <div><strong>Detected Fault:</strong> ${g.aiAnalysis?.detectedFault || 'Disruption identified'}</div>
            <div><strong>Recommended Action:</strong> ${g.aiAnalysis?.recommendedAction || 'Technician dispatched'}</div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--text-muted); border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
            <div>Assigned: <strong>${g.assignedTo}</strong></div>
            ${!isResolved ? `
              <button class="btn btn-secondary btn-sm" onclick="window.CitizenPortal.resolveGrievance('${g.id}')">
                Mark Resolved
              </button>
            ` : `
              <span style="color:var(--status-functional); font-weight:600;">⭐ Resolved & Verified</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  },

  async resolveGrievance(id) {
    try {
      const res = await fetch(`/api/grievances/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved', note: 'Resolved and verified by Gram Panchayat Jal Sahiya.' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Grievance ${id} marked as resolved.`, 'success');
        SoundFX.playSuccess();
        const updated = await (await fetch('/api/grievances')).json();
        window.AppState.grievancesData = updated.data;
        this.renderGrievanceList(updated.data);
      }
    } catch (e) {
      showToast('Failed to update grievance.', 'danger');
    }
  }
};
