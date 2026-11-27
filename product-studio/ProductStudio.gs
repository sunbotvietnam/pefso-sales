/** PEFSO Product Studio V1 — spreadsheet-bound, internal only.
 * Do not deploy as a public web app. Run psInstall once from the bound project.
 */
const PS_TABS = {
  sku: "SKU_MASTER", cat: "CATEGORY_MASTER", intake: "PRODUCT_INTAKE",
  spec: "PRODUCT_SPECIFICATIONS", rel: "PRODUCT_RELATIONS", assets: "SKU_ASSETS",
  audit: "PRODUCT_CHANGE_LOG"
};
const PS_DEV = ["Concept","Draft","Sample pending","Ready for review","Approved","Active","Discontinued"];
const PS_PUB = ["Hold","Private only","Public approved"];
function psInstall(){
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw Error("Bind this script to Sales Kit Master v3 first.");
  ["sku","cat","intake","spec","rel","assets"].forEach(k=>psSheet_(k));
  psWithLock_(()=>{if(!ss.getSheetByName(PS_TABS.audit)){
    const sh=ss.insertSheet(PS_TABS.audit);
    sh.appendRow(["timestamp","actor","action","record_id","old_value","new_value","note"]);
    sh.setFrozenRows(1);sh.getRange("A1:G1").setFontWeight("bold");
  }});
  psMenu();
}
function psMenu(){SpreadsheetApp.getUi().createMenu("PEFSO Product Studio").addItem("Mở quản trị sản phẩm","psOpen").addToUi();}
function psOpen(){SpreadsheetApp.getUi().showModelessDialog(HtmlService.createHtmlOutputFromFile("ProductStudio").setWidth(1120).setHeight(720),"PEFSO | Product Studio");}
function psSheet_(k){const ss=SpreadsheetApp.getActiveSpreadsheet();const sh=ss&&ss.getSheetByName(PS_TABS[k]);if(!sh)throw Error("Missing sheet: "+PS_TABS[k]);return sh;}
function psRead_(k){const sh=psSheet_(k),v=sh.getDataRange().getValues(),h=v[0].map(String);return {sh,h,rows:v.slice(1).map((r,i)=>Object.assign({_row:i+2},Object.fromEntries(h.map((a,j)=>[a,r[j] instanceof Date?r[j].toISOString():r[j]])))).filter(r=>String(r[h[0]]||"").trim())};}
function psActor_(){const email=Session.getActiveUser().getEmail();if(!email)throw Error("Không xác định được tài khoản Google. Dùng tài khoản có quyền chỉnh sửa bảng tính.");return email;}
function psWithLock_(fn){const l=LockService.getDocumentLock();if(!l)throw Error("Must be spreadsheet-bound");l.waitLock(15000);try{return fn()}finally{l.releaseLock()}}
function psText_(v,max){const s=String(v==null?"":v).trim();if(s.length>(max||1000))throw Error("Field too long");if(/^[=+@-]/.test(s))throw Error("Không nhập biểu thức/công thức vào trường văn bản.");return s;}
function psId_(v){const s=psText_(v,80).toUpperCase();if(!/^[A-Z0-9][A-Z0-9._-]{1,79}$/.test(s))throw Error("Mã chỉ dùng A-Z, số, dấu . _ -");return s}
function psURL_(v){const s=psText_(v,1000);if(s&&!/^https:\/\/[^\s]+$/i.test(s))throw Error("Nguồn phải là đường dẫn HTTPS.");return s}
function psRequire_(v,label){if(!v)throw Error("Thiếu "+label);return v}
function psRecord_(t,key,id){const rows=t.rows.filter(r=>String(r[key]).toUpperCase()===String(id).toUpperCase());if(rows.length!==1)throw Error(rows.length?"Duplicate record: "+id:"Record not found: "+id);return rows[0]}
function psSet_(t,row,changes){for(const [k,v] of Object.entries(changes)){const i=t.h.indexOf(k);if(i<0)throw Error("Missing column "+k);t.sh.getRange(row,i+1).setValue(v)}}
function psAppend_(t,record){t.sh.appendRow(t.h.map(k=>record[k]===undefined?"":record[k]));}
function psAudit_(actor,action,id,before,after,note){psSheet_("audit").appendRow([new Date(),actor,action,id,JSON.stringify(before),JSON.stringify(after),note||""])}
function psDate_(){return Utilities.formatDate(new Date(),"Asia/Ho_Chi_Minh","yyyy-MM-dd")}
function psPublic_(r){return r.publish_status==="Public approved"&&["Approved","Active"].includes(r.development_status)}
function psData(){
  psActor_();
  return {skus:psRead_("sku").rows,families:psRead_("cat").rows,intakes:psRead_("intake").rows,dev:PS_DEV,pub:PS_PUB};
}
function psDetails(sku){psActor_();sku=psId_(sku);const r=psRecord_(psRead_("sku"),"sku",sku);return {sku:r,specs:psRead_("spec").rows.filter(x=>x.sku===sku),relations:psRead_("rel").rows.filter(x=>x.from_sku===sku||x.to_sku===sku),assets:psRead_("assets").rows.filter(x=>x.collection_id===r.collection_id&&(!x.family_id||x.family_id===r.family_id))}}
function psNewFamily(p){const actor=psActor_();return psWithLock_(()=>{
  const t=psRead_("cat"),family=psId_(p.family_id);
  if(t.rows.some(r=>String(r.family_id).toUpperCase()===family))throw Error("Family đã tồn tại");
  const category=psId_(p.category_id),collection=psId_(p.collection_id),categoryName=psRequire_(psText_(p.category_en,180),"category name"),familyName=psRequire_(psText_(p.family_en,180),"family name");
  if(t.rows.some(r=>r.category_id===category&&r.category_en!==categoryName))throw Error("Tên ngành hàng không khớp mã hiện có");
  if(t.rows.some(r=>r.collection_id===collection&&r.category_id!==category))throw Error("Collection đã thuộc ngành hàng khác");
  const legacy=psText_(p.legacy_product_id,80);
  if(legacy){const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PRODUCT_MASTER");if(!sh||!sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),1).getDisplayValues().some(r=>r[0]===legacy))throw Error("Legacy product ID không tồn tại");}
  const row={category_id:category,category_en:categoryName,collection_id:collection,family_id:family,family_en:familyName,legacy_product_id:legacy,status:"Pilot",notes:psText_(p.notes,1000)};
  psAppend_(t,row);psAudit_(actor,"CREATE_FAMILY",family,{},row,"");return {ok:true,id:family};
})}
function psNewIntake(p){const actor=psActor_();return psWithLock_(()=>{
  const t=psRead_("intake"),skus=psRead_("sku"),f=psRecord_(psRead_("cat"),"family_id",psId_(p.family_id)),sku=psId_(p.proposed_sku);
  if(skus.rows.some(r=>String(r.sku).toUpperCase()===sku))throw Error("SKU đã tồn tại");
  if(t.rows.some(r=>String(r.proposed_sku).toUpperCase()===sku&&!["Rejected","Promoted"].includes(r.review_status)))throw Error("SKU đã có hồ sơ tiếp nhận");
  const folder=psURL_(p.source_folder_url),doc=psURL_(p.source_document_url);psRequire_(folder||doc,"nguồn dữ liệu");
  const row={intake_id:"INT-"+Utilities.getUuid(),received_date:psDate_(),submitted_by:actor,category_id:f.category_id,collection_id:f.collection_id,family_id:f.family_id,proposed_sku:sku,product_name_en:psRequire_(psText_(p.product_name_en,250),"tên sản phẩm"),raw_spec_or_description:psRequire_(psText_(p.raw_spec_or_description,4000),"thông số"),order_unit:psRequire_(psText_(p.order_unit,100),"đơn vị"),source_folder_url:folder,source_document_url:doc,review_status:"New"};
  psAppend_(t,row);psAudit_(actor,"NEW_INTAKE",row.intake_id,{},row,"");return {ok:true,id:row.intake_id};
})}
function psReviewIntake(p){const actor=psActor_();return psWithLock_(()=>{
  const t=psRead_("intake"),r=psRecord_(t,"intake_id",p.intake_id);
  if(["Promoted","Rejected"].includes(r.review_status))throw Error("Hồ sơ đã đóng");
  const status=String(p.status);if(!["In review","Needs information","Approved","Rejected"].includes(status))throw Error("Invalid status");
  const note=psRequire_(psText_(p.note,2000),"ghi chú rà soát");
  if(status==="Approved"&&p.confirm!==true)throw Error("Cần xác nhận đã kiểm tra thông số/mẫu");
  const changes={review_status:status,reviewer:actor,review_note:note};psSet_(t,r._row,changes);psAudit_(actor,"REVIEW_INTAKE",r.intake_id,{review_status:r.review_status},changes,note);return {ok:true};
})}
function psPromote(p){const actor=psActor_();return psWithLock_(()=>{
  const t=psRead_("intake"),r=psRecord_(t,"intake_id",p.intake_id),s=psRead_("sku");
  if(r.review_status!=="Approved"||p.confirm!==true)throw Error("Chỉ chuyển hồ sơ đã duyệt và xác nhận.");
  const sku=psId_(r.proposed_sku);if(s.rows.some(x=>String(x.sku).toUpperCase()===sku))throw Error("SKU đã tồn tại; kiểm tra hồ sơ trước khi tiếp tục.");
  const f=psRecord_(psRead_("cat"),"family_id",r.family_id);
  if(f.category_id!==r.category_id||f.collection_id!==r.collection_id)throw Error("Family mismatch");
  const row={sku,category_id:r.category_id,collection_id:r.collection_id,family_id:r.family_id,legacy_product_id:f.legacy_product_id||"",product_name_en:psRequire_(psText_(r.product_name_en,250),"tên sản phẩm"),spec_display_en:psRequire_(psText_(r.raw_spec_or_description,4000),"thông số"),order_unit_source:psRequire_(psText_(r.order_unit,100),"đơn vị"),source_rfq_status:"",development_status:"Approved",publish_status:"Hold",review_note_vi:r.review_note,source_product_list:psURL_(r.source_folder_url),source_technical:psURL_(r.source_document_url),asset_scope:"Unverified",updated_date:psDate_()};
  psAppend_(s,row);psSet_(t,r._row,{review_status:"Promoted",promoted_sku:sku});psAudit_(actor,"PROMOTE",sku,{},row,"Publication remains on Hold");return {ok:true,id:sku};
})}
function psSetStatus(p){const actor=psActor_();return psWithLock_(()=>{
  const t=psRead_("sku"),r=psRecord_(t,"sku",psId_(p.sku)),dev=String(p.development_status),pub=String(p.publish_status);
  if(!PS_DEV.includes(dev)||!PS_PUB.includes(pub))throw Error("Invalid status");
  const note=psRequire_(psText_(p.note,2000),"ghi chú xác nhận");
  if(["Approved","Active"].includes(dev)&&!["Approved","Active"].includes(r.development_status)&&p.confirm!==true)throw Error("Cần xác nhận đã rà soát kỹ thuật.");
  if(pub==="Public approved"&&(!["Approved","Active"].includes(dev)||p.confirm!==true))throw Error("Chỉ SKU đã duyệt kỹ thuật và có xác nhận xuất bản.");
  if(dev==="Discontinued"&&pub!=="Hold")throw Error("Ngừng kinh doanh phải giữ xuất bản.");
  const changes={development_status:dev,publish_status:pub,review_note_vi:note,updated_date:psDate_()};psSet_(t,r._row,changes);psAudit_(actor,"SKU_STATUS",r.sku,{development_status:r.development_status,publish_status:r.publish_status},changes,note);return {ok:true};
})}
/** Internal preview only; allowlist. No URL, buyer data, internal note, price or stock. */
function psPublicPreview(){psActor_();return psRead_("sku").rows.filter(psPublic_).map(r=>({sku:r.sku,category_id:r.category_id,collection_id:r.collection_id,family_id:r.family_id,product_name_en:r.product_name_en,spec_display_en:r.spec_display_en,order_unit:r.order_unit_source,units_per_pack:r.units_per_pack}));}

/** V1.1: batch intake from a rectangular TSV copied from Excel/Sheets. */
function psBatchPlan_(p){
 const text=String(p.tsv||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trim();
 if(!text||text.length>400000)throw Error("Dữ liệu trống hoặc quá lớn.");
 const lines=text.split("\n"), expected=["sku","family_id","product_name_en","specification","order_unit"];
 const header=lines.shift().split("\t").map(x=>x.trim().toLowerCase());
 if(header.length!==5||!expected.every((x,i)=>x===header[i]))throw Error("Tiêu đề phải đúng: "+expected.join(" | "));
 if(lines.length>100)throw Error("Tối đa 100 SKU/lần.");
 const folder=psURL_(p.source_folder_url),doc=psURL_(p.source_document_url);psRequire_(folder||doc,"nguồn dữ liệu");
 const t=psRead_("intake"), s=psRead_("sku"), f=psRead_("cat");
 const existing=new Set(s.rows.map(x=>String(x.sku).toUpperCase())),pending=new Set(t.rows.filter(x=>!["Rejected","Promoted"].includes(x.review_status)).map(x=>String(x.proposed_sku).toUpperCase())),seen=new Set();
 const result=[];
 lines.forEach((line,i)=>{if(!line.trim())return;let sku="",name="";try{
  const a=line.split("\t");if(a.length!==5)throw Error("Cần đúng 5 cột; không dùng tab hoặc xuống dòng trong ô.");
  sku=psId_(a[0]);name=psRequire_(psText_(a[2],250),"tên");
  const fam=psRecord_(f,"family_id",psId_(a[1]));
  if(existing.has(sku))throw Error("Đã có trong SKU Master");
  if(pending.has(sku))throw Error("Đã có hồ sơ tiếp nhận");
  if(seen.has(sku))throw Error("Trùng trong lô nhập");seen.add(sku);
  result.push({line:i+2,sku,name,ok:true,record:{category_id:fam.category_id,collection_id:fam.collection_id,family_id:fam.family_id,proposed_sku:sku,product_name_en:name,raw_spec_or_description:psRequire_(psText_(a[3],4000),"thông số"),order_unit:psRequire_(psText_(a[4],100),"đơn vị"),source_folder_url:folder,source_document_url:doc,review_status:"New"}});
 }catch(e){result.push({line:i+2,sku,name,ok:false,error:String(e.message||e)})}});
 if(!result.length)throw Error("Không có dòng dữ liệu.");
 return {t,result};
}
function psBatchPreview(p){psActor_();const {result}=psBatchPlan_(p);return result.map(({record,...r})=>r)}
function psBatchCommit(p){const actor=psActor_();return psWithLock_(()=>{
 if(p.confirm!==true)throw Error("Cần xác nhận nhập lô.");
 const {t,result}=psBatchPlan_(p);if(result.some(r=>!r.ok))throw Error("Lô có lỗi hoặc dữ liệu đã thay đổi; kiểm tra lại. Chưa nhập dòng nào.");
 const records=result.map(r=>Object.assign({intake_id:"INT-"+Utilities.getUuid(),received_date:psDate_(),submitted_by:actor},r.record));
 const rows=records.map(r=>t.h.map(k=>r[k]===undefined?"":r[k]));
 const start=t.sh.getLastRow()+1,need=start+rows.length-1-t.sh.getMaxRows();if(need>0)t.sh.insertRowsAfter(t.sh.getMaxRows(),need);
 t.sh.getRange(start,1,rows.length,t.h.length).setValues(rows);
 psAudit_(actor,"BATCH_INTAKE","BATCH-"+Utilities.getUuid(),{},records.map(r=>({intake_id:r.intake_id,sku:r.proposed_sku})),"Batch intake; no automatic approval");
 return {ok:true,count:records.length};
})}
/** Correct core data or a structured technical attribute. Any technical edit returns the SKU to review/Hold. */
function psEditCore(p){const actor=psActor_();return psWithLock_(()=>{
 const t=psRead_("sku"),r=psRecord_(t,"sku",psId_(p.sku));
 if(r.development_status==="Discontinued")throw Error("SKU ngừng kinh doanh; mở lại qua duyệt trước.");
 const note=psRequire_(psText_(p.note,2000),"lý do chỉnh sửa"), source=psRequire_(psURL_(p.source_technical),"nguồn kỹ thuật");
 const raw=String(p.units_per_pack||"").trim();let units="";if(raw){units=Number(raw);if(!Number.isSafeInteger(units)||units<1)throw Error("Số đơn vị/gói phải là số nguyên dương");}
 const ch={product_name_en:psRequire_(psText_(p.product_name_en,250),"tên"),spec_display_en:psRequire_(psText_(p.spec_display_en,4000),"thông số"),order_unit_source:psRequire_(psText_(p.order_unit_source,100),"đơn vị"),units_per_pack:units,source_technical:source,development_status:"Ready for review",publish_status:"Hold",review_note_vi:note,updated_date:psDate_()};
 psSet_(t,r._row,ch);psAudit_(actor,"EDIT_CORE",r.sku,Object.fromEntries(Object.keys(ch).map(k=>[k,r[k]])),ch,note);return {ok:true};
})}
function psSaveSpec(p){const actor=psActor_();return psWithLock_(()=>{
 const s=psRead_("sku"),r=psRecord_(s,"sku",psId_(p.sku)),t=psRead_("spec");
 if(r.development_status==="Discontinued")throw Error("SKU ngừng kinh doanh");
 const key=psText_(p.attribute_key,100).toLowerCase();if(!/^[a-z][a-z0-9_]{1,99}$/.test(key))throw Error("Thuộc tính dùng snake_case, ví dụ diameter_mm.");
 const raw=String(p.value_number??"").trim(),value=psText_(p.value_text,2000);let num="";if(raw){if(!/^-?\d+(\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw)))throw Error("Giá trị số không hợp lệ; dùng dấu chấm.");num=Number(raw);}
 if((num!==""&&value)||(num===""&&!value))throw Error("Nhập đúng một trong giá trị số hoặc chữ.");
 const source=psRequire_(psURL_(p.source_url),"nguồn kỹ thuật"),note=psRequire_(psText_(p.note,2000),"lý do");
 const basis=psRequire_(psText_(p.measurement_basis,250),"cơ sở đo");const row={sku:r.sku,attribute_key:key,value_number:num,value_text:value,unit:psText_(p.unit,60),measurement_basis:basis,evidence_status:"Source listed; sample review",source_url:source};
 const matches=t.rows.filter(x=>x.sku===r.sku&&x.attribute_key===key);
 if(matches.length>1)throw Error("Thuộc tính có nhiều bản ghi; cần đối soát thủ công.");
 // Reset publication before editing the evidence record.
 psSet_(s,r._row,{development_status:"Ready for review",publish_status:"Hold",review_note_vi:note,updated_date:psDate_()});
 if(matches.length)psSet_(t,matches[0]._row,row);else psAppend_(t,row);
 psAudit_(actor,"UPSERT_SPEC",r.sku+":"+key,matches[0]||{},row,note);return {ok:true};
})}
function psAddAsset(p){const actor=psActor_();return psWithLock_(()=>{
 const t=psRead_("assets"),r=psRecord_(psRead_("sku"),"sku",psId_(p.sku));
 const url=psRequire_(psURL_(p.source_drive_url),"link nguồn");if(!/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+(?:\/|$)/.test(url))throw Error("Cần link file Google Drive, không phải link thư mục.");
 const type=String(p.asset_type);if(!["Family representative","Concept illustration","Internal reference","Technical reference","Brand asset"].includes(type))throw Error("Loại tài nguyên không hợp lệ");
 const fileId=url.match(/\/file\/d\/([A-Za-z0-9_-]+)/)[1];
 if(t.rows.some(x=>x.family_id===r.family_id&&String(x.source_drive_url).includes("/file/d/"+fileId+"/")))throw Error("File đã liên kết với dòng sản phẩm.");
 const row={asset_id:"AS-"+Utilities.getUuid(),collection_id:r.collection_id,family_id:r.family_id,file_name:psRequire_(psText_(p.file_name,250),"tên file"),source_drive_url:"https://drive.google.com/file/d/"+fileId+"/view",asset_type:type,scope:"Family",public_status:"Hold",caption_or_note:psRequire_(psText_(p.caption_or_note,1000),"chú thích loại ảnh")};
 psAppend_(t,row);psAudit_(actor,"ADD_ASSET",row.asset_id,{},row,"Family scope; no exact SKU claim");return {ok:true};
})}
