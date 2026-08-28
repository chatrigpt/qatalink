export type PrintableOrder={
  order_number:string;
  created_at:string;
  status?:string;
  table_number?:string|null;
  delivery_address?:string|null;
  customer_note?:string|null;
  flow_mode?:string|null;
  flow_fields?:Record<string,unknown>|null;
  total_minor?:number|null;
  currency_code?:string|null;
  items?:Array<{name:string;quantity:number;unit_price_minor?:number|null;line_total_minor?:number|null}>;
};

type ReceiptOptions={
  businessName?:string;
  catalogTitle?:string;
  catalogUrl?:string;
  receiptTitle?:string|null;
  receiptFooter?:string|null;
  width?:'58mm'|'80mm';
};

const RECEIPT_CATALOG_URL_KEY='qatalink_receipt_catalog_url';
function esc(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]||c))}
export function receiptCatalogUrl(opts:ReceiptOptions){
  const explicit=String(opts.catalogUrl||'').trim();
  if(explicit)return explicit;
  if(typeof window!=='undefined'){
    try{const cached=String(localStorage.getItem(RECEIPT_CATALOG_URL_KEY)||'').trim();if(/^https:\/\/qatalink\.com\/c\//i.test(cached))return cached}catch{}
  }
  return '';
}
export function cleanDeliveryLabel(value:unknown){
  const raw=String(value??'').replace(/\r/g,'').trim();if(!raw)return'';
  const withoutGps=raw.replace(/(?:position\s+gps\s+exacte\s*:\s*)?https?:\/\/(?:www\.)?(?:maps\.google\.com|google\.com\/maps)\/[^\s]+/gi,'').replace(/[—|•·\-]+\s*$/g,'').replace(/\s{2,}/g,' ').trim();
  return withoutGps;
}
export function orderDeliveryLabel(order:PrintableOrder){
  const typed=cleanDeliveryLabel(order.delivery_address);if(typed)return typed;
  const area=String(order.flow_fields?.area||order.flow_fields?.zone||order.flow_fields?.quartier||'').trim();
  return area;
}
export function orderMoney(value:number|null|undefined,currency='XOF'){
  if(value===null||value===undefined)return'';
  if(currency==='XOF')return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Number(value)).replace(/\u202f/g,' ')} F CFA`;
  return new Intl.NumberFormat('fr-FR',{style:'currency',currency:currency||'XOF'}).format(Number(value));
}

export function printOrderReceipt(order:PrintableOrder,opts:ReceiptOptions){
  if(typeof window==='undefined')return;
  const width=opts.width||'58mm',currency=order.currency_code||'XOF';
  const isMobileOrTablet=window.matchMedia('(max-width: 1024px)').matches||('ontouchstart' in window&&Math.min(window.screen.width,window.screen.height)<=1024);
  const printScale=isMobileOrTablet?2.45:1;
  const catalogName=String(opts.catalogTitle||opts.receiptTitle||opts.businessName||'Qatalink').trim();
  const catalogUrl=receiptCatalogUrl(opts);
  const slug=catalogUrl.match(/\/c\/([^/?#]+)/)?.[1]||'';
  const qrSrc=slug?`/api/qr/${encodeURIComponent(decodeURIComponent(slug))}`:'';
  const delivery=orderDeliveryLabel(order);
  const lines=(order.items||[]).map(item=>`<div class="line"><div><b>${esc(item.quantity)} × ${esc(item.name)}</b>${item.unit_price_minor!==null&&item.unit_price_minor!==undefined?`<small>${esc(orderMoney(item.unit_price_minor,currency))} l’unité</small>`:''}</div>${item.line_total_minor!==null&&item.line_total_minor!==undefined?`<strong>${esc(orderMoney(item.line_total_minor,currency))}</strong>`:''}</div>`).join('');
  const meta=[order.table_number?`<b>Table :</b> ${esc(order.table_number)}`:'',delivery?`<b>Livraison :</b> ${esc(delivery)}`:''].filter(Boolean).join('<br/>');
  const w=window.open('','_blank','width=420,height=760');if(!w)return;
  const mobilePageCss=isMobileOrTablet?`@page{size:auto;margin:6mm}body{width:${width};zoom:${printScale};margin:0;padding:2.5mm}`:`@page{size:${width} auto;margin:3mm}body{width:${width};margin:0 auto;padding:3mm}`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(order.order_number)}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:11px}.center{text-align:center}.catalog{font-size:17px;font-weight:900;line-height:1.15}.order-no{display:inline-block;margin:7px auto 2px;padding:5px 8px;border:2px solid #111;font-size:17px;font-weight:900;letter-spacing:.04em}.date{font-size:9px;margin-top:3px;color:#333}.rule{border-top:1px dashed #111;margin:8px 0}.line{display:flex;justify-content:space-between;gap:8px;margin:7px 0}.line>div{min-width:0}.line small{display:block;font-size:9px;margin-top:2px}.line strong{text-align:right;white-space:nowrap}.total{display:flex;justify-content:space-between;font-size:15px;font-weight:900;margin-top:8px}.note{white-space:pre-wrap}.qr{margin:10px auto 3px;width:104px;height:104px;display:block;image-rendering:pixelated}.qr-label{text-align:center;font-size:8.5px;font-weight:700;line-height:1.35}.url{text-align:center;font-size:7px;overflow-wrap:anywhere;margin-top:3px}.footer{margin-top:9px;text-align:center;font-size:8px}.no-print{display:block;margin:12px auto;padding:8px 12px}@media print{.no-print{display:none}${mobilePageCss}}</style></head><body><div class="center"><div class="catalog">${esc(catalogName)}</div><div class="order-no">COMMANDE ${esc(order.order_number)}</div><div class="date">${esc(new Date(order.created_at).toLocaleString('fr-FR'))}</div></div>${meta?`<div class="rule"></div><div>${meta}</div>`:''}<div class="rule"></div>${lines}<div class="rule"></div>${order.total_minor!==null&&order.total_minor!==undefined?`<div class="total"><span>TOTAL</span><span>${esc(orderMoney(order.total_minor,currency))}</span></div>`:''}${order.customer_note?`<div class="rule"></div><div class="note"><b>Note :</b><br/>${esc(order.customer_note)}</div>`:''}${qrSrc?`<div class="rule"></div><img class="qr" src="${qrSrc}" alt="QR du catalogue"/><div class="qr-label">Merci pour votre passage chez nous, scannez ce QR code pour commander de nouveau en un clic.</div><div class="url">${esc(catalogUrl)}</div>`:''}<div class="footer">${esc(opts.receiptFooter||'Commande enregistrée avec Qatalink')}</div><button class="no-print" onclick="window.print()">Imprimer</button><script>const go=()=>setTimeout(()=>window.print(),120);const q=document.querySelector('.qr');if(q&&!q.complete){q.addEventListener('load',go,{once:true});q.addEventListener('error',go,{once:true});setTimeout(go,1200)}else go()</script></body></html>`);
  w.document.close();
}
