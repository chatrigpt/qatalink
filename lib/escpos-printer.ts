import {orderDeliveryLabel,orderMoney,receiptCatalogUrl,type PrintableOrder} from '@/lib/order-receipt';

type PrinterOptions={
  businessName?:string;
  catalogTitle?:string;
  catalogUrl?:string;
  receiptTitle?:string|null;
  receiptFooter?:string|null;
  sourceOrderNumbers?:string[];
  baudRate?:number;
};

let activePort:any=null;
function navSerial(){return typeof navigator!=='undefined'?(navigator as any).serial:null}
function isMobileOrTablet(){if(typeof window==='undefined'||typeof navigator==='undefined')return false;const ua=navigator.userAgent||'';return /Android|iPhone|iPad|iPod/i.test(ua)||window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches}
function mobileShareAvailable(){return isMobileOrTablet()&&typeof navigator!=='undefined'&&typeof navigator.share==='function'&&typeof File!=='undefined'}
export function escPosDirectSupported(){return (mobileShareAvailable()||!!navSerial())&&typeof window!=='undefined'&&window.isSecureContext}
export function escPosConnected(){return !!activePort?.writable}
function cmd(...bytes:number[]){return new Uint8Array(bytes)}
function concat(parts:Uint8Array[]){const size=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out}
function clean(value:unknown){return String(value??'').replace(/\s+/g,' ').trim()}
function ascii(value:unknown){return String(value??'').replace(/€/g,'EUR').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E\r\n]/g,'?')}
function text(value:unknown){return new TextEncoder().encode(ascii(value))}
function line(value=''){return text(`${ascii(value).replace(/[\r\n]+/g,' ')}\r\n`)}
function wrap(value:string,width=32){const words=clean(value).split(' ').filter(Boolean),lines:string[]=[];let current='';for(const word0 of words){let word=ascii(word0);while(word.length>width){if(current){lines.push(current);current=''}lines.push(word.slice(0,width));word=word.slice(width)}if(!word)continue;const candidate=current?`${current} ${word}`:word;if(candidate.length<=width)current=candidate;else{if(current)lines.push(current);current=word}}if(current)lines.push(current);return lines.length?lines:['']}
function padLine(left:string,right:string,width=32){left=ascii(clean(left));right=ascii(clean(right));if(right.length>=width)return right.slice(0,width);const room=Math.max(1,width-right.length);return `${left.slice(0,room).padEnd(room,' ')}${right}`.slice(0,width)}
function qrCommands(value:string,size=5){const data=text(value),storeLen=data.length+3,pL=storeLen&255,pH=(storeLen>>8)&255;return [cmd(0x1d,0x28,0x6b,0x04,0x00,0x31,0x41,0x32,0x00),cmd(0x1d,0x28,0x6b,0x03,0x00,0x31,0x43,Math.max(2,Math.min(8,size))),cmd(0x1d,0x28,0x6b,0x03,0x00,0x31,0x45,0x31),concat([cmd(0x1d,0x28,0x6b,pL,pH,0x31,0x50,0x30),data]),cmd(0x1d,0x28,0x6b,0x03,0x00,0x31,0x51,0x30)]}

function wrapCanvas(ctx:CanvasRenderingContext2D,value:string,maxWidth:number){const words=clean(value).split(' ').filter(Boolean),lines:string[]=[];let current='';for(const word of words){const candidate=current?`${current} ${word}`:word;if(!current||ctx.measureText(candidate).width<=maxWidth)current=candidate;else{lines.push(current);current=word}}if(current)lines.push(current);return lines.length?lines:['']}
async function drawQr(ctx:CanvasRenderingContext2D,url:string,x:number,y:number,size:number){if(!url)return;const slug=url.match(/\/c\/([^/?#]+)/)?.[1];if(!slug)return;const img=new Image();img.crossOrigin='anonymous';img.src=`/api/qr/${encodeURIComponent(decodeURIComponent(slug))}`;await new Promise<void>(resolve=>{img.onload=()=>resolve();img.onerror=()=>resolve()});if(img.complete&&img.naturalWidth)ctx.drawImage(img,x,y,size,size)}
async function shareReceiptImage(order:PrintableOrder,opts:PrinterOptions){
  if(typeof document==='undefined'||typeof navigator==='undefined')throw new Error('MOBILE_SHARE_UNSUPPORTED');
  const width=384,padding=14,work=document.createElement('canvas');work.width=width;work.height=3400;const ctx=work.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');ctx.fillStyle='#fff';ctx.fillRect(0,0,work.width,work.height);ctx.fillStyle='#000';ctx.textBaseline='top';let y=18;
  const center=(value:string,size=20,bold=false,gap=7)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;ctx.textAlign='center';for(const l of wrapCanvas(ctx,value,width-padding*2)){ctx.fillText(l,width/2,y);y+=size+5}y+=gap};
  const left=(value:string,size=18,bold=false,gap=4)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;ctx.textAlign='left';for(const l of wrapCanvas(ctx,value,width-padding*2)){ctx.fillText(l,padding,y);y+=size+5}y+=gap};
  const divider=()=>{y+=6;ctx.strokeStyle='#000';ctx.lineWidth=1.4;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(padding,y);ctx.lineTo(width-padding,y);ctx.stroke();ctx.setLineDash([]);y+=11};
  const leftRight=(l:string,r:string,size=18,bold=false)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;const rightWidth=Math.min(154,ctx.measureText(r).width),room=width-padding*2-rightWidth-10,lLines=wrapCanvas(ctx,l,Math.max(128,room));ctx.textAlign='right';ctx.fillText(r,width-padding,y);ctx.textAlign='left';for(let i=0;i<lLines.length;i++)ctx.fillText(lLines[i],padding,y+i*(size+5));y+=Math.max(1,lLines.length)*(size+5)+5};
  const catalogName=clean(opts.catalogTitle||opts.receiptTitle||opts.businessName||'Qatalink'),catalogUrl=receiptCatalogUrl(opts),delivery=orderDeliveryLabel(order);
  center(catalogName,28,true,4);center(`COMMANDE ${clean(order.order_number)}`,24,true,2);center(new Date(order.created_at).toLocaleString('fr-FR'),16,false,4);divider();if(order.table_number)left(`Table : ${clean(order.table_number)}`,18,true,2);if(delivery)left(`Livraison : ${delivery}`,17,false,2);if(opts.sourceOrderNumbers?.length)left(`Commandes : ${opts.sourceOrderNumbers.join(', ')}`,16,false,2);if(order.table_number||delivery||opts.sourceOrderNumbers?.length)divider();
  const currency=order.currency_code||'XOF';for(const item of order.items||[]){const total=item.line_total_minor!==null&&item.line_total_minor!==undefined?orderMoney(item.line_total_minor,currency):'';leftRight(`${item.quantity} x ${item.name}`,total,18,true);if(item.unit_price_minor!==null&&item.unit_price_minor!==undefined)left(`${orderMoney(item.unit_price_minor,currency)} l'unite`,14,false,2)}divider();if(order.total_minor!==null&&order.total_minor!==undefined)leftRight('TOTAL',orderMoney(order.total_minor,currency),24,true);if(order.customer_note){divider();left('Note :',16,true,1);left(order.customer_note,16,false,2)}
  if(catalogUrl){divider();const qrSize=150,qrX=(width-qrSize)/2;await drawQr(ctx,catalogUrl,qrX,y,qrSize);y+=qrSize+7;center('Merci pour votre passage chez nous, scannez ce QR code pour commander de nouveau en un clic.',14,true,1);center(catalogUrl,11,false,2)}divider();center(clean(opts.receiptFooter||'Commande enregistree avec Qatalink'),15,false,0);y+=14;
  const out=document.createElement('canvas');out.width=width;out.height=Math.max(220,Math.ceil(y));const outCtx=out.getContext('2d');if(!outCtx)throw new Error('CANVAS_UNAVAILABLE');outCtx.fillStyle='#fff';outCtx.fillRect(0,0,out.width,out.height);outCtx.drawImage(work,0,0,width,out.height,0,0,width,out.height);const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(v=>v?resolve(v):reject(new Error('IMAGE_EXPORT_FAILED')),'image/png',1));const safe=clean(order.order_number).replace(/[^a-z0-9_-]+/gi,'-')||'ticket',file=new File([blob],`ticket-${safe}.png`,{type:'image/png'}),sharePayload={files:[file],title:`Ticket ${clean(order.order_number)}`};try{if(typeof navigator.canShare==='function'&&!navigator.canShare(sharePayload))throw new Error('FILE_SHARE_UNSUPPORTED');await navigator.share(sharePayload)}catch(err:any){if(err?.name==='AbortError')return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
}

export async function connectEscPosPrinter(baudRate=9600){if(mobileShareAvailable())return true;const serial=navSerial();if(!serial)throw new Error('DIRECT_PRINT_UNSUPPORTED');let port:any=null;const granted=await serial.getPorts().catch(()=>[]);if(granted?.length===1)port=granted[0];if(!port)port=await serial.requestPort();if(!port.writable)await port.open({baudRate});activePort=port;return true}
export async function disconnectEscPosPrinter(){if(!activePort)return;try{if(activePort.writable){const writer=activePort.writable.getWriter();await writer.close().catch(()=>{});writer.releaseLock?.()}}catch{}try{await activePort.close()}catch{}activePort=null}
export async function ensureEscPosPrinter(baudRate=9600,requestIfMissing=false){if(activePort?.writable)return activePort;const serial=navSerial();if(!serial)throw new Error('DIRECT_PRINT_UNSUPPORTED');const ports=await serial.getPorts().catch(()=>[]);if(ports?.length){activePort=ports[0];if(!activePort.writable)await activePort.open({baudRate});return activePort}if(requestIfMissing){const port=await serial.requestPort();if(!port.writable)await port.open({baudRate});activePort=port;return activePort}throw new Error('PRINTER_NOT_CONNECTED')}

export async function printEscPosReceipt(order:PrintableOrder,opts:PrinterOptions){
  if(mobileShareAvailable()){await shareReceiptImage(order,opts);return}
  const port=await ensureEscPosPrinter(opts.baudRate||9600,true);if(!port?.writable)throw new Error('PRINTER_NOT_CONNECTED');const currency=order.currency_code||'XOF',chunks:Uint8Array[]=[],catalogName=clean(opts.catalogTitle||opts.receiptTitle||opts.businessName||'Qatalink'),catalogUrl=receiptCatalogUrl(opts),delivery=orderDeliveryLabel(order);
  chunks.push(cmd(0x1b,0x40));
  chunks.push(cmd(0x1b,0x61,0x01),cmd(0x1b,0x45,0x01));chunks.push(line(catalogName));chunks.push(cmd(0x1d,0x21,0x11));chunks.push(line(`COMMANDE ${clean(order.order_number)}`));chunks.push(cmd(0x1d,0x21,0x00),cmd(0x1b,0x45,0x00));chunks.push(line(new Date(order.created_at).toLocaleString('fr-FR')),cmd(0x1b,0x61,0x00),line('--------------------------------'));
  if(order.table_number)chunks.push(line(`Table : ${clean(order.table_number)}`));if(delivery)for(const l of wrap(`Livraison : ${delivery}`))chunks.push(line(l));if(opts.sourceOrderNumbers?.length)for(const l of wrap(`Commandes : ${opts.sourceOrderNumbers.join(', ')}`))chunks.push(line(l));if(order.table_number||delivery||opts.sourceOrderNumbers?.length)chunks.push(line('--------------------------------'));
  for(const item of order.items||[]){for(const l of wrap(`${item.quantity} x ${item.name}`))chunks.push(line(l));if(item.line_total_minor!==null&&item.line_total_minor!==undefined)chunks.push(line(padLine('',orderMoney(item.line_total_minor,currency))))}
  chunks.push(line('--------------------------------'));if(order.total_minor!==null&&order.total_minor!==undefined){chunks.push(cmd(0x1b,0x45,0x01),line(padLine('TOTAL',orderMoney(order.total_minor,currency))),cmd(0x1b,0x45,0x00))}if(order.customer_note){chunks.push(line('--------------------------------'));for(const l of wrap(`Note : ${order.customer_note}`))chunks.push(line(l))}
  if(catalogUrl){chunks.push(line('--------------------------------'),cmd(0x1b,0x61,0x01),...qrCommands(catalogUrl,5),line());for(const l of wrap('Merci pour votre passage chez nous, scannez ce QR code pour commander de nouveau en un clic.'))chunks.push(line(l));for(const l of wrap(catalogUrl))chunks.push(line(l))}
  chunks.push(cmd(0x1b,0x61,0x01),line(),line(clean(opts.receiptFooter||'Commande enregistree avec Qatalink')),line(),line(),cmd(0x1b,0x61,0x00));
  const writer=port.writable.getWriter();try{await writer.write(concat(chunks))}finally{writer.releaseLock()}
}
