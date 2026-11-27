# PEFSO — AI intake brief (V1.2 preparation)

Use this brief in an AI session with access to the supplied product folder and the current CATEGORY_MASTER, SKU_MASTER and PRODUCT_INTAKE. The AI must read sources before proposing data. Never supply credentials or publish internal data.

## Task
1. Inventory the source folder and identify the latest source version, product list, technical evidence, images and unresolved questions. Cite source file links and sheet/range or page where available.
2. Match existing SKU and family IDs exactly. Separate genuinely new SKUs from existing SKU corrections. Do not rename a SKU or add a new family without evidence and owner confirmation.
3. Preserve source dimensions, measurement basis, units, pack quantity and sample status. Do not guess prices, MOQ, availability, certifications, food contact safety or compatibility.
4. Classify visual evidence as exact SKU evidence only if explicitly proven; otherwise family representative, concept illustration, technical reference, internal reference or brand asset. Do not assign exact SKU photography based on shape or filenames alone.
5. Deliver four outputs:
   - NEW SKU TSV, with the exact header below, only rows with complete required fields and valid existing family IDs. No multiline cells or tabs within fields. Maximum 100 rows per batch.
   - Existing SKU correction queue: SKU, field, old value, proposed value, reason, source, confirmation needed.
   - Missing family / unresolved data queue: proposed category, collection and family, evidence, questions for Tony.
   - Asset registry proposal: family, file name, source Drive link, evidence type and caption, all Hold until review.
6. Produce one concise list of questions Tony must answer before commercial approval. Separate proposed specifications from verified ones. No automatic writes or approval.

## TSV contract
```tsv
sku	family_id	product_name_en	specification	order_unit
```

The shared source folder/document URL is entered separately in Product Studio. Only paste rows identified as NEW. Do not use the existing Banneton 32 SKUs as new import rows.

## Current workflow
Product Studio V1.1 accepts TSV copied from Excel/Sheets. It validates the whole batch, queues new records, and requires review before promotion. This brief is an assisted workflow, not an automated Drive ingestion service. AI may help prepare files and classify content, but the application does not yet scan Drive folders itself.
