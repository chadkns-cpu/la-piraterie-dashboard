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

