export type PrintableOrder={
  order_number:string;
  created_at:string;
  status?:string;
  table_number?:string|null;
  delivery_address?:string|null;
  customer_note?:string|null;
  flow_mode?:string|null;
  total_minor?:number|null;
  currency_code?:string|null;
  items?:Array<{name:string;quantity:number;unit_price_minor?:number|null;line_total_minor?:number|null}>;
};

function esc(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c))}
export function orderMoney(value:number|null|undefined,currency='XOF'){
  if(value===null||value===undefined)return'';
  if(currency==='XOF')return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(value)).replace(/\u202f/g,' ')} F CFA`;
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:currency||'XOF'}).format(Number(value));
}

export function printOrderReceipt(order:PrintableOrder,opts:{businessName:string;catalogTitle?:string;receiptTitle?:string|null;receiptFooter?:string|null;width?:'58mm'|'80mm'}){
  if(typeof window==='undefined')return;
  const width=opts.width||'58mm';
  const currency=order.currency_code||'XOF';
  const isMobileOrTablet=window.matchMedia('(max-width: 1024px)').matches||('ontouchstart' in window&&Math.min(window.screen.width,window.screen.height)<=1024);
  const printScale=isMobileOrTablet?3.05:1;
  const lines=(order.items||[]).map(item=>`<div class="line"><div><b>${esc(item.quantity)} × ${esc(item.name)}</b>${item.unit_price_minor!==null&&item.unit_price_minor!==undefined?`<small>${esc(orderMoney(item.unit_price_minor,currency))} l’unité</small>`:''}</div>${item.line_total_minor!==null&&item.line_total_minor!==undefined?`<strong>${esc(orderMoney(item.line_total_minor,currency))}</strong>`:''}</div>`).join('');
  const meta=[order.table_number?`Table : ${esc(order.table_number)}`:'',order.delivery_address?`Livraison : ${esc(order.delivery_address)}`:''].filter(Boolean).join('<br/>');
  const w=window.open('','_blank','width=420,height=700');
  if(!w)return;
  const mobilePageCss=isMobileOrTablet?`@page{size:auto;margin:8mm}body{width:${width};zoom:${printScale};margin:0;padding:3mm}`:`@page{size:${width} auto;margin:3mm}body{width:${width};margin:0 auto;padding:3mm}`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(order.order_number)}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:11px}.center{text-align:center}.title{font-size:16px;font-weight:800}.muted{color:#555}.rule{border-top:1px dashed #111;margin:8px 0}.line{display:flex;justify-content:space-between;gap:8px;margin:7px 0}.line>div{min-width:0}.line small{display:block;font-size:9px;margin-top:2px}.line strong{text-align:right;white-space:nowrap}.total{display:flex;justify-content:space-between;font-size:15px;font-weight:800;margin-top:8px}.note{white-space:pre-wrap}.footer{margin-top:12px;text-align:center;font-size:9px}.no-print{display:block;margin:12px auto;padding:8px 12px}@media print{.no-print{display:none}${mobilePageCss}}</style></head><body><div class="center"><div class="title">${esc(opts.receiptTitle||opts.businessName)}</div>${opts.catalogTitle?`<div>${esc(opts.catalogTitle)}</div>`:''}<div class="muted">Commande ${esc(order.order_number)}</div><div class="muted">${esc(new Date(order.created_at).toLocaleString('fr-FR'))}</div></div>${meta?`<div class="rule"></div><div>${meta}</div>`:''}<div class="rule"></div>${lines}<div class="rule"></div>${order.total_minor!==null&&order.total_minor!==undefined?`<div class="total"><span>TOTAL</span><span>${esc(orderMoney(order.total_minor,currency))}</span></div>`:''}${order.customer_note?`<div class="rule"></div><div class="note"><b>Note :</b><br/>${esc(order.customer_note)}</div>`:''}<div class="footer">${esc(opts.receiptFooter||'Commande enregistrée avec Qatalink')}</div><button class="no-print" onclick="window.print()">Imprimer</button><script>setTimeout(()=>window.print(),250)</script></body></html>`);
  w.document.close();
}
