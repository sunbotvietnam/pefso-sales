# PEFSO Product Studio V1.1 — internal pilot

This module extends the existing Sales Kit Master v3, without changing its legacy Product Master or the running Proposal/Sales applications. No production data, spreadsheet ID, credentials, or customer details are committed.

## Install in the existing spreadsheet (owner/editor only)

1. Open the actual PEFSO Sales Kit Master v3 spreadsheet. Choose Extensions > Apps Script. Do not create a separate spreadsheet, replace Code.gs, or change any existing deployment.
2. In the bound Apps Script project create a script named ProductStudio and paste the contents of ProductStudio.gs. Create an HTML file named ProductStudio and paste ProductStudio.html. Save. Check for existing global identifiers with the same ps prefix / PS constants before saving.
3. Run psInstall once in the editor using the authorized Google account, review and grant only the requested permissions. This checks required tabs, creates PRODUCT_CHANGE_LOG if missing, and adds the menu. Return to the spreadsheet.
4. Choose PEFSO Product Studio > Mở quản trị sản phẩm. For a permanent menu on spreadsheet open, add a call to psMenu() inside the existing onOpen handler if present; otherwise add function onOpen(){psMenu();}. Do not overwrite the existing handler. Alternatively run psMenu manually after reopening.
5. Do NOT deploy this module as a public web app. The dialog is intended for spreadsheet editors only. It checks for an identifiable Google user, but spreadsheet-level access is the permission boundary; it does not enforce separate reviewer/publisher roles. Limit editors to trusted PEFSO personnel.
6. Test on a temporary copy first if possible. Do not promote dummy records in the live spreadsheet. Use a real new SKU only after Tony confirms source, specs and sample status.

## Workflow

- Read SKU_MASTER, CATEGORY_MASTER, PRODUCT_SPECIFICATIONS, PRODUCT_RELATIONS and SKU_ASSETS. Preserve legacy data.
- Add a new family only when the existing classification does not cover the product.
- Intake requires unique SKU, family, product name, specification, order unit and source URL.
- Review requires notes; approval requires explicit confirmation.
- Promote only approved intake; a promoted SKU is Approved / Hold by default, not published.
- Public approved requires Approved or Active technical status and explicit confirmation; discontinued must remain Hold.
- Publication preview is an internal allowlisted view, not a public API. The spec text is not separately sanitized for confidential content; reviewers must ensure it contains only public information before future website integration.
- PRODUCT_CHANGE_LOG captures application writes; direct sheet edits bypass this log. Sheet writes are not a transactional database; in case of an error between writes, inspect the SKU/intake/audit rows before retrying.
- Existing technical evidence/asset links are displayed with their source status; no claim that a representative image is an exact SKU photo.

## Validation completed

Server and client JavaScript syntax parsed successfully. Seventeen in-memory server checks using the existing schema and read-only source snapshot passed: initial 32 SKUs, matching liner link, empty public preview, duplicate/unknown-family/missing-source/formula rejection, intake creation, duplicate pending intake, unapproved promotion blocked, approval confirmation, promotion to Hold, duplicate promotion blocked, unapproved publication blocked, allowlisted preview, audit entries, family uniqueness. No live writes during these tests.

Not yet tested: Google Apps Script authorization, actual dialog rendering and end-to-end writing on Google Sheets. No public deployment, no WordPress sync, no automatic RFQ integration.

## Next version

AI-assisted intake from source folders, asset approval, separate roles, reconciliation, proposal adapter to SKU_MASTER, public catalog service, RFQ and quotation lines. The live original Proposal repository remains read-only to the current connection.

## V1.1 additions — 2026-11-28
- Bulk intake: paste TSV from Excel/Sheets, including exactly this header: sku, family_id, product_name_en, specification, order_unit (tab separated). Up to 100 data rows; no embedded tabs or multiline cells. A shared source folder or technical document URL is required. Preview is read-only. Commit revalidates the whole batch under the document lock and only writes if every row is valid. No automatic approval. Native XLSX file upload is not implemented.
- Core editing and structured attribute upsert require a source and reason; technical changes return the item to Ready for review / Hold. Review consistency between display specs and structured attributes before approving again.
- Asset registration accepts Drive file links at family level, labels representative/concept/reference assets and defaults to Hold. It does not fetch the image, verify its contents, change sharing permissions, or certify exact SKU evidence.
- 18 additional in-memory regression checks passed for batch preview, duplicate rejection, all-or-none validation, commit/replay, edits, spec upsert, asset scope and audit. Both JavaScript files pass syntax parsing. No live test writes. Google authorization and browser dialog testing remain pending.
- Installation uses the same two files, not a new Apps Script project. If V1.0 has already been installed, replace only ProductStudio.gs and ProductStudio.html; rerun psInstall. Otherwise install V1.1 directly.
