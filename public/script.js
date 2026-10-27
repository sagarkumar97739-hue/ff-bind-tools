// ═══════════ PARTICLE BACKGROUND ═══════════
(function initParticles() {
  const canvas = document.getElementById('bg-particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) particles.push({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.5 + 0.5,
  });
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 130) {
        ctx.strokeStyle = `rgba(255, 107, 53, ${0.12 * (1 - d / 130)})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.fillStyle = 'rgba(255, 159, 28, 0.5)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ═══════════ NAVBAR ═══════════
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ═══════════ SCROLL REVEAL ═══════════
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ═══════════ SERVICES ═══════════
const SERVICES = [
  { id: 'bind-info',     icon: '🔍', title: 'Check Bind Info',      desc: 'View player info, current email, pending email, mobile, and cooldown.' },
  { id: 'bind-email',    icon: '📧', title: 'Bind New Email',       desc: 'Attach a new recovery email using OTP verification.' },
  { id: 'unbind-email',  icon: '🔓', title: 'Unbind Email',         desc: 'Remove the currently bound recovery email.' },
  { id: 'change-email',  icon: '🔄', title: 'Change Bind Email',    desc: 'Migrate the recovery email to a new one.' },
  { id: 'cancel-bind',   icon: '❌', title: 'Cancel Pending',       desc: 'Abort any in-progress bind, rebind, or unbind request.' },
  { id: 'eat-token',     icon: '🔑', title: 'EAT → Access Token',   desc: 'Convert a Garena EAT login URL to a valid access token.' },
  { id: 'revoke-token',  icon: '🛡️', title: 'Revoke Access Token',  desc: 'Force-logout any session by revoking its access token.' },
  { id: 'login-history', icon: '📜', title: 'Login History',        desc: 'View recent login history with device info and login type.' },
  { id: 'platform-info', icon: '🔗', title: 'Platform Bind Info',   desc: 'See which third-party platforms are linked to the account.' },
  { id: 'to-jwt',        icon: '🎫', title: 'Access Token → JWT',   desc: 'Convert an access token into a signed game JWT.' },
];

const grid = document.getElementById('servicesGrid');
SERVICES.forEach(s => {
  const card = document.createElement('div');
  card.className = 'svc-card reveal';
  card.innerHTML = `
    <div class="svc-icon">${s.icon}</div>
    <h3>${s.title}</h3>
    <p>${s.desc}</p>
    <span class="svc-cta">Open Tool →</span>`;
  card.addEventListener('click', () => openService(s.id));
  card.addEventListener('mousemove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
  grid.appendChild(card);
  io.observe(card);
});

// ═══════════ MODAL ═══════════
const overlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalSub = document.getElementById('modalSub');
const modalIcon = document.getElementById('modalIcon');
const modalBody = document.getElementById('modalBody');
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
function closeModal() { overlay.classList.remove('open'); modalBody.innerHTML = ''; }

// ═══════════ API HELPER (60s timeout) ═══════════
async function callApi(action, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await fetch(`/api/handler?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const text = await r.text();
    if (!text) return { success: false, error: `Empty response (HTTP ${r.status})` };
    try { return JSON.parse(text); }
    catch {
      const clean = text.replace(/<[^>]+>/g, '').trim().slice(0, 200);
      return { success: false, error: `Server error (HTTP ${r.status})${clean ? ': ' + clean : ''}` };
    }
  } catch (err) {
    if (err.name === 'AbortError') return { success: false, error: '⏱ Request timed out after 60 seconds.' };
    return { success: false, error: `Network error: ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════ UI HELPERS ═══════════
function field(id, label, type = 'text', placeholder = '') {
  return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" placeholder="${placeholder}" autocomplete="off" /></div>`;
}
function submitBtn(text = 'Submit') { return `<button class="btn-primary" id="submitBtn">${text}</button>`; }
function loading() { return `<div class="loading">Processing…</div>`; }
function resultPanel(html, isError = false) { return `<div class="result ${isError ? 'error' : 'success'}">${html}</div>`; }

// ✅ Rich error panel showing Garena's actual response
function errorPanel(r, fallbackMsg = 'Failed') {
  let html = `<b>${r.error || fallbackMsg}</b>`;
  if (r.debug?.garena_response) {
    const g = r.debug.garena_response;
    html += `<br><br><b>Garena response:</b><br><code>${JSON.stringify(g, null, 2)}</code>`;
  }
  return resultPanel(html, true);
}

function validateInputs(ids) {
  let allValid = true;
  let firstInvalid = null;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value.trim()) {
      el.classList.remove('invalid');
      void el.offsetWidth;
      el.classList.add('invalid');
      if (!firstInvalid) firstInvalid = el;
      allValid = false;
      setTimeout(() => el.classList.remove('invalid'), 600);
    }
  });
  if (firstInvalid) firstInvalid.focus();
  return allValid;
}

