# GitHub deployment

Repository: `sunbotvietnam/pefso-sales`

## Frontend
Enable GitHub Pages:
Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save.

Expected frontend URL after Pages is enabled:
`https://sunbotvietnam.github.io/pefso-sales/`

## Backend
1. Create a standalone Google Apps Script project.
2. Paste `apps-script/Code.gs`.
3. Deploy → New deployment → Web app.
4. Execute as: Me.
5. Access: Anyone.
6. Copy the `/exec` URL.
7. Replace `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` in `index.html` with that URL.

Backend Google Sheet ID:
`1o7OXEp7FHMrJ2TPqmWXH6BQM25nLqxxdC0J2l6f2O_c`

The system is independent from `newpefso/info`.