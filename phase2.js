(()=>{
  const today='2026-08-19';
  const prot={
    'CUST-DEMO-001':['2026-08-18','2026-11-16','Healthy'],
    'CUST-DEMO-002':['2026-07-10','2026-10-08','Warning'],
    'CUST-DEMO-003':['2026-05-15','2026-08-13','Expired'],
    'CUST-DEMO-004':['2026-08-05','2026-11-03','Healthy'],
    'CUST-DEMO-005':['2026-08-19','2026-11-17','Healthy']
  };
  DEMO_CUSTOMERS.forEach(c=>{const x=prot[c.customer_id];if(x){c.last_meaningful_activity_at=x[0];c.protection_expires_at=x[1];c.protection_state=x[2];}});
  const d5=DEMO_DEALS.find(d=>d.deal_id==='DEAL-DEMO-005');if(d5){Object.assign(d5,{commission_status:'Estimated',estimated_commission_usd:1508.50,final_order_value_usd:28200,payment_complete:false});}
  if(!DEMO_DEALS.some(d=>d.deal_id==='DEAL-DEMO-007'))DEMO_DEALS.push({deal_id:'DEAL-DEMO-007',customer_id:'CUST-DEMO-001',deal_name:'US Blue Program — Paid in Full',owner_user_id:'ctv1',stage:'Won',status:'Won',estimated_qty:188000,final_qty:188000,final_selling_price:.1341489,commission_status:'Eligible',estimated_commission_usd:938.25,final_order_value_usd:25220,payment_complete:true,next_action:'Commission ready for payment',next_action_date:today,active:true});
  if(!DEMO_DEALS.some(d=>d.deal_id==='DEAL-DEMO-008'))DEMO_DEALS.push({deal_id:'DEAL-DEMO-008',customer_id:'CUST-DEMO-004',deal_name:'Australia Silver Program — Commission Paid',owner_user_id:'ctv1',stage:'Won',status:'Won',estimated_qty:190000,final_qty:190000,final_selling_price:.1375,commission_status:'Paid',estimated_commission_usd:1101.25,final_order_value_usd:26125,payment_complete:true,commission_paid_at:'2026-08-18',next_action:'Complete',next_action_date:'2026-08-18',active:true});

  const oldShowApp=showApp;showApp=async function(u){await oldShowApp(u);setTimeout(()=>{try{loadCustomers();loadDeals();loadDashboard();}catch{}},0)};

  function pBadge(c){const s=c.protection_state||'Healthy';const map={Healthy:['#eaf7f1','#16734c'],Warning:['#fff4dd','#9b6200'],Expired:['#fff0ee','#b42318']};const m=map[s]||map.Healthy;return `<span class="badge" style="background:${m[0]};color:${m[1]}">${esc(s)}</span><div class="sub">Last: ${esc(c.last_meaningful_activity_at||'—')}<br>Expires: ${esc(c.protection_expires_at||'—')}</div>`}
  customerTable=function(list){return '<table><tr><th>Company</th><th>Country</th><th>Contact</th><th>Owner</th><th>Lead protection</th><th></th></tr>'+list.map(c=>`<tr><td><b>${esc(c.company_name)}</b><div class="sub">${esc(c.domain||c.website||'')}</div></td><td>${esc(c.country||'')}</td><td>${esc(c.contact_name||'')}<div class="sub">${esc(c.contact_email||'')}</div></td><td>${esc(c.owner_user_id||'')}</td><td>${pBadge(c)}</td><td><button class="btn light sm" onclick='openCustomer(${JSON.stringify(JSON.stringify(c))})'>Edit</button></td></tr>`).join('')+'</table>'};

  loadCustomers=async function(render=true){
    let list=customers.length?customers:scopedDemo(DEMO_CUSTOMERS);
    if(list.every(c=>!c.protection_state)) list=scopedDemo(DEMO_CUSTOMERS);
    customers=list;
    if(render)$("customersWrap").innerHTML=customerTable(list);
    try{const r=await apiFast('listCustomers',{include_deleted:$("showDeletedCustomers")?.checked||false},2200);if(r&&r.ok&&r.customers&&r.customers.length){customers=r.customers;$("customersWrap").innerHTML=customerTable(customers);cacheSet('customers',customers)}}catch{}
  };

  function cBadge(d){if(!d.commission_status)return '—';const color=d.commission_status==='Paid'?'#16734c':d.commission_status==='Eligible'?'#9b6200':'#6b746f';return `<span class="badge" style="color:${color}">${esc(d.commission_status)}</span><div class="sub">$${Number(d.estimated_commission_usd||0).toFixed(2)}</div>`}
  loadDeals=async function(){
    let list=deals.length?deals:scopedDemo(DEMO_DEALS);
    if(!list.some(d=>d.commission_status)) list=scopedDemo(DEMO_DEALS);
    deals=list;
    const custMap=Object.fromEntries((customers.length?customers:DEMO_CUSTOMERS).map(c=>[c.customer_id,c.company_name]));
    $("dealsWrap").innerHTML='<table><tr><th>Deal</th><th>Customer</th><th>Owner</th><th>Stage</th><th>Qty</th><th>Next action</th><th>Commission</th><th></th></tr>'+list.map(d=>`<tr><td><b>${esc(d.deal_name)}</b>${d.lost_reason?`<div class="sub">Lost: ${esc(d.lost_reason)}</div>`:''}</td><td>${esc(custMap[d.customer_id]||d.customer_id||'')}</td><td>${esc(d.owner_user_id||'')}</td><td><span class="badge">${esc(d.stage||'')}</span></td><td>${Number(d.estimated_qty||0).toLocaleString()}</td><td>${esc(d.next_action||'')}<div class="sub">${esc(d.next_action_date||'')}</div></td><td>${cBadge(d)}</td><td><button class="btn light sm" onclick='openDeal(${JSON.stringify(JSON.stringify(d))})'>Edit</button></td></tr>`).join('')+'</table>';
    try{const r=await apiFast('listDeals',{},2200);if(r&&r.ok&&r.deals&&r.deals.length){deals=r.deals;cacheSet('deals',deals)}}catch{}
  };

  const baseDash=loadDashboard;loadDashboard=async function(){
    await baseDash();
    const host=$("pipelineWrap");if(!host)return;
    const ds=scopedDemo(DEMO_DEALS);const comm={Estimated:0,Eligible:0,Paid:0};ds.forEach(d=>{if(comm[d.commission_status]!==undefined)comm[d.commission_status]++});
    const cs=scopedDemo(DEMO_CUSTOMERS);const warn=cs.filter(c=>c.protection_state==='Warning').length,exp=cs.filter(c=>c.protection_state==='Expired').length;
    host.innerHTML += `<div class="grid3" style="margin-top:10px"><div class="card kpi"><span>Lead warning · 30d</span><b>${warn}</b></div><div class="card kpi"><span>Lead expired · 90d</span><b>${exp}</b></div><div class="card kpi"><span>Commission · E / E / P</span><b>${comm.Estimated} / ${comm.Eligible} / ${comm.Paid}</b></div></div>`;
  };

  window.demoSetCommission=function(id,status){const d=DEMO_DEALS.find(x=>x.deal_id===id);if(!d)return;d.commission_status=status;if(status==='Paid')d.commission_paid_at=today;loadDeals();loadDashboard()};
})();