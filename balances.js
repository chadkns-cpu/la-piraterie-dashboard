const fmt = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
};

console.log('[balances.js] version 3 loaded');

const normalizeBalance = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const NAME_MAP_URL = 'player-names.json';
const REFRESH_INTERVAL_MS = 30000;
let nameMap = {};

const isDiscordId = (value) => typeof value === 'string' && /^[0-9]{17,20}$/.test(value);
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const looksLikePlayerEntry = (value) => isObject(value) && ('username' in value || 'current' in value || 'currentBalance' in value || 'balance' in value || 'lifetime' in value || 'lifetimeBalance' in value || 'name' in value || 'id' in value);
const isPlayerMap = (value) => isObject(value) && Object.values(value).length > 0 && Object.values(value).every(looksLikePlayerEntry);

const loadNameMap = async () => {
  try {
    const res = await fetch(NAME_MAP_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  } catch (err) {
    return {};
  }
};

const normalizePlayerMap = (value) => {
  if (!isPlayerMap(value)) return [];
  return Object.entries(value).map(([id, entry]) => ({ id, ...entry }));
};

const extractRawBalances = (data) => {
  return Array.isArray(data?.balances)
    ? data.balances
    : Array.isArray(data?.players)
      ? data.players
      : Array.isArray(data?.data)
        ? data.data
        : isPlayerMap(data?.players)
          ? normalizePlayerMap(data.players)
          : isPlayerMap(data)
            ? normalizePlayerMap(data)
            : [];
};

const getNameMapEntry = (key) => {
  if (!key || typeof key !== 'string') return null;
  const value = nameMap[key.trim()];
  if (!value) return null;
  if (typeof value === 'string') {
    return { username: value.trim(), current: NaN, lifetime: NaN };
  }
  if (value && typeof value === 'object') {
    return {
      username: typeof value.username === 'string' && value.username.trim() ? value.username.trim() : undefined,
      current: normalizeBalance(value.current ?? value.currentBalance ?? value.balance ?? value.amount),
      lifetime: normalizeBalance(value.lifetime ?? value.lifetimeBalance ?? value.total ?? value.totalBalance),
    };
  }
  return null;
};

const getPlayerName = (p) => {
  if (!p) return '';
  if (typeof p.username === 'string' && p.username.trim()) return p.username.trim();
  if (p.user && typeof p.user.username === 'string' && p.user.username.trim()) return p.user.username.trim();
  if (p.user && typeof p.user.name === 'string' && p.user.name.trim()) return p.user.name.trim();

  const rawName = typeof p.name === 'string' ? p.name.trim() : '';
  const rawId = typeof p.id === 'string' ? p.id.trim() : (typeof p.id === 'number' ? String(p.id) : '');
  const candidate = rawName || rawId;
  if (!candidate) return '';
  const mapEntry = getNameMapEntry(candidate);
  if (mapEntry?.username) return mapEntry.username;
  return candidate;
};

// Prefer the exact API fields: username / current / lifetime
const getCurrentBalance = (p) => normalizeBalance(p?.current ?? p?.currentBalance ?? p?.balance ?? p?.amount);
const getLifetimeBalance = (p) => normalizeBalance(p?.lifetime ?? p?.lifetimeBalance ?? p?.total ?? p?.totalBalance);

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
const byBalanceDesc = (a, b) => (Number.isFinite(b.currentBalance) ? b.currentBalance : 0) - (Number.isFinite(a.currentBalance) ? a.currentBalance : 0);
const byBalanceAsc = (a, b) => (Number.isFinite(a.currentBalance) ? a.currentBalance : 0) - (Number.isFinite(b.currentBalance) ? b.currentBalance : 0);

const state = {
  raw: null,
  health: null,
  balances: [],
};

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

const tableRowsEl = qs('#rows');
const rowCountEl = qs('#rowCount');
const generatedAtTextEl = qs('#generatedAtText');
const searchEl = qs('#search');
const sortEl = qs('#sort');

const render = () => {
  const query = (searchEl?.value || '').trim().toLowerCase();
  let list = (state.balances || []).slice();

  if (query) {
    list = list.filter((p) => (p.name || '').toLowerCase().includes(query));
  }

  const sortVal = sortEl?.value || 'name';
  if (sortVal === 'name') list.sort(byName);
  if (sortVal === 'balance_desc') list.sort(byBalanceDesc);
  if (sortVal === 'balance_asc') list.sort(byBalanceAsc);

  rowCountEl.textContent = String(list.length);

  if (!list.length) {
    tableRowsEl.innerHTML = '<tr><td colspan="3" class="muted">No results.</td></tr>';
    return;
  }

  tableRowsEl.innerHTML = list
    .map((p) => {
      const name = String(p.name ?? '');
      const current = Number.isFinite(p.currentBalance) ? p.currentBalance : NaN;
      const lifetime = Number.isFinite(p.lifetimeBalance) ? p.lifetimeBalance : current;
      return `
        <tr>
          <td style="font-weight:900;">${escapeHtml(name)}</td>
          <td style="text-align:right; font-weight:900;">${fmt(current)}</td>
          <td style="text-align:right; font-weight:900;">${fmt(lifetime)}</td>
        </tr>
      `;
    })
    .join('');
};

const escapeHtml = (s) => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

// Change BALANCES_API_URL to your API endpoint.
// IMPORTANT: the endpoint must allow browser requests (CORS).
const BALANCES_API_URL = 'http://193.70.34.101:20036/balances';

// IMPORTANT: this is a public frontend. If this key grants access, it will be exposed to anyone.
// Prefer a server-side proxy in production.
const BALANCES_API_KEY = '368feea3692ff6070581646deaf1440211f6d2955167ecb45efe985ca06dc3a1' ;

// Some APIs return a different shape (or require a proxy). We keep the UI resilient.
// If your endpoint doesn’t return { players: [...] }, adjust the parsing below in `load()`.


const load = async () => {
  try {
    nameMap = await loadNameMap();
    const fetchUrl = BALANCES_API_URL;
    const headers = {};
    if (typeof BALANCES_API_KEY === 'string' && BALANCES_API_KEY.length) headers['x-api-key'] = BALANCES_API_KEY;

    const res = await fetch(fetchUrl, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Save raw response
    state.raw = data;

    // Extract health/status if present
    state.health = data?.health ?? data?.status ?? data?.ok ?? null;

    // Accept multiple shapes for balances:
    // - { balances: [...] }
    // - { players: [...] }
    // - { data: [...] }
    // - [...] (array directly)
    const rawBalances = extractRawBalances(data);

    state.balances = rawBalances
      .map((p) => {
        const rawName = typeof p.name === 'string' ? p.name.trim() : '';
        const rawId = typeof p.id === 'string' ? p.id.trim() : (typeof p.id === 'number' ? String(p.id) : '');
        const candidate = rawName || rawId;
        const mapEntry = getNameMapEntry(candidate);
        const cur = getCurrentBalance(p);
        const life = getLifetimeBalance(p);
        return {
          name: getPlayerName(p),
          currentBalance: Number.isFinite(cur) ? cur : (mapEntry?.current ?? NaN),
          lifetimeBalance: Number.isFinite(life) ? life : (mapEntry?.lifetime ?? NaN),
        };
      })
      .filter((p) => p.name.length);

    if (generatedAtTextEl) {
      const d = data?.generatedAt ? new Date(data.generatedAt) : null;
      generatedAtTextEl.textContent = d && !Number.isNaN(d.getTime())
        ? `Updated: ${d.toLocaleString()}`
        : 'Updated.';
    }

    // Show health status if available
    // health is taken from the balances response when available

    try {
      const healthEl = qs('#healthStatus') || (() => {
        const el = document.createElement('div');
        el.id = 'healthStatus';
        el.style.margin = '0.5rem 1rem';
        el.style.fontWeight = '700';
        document.body.insertBefore(el, document.body.firstChild);
        return el;
      })();
      healthEl.textContent = state.health === null ? 'Health: —' : `Health: ${typeof state.health === 'object' ? JSON.stringify(state.health) : String(state.health)}`;
    } catch (err) {
      // ignore UI errors
    }

    render();
    // Also show the full API response (raw JSON) so the UI can "lire tout".
    try {
      const rawEl = qs('#rawData') || (() => {
        const el = document.createElement('pre');
        el.id = 'rawData';
        el.style.whiteSpace = 'pre-wrap';
        el.style.maxHeight = '40vh';
        el.style.overflow = 'auto';
        el.style.margin = '1rem';
        document.body.appendChild(el);
        return el;
      })();
      rawEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      // ignore UI errors when showing raw JSON
    }
  } catch (e) {
    const errMsg = e?.message || String(e);
    if (generatedAtTextEl) generatedAtTextEl.textContent = `Could not load balances: ${errMsg}`;
    if (tableRowsEl) {
      tableRowsEl.innerHTML = `<tr><td colspan="3" class="muted">Failed to load balances from ${escapeHtml(BALANCES_API_URL)} — ${escapeHtml(errMsg)}</td></tr>`;
    }

    try {
      const rawEl = qs('#rawData') || (() => {
        const el = document.createElement('pre');
        el.id = 'rawData';
        el.style.whiteSpace = 'pre-wrap';
        el.style.maxHeight = '40vh';
        el.style.overflow = 'auto';
        el.style.margin = '1rem';
        document.body.appendChild(el);
        return el;
      })();
      rawEl.textContent = `Error loading ${BALANCES_API_URL}\n${errMsg}`;
    } catch (uiErr) {
      // ignore
    }

    // Try fallback to local `balances.json`
    (async () => {
      try {
        const fallbackRes = await fetch('balances.json', { cache: 'no-store' });
        if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
        const data = await fallbackRes.json();

        // Process fallback data (same logic as success case)
        state.raw = data;
        state.health = data?.health ?? data?.status ?? data?.ok ?? null;
        const rawBalances = extractRawBalances(data);

        state.balances = rawBalances
          .map((p) => {
            const cur = getCurrentBalance(p);
            const life = getLifetimeBalance(p);
            return {
              name: getPlayerName(p),
              currentBalance: Number.isFinite(cur) ? cur : NaN,
              lifetimeBalance: Number.isFinite(life) ? life : NaN,
            };
          })
          .filter((p) => p.name.length);

        if (generatedAtTextEl) generatedAtTextEl.textContent = 'Loaded local balances.json';
        try {
          const rawEl2 = qs('#rawData') || (() => { throw 0; })();
          rawEl2.textContent = JSON.stringify(data, null, 2);
        } catch (ignore) {}
        render();
        if (typeof toast === 'function') toast("Données locales chargées (balances.json).");
        return;
      } catch (fe) {
        const fmsg = fe?.message || String(fe);
        if (typeof toast === 'function') toast("Impossible de charger l'API et le fallback local a échoué.");
        try {
          const rawEl3 = qs('#rawData') || (() => {
            const el = document.createElement('pre');
            el.id = 'rawData';
            el.style.whiteSpace = 'pre-wrap';
            el.style.maxHeight = '40vh';
            el.style.overflow = 'auto';
            el.style.margin = '1rem';
            document.body.appendChild(el);
            return el;
          })();
          rawEl3.textContent = `Fallback error: ${fmsg}`;
        } catch (uiErr) {}
      }
    })();
  }
};

const refreshBtnEl = qs('#refreshBtn');
let refreshTimer = null;

const setupRefresh = () => {
  if (refreshBtnEl) {
    refreshBtnEl.addEventListener('click', async () => {
      refreshBtnEl.disabled = true;
      const originalText = refreshBtnEl.textContent;
      refreshBtnEl.textContent = 'Refreshing…';
      try {
        await load();
      } finally {
        refreshBtnEl.disabled = false;
        refreshBtnEl.textContent = originalText;
      }
    });
  }

  if (typeof window !== 'undefined' && typeof window.setInterval === 'function') {
    refreshTimer = window.setInterval(() => {
      load();
    }, REFRESH_INTERVAL_MS);
  }
};

if (searchEl) searchEl.addEventListener('input', render);
if (sortEl) sortEl.addEventListener('change', render);

setupRefresh();
load();
