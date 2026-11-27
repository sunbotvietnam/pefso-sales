# PEFSO Product Studio V1 — internal pilot

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

Structured specification editing and evidence/asset approval, bulk SKU import, separate roles, explicit pack quantity, controlled product edits and reconciliation, proposal adapter to SKU_MASTER, public catalog service, RFQ and quotation lines. The live original Proposal repository remains read-only to the current connection.
