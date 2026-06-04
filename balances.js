const fmt = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
};

const normalizeBalance = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const getPlayerName = (p) => String(p?.username ?? p?.user ?? p?.name ?? p?.id ?? '').trim();
const getCurrentBalance = (p) => normalizeBalance(p?.currentBalance ?? p?.current ?? p?.balance ?? p?.balanceCurrent ?? p?.current_balance ?? p?.current);
const getLifetimeBalance = (p) => normalizeBalance(p?.lifetimeBalance ?? p?.lifetime ?? p?.totalBalance ?? p?.total ?? p?.allTimeBalance ?? p?.all_time_balance ?? p?.lifetime_balance ?? p?.total_balance ?? p?.all_time);

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
const byBalanceDesc = (a, b) => (b.currentBalance ?? 0) - (a.currentBalance ?? 0);
const byBalanceAsc = (a, b) => (a.currentBalance ?? 0) - (b.currentBalance ?? 0);

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
      const current = typeof p.currentBalance === 'number' ? p.currentBalance : Number(p.currentBalance);
      const lifetime = typeof p.lifetimeBalance === 'number' ? p.lifetimeBalance : Number(p.lifetimeBalance);
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
    const rawBalances = Array.isArray(data?.balances)
      ? data.balances
      : Array.isArray(data?.players)
        ? data.players
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

    state.balances = rawBalances
      .map((p) => ({
        name: getPlayerName(p),
        currentBalance: getCurrentBalance(p),
        lifetimeBalance: getLifetimeBalance(p),
      }))
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
      tableRowsEl.innerHTML = `<tr><td colspan="2" class="muted">Failed to load balances from ${escapeHtml(BALANCES_API_URL)} — ${escapeHtml(errMsg)}</td></tr>`;
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
        const rawBalances = Array.isArray(data?.balances)
          ? data.balances
          : Array.isArray(data?.players)
            ? data.players
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : [];

        state.balances = rawBalances
          .map((p) => ({
            name: getPlayerName(p),
            currentBalance: getCurrentBalance(p),
            lifetimeBalance: getLifetimeBalance(p),
          }))
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

if (searchEl) searchEl.addEventListener('input', render);
if (sortEl) sortEl.addEventListener('change', render);

load();
