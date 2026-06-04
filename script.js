const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Footer year
$('#year').textContent = new Date().getFullYear();

// Toast
const toastEl = $('#toast');
const toastMsg = $('#toastMsg');
let toastTimer;
window.toast = (msg) => {
  toastMsg.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
};

// Mobile nav
const navToggle = $('[data-nav-toggle]');
if (navToggle) {
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';
  menu.innerHTML = [
    '<div class="container">',
    '<a href="#features">Features</a>',
    '<a href="#commands">Commands</a>',
    '<a href="#status">Status</a>',
    '<a class="btn btn--primary" href="#invite" style="width:100%; margin-top:10px;">Invite</a>',
    '</div>'
  ].join('');
  document.body.appendChild(menu);

  navToggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

// Placeholder KPI values
const kpis = $('[data-kpi="servers"]') ? $$('[data-kpi]') : [];
const randomFrom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
if (kpis.length) {
  const servers = randomFrom(12, 99);
  const users = randomFrom(1200, 42000);
  const uptimeH = randomFrom(3, 240);
  kpis.forEach((el) => {
    if (el.getAttribute('data-kpi') === 'servers') el.textContent = servers.toLocaleString();
    if (el.getAttribute('data-kpi') === 'users') el.textContent = users.toLocaleString();
    if (el.getAttribute('data-kpi') === 'uptime') el.textContent = uptimeH + 'h';
  });
}

// Status timestamp
const lastUpdated = $('#lastUpdated');
if (lastUpdated) {
  const d = new Date();
  lastUpdated.textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}

// API button: try local `balances.json` then report status (French messages)
const apiBtn = $('#apiBtn');
if (apiBtn) {
  apiBtn.addEventListener('click', async () => {
    try {
      const res = await fetch('balances.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      toast("Connecté à l'API (données locales).");
    } catch (err) {
      toast("Pas connecté à l'API. Vérifiez votre endpoint.");
    }
  });
}

