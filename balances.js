const fmt = (n) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
};

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
const byBalanceDesc = (a, b) => (b.balance ?? 0) - (a.balance ?? 0);
const byBalanceAsc = (a, b) => (a.balance ?? 0) - (b.balance ?? 0);

const state = {
  players: [],
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
  let list = state.players.slice();

  if (query) {
    list = list.filter((p) => (p.name || '').toLowerCase().includes(query));
  }

  const sortVal = sortEl?.value || 'name';
  if (sortVal === 'name') list.sort(byName);
  if (sortVal === 'balance_desc') list.sort(byBalanceDesc);
  if (sortVal === 'balance_asc') list.sort(byBalanceAsc);

  rowCountEl.textContent = String(list.length);

  if (!list.length) {
    tableRowsEl.innerHTML = '<tr><td colspan="2" class="muted">No results.</td></tr>';
    return;
  }

  tableRowsEl.innerHTML = list
    .map((p) => {
      const name = String(p.name ?? '');
      const balance = typeof p.balance === 'number' ? p.balance : Number(p.balance);
      return `
        <tr>
          <td style="font-weight:900;">${escapeHtml(name)}</td>
          <td style="text-align:right; font-weight:900;">${fmt(balance)}</td>
        </tr>
      `;
    })
    .join('');
};

const escapeHtml = (s) => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '<')
  .replaceAll('>', '>')
  .replaceAll('"', '"')
  .replaceAll("'", '&#039;');

// Change BALANCES_API_URL to your API endpoint.
// IMPORTANT: the endpoint must allow browser requests (CORS).
const BALANCES_API_URL = 'http://127.0.0.1:20313/health';

// IMPORTANT: this is a public frontend. If this key grants access, it will be exposed to anyone.
// Prefer a server-side proxy in production.
const BALANCES_API_KEY = 'ptlc_ZMxKJnw6mGW';

// Some APIs return a different shape (or require a proxy). We keep the UI resilient.
// If your endpoint doesn’t return { players: [...] }, adjust the parsing below in `load()`.


const load = async () => {
  try {
    const res = await fetch(BALANCES_API_URL, {
      cache: 'no-store',
      headers: {
        'x-api-key': BALANCES_API_KEY,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Expected JSON format:
    // { "players": [ {"name":"Alice","balance":1500}, ... ], "generatedAt":"..." }
// Accept multiple shapes:
    // - { players: [...] }
    // - { data: [...] }
    // - [...] (array directly)
    const rawPlayers = Array.isArray(data?.players)
      ? data.players
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];

    const players = rawPlayers;
    state.players = players
      .map((p) => ({
        name: String(p?.name ?? ''),
        balance: typeof p?.balance === 'number' ? p.balance : Number(p?.balance),
      }))
      .filter((p) => p.name.length);

    if (generatedAtTextEl) {
      const d = data?.generatedAt ? new Date(data.generatedAt) : null;
      generatedAtTextEl.textContent = d && !Number.isNaN(d.getTime())
        ? `Updated: ${d.toLocaleString()}`
        : 'Updated.';
    }

    render();
  } catch (e) {
    if (generatedAtTextEl) generatedAtTextEl.textContent = 'Could not load balances.';
    if (tableRowsEl) {
      tableRowsEl.innerHTML = `<tr><td colspan="2" class="muted">Failed to load balances from ${escapeHtml(BALANCES_API_URL)}</td></tr>`;
    }
  }
};

if (searchEl) searchEl.addEventListener('input', render);
if (sortEl) sortEl.addEventListener('change', render);

load();

