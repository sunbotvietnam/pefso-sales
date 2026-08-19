# PEFSO Sales V2

Independent frontend for `sunbotvietnam/pefso-sales`.

## Current implemented scope
- ID + 8-digit PIN login
- Roles: Admin / Staff / Collaborator
- Admin User Management: create account, edit ID/role/name, reset PIN, activate/deactivate
- My Account: user can change own ID/PIN; current PIN required
- Backend contract: independent Google Sheet + Apps Script
- No changes to `newpefso/info`

## Backend
Google Sheet ID: `1o7OXEp7FHMrJ2TPqmWXH6BQM25nLqxxdC0J2l6f2O_c`

The Sheet stores no plain PIN. Existing initial users use legacy SHA-256(salt:PIN) and are automatically upgraded after the first successful login to a peppered server-side hash.

## Deploy Apps Script
1. Open script.google.com and create a new standalone Apps Script project.
2. Paste `apps-script/Code.gs`.
3. Deploy → New deployment → Web app.
4. Execute as: Me.
5. Who has access: Anyone (or the broadest option available for your Google account; authentication is handled by the app itself).
6. Copy the `/exec` URL.
7. In `index.html`, replace `PASTE_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL.

## Initial login
Use the IDs `admin`, `staff`, `ctv` and the 8-digit PINs already agreed with the owner.