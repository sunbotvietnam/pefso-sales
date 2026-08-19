const SPREADSHEET_ID = "1o7OXEp7FHMrJ2TPqmWXH6BQM25nLqxxdC0J2l6f2O_c";
const USERS_SHEET = "USERS";
const SESSIONS_SHEET = "SESSIONS";
const AUDIT_SHEET = "AUDIT_LOG";
const ATTEMPTS_SHEET = "LOGIN_ATTEMPTS";

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  let payload = {};
  try { payload = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) {}
  return handle_(payload);
}

function handle_(p) {
  try {
    ensureSchema_();
    const action = String(p.action || "");
    if (action === "health") return out_({ok:true, service:"PEFSO Sales Auth", version:"2.1"});
    if (action === "login") return out_(login_(p));
    if (action === "me") return out_(me_(p));
    if (action === "logout") return out_(logout_(p));
    if (action === "listUsers") return out_(listUsers_(p));
    if (action === "saveUser") return out_(saveUser_(p));
    if (action === "resetPin") return out_(resetPin_(p));
    if (action === "changeOwnCredentials") return out_(changeOwnCredentials_(p));
    if (action === "setUserActive") return out_(setUserActive_(p));
    return out_({ok:false,error:"Unknown action"});
  } catch (err) {
    return out_({ok:false,error:String(err && err.message ? err.message : err)});
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ss_(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }
function sh_(name){ return ss_().getSheetByName(name); }
function nowIso_(){ return new Date().toISOString(); }

function ensureSchema_(){
  const s = sh_(USERS_SHEET);
  if (!s) throw new Error("USERS sheet not found");
  if (String(s.getRange(3,15).getValue() || "") !== "hash_version") s.getRange(3,15).setValue("hash_version");
}

function ensurePepper_() {
  const props = PropertiesService.getScriptProperties();
  let pepper = props.getProperty("PEFSO_AUTH_PEPPER");
  if (!pepper) {
    pepper = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("PEFSO_AUTH_PEPPER", pepper);
  }
  return pepper;
}
function hex_(bytes) {
  return bytes.map(function(b){ const v=(b<0?b+256:b).toString(16); return v.length===1?"0"+v:v; }).join("");
}
function sha256_(text) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8));
}
function hashV1_(pin,salt){ return sha256_(String(salt)+":"+String(pin)); }
function hashV2_(pin,salt){ return sha256_(ensurePepper_()+":"+String(salt)+":"+String(pin)); }
function randomSalt_(){ return Utilities.getUuid().replace(/-/g,"")+Utilities.getUuid().replace(/-/g,""); }
function randomToken_(){ return sha256_(Utilities.getUuid()+":"+Utilities.getUuid()+":"+new Date().getTime()); }
function validPin_(pin){ return /^\d{8}$/.test(String(pin||"")); }

function rowsAsObjects_(sheet,headerRow) {
  const lastRow=sheet.getLastRow(), lastCol=sheet.getLastColumn();
  if(lastRow<headerRow) return {headers:[],rows:[]};
  const vals=sheet.getRange(headerRow,1,lastRow-headerRow+1,lastCol).getValues();
  const headers=vals[0].map(String);
  const rows=vals.slice(1).map(function(r,idx){
    const o={_row:headerRow+1+idx}; headers.forEach(function(h,i){ if(h) o[h]=r[i]; }); return o;
  }).filter(function(o){return String(o.user_id||o.event_id||o.timestamp||"").trim()!=="";});
  return {headers:headers,rows:rows};
}
function findUser_(userId){
  const data=rowsAsObjects_(sh_(USERS_SHEET),3), wanted=String(userId||"").trim().toLowerCase();
  return data.rows.find(function(u){return String(u.user_id||"").trim().toLowerCase()===wanted;})||null;
}

