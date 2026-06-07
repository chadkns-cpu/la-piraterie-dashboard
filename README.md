# La Piraterie — Discord Bot Dashboard (GitHub Pages)

This folder contains a static website ready to publish on **GitHub Pages**.

## Publish steps
1. Create a new GitHub repository, for example: `la-piraterie-dashboard`.
2. Upload **all files** from this folder (at minimum):
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
3. In your GitHub repo: **Settings → Pages**.
4. Set **Source** to: **Deploy from a branch** and select your default branch (usually `main`).
5. Save.
6. Wait for GitHub to deploy (usually ~1-3 minutes).

## Customization
- Change the bot invite link: in `index.html`, update the `onclick` handler on the **Invite the bot** button.
- Update KPIs/status later by connecting them to your bot API.
- Replace the command list under **Commands** with your real slash commands.

## Sync balances.json from the API
This project uses a local `balances.json` fallback file for the balances page.

To refresh local balances data from the API, run:

```bash
node sync-balances.js
```

To run it automatically every X seconds, use:

```bash
node sync-balances.js --interval=300
```

The script fetches from the configured API endpoint and rewrites `balances.json` with entries keyed by player ID, containing:
- `username`
- `current`
- `lifetime`

> Requires Node.js v18+ for built-in `fetch` support.

## Run a local server for automatic refresh

If you want the balance page to trigger `sync-balances.js` automatically when you click **Actualiser**, use the local server:

```bash
node server.js
```

Then open the page in your browser at:

```text
http://localhost:3000/balances.html
```

The page will try to call the local endpoint `/sync-balances` before reloading API data.

> This only works when the page is served by the local Node server, not from `file://` or GitHub Pages.

## Automatic refresh on GitHub Pages

If you're using **GitHub Pages**, configure **GitHub Actions** to run `sync-balances.js` automatically:

1. Commit the workflow file at `.github/workflows/sync-balances.yml` to your repo.
2. GitHub will automatically run it every 5 minutes (or on manual trigger).
3. The workflow updates `balances.json` and commits it to your repo.
4. GitHub Pages will serve the updated file.

To trigger a manual run:
- Go to your repo on GitHub
- Click the **Actions** tab
- Click **Sync Balances** workflow
- Click **Run workflow**

