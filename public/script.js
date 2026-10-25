// ═══════════ PARTICLE BACKGROUND ═══════════
(function initParticles() {
  const canvas = document.getElementById('bg-particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
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
    }
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
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
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ═══════════ SERVICES ═══════════
const SERVICES = [
  { id: 'bind-info',     icon: '🔍', title: 'Check Bind Info',      desc: 'View current email, pending email, mobile, and cooldown on the account.' },
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
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

function closeModal() {
  overlay.classList.remove('open');
  modalBody.innerHTML = '';
}

// ═══════════ ✅ FIXED: API HELPER (handles non-JSON 500 pages) ═══════════
async function callApi(action, payload) {
  try {
    const r = await fetch(`/api/handler?action=${encodeURIComponent(action)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();

    if (!text) {
      return { success: false, error: `Empty response (HTTP ${r.status})` };
    }

    try {
      return JSON.parse(text);
    } catch {
      // Server returned HTML (e.g. Vercel error page) — surface a clean message
      const clean = text.replace(/<[^>]+>/g, '').trim().slice(0, 200);
      return {
        success: false,
        error: `Server error (HTTP ${r.status})${clean ? ': ' + clean : ''}`,
      };
    }
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// ═══════════ UI HELPERS ═══════════
function field(id, label, type = 'text', placeholder = '') {
  return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" placeholder="${placeholder}" autocomplete="off" /></div>`;
}
function submitBtn(text = 'Submit') {
  return `<button class="btn-primary" id="submitBtn">${text}</button>`;
}
function loading() {
  return `<div class="loading">Processing…</div>`;
}
function resultPanel(html, isError = false) {
  return `<div class="result ${isError ? 'error' : 'success'}">${html}</div>`;
}

// ═══════════ OPEN SERVICE ═══════════
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
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('bind-info', { access_token: token });
        if (!r.success) return out.innerHTML = resultPanel(r.error || 'Failed', true);
        const d = r.data;
        out.innerHTML = resultPanel(`
          <div class="kv"><span>Current Email</span><span>${d.current_email || 'None'}</span></div>
          <div class="kv"><span>Pending Email</span><span>${d.pending_email || 'None'}</span></div>
          <div class="kv"><span>Current Mobile</span><span>${d.mobile || 'None'}</span></div>
          <div class="kv"><span>Pending Mobile</span><span>${d.pending_mobile || 'None'}</span></div>
          <div class="kv"><span>Cooldown</span><span>${d.cooldown_seconds} sec</span></div>
          <div class="kv"><span>Status</span><span style="color:var(--emerald)">✓ Success</span></div>`);
      };
    },
  },

  'bind-email': {
    render() {
      const state = {};
      let step = 1;
      const draw = () => {
        modalBody.innerHTML = `
          <div class="step-indicator">${[1,2,3].map(n => `<div class="step-dot ${n===step?'active':n<step?'done':''}"></div>`).join('')}</div>
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');
        if (step === 1) {
          sb.innerHTML = `${field('token','Access Token')}${field('email','New Email','email')}${submitBtn('Send OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            state.access_token = document.getElementById('token').value.trim();
            state.email = document.getElementById('email').value.trim();
            if (!state.access_token || !state.email) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.email });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed to send OTP', true);
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('otp','OTP Code (from email)','text','6-digit code')}${submitBtn('Verify OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const otp = document.getElementById('otp').value.trim();
            if (!otp) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('verify-otp', { access_token: state.access_token, email: state.email, otp });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Invalid OTP', true);
            state.verifier_token = r.data.verifier_token || '';
            if (!state.verifier_token) return document.getElementById('output').innerHTML = resultPanel('Verifier token not returned', true);
            step = 3;
            draw();
          };
        } else {
          sb.innerHTML = `${field('code','Security Code (6 digits)','password')}${submitBtn('Complete Bind')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const code = document.getElementById('code').value.trim();
            if (!code) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('create-bind', {
              access_token: state.access_token,
              email: state.email,
              verifier_token: state.verifier_token,
              security_code: code,
            });
            document.getElementById('output').innerHTML = r.success
              ? resultPanel('✅ Email bound successfully!')
              : resultPanel(r.error || 'Bind failed', true);
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
      const draw = () => {
        modalBody.innerHTML = `
          <div class="step-indicator">${[1,2,3].map(n => `<div class="step-dot ${n===step?'active':n<step?'done':''}"></div>`).join('')}</div>
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');
        if (step === 1) {
          sb.innerHTML = `${field('token','Access Token')}${field('email','Bound Email','email')}${submitBtn('Send OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            state.access_token = document.getElementById('token').value.trim();
            state.email = document.getElementById('email').value.trim();
            if (!state.access_token || !state.email) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.email });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('otp','OTP Code','text','From bound email')}${submitBtn('Verify Identity')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const otp = document.getElementById('otp').value.trim();
            if (!otp) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('verify-identity', { access_token: state.access_token, email: state.email, otp });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            state.identity_token = r.data.identity_token || '';
            if (!state.identity_token) return document.getElementById('output').innerHTML = resultPanel('No identity token', true);
            step = 3;
            draw();
          };
        } else {
          sb.innerHTML = `${submitBtn('Complete Unbind')}`;
          document.getElementById('submitBtn').onclick = async () => {
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('create-unbind', { access_token: state.access_token, identity_token: state.identity_token });
            document.getElementById('output').innerHTML = r.success
              ? resultPanel('✅ Email unbound successfully!')
              : resultPanel(r.error || 'Unbind failed', true);
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
      const draw = () => {
        modalBody.innerHTML = `
          <div class="step-indicator">${[1,2,3,4,5].map(n => `<div class="step-dot ${n===step?'active':n<step?'done':''}"></div>`).join('')}</div>
          <div id="stepBody"></div><div id="output"></div>`;
        const sb = document.getElementById('stepBody');
        if (step === 1) {
          sb.innerHTML = `${field('token','Access Token')}${field('email','Current Bound Email','email')}${submitBtn('Send OTP to Old Email')}`;
          document.getElementById('submitBtn').onclick = async () => {
            state.access_token = document.getElementById('token').value.trim();
            state.old_email = document.getElementById('email').value.trim();
            if (!state.access_token || !state.old_email) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.old_email });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            step = 2;
            draw();
          };
        } else if (step === 2) {
          sb.innerHTML = `${field('otp','OTP from OLD email')}${submitBtn('Verify Identity')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const otp = document.getElementById('otp').value.trim();
            if (!otp) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('verify-identity', { access_token: state.access_token, email: state.old_email, otp });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            state.identity_token = r.data.identity_token || '';
            if (!state.identity_token) return document.getElementById('output').innerHTML = resultPanel('No identity token', true);
            step = 3;
            draw();
          };
        } else if (step === 3) {
          sb.innerHTML = `${field('new_email','New Email','email')}${submitBtn('Send OTP to New Email')}`;
          document.getElementById('submitBtn').onclick = async () => {
            state.new_email = document.getElementById('new_email').value.trim();
            if (!state.new_email) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('send-otp', { access_token: state.access_token, email: state.new_email });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            step = 4;
            draw();
          };
        } else if (step === 4) {
          sb.innerHTML = `${field('otp_new','OTP from NEW email')}${submitBtn('Verify New OTP')}`;
          document.getElementById('submitBtn').onclick = async () => {
            const otp = document.getElementById('otp_new').value.trim();
            if (!otp) return;
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('verify-otp', { access_token: state.access_token, email: state.new_email, otp });
            if (!r.success) return document.getElementById('output').innerHTML = resultPanel(r.error || 'Failed', true);
            state.verifier_token = r.data.verifier_token || '';
            if (!state.verifier_token) return document.getElementById('output').innerHTML = resultPanel('No verifier token', true);
            step = 5;
            draw();
          };
        } else {
          sb.innerHTML = `${submitBtn('Complete Change')}`;
          document.getElementById('submitBtn').onclick = async () => {
            document.getElementById('output').innerHTML = loading();
            const r = await callApi('create-rebind', {
              access_token: state.access_token,
              email: state.new_email,
              identity_token: state.identity_token,
              verifier_token: state.verifier_token,
            });
            document.getElementById('output').innerHTML = r.success
              ? resultPanel('✅ Email changed successfully!')
              : resultPanel(r.error || 'Failed', true);
          };
        }
      };
      draw();
    },
  },

  'cancel-bind': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token')}${submitBtn('Cancel Pending Request')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('cancel-bind', { access_token: token });
        out.innerHTML = r.success
          ? resultPanel('✅ Pending request cancelled!')
          : resultPanel(r.error || 'Failed', true);
      };
    },
  },

  'eat-token': {
    render() {
      modalBody.innerHTML = `${field('eat','EAT Token or Full URL','text','Paste EAT token or URL')}${submitBtn('Convert to Access Token')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        let input = document.getElementById('eat').value.trim();
        if (!input) return;
        let eat = input;
        if (input.includes('http') || input.includes('?')) {
          try {
            const u = new URL(input);
            eat = u.searchParams.get('eat') || input;
          } catch {}
        }
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('eat-token', { eat_token: eat });
        if (!r.success) return out.innerHTML = resultPanel(r.error || 'Failed', true);
        out.innerHTML = resultPanel(`
          <div class="kv"><span>Nickname</span><span>${r.data.nickname || '-'}</span></div>
          <div class="kv"><span>Account ID</span><span>${r.data.account_id || '-'}</span></div>
          <div class="kv"><span>Region</span><span>${r.data.region || '-'}</span></div>
          <div class="kv"><span>Access Token</span><span style="font-size:11px">${r.data.access_token}</span></div>`);
      };
    },
  },

  'revoke-token': {
    render() {
      modalBody.innerHTML = `${field('token','Access Token to Revoke')}${submitBtn('Revoke Token')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('revoke-token', { access_token: token });
        out.innerHTML = r.success
          ? resultPanel('✅ Token revoked successfully!')
          : resultPanel(r.error || r.message || 'Failed', true);
      };
    },
  },

  'login-history': {
    render() {
      modalBody.innerHTML = `${field('token','JWT Token','text','Use "Access → JWT" if needed')}${submitBtn('Fetch Login History')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('login-history', { token });
        if (!r.success) return out.innerHTML = resultPanel(r.error || 'Failed', true);
        const d = r.data;
        let html = `
          <div class="kv"><span>Nickname</span><span>${d.nickname}</span></div>
          <div class="kv"><span>Account ID</span><span>${d.account_id}</span></div>
          <div class="kv"><span>Region</span><span>${d.region}</span></div>
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
      modalBody.innerHTML = `${field('token','Access Token')}${submitBtn('Check Platforms')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('platform-info', { access_token: token });
        if (!r.success) return out.innerHTML = resultPanel(r.error || 'Failed', true);
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
      modalBody.innerHTML = `${field('token','Access Token')}${submitBtn('Generate JWT')}<div id="output"></div>`;
      document.getElementById('submitBtn').onclick = async () => {
        const token = document.getElementById('token').value.trim();
        if (!token) return;
        const out = document.getElementById('output');
        out.innerHTML = loading();
        const r = await callApi('to-jwt', { access_token: token });
        if (!r.success) return out.innerHTML = resultPanel(r.error || 'Failed', true);
        const d = r.data;
        out.innerHTML = resultPanel(`
          <div class="kv"><span>Nickname</span><span>${d.nickname || '-'}</span></div>
          <div class="kv"><span>Account ID</span><span>${d.account_id || '-'}</span></div>
          <div class="kv"><span>UID</span><span>${d.uid || '-'}</span></div>
          <div class="kv"><span>Region</span><span>${d.region || '-'}</span></div>
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