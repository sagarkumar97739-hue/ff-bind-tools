// api/handler.js — server-side only. Never sent to browser.
const https = require('https');
const crypto = require('crypto');

const APP_ID = '100067';
const BASE = 'https://100067.connect.garena.com/game/account_security';
const MSDK_UA = 'GarenaMSDK/4.0.30';

const SUSPICIOUS_KW = ['danger', 'papa', 'hack', 'mod', 'crack', 'crk', 't.me/', 'cheat', 'modmenu', 'script', 'keyauth'];
const CLEAN_DEVICE = 'Xiaomi 2201122G';
const CLEAN_ARCH = 'ARM64 FP ASIMD AES VMH | 2513 | 6';
const REFRESH_TOKEN = '1380dcb63ab3a077dc05bdf0b25ba4497c403a5b4eae96d7203010eafa6c83a8';
const NICK_KEY = Buffer.from('1e5898ccb8dfdd921f9bdea848768b64a201');

// ═══════════ PROTOBUF PARSER ═══════════
function readVarint(buf, off) {
  let r = 0n, s = 0n;
  while (off < buf.length) {
    const b = buf[off++];
    r |= BigInt(b & 0x7f) << s;
    if (!(b & 0x80)) break;
    s += 7n;
  }
  return [r, off];
}
function* iterFields(buf) {
  let o = 0;
  while (o < buf.length) {
    const [tag, next] = readVarint(buf, o);
    o = next;
    if (tag === 0n) break;
    const f = Number(tag >> 3n), wt = Number(tag & 7n);
    if (wt === 0) { const [v, x] = readVarint(buf, o); o = x; yield [f, 0, v]; }
    else if (wt === 2) { const [len, x] = readVarint(buf, o); o = x; const n = Number(len); yield [f, 2, buf.slice(o, o + n)]; o += n; }
    else if (wt === 1) { yield [f, 1, buf.slice(o, o + 8)]; o += 8; }
    else if (wt === 5) { yield [f, 5, buf.slice(o, o + 4)]; o += 4; }
    else break;
  }
}
function parseEntry(buf) {
  const e = { LastLogin: 0, Extra: 0, DeviceModel: '', DeviceArchitecture: '', LoginType: 0 };
  for (const [n, wt, v] of iterFields(buf)) {
    if (n === 1 && wt === 0) e.LastLogin = Number(v);
    else if (n === 2 && wt === 0) e.Extra = Number(v);
    else if (n === 3 && wt === 2) e.DeviceModel = v.toString('utf8');
    else if (n === 4 && wt === 2) e.DeviceArchitecture = v.toString('utf8');
    else if (n === 5 && wt === 0) e.LoginType = Number(v);
  }
  return e;
}
function parseLoginHistory(buf) {
  const out = [];
  for (const [n, wt, v] of iterFields(buf)) if (n === 1 && wt === 2) out.push(parseEntry(v));
  return out;
}

// ═══════════ HELPERS ═══════════
function isSuspicious(s) {
  if (!s || s.trim().length < 2) return true;
  const low = s.toLowerCase();
  return SUSPICIOUS_KW.some(k => low.includes(k));
}

// ✅ NEW: Human-readable cooldown
function formatCooldown(sec) {
  sec = Number(sec) || 0;
  if (sec <= 0) return '0 Sec';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(`${d} Day${d !== 1 ? 's' : ''}`);
  if (h) parts.push(`${h} Hour${h !== 1 ? 's' : ''}`);
  if (m) parts.push(`${m} Min`);
  if (s || !parts.length) parts.push(`${s} Sec`);
  return parts.join(' ');
}

// ✅ NEW: Fetch player info (UID / Nickname / Region)
async function fetchPlayer(access_token) {
  try {
    const pr = await fetch(`https://api-otrss.garena.com/support/callback/?access_token=${encodeURIComponent(access_token)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' },
      redirect: 'follow',
    });
    const u = new URL(pr.url);
    return {
      uid: u.searchParams.get('account_id') || 'Unknown',
      nickname: decodeURIComponent(u.searchParams.get('nickname') || 'Unknown'),
      region: u.searchParams.get('region') || 'Unknown',
    };
  } catch {
    return null;
  }
}

function httpsRaw(url, opts, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET', headers: opts.headers || {},
      rejectUnauthorized: false, timeout: 30000,
    }, (res) => {
      const c = []; res.on('data', x => c.push(x));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(c) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function garenaPost(ep, form) {
  const r = await fetch(`${BASE}/${ep}`, {
    method: 'POST',
    headers: { 'User-Agent': MSDK_UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams(form).toString(),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function garenaGet(ep, params) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(`${BASE}/${ep}?${qs}`, {
    headers: { 'User-Agent': 'GarenaMSDK/4.0.19P9(Redmi Note 5 ;Android 9;en;US;)' },
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
function decodeNickname(enc) {
  if (!enc) return 'N/A';
  try {
    const raw = Buffer.from(enc, 'base64');
    const out = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ NICK_KEY[i % NICK_KEY.length];
    const s = out.toString('utf8').replace(/\uFFFD/g, '');
    return s.trim().length > 0 ? s : 'Hidden';
  } catch { return 'N/A'; }
}

// ═══════════ ACTIONS ═══════════
async function playerInfo({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Token required' });
  const player = await fetchPlayer(access_token);
  if (!player) return res.json({ success: false, error: 'Could not fetch player info' });
  return res.json({ success: true, data: player });
}

async function bindInfo({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Access token required' });

  // ✅ Fetch player info in parallel with bind info
  const [player, r] = await Promise.all([
    fetchPlayer(access_token),
    garenaGet('bind:get_bind_info', { app_id: APP_ID, access_token }),
  ]);

  if (r.status !== 200) return res.json({ success: false, error: `Garena error ${r.status}`, player });
  const d = r.data;
  return res.json({
    success: d.result === 0,
    player,
    data: {
      current_email: d.email || '',
      pending_email: d.email_to_be || '',
      mobile: d.mobile || '',
      pending_mobile: d.mobile_to_be || '',
      cooldown_seconds: d.request_exec_countdown || 0,
      cooldown_human: formatCooldown(d.request_exec_countdown || 0),
      result: d.result,
    },
  });
}

async function sendOtp({ access_token, email, locale, region }, res) {
  if (!access_token || !email) return res.json({ success: false, error: 'Token + email required' });
  const r = await garenaPost('bind:send_otp', { email, locale: locale || 'en_PK', region: region || 'PK', app_id: APP_ID, access_token });
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function verifyOtp({ access_token, email, otp }, res) {
  if (!access_token || !email || !otp) return res.json({ success: false, error: 'Token, email, OTP required' });
  const r = await garenaPost('bind:verify_otp', { app_id: APP_ID, access_token, email, code: otp, otp, type: '1' });
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function verifyIdentity({ access_token, email, otp, security_code }, res) {
  if (!access_token || !email) return res.json({ success: false, error: 'Token + email required' });
  const fd = { email, app_id: APP_ID, access_token };
  if (otp) fd.otp = otp;
  if (security_code) fd.secondary_password = crypto.createHash('sha256').update(security_code).digest('hex');
  const r = await garenaPost('bind:verify_identity', fd);
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function createBind({ access_token, email, verifier_token, security_code }, res) {
  if (!access_token || !email || !verifier_token) return res.json({ success: false, error: 'Missing fields' });
  const r = await garenaPost('bind:create_bind_request', { email, app_id: APP_ID, access_token, verifier_token, secondary_password: security_code || '' });
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function createUnbind({ access_token, identity_token }, res) {
  if (!access_token || !identity_token) return res.json({ success: false, error: 'Missing tokens' });
  const r = await garenaPost('bind:create_unbind_request', { app_id: APP_ID, access_token, identity_token });
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function createRebind({ access_token, email, identity_token, verifier_token }, res) {
  if (!access_token || !email || !identity_token || !verifier_token) return res.json({ success: false, error: 'Missing fields' });
  const r = await garenaPost('bind:create_rebind_request', { identity_token, email, app_id: APP_ID, verifier_token, access_token });
  return res.json({ success: r.data.result === 0, data: r.data });
}

async function cancelBind({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Token required' });

  // ✅ Fetch player + do cancel in parallel
  const [player, r] = await Promise.all([
    fetchPlayer(access_token),
    garenaPost('bind:cancel_request', { app_id: APP_ID, access_token }),
  ]);

  return res.json({ success: r.data.result === 0, player, data: r.data });
}

async function eatToken({ eat_token }, res) {
  if (!eat_token) return res.json({ success: false, error: 'EAT required' });
  const r = await fetch(`https://api-otrss.garena.com/support/callback/?access_token=${encodeURIComponent(eat_token)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow',
  });
  const u = new URL(r.url);
  const a = u.searchParams.get('access_token');
  if (!a) return res.json({ success: false, error: 'Token invalid or expired' });
  return res.json({
    success: true,
    data: {
      access_token: a,
      nickname: decodeURIComponent(u.searchParams.get('nickname') || ''),
      account_id: u.searchParams.get('account_id') || '',
      region: u.searchParams.get('region') || '',
    },
  });
}

