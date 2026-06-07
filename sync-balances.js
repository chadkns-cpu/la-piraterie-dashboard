const fs = require('fs').promises;
const path = require('path');

const BALANCES_API_URL = 'http://193.70.34.101:20036/balances';
const BALANCES_API_KEY = '368feea3692ff6070581646deaf1440211f6d2955167ecb45efe985ca06dc3a1';
const OUTPUT_FILE = path.resolve(process.cwd(), 'balances.json');

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const normalizeString = (value) => typeof value === 'string' && value.trim().length ? value.trim() : '';
const normalizeBalance = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

const looksLikePlayerEntry = (value) => isObject(value) && (
  'username' in value ||
  'current' in value ||
  'currentBalance' in value ||
  'balance' in value ||
  'amount' in value ||
  'lifetime' in value ||
  'lifetimeBalance' in value ||
  'total' in value ||
  'totalBalance' in value ||
  'name' in value ||
  'id' in value ||
  'userId' in value
);

const isPlayerMap = (value) => isObject(value) && Object.values(value).length > 0 && Object.values(value).every(looksLikePlayerEntry);

const normalizePlayerMap = (value) => {
  return Object.entries(value).map(([id, entry]) => ({ id, ...entry }));
};

const extractRawBalances = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.balances)) return data.balances;
  if (Array.isArray(data?.players)) return data.players;
  if (Array.isArray(data?.data)) return data.data;
  if (isPlayerMap(data?.players)) return normalizePlayerMap(data.players);
  if (isPlayerMap(data)) return normalizePlayerMap(data);
  return [];
};

const getPlayerId = (entry) => {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.id === 'string' && entry.id.trim()) return entry.id.trim();
  if (typeof entry.userId === 'string' && entry.userId.trim()) return entry.userId.trim();
  if (typeof entry.id === 'number' && Number.isFinite(entry.id)) return String(entry.id);
  if (typeof entry.userId === 'number' && Number.isFinite(entry.userId)) return String(entry.userId);
  return '';
};

const getUsername = (entry) => {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.username === 'string' && entry.username.trim()) return entry.username.trim();
  if (typeof entry.name === 'string' && entry.name.trim()) return entry.name.trim();
  if (entry.user && typeof entry.user.username === 'string' && entry.user.username.trim()) return entry.user.username.trim();
  if (entry.user && typeof entry.user.name === 'string' && entry.user.name.trim()) return entry.user.name.trim();
  return '';
};

const getCurrentBalance = (entry) => normalizeBalance(entry?.current ?? entry?.currentBalance ?? entry?.balance ?? entry?.amount);
const getLifetimeBalance = (entry) => normalizeBalance(entry?.lifetime ?? entry?.lifetimeBalance ?? entry?.total ?? entry?.totalBalance);

const readExistingBalances = async () => {
  try {
    const text = await fs.readFile(OUTPUT_FILE, 'utf8');
    const data = JSON.parse(text);
    return isObject(data) ? data : {};
  } catch {
    return {};
  }
};

const main = async () => {
  if (typeof fetch !== 'function') {
    throw new Error('Node.js v18+ is required for built-in fetch support.');
  }

  const headers = { 'Accept': 'application/json' };
  if (BALANCES_API_KEY) headers['x-api-key'] = BALANCES_API_KEY;

  console.log(`Fetching balances from ${BALANCES_API_URL}...`);
  const response = await fetch(BALANCES_API_URL, { headers, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawBalances = extractRawBalances(data);
  if (!Array.isArray(rawBalances) || rawBalances.length === 0) {
    throw new Error('API response does not contain a recognized balances array.');
  }

  const existingBalances = await readExistingBalances();
  const output = {};
  let skipped = 0;

  for (const entry of rawBalances) {
    const id = getPlayerId(entry);
    if (!id) {
      skipped += 1;
      continue;
    }

    let username = getUsername(entry);
    if (!username && existingBalances[id] && typeof existingBalances[id].username === 'string' && existingBalances[id].username.trim()) {
      username = existingBalances[id].username.trim();
    }
    if (!username) {
      username = `unknown_${id}`;
    }

    const current = getCurrentBalance(entry);
    const lifetime = getLifetimeBalance(entry);

    output[id] = {
      username,
      current: Number.isFinite(current) ? current : 0,
      lifetime: Number.isFinite(lifetime) ? lifetime : 0,
    };
  }

  const outputJson = JSON.stringify(output, null, 2);
  await fs.writeFile(OUTPUT_FILE, outputJson + '\n', 'utf8');

  console.log(`Updated ${OUTPUT_FILE} with ${Object.keys(output).length} entries.${skipped ? ` Skipped ${skipped} invalid entries.` : ''}`);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const intervalArg = args.find((arg) => arg.startsWith('--interval='));
  const watch = args.includes('--watch') || Boolean(intervalArg);
  const intervalSeconds = intervalArg ? Number(intervalArg.split('=')[1]) : 300;
  return { watch, intervalSeconds };
};

const { watch, intervalSeconds } = parseArgs();

if (watch) {
  if (Number.isNaN(intervalSeconds) || intervalSeconds <= 0) {
    console.error('Usage: node sync-balances.js --interval=<seconds>\nExample: node sync-balances.js --interval=300');
    process.exit(1);
  }

  const run = async () => {
    try {
      await main();
    } catch (err) {
      console.error('Error during scheduled sync:', err.message || err);
    }
  };

  console.log(`Running in watch mode. Refreshing every ${intervalSeconds} seconds.`);
  run();
  setInterval(run, intervalSeconds * 1000);
} else {
  main().catch((err) => {
    console.error('Error:', err.message || err);
    process.exit(1);
  });
}

