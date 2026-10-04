/**
 * JalDrishti - Har Ghar Jal Certified Sujal Gaon Digital Certificate Modal
 */

window.CertificateModal = {
  certData: null,

  async open() {
    const modal = document.getElementById('certificateModalOverlay');
    if (!modal) return;

    try {
      const res = await fetch('/api/sujal-gaon/certificate');
      const json = await res.json();
      if (json.success) {
        this.certData = json.data;
        this.renderCertificate(json.data);
      }
    } catch (e) {
      console.warn('Certificate fetch error:', e);
    }
    modal.classList.add('active');
  },

  close() {
    const modal = document.getElementById('certificateModalOverlay');
    if (modal) modal.classList.remove('active');
  },

  renderCertificate(cert) {
    const container = document.getElementById('certificateContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="background:#ffffff; color:#0f172a; padding:36px; border:8px double #0284c7; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.5); position:relative; font-family:'Outfit', sans-serif;">
        <!-- Top National Strip -->
        <div style="text-align:center; border-bottom:2px solid #e2e8f0; padding-bottom:18px; margin-bottom:20px;">
          <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom:8px;">
            <svg style="width:36px; height:44px;" viewBox="0 0 40 48" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#0284c7" stroke-width="2"/>
              <path d="M20 6C20 6 12 18 12 24C12 28.4183 15.5817 32 20 32C24.4183 32 28 28.4183 28 24C28 18 20 6 20 6Z" fill="#0284c7"/>
              <circle cx="20" cy="24" r="3" fill="#ffffff"/>
              <path d="M8 40H32" stroke="#ff9933" stroke-width="3"/>
              <path d="M12 44H28" stroke="#138808" stroke-width="3"/>
            </svg>
          </div>
          <div style="font-size:0.85rem; font-weight:700; color:#ff9933; text-transform:uppercase; letter-spacing:1px;">
            Government of India • Ministry of Jal Shakti
          </div>
          <div style="font-size:0.75rem; color:#64748b;">
            Department of Drinking Water & Sanitation | National Jal Jeevan Mission
          </div>
          <h2 style="font-size:1.6rem; font-weight:900; color:#0369a1; margin-top:8px; text-transform:uppercase; letter-spacing:0.5px;">
            हर घर जल (Har Ghar Jal) Certificate
          </h2>
          <div style="font-size:0.85rem; color:#059669; font-weight:700;">
            SUJAL GAON ACCREDITATION & SUSTAINED FUNCTIONALITY COMPLIANCE
          </div>
        </div>

        <!-- Body Text -->
        <div style="text-align:center; margin-bottom:24px; line-height:1.7; font-size:0.95rem; color:#334155;">
          This is to officially certify that Gram Panchayat <strong>${cert.gramPanchayat}</strong>, 
          Block <strong>${cert.block}</strong>, District <strong>${cert.district} (${cert.state})</strong>, 
          bearing Sujal Gaon ID <strong style="color:#0284c7;">${cert.sujalGaonId}</strong>, has successfully provided 
          <strong>100% Functional Household Tap Connections (FHTCs)</strong> delivering clean potable water meeting the 
          <strong>55 Litres Per Capita Daily (LPCD)</strong> benchmark with continuous IoT sensor & AI surveillance.
        </div>

        <!-- 4 Pillars Table -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:16px; margin-bottom:24px;">
          <div style="font-weight:800; font-size:0.82rem; color:#0369a1; text-transform:uppercase; margin-bottom:10px; text-align:center;">
            Verified Four Pillars of Sustainability Audit
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.82rem;">
            <div>💧 <strong>Adequate Quantity:</strong> ${cert.fourPillarsAudit.pillar1_Quantity}</div>
            <div>🧪 <strong>Potable Quality:</strong> ${cert.fourPillarsAudit.pillar2_Quality}</div>
            <div>⏱️ <strong>Regularity:</strong> ${cert.fourPillarsAudit.pillar3_Regularity}</div>
            <div>🤝 <strong>Community O&M:</strong> ${cert.fourPillarsAudit.pillar4_Sustainability}</div>
          </div>
        </div>

        <!-- Signatures & QR Code Verification -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:2px solid #e2e8f0; padding-top:20px;">
          <!-- QR Code Mockup -->
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:68px; height:68px; background:#0f172a; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">
              📱
            </div>
            <div style="font-size:0.72rem; color:#64748b;">
              <div>Certificate No: <strong>${cert.certificateNumber}</strong></div>
              <div>Audit Agency: <strong>${cert.auditAgency}</strong></div>
              <div>Cryptographic Verification Hash:</div>
              <code style="font-size:0.65rem; color:#0284c7;">${cert.qrVerificationHash}</code>
            </div>
          </div>

          <!-- Official Signatures -->
          <div style="display:flex; gap:24px; text-align:center;">
            <div>
              <div style="font-family:cursive; font-size:1.1rem; color:#0369a1; margin-bottom:4px;">Kamla Devi</div>
              <div style="border-top:1px solid #94a3b8; font-size:0.72rem; font-weight:700; color:#334155; padding-top:2px;">
                Sarpanch / VWSC President
              </div>
            </div>
            <div>
              <div style="font-family:cursive; font-size:1.1rem; color:#0369a1; margin-bottom:4px;">R. K. Sharma</div>
              <div style="border-top:1px solid #94a3b8; font-size:0.72rem; font-weight:700; color:#334155; padding-top:2px;">
                Executive Engineer, DWSM
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  printCertificate() {
    window.print();
  }
};