function playerCard(p) {
  if (!p) return '';
  return `
    <div class="player-card">
      <div class="player-header">Player Information</div>
      <div class="player-row"><span>UID</span><span>${p.uid || 'Unknown'}</span></div>
      <div class="player-row"><span>Nickname</span><span>${p.nickname || 'Unknown'}</span></div>
      <div class="player-row"><span>Region</span><span>${p.region || 'Unknown'}</span></div>
    </div>`;
}

function stepDots(current, total) {
  return `<div class="step-indicator">${Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return `<div class="step-dot ${n === current ? 'active' : n < current ? 'done' : ''}"></div>`;
  }).join('')}</div>`;
}

function openService(id) {
  const svc = SERVICES.find(s => s.id === id);
  modalTitle.textContent = svc.title;
  modalSub.textContent = svc.desc;
  modalIcon.textContent = svc.icon;
  modalBody.innerHTML = '';
  HANDLERS[id].render();
  overlay.classList.add('open');
}

// ═══════════ HANDLERS ═══════════
const HANDLERS = {

  'bind-info': {
    render() {
      modalBody.innerHTML = `${field('token', 'Access Token', 'text', 'Paste your access token')}${submitBtn('Check Bind Info')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('bind-info', { access_token: token });
        if (!r.success && !r.data) return out.innerHTML = errorPanel(r, 'Failed to fetch');
        const d = r.data || {};
        out.innerHTML = resultPanel(`
          ${playerCard(r.player)}
          <div class="kv"><span>Current Email</span><span>${d.current_email || 'None'}</span></div>
          <div class="kv"><span>Pending Email</span><span>${d.pending_email || 'None'}</span></div>
          <div class="kv"><span>Current Mobile</span><span>${d.mobile || 'None'}</span></div>
          <div class="kv"><span>Pending Mobile</span><span>${d.pending_mobile || 'None'}</span></div>
          <div class="kv"><span>Cooldown</span><span>${d.cooldown_human || '0 Sec'}</span></div>
          <div class="kv"><span>Status</span><span style="color:var(--emerald)">✓ Success</span></div>`);
      };
    },
  },

  'bind-email': {
    render() {
      const state = {};
      let step = 1;
      const TOTAL = 4;
      const draw = () => {
        modalBody.innerHTML = `
          ${state.player ? playerCard(state.player) : ''}
          ${stepDots(step, TOTAL)}
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');

        if (step === 1) {
          sb.innerHTML = `${field('token', 'Access Token', 'text', 'Paste your access token')}${submitBtn('Load Player Info')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['token'])) return;
            state.access_token = document.getElementById('token').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const pInfo = await callApi('player-info', { access_token: state.access_token });
            if (!pInfo.success) return out.innerHTML = errorPanel(pInfo, 'Failed to load player');
            state.player = pInfo.data;
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('email', 'New Email', 'email', 'Enter new recovery email')}${submitBtn('Send OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['email'])) return;
            state.email = document.getElementById('email').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.email });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Failed to send OTP');
            step = 3;
            draw();
          };
        } else if (step === 3) {
          sb.innerHTML = `${field('otp', 'OTP Code (from email)', 'text', '6-digit code')}${submitBtn('Verify OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['otp'])) return;
            const otp = document.getElementById('otp').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('verify-otp', { access_token: state.access_token, email: state.email, otp });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Invalid OTP');
            state.verifier_token = (r.data && r.data.verifier_token) || '';
            if (!state.verifier_token) return out.innerHTML = resultPanel('Verifier token not returned', true);
            step = 4;
            draw();
          };
        } else {
          sb.innerHTML = `${field('code', 'Security Code (6 digits)', 'password', 'Set your security code')}${submitBtn('Complete Bind')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['code'])) return;
            const code = document.getElementById('code').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('create-bind', { access_token: state.access_token, email: state.email, verifier_token: state.verifier_token, security_code: code });
            out.innerHTML = r.success ? resultPanel('✅ Email bound successfully!') : errorPanel(r, 'Bind failed');
          };
        }
      };
      draw();
    },
  },

  'unbind-email': {
    render() {
      const state = {};
      let step = 1;
      const TOTAL = 4;
      const draw = () => {
        modalBody.innerHTML = `
          ${state.player ? playerCard(state.player) : ''}
          ${stepDots(step, TOTAL)}
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');

        if (step === 1) {
          sb.innerHTML = `${field('token', 'Access Token', 'text', 'Paste your access token')}${submitBtn('Load Player Info')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['token'])) return;
            state.access_token = document.getElementById('token').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const pInfo = await callApi('player-info', { access_token: state.access_token });
            if (!pInfo.success) return out.innerHTML = errorPanel(pInfo, 'Failed to load player');
            state.player = pInfo.data;
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('email', 'Bound Email', 'email', 'Enter bound email address')}${submitBtn('Send OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['email'])) return;
            state.email = document.getElementById('email').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.email });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Failed to send OTP');
            step = 3;
            draw();
          };
        } else if (step === 3) {
          sb.innerHTML = `${field('otp', 'OTP Code', 'text', 'From bound email')}${submitBtn('Verify Identity')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['otp'])) return;
            const otp = document.getElementById('otp').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('verify-identity', { access_token: state.access_token, email: state.email, otp });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Verification failed');
            state.identity_token = (r.data && r.data.identity_token) || '';
            if (!state.identity_token) return out.innerHTML = resultPanel('No identity token returned', true);
            step = 4;
            draw();
          };
        } else {
          sb.innerHTML = `${submitBtn('Complete Unbind')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('create-unbind', { access_token: state.access_token, identity_token: state.identity_token });
            out.innerHTML = r.success ? resultPanel('✅ Email unbound successfully!') : errorPanel(r, 'Unbind failed');
          };
        }
      };
      draw();
    },
  },

  'change-email': {
    render() {
      const state = {};
      let step = 1;
      const TOTAL = 6;
      const draw = () => {
        modalBody.innerHTML = `
          ${state.player ? playerCard(state.player) : ''}
          ${stepDots(step, TOTAL)}
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');

        if (step === 1) {
          sb.innerHTML = `${field('token', 'Access Token', 'text', 'Paste your access token')}${submitBtn('Load Player Info')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['token'])) return;
            state.access_token = document.getElementById('token').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const pInfo = await callApi('player-info', { access_token: state.access_token });
            if (!pInfo.success) return out.innerHTML = errorPanel(pInfo, 'Failed to load player');
            state.player = pInfo.data;
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('email', 'Current Bound Email', 'email', 'Enter current email')}${submitBtn('Send OTP to Old Email')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['email'])) return;
            state.old_email = document.getElementById('email').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.old_email });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Failed to send OTP');
            step = 3;
            draw();
          };
        } else if (step === 3) {
          sb.innerHTML = `${field('otp', 'OTP from OLD email', 'text', '6-digit code')}${submitBtn('Verify Identity')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['otp'])) return;
            const otp = document.getElementById('otp').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('verify-identity', { access_token: state.access_token, email: state.old_email, otp });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Verification failed');
            state.identity_token = (r.data && r.data.identity_token) || '';
            if (!state.identity_token) return out.innerHTML = resultPanel('No identity token returned', true);
            step = 4;
            draw();
          };
        } else if (step === 4) {
          sb.innerHTML = `${field('new_email', 'New Email', 'email', 'Enter new email')}${submitBtn('Send OTP to New Email')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['new_email'])) return;
            state.new_email = document.getElementById('new_email').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.new_email });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Failed to send OTP');
            step = 5;
            draw();
          };
        } else if (step === 5) {
          sb.innerHTML = `${field('otp_new', 'OTP from NEW email', 'text', '6-digit code')}${submitBtn('Verify New OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            if (!validateInputs(['otp_new'])) return;
            const otp = document.getElementById('otp_new').value.trim();
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('verify-otp', { access_token: state.access_token, email: state.new_email, otp });
            if (!r.success) return out.innerHTML = errorPanel(r, 'Invalid OTP');
            state.verifier_token = (r.data && r.data.verifier_token) || '';
            if (!state.verifier_token) return out.innerHTML = resultPanel('No verifier token returned', true);
            step = 6;
            draw();
          };
        } else {
          sb.innerHTML = `${submitBtn('Complete Change')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const out = document.getElementById('output');
            out.innerHTML = loading();
            const r = await callApi('create-rebind', { access_token: state.access_token, email: state.new_email, identity_token: state.identity_token, verifier_token: state.verifier_token });
            out.innerHTML = r.success ? resultPanel('✅ Email changed successfully!') : errorPanel(r, 'Change failed');
          };
        }
      };
      draw();
    },
  },

  'cancel-bind': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token','text','Paste your access token')}${submitBtn('Cancel Pending Request')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('cancel-bind', { access_token: token });
        let html = '';
        if (r.player) html += playerCard(r.player);
        if (r.success) html += `<div style="color:var(--emerald);font-weight:600">✅ Pending request cancelled!</div>`;
        else html += `<div style="color:var(--crimson);font-weight:600">${r.error || 'Failed'}</div>`;
        out.innerHTML = resultPanel(html, !r.success);
      };
    },
  },

  'eat-token': {
    render() {
      modalBody.innerHTML = `${field('eat','EAT Token or Full URL','text','Paste EAT token or URL')}${submitBtn('Convert to Access Token')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['eat'])) return;
        let input = document.getElementById('eat').value.trim();
        let eat = input;
        if (input.includes('http') || input.includes('?')) {
          try { const u = new URL(input); eat = u.searchParams.get('eat') || input; } catch {}
        }
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('eat-token', { eat_token: eat });
        if (!r.success) return out.innerHTML = errorPanel(r, 'Failed');
        out.innerHTML = resultPanel(`
          ${playerCard({ uid: r.data.account_id, nickname: r.data.nickname, region: r.data.region })}
          <div class="kv"><span>Access Token</span><span style="font-size:11px">${r.data.access_token}</span></div>`);
      };
    },
  },

  'revoke-token': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token to Revoke','text','Paste token to revoke')}${submitBtn('Revoke Token')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('revoke-token', { access_token: token });
        let html = '';
        if (r.player) html += playerCard(r.player);
        if (r.success) html += `<div style="color:var(--emerald);font-weight:600">✅ Token revoked successfully!</div>`;
        else html += `<div style="color:var(--crimson);font-weight:600">${r.error || r.message || 'Failed'}</div>`;
        out.innerHTML = resultPanel(html, !r.success);
      };
    },
  },

  'login-history': {
    render() {
      modalBody.innerHTML = `${field('token','JWT Token','text','Use "Access → JWT" if needed')}${submitBtn('Fetch Login History')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('login-history', { token });
        if (!r.success) return out.innerHTML = errorPanel(r, 'Failed');
        const d = r.data;
        let html = `
          ${playerCard({ uid: d.account_id, nickname: d.nickname, region: d.region })}
          <div class="kv"><span>Suspicious Logins</span><span>${d.suspicious_count}</span></div>
          <div style="margin-top:18px">`;
        d.entries.forEach(e => {
          const cls = e.type === 'Usual' ? 'usual' : e.type === 'Unusual' ? 'unusual' : 'unknown';
          html += `
            <div class="entry">
              <div class="entry-head"><span>Entry #${e.index}</span><span class="badge ${cls}">${e.type}</span></div>
              <div class="kv"><span>Time</span><span>${e.time}</span></div>
              <div class="kv"><span>Device</span><span>${e.device}</span></div>
              <div class="kv"><span>Arch</span><span>${e.arch}</span></div>
              <div class="kv"><span>Extra</span><span>${e.extra}</span></div>
            </div>`;
        });
        html += '</div>';
        out.innerHTML = resultPanel(html);
      };
    },
  },

  'platform-info': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token','text','Paste your access token')}${submitBtn('Check Platforms')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('platform-info', { access_token: token });
        if (!r.success) return out.innerHTML = errorPanel(r, 'Failed');
        const d = r.data;
        out.innerHTML = resultPanel(`
          <div style="margin-bottom:12px"><strong>Bound Platforms:</strong></div>
          ${d.bound.length ? d.bound.map(p => `<div class="kv"><span>● ${p}</span><span>Active</span></div>`).join('') : '<div style="color:var(--muted)">None</div>'}
          <div style="margin-top:18px;margin-bottom:12px"><strong>Available Platforms:</strong></div>
          ${d.available.length ? d.available.map(p => `<div class="kv"><span>○ ${p}</span><span>Available</span></div>`).join('') : '<div style="color:var(--muted)">None</div>'}`);
      };
    },
  },

  'to-jwt': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token','text','Paste your access token')}${submitBtn('Generate JWT')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        if (!validateInputs(['token'])) return;
        const token = document.getElementById('token').value.trim();
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('to-jwt', { access_token: token });
        if (!r.success) return out.innerHTML = errorPanel(r, 'Failed');
        const d = r.data;
        out.innerHTML = resultPanel(`
          ${playerCard({ uid: d.account_id, nickname: d.nickname, region: d.region })}
          <div class="kv"><span>UID</span><span>${d.uid || '-'}</span></div>
          <div class="kv"><span>Platform ID</span><span>${d.platform_id || '-'}</span></div>
          <div style="margin-top:14px"><strong>JWT Token:</strong></div>
          <pre>${d.token}</pre>`);
      };
    },
  },
};

// ═══════════ FAQ ═══════════
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ═══════════ YEAR ═══════════
document.getElementById('year').textContent = new Date().getFullYear();