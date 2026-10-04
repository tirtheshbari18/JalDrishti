/**
 * JalDrishti (जलदृष्टि) - Community Stewardship & Jal Sahiya Social Audit
 * Citizen & VWSC participatory governance, FTK test certification, and social audits.
 */

window.CommunityStewardship = (function() {
  const jalSahiyas = [
    { name: 'Sunita Meena', role: 'Chief Jal Sahiya Coordinator', village: 'Rampur', testsConducted: 142, rating: 4.9, badge: 'Water Champion (जल सखी)' },
    { name: 'Geeta Devi', role: 'FTK Testing In-Charge (Ward 1 & 2)', village: 'Rampur', testsConducted: 118, rating: 4.8, badge: 'Purity Guardian' },
    { name: 'Radha Sharma', role: 'Community Mobilizer & Chlorination', village: 'Rampur', testsConducted: 96, rating: 4.7, badge: 'Community Hero' },
    { name: 'Santosh Jat', role: 'School & Anganwadi Water Quality', village: 'Rampur', testsConducted: 84, rating: 4.8, badge: 'Child Health Vanguard' }
  ];

  function renderLeaderboard() {
    const container = document.getElementById('sahiyaLeaderboardContainer');
    if (!container) return;

    container.innerHTML = jalSahiyas.map((s, idx) => `
      <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:12px 14px; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:1.4rem;">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🎖️'}</div>
          <div>
            <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">${s.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${s.role}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge badge-success" style="font-size:0.7rem;">${s.badge}</span>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:3px;">
            <strong>${s.testsConducted}</strong> FTK Tests • ⭐ ${s.rating}/5
          </div>
        </div>
      </div>
    `).join('');
  }

  async function submitEndorsement(e) {
    if (e) e.preventDefault();
    const nameInput = document.getElementById('endorserNameInput');
    const roleInput = document.getElementById('endorserRoleInput');

    const name = nameInput ? nameInput.value.trim() : 'Village Resident';
    const role = roleInput ? roleInput.value : 'Gram Sabha Member';

    try {
      const res = await fetch('/api/community/endorse-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endorserName: name, role })
      });
      const data = await res.json();

      if (data.success) {
        if (window.showToast) window.showToast(data.message, 'success');
        const badge = document.getElementById('endorsementAffirmationBadge');
        if (badge) {
          badge.innerHTML = `✓ Digital Affirmation Verified by <strong>${name}</strong> (${role}) at ${new Date().toLocaleTimeString()} (Hash: ${data.endorsement.verificationHash})`;
          badge.style.display = 'block';
        }
        if (nameInput) nameInput.value = '';
      }
    } catch (err) {
      if (window.showToast) window.showToast('Failed to record affirmation.', 'error');
    }
  }

  return {
    init: renderLeaderboard,
    submitEndorsement: submitEndorsement
  };
})();