async function revokeToken({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Token required' });

  // ✅ Fetch player info + revoke in parallel
  const [player, r] = await Promise.all([
    fetchPlayer(access_token),
    fetch(`https://100067.connect.garena.com/oauth/logout?access_token=${encodeURIComponent(access_token)}&refresh_token=${REFRESH_TOKEN}`, {
      headers: { 'User-Agent': MSDK_UA, 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    }),
  ]);

  const t = await r.text();
  const ok = r.status === 200 && !t.toLowerCase().includes('error');
  return res.json({ success: ok, player, message: ok ? 'Token revoked' : 'Revoke failed' });
}

async function loginHistory({ token }, res) {
  if (!token) return res.json({ success: false, error: 'JWT required' });
  const parts = token.split('.');
  if (parts.length !== 3) return res.json({ success: false, error: 'Invalid JWT format' });

  let payload;
  try { payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); }
  catch { return res.json({ success: false, error: 'Cannot decode JWT' }); }

  const region = payload.lock_region || payload.region;
  if (!region) return res.json({ success: false, error: 'No region in JWT' });

  const rUp = region.toUpperCase();
  let domain = 'clientbp.ggpolarbear.com';
  if (rUp === 'IND') domain = 'client.ind.freefiremobile.com';
  else if (['BR', 'US', 'NA', 'SAC'].includes(rUp)) domain = 'client.us.freefiremobile.com';

  const raw = Buffer.from('ac74dc5eb016b4ed43774eec3d13e042bd8faa337913efeb6b92ddfbf113c5cd7972e5a9fee97dc9aa8a71270cae1dc9902c91a5eeee312684d4834c003fcf7d83067c9157de749063ed0714b442666c', 'hex');

  const resp = await httpsRaw(`https://${domain}/GetLoginHistory`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 13; 2201122G Build/TKQ1.220829.002)',
      'Authorization': `Bearer ${token}`,
      'X-Unity-Version': '2018.4.11f1',
      'X-GA': 'v1 1',
      'ReleaseVersion': 'OB55',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': raw.length,
    },
  }, raw);

  if (resp.status !== 200) return res.json({ success: false, error: `Garena returned ${resp.status}` });

  const entries = parseLoginHistory(resp.body).map((e, i) => ({
    index: i + 1,
    time: new Date(e.LastLogin * 1000).toISOString().replace('T', ' ').slice(0, 19),
    extra: e.Extra,
    device: isSuspicious(e.DeviceModel) ? CLEAN_DEVICE : e.DeviceModel,
    arch: isSuspicious(e.DeviceArchitecture) ? CLEAN_ARCH : e.DeviceArchitecture,
    type: (e.LoginType === 0 || e.LoginType === 2) ? 'Usual' : (e.LoginType === 1 || e.LoginType === 3) ? 'Unusual' : 'Unknown',
  }));

  return res.json({
    success: true,
    data: {
      nickname: decodeNickname(payload.nickname),
      account_id: payload.account_id,
      region,
      entries,
      suspicious_count: entries.filter(e => e.type === 'Unusual').length,
    },
  });
}

async function platformInfo({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Token required' });
  const r = await fetch(`https://100067.connect.garena.com/bind/app/platform/info/get?access_token=${encodeURIComponent(access_token)}`, {
    headers: { 'User-Agent': 'GarenaMSDK/4.0.19P9(Redmi Note 5 ;Android 9;en;US;)' },
  });
  const d = await r.json();
  const names = { 1: 'Garena', 3: 'Facebook', 4: 'Guest', 5: 'VK', 6: 'Huawei', 7: 'Apple', 8: 'Google', 10: 'GameCenter / Line', 11: 'X (Twitter)', 13: 'Apple ID', 28: 'Line', 35: 'TikTok' };
  return res.json({
    success: true,
    data: {
      bound: (d.bounded_accounts || []).map(id => names[id] || `Unknown(${id})`),
      available: (d.available_platforms || []).map(id => names[id] || `Unknown(${id})`),
    },
  });
}

async function toJwt({ access_token }, res) {
  if (!access_token) return res.json({ success: false, error: 'Token required' });
  const r = await fetch(`https://ff-jwt-gen-api.lovable.app/api/public/token?access_token=${encodeURIComponent(access_token)}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (r.status !== 200) return res.json({ success: false, error: `API returned ${r.status}` });
  const d = await r.json();
  if (!d.token) return res.json({ success: false, error: 'No token returned' });
  const p = (d.jwt_decoded && d.jwt_decoded.payload) || {};
  return res.json({
    success: true,
    data: {
      token: d.token,
      nickname: decodeNickname(p.nickname),
      account_id: p.account_id || '',
      uid: p.external_uid || '',
      region: p.lock_region || d.region || '',
      platform_id: d.platform_type_used || p.external_type || '',
    },
  });
}

// ═══════════ ROUTER ═══════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const action = req.query.action;
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  try {
    switch (action) {
      case 'player-info':     return await playerInfo(body, res);
      case 'bind-info':       return await bindInfo(body, res);
      case 'send-otp':        return await sendOtp(body, res);
      case 'verify-otp':      return await verifyOtp(body, res);
      case 'verify-identity': return await verifyIdentity(body, res);
      case 'create-bind':     return await createBind(body, res);
      case 'create-unbind':   return await createUnbind(body, res);
      case 'create-rebind':   return await createRebind(body, res);
      case 'cancel-bind':     return await cancelBind(body, res);
      case 'eat-token':       return await eatToken(body, res);
      case 'revoke-token':    return await revokeToken(body, res);
      case 'login-history':   return await loginHistory(body, res);
      case 'platform-info':   return await platformInfo(body, res);
      case 'to-jwt':          return await toJwt(body, res);
      default:                return res.status(400).json({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};