function login_(p){
  const userId=String(p.user_id||"").trim(), pin=String(p.pin||"");
  if(!userId||!validPin_(pin)) return {ok:false,error:"ID hoặc PIN không hợp lệ"};
  const user=findUser_(userId);
  if(!user||String(user.active).toLowerCase()!=="true"){
    logAttempt_(userId,false,"user_not_found_or_inactive");
    return {ok:false,error:"ID hoặc PIN không đúng"};
  }
  const version=String(user.hash_version||"v1_sha256_salt");
  const candidate=version==="v2_pepper_sha256"?hashV2_(pin,user.salt):hashV1_(pin,user.salt);
  if(candidate!==String(user.pin_hash)){
    logAttempt_(userId,false,"bad_pin"); return {ok:false,error:"ID hoặc PIN không đúng"};
  }
  if(version!=="v2_pepper_sha256"){
    const salt=randomSalt_(); updateUserHash_(user._row,pin,salt); user.salt=salt; user.hash_version="v2_pepper_sha256";
  }
  const token=randomToken_(), tokenHash=sha256_(token), issued=new Date(), expires=new Date(issued.getTime()+8*60*60*1000);
  sh_(SESSIONS_SHEET).appendRow([tokenHash,user.user_id,user.role,issued,expires,issued,true,"","","login"]);
  logAttempt_(userId,true,""); audit_(user.user_id,"LOGIN",user.user_id,"success","");
  return {ok:true,token:token,user:safeUser_(user)};
}

function updateUserHash_(row,pin,salt){
  const s=sh_(USERS_SHEET);
  s.getRange(row,4).setValue(hashV2_(pin,salt));
  s.getRange(row,5).setValue(salt);
  s.getRange(row,13).setValue(nowIso_());
  s.getRange(row,15).setValue("v2_pepper_sha256");
}

function sessionUser_(token){
  if(!token)return null;
  const tokenHash=sha256_(String(token)), s=sh_(SESSIONS_SHEET), data=s.getDataRange().getValues();
  if(data.length<4)return null;
  const headers=data[2].map(String);
  for(let i=3;i<data.length;i++){
    const o={}; headers.forEach(function(h,j){if(h)o[h]=data[i][j];});
    if(String(o.session_token_hash)===tokenHash&&String(o.active).toLowerCase()==="true"&&new Date(o.expires_at).getTime()>Date.now()){
      const u=findUser_(o.user_id); if(!u||String(u.active).toLowerCase()!=="true")return null;
      s.getRange(i+1,6).setValue(new Date()); return u;
    }
  }
  return null;
}
function requireUser_(p){const u=sessionUser_(p.token);if(!u)throw new Error("Unauthorized");return u;}
function requireAdmin_(p){const u=requireUser_(p);if(String(u.can_manage_users).toLowerCase()!=="true")throw new Error("Forbidden");return u;}
function safeUser_(u){return {user_id:u.user_id,role:u.role,display_name:u.display_name,active:u.active,permissions:{can_manage_users:u.can_manage_users,can_manage_products:u.can_manage_products,can_approve_quotation:u.can_approve_quotation,can_see_all_customers:u.can_see_all_customers,can_manage_prices:u.can_manage_prices}};}
function me_(p){const u=requireUser_(p);return {ok:true,user:safeUser_(u)};}

function logout_(p){
  if(!p.token)return {ok:true};
  const hash=sha256_(String(p.token)),s=sh_(SESSIONS_SHEET),data=s.getDataRange().getValues();
  for(let i=3;i<data.length;i++){if(String(data[i][0])===hash){s.getRange(i+1,7).setValue(false);break;}}
  return {ok:true};
}
function listUsers_(p){requireAdmin_(p);const data=rowsAsObjects_(sh_(USERS_SHEET),3);return {ok:true,users:data.rows.map(safeUser_)};}

function roleDefaults_(role){
  if(role==="admin")return {can_manage_users:true,can_manage_products:true,can_approve_quotation:true,can_see_all_customers:true,can_manage_prices:true};
  if(role==="staff")return {can_manage_users:false,can_manage_products:true,can_approve_quotation:false,can_see_all_customers:true,can_manage_prices:false};
  return {can_manage_users:false,can_manage_products:false,can_approve_quotation:false,can_see_all_customers:false,can_manage_prices:false};
}

function saveUser_(p){
  const actor=requireAdmin_(p),originalId=String(p.original_user_id||"").trim(),newId=String(p.user_id||"").trim(),role=String(p.role||"").trim(),name=String(p.display_name||"").trim();
  if(!newId)throw new Error("User ID is required");
  if(!/^[A-Za-z0-9._-]{3,40}$/.test(newId))throw new Error("User ID format invalid");
  if(!["admin","staff","collaborator"].includes(role))throw new Error("Role invalid");
  const s=sh_(USERS_SHEET),existingByNew=findUser_(newId),existing=originalId?findUser_(originalId):null;
  if(existingByNew&&(!existing||existingByNew._row!==existing._row))throw new Error("User ID already exists");
  const f=roleDefaults_(role);
  if(existing){
    s.getRange(existing._row,1).setValue(newId);s.getRange(existing._row,2).setValue(role);s.getRange(existing._row,3).setValue(name||newId);
    s.getRange(existing._row,6,1,6).setValues([[p.active!==false,f.can_manage_users,f.can_manage_products,f.can_approve_quotation,f.can_see_all_customers,f.can_manage_prices]]);
    s.getRange(existing._row,13).setValue(nowIso_());audit_(actor.user_id,"UPDATE_USER",newId,"success","from "+originalId);
  }else{
    if(!validPin_(p.pin))throw new Error("New user requires an 8-digit PIN");
    const salt=randomSalt_();
    s.appendRow([newId,role,name||newId,hashV2_(p.pin,salt),salt,true,f.can_manage_users,f.can_manage_products,f.can_approve_quotation,f.can_see_all_customers,f.can_manage_prices,nowIso_(),nowIso_(),"Created by "+actor.user_id,"v2_pepper_sha256"]);
    audit_(actor.user_id,"CREATE_USER",newId,"success","");
  }
  return {ok:true};
}

function resetPin_(p){
  const actor=requireAdmin_(p),target=findUser_(p.user_id);if(!target)throw new Error("User not found");if(!validPin_(p.new_pin))throw new Error("PIN must contain exactly 8 digits");
  updateUserHash_(target._row,p.new_pin,randomSalt_());invalidateUserSessions_(target.user_id);audit_(actor.user_id,"RESET_PIN",target.user_id,"success","");return {ok:true};
}

function changeOwnCredentials_(p){
  const u=requireUser_(p),oldPin=String(p.current_pin||""),newId=String(p.new_user_id||u.user_id).trim(),newPin=String(p.new_pin||"");
  if(!validPin_(oldPin))throw new Error("Current PIN required");
  const live=findUser_(u.user_id),version=String(live.hash_version||"v1_sha256_salt"),check=version==="v2_pepper_sha256"?hashV2_(oldPin,live.salt):hashV1_(oldPin,live.salt);
  if(check!==String(live.pin_hash))throw new Error("Current PIN incorrect");
  if(newId!==String(live.user_id)){
    if(findUser_(newId))throw new Error("New user ID already exists");
    if(!/^[A-Za-z0-9._-]{3,40}$/.test(newId))throw new Error("User ID format invalid");
    sh_(USERS_SHEET).getRange(live._row,1).setValue(newId);
  }
  if(newPin){if(!validPin_(newPin))throw new Error("New PIN must contain exactly 8 digits");updateUserHash_(live._row,newPin,randomSalt_());}
  else sh_(USERS_SHEET).getRange(live._row,13).setValue(nowIso_());
  invalidateUserSessions_(u.user_id);audit_(u.user_id,"CHANGE_OWN_CREDENTIALS",newId,"success","");return {ok:true,relogin:true,new_user_id:newId};
}

function setUserActive_(p){
  const actor=requireAdmin_(p),target=findUser_(p.user_id);if(!target)throw new Error("User not found");
  if(String(target.user_id)===String(actor.user_id)&&p.active===false)throw new Error("Admin cannot deactivate the current account");
  sh_(USERS_SHEET).getRange(target._row,6).setValue(!!p.active);sh_(USERS_SHEET).getRange(target._row,13).setValue(nowIso_());
  if(!p.active)invalidateUserSessions_(target.user_id);audit_(actor.user_id,p.active?"ACTIVATE_USER":"DEACTIVATE_USER",target.user_id,"success","");return {ok:true};
}

function invalidateUserSessions_(userId){
  const s=sh_(SESSIONS_SHEET),data=s.getDataRange().getValues();
  for(let i=3;i<data.length;i++){if(String(data[i][1])===String(userId)&&String(data[i][6]).toLowerCase()==="true")s.getRange(i+1,7).setValue(false);}
}
function audit_(actor,action,target,result,details){sh_(AUDIT_SHEET).appendRow(["EVT-"+new Date().getTime(),new Date(),actor,action,target,result,details||"","","Apps Script",""]);}
function logAttempt_(userId,success,reason){sh_(ATTEMPTS_SHEET).appendRow([new Date(),userId,!!success,reason||"","","","",""]);}