import {orderMoney,type PrintableOrder} from '@/lib/order-receipt';

type PrinterOptions={
  businessName:string;
  catalogTitle?:string;
  receiptTitle?:string|null;
  receiptFooter?:string|null;
  sourceOrderNumbers?:string[];
  baudRate?:number;
};

let activePort:any=null;

const CP850:Record<string,number>={
  'é':130,'â':131,'ä':132,'à':133,'å':134,'ç':135,'ê':136,'ë':137,'è':138,'ï':139,'î':140,'ì':141,'Ä':142,'Å':143,
  'É':144,'æ':145,'Æ':146,'ô':147,'ö':148,'ò':149,'û':150,'ù':151,'ÿ':152,'Ö':153,'Ü':154,'ø':155,'£':156,'Ø':157,
  'á':160,'í':161,'ó':162,'ú':163,'ñ':164,'Ñ':165,'ª':166,'º':167,'¿':168,'®':169,'¬':170,'½':171,'¼':172,'¡':173,'«':174,'»':175,
  'Á':181,'Â':182,'À':183,'©':184,'╣':185,'║':186,'╗':187,'╝':188,'¢':189,'¥':190,'┐':191,'└':192,'┴':193,'┬':194,'├':195,
  '─':196,'┼':197,'ã':198,'Ã':199,'╚':200,'╔':201,'╩':202,'╦':203,'╠':204,'═':205,'╬':206,'¤':207,'ð':208,'Ð':209,
  'Ê':210,'Ë':211,'È':212,'ı':213,'Í':214,'Î':215,'Ï':216,'┘':217,'┌':218,'█':219,'▄':220,'¦':221,'Ì':222,'▀':223,
  'Ó':224,'ß':225,'Ô':226,'Ò':227,'õ':228,'Õ':229,'µ':230,'þ':231,'Þ':232,'Ú':233,'Û':234,'Ù':235,'ý':236,'Ý':237,'¯':238,'´':239,
  '­':240,'±':241,'‗':242,'¾':243,'¶':244,'§':245,'÷':246,'¸':247,'°':248,'¨':249,'·':250,'¹':251,'³':252,'²':253,'■':254,' ':255
};

function navSerial(){return typeof navigator!=='undefined'?(navigator as any).serial:null}
function isMobileOrTablet(){
  if(typeof window==='undefined'||typeof navigator==='undefined')return false;
  const ua=navigator.userAgent||'';
  return /Android|iPhone|iPad|iPod/i.test(ua)||window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches;
}
function mobileShareAvailable(){return isMobileOrTablet()&&typeof navigator!=='undefined'&&typeof navigator.share==='function'&&typeof File!=='undefined'}
export function escPosDirectSupported(){return (mobileShareAvailable()||!!navSerial())&&typeof window!=='undefined'&&window.isSecureContext}
export function escPosConnected(){return !!activePort?.writable}

function encodeCp850(value:string){
  const bytes:number[]=[];
  for(const raw of value.replace(/€/g,'EUR')){
    const cp=raw.codePointAt(0)||32;
    if(cp>=32&&cp<=126){bytes.push(cp);continue}
    if(CP850[raw]!==undefined){bytes.push(CP850[raw]);continue}
    const plain=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const p=plain.codePointAt(0)||63;bytes.push(p>=32&&p<=126?p:63);
  }
  return new Uint8Array(bytes);
}

function concat(parts:Uint8Array[]){const size=parts.reduce((s,p)=>s+p.length,0);const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length}return out}
function cmd(...bytes:number[]){return new Uint8Array(bytes)}
function text(value:string){return encodeCp850(value)}
function clean(value:unknown){return String(value??'').replace(/\s+/g,' ').trim()}
function padLine(left:string,right:string,width=32){
  left=clean(left);right=clean(right);
  if(!right)return left.slice(0,width);
  const room=Math.max(1,width-right.length-1);
  return `${left.slice(0,room).padEnd(room,' ')} ${right.slice(0,width-room-1)}`;
}
function wrap(value:string,width=32){
  const words=clean(value).split(' ').filter(Boolean);const lines:string[]=[];let line='';
  for(const word of words){if(!line){line=word.slice(0,width);continue}if((line+' '+word).length<=width)line+=' '+word;else{lines.push(line);line=word.slice(0,width)}}
  if(line)lines.push(line);return lines.length?lines:[''];
}

function wrapCanvas(ctx:CanvasRenderingContext2D,value:string,maxWidth:number){
  const words=clean(value).split(' ').filter(Boolean);const lines:string[]=[];let line='';
  for(const word of words){
    const candidate=line?`${line} ${word}`:word;
    if(!line||ctx.measureText(candidate).width<=maxWidth)line=candidate;
    else{lines.push(line);line=word}
  }
  if(line)lines.push(line);return lines.length?lines:[''];
}

async function shareReceiptImage(order:PrintableOrder,opts:PrinterOptions){
  if(typeof document==='undefined'||typeof navigator==='undefined')throw new Error('MOBILE_SHARE_UNSUPPORTED');
  const width=384;
  const padding=14;
  const work=document.createElement('canvas');
  work.width=width;work.height=2800;
  const ctx=work.getContext('2d');if(!ctx)throw new Error('CANVAS_UNAVAILABLE');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,work.width,work.height);ctx.fillStyle='#000';ctx.textBaseline='top';
  let y=18;
  const center=(value:string,size=20,bold=false,gap=7)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;ctx.textAlign='center';for(const line of wrapCanvas(ctx,value,width-padding*2)){ctx.fillText(line,width/2,y);y+=size+5}y+=gap};
  const left=(value:string,size=18,bold=false,gap=4)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;ctx.textAlign='left';for(const line of wrapCanvas(ctx,value,width-padding*2)){ctx.fillText(line,padding,y);y+=size+5}y+=gap};
  const divider=()=>{y+=6;ctx.strokeStyle='#000';ctx.lineWidth=1.4;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(padding,y);ctx.lineTo(width-padding,y);ctx.stroke();ctx.setLineDash([]);y+=11};
  const leftRight=(l:string,r:string,size=18,bold=false)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;ctx.textAlign='left';const rightWidth=Math.min(154,ctx.measureText(r).width);const room=width-padding*2-rightWidth-10;const lLines=wrapCanvas(ctx,l,Math.max(128,room));ctx.textAlign='right';ctx.fillText(r,width-padding,y);ctx.textAlign='left';for(let i=0;i<lLines.length;i++)ctx.fillText(lLines[i],padding,y+i*(size+5));y+=Math.max(1,lLines.length)*(size+5)+5};

  center(clean(opts.receiptTitle||opts.businessName),27,true,4);
  if(opts.catalogTitle)center(clean(opts.catalogTitle),19,false,2);
  center(`Commande ${clean(order.order_number)}`,20,true,1);
  center(new Date(order.created_at).toLocaleString('fr-FR'),16,false,4);
  divider();
  if(order.table_number)left(`Table : ${clean(order.table_number)}`,18,true,2);
  if(order.delivery_address)left(`Livraison : ${clean(order.delivery_address)}`,17,false,2);
  if(opts.sourceOrderNumbers?.length)left(`Commandes : ${opts.sourceOrderNumbers.join(', ')}`,16,false,2);
  if(order.table_number||order.delivery_address||opts.sourceOrderNumbers?.length)divider();

  const currency=order.currency_code||'XOF';
  for(const item of order.items||[]){
    const lineTotal=item.line_total_minor!==null&&item.line_total_minor!==undefined?orderMoney(item.line_total_minor,currency):'';
    leftRight(`${item.quantity} × ${item.name}`,lineTotal,18,true);
    if(item.unit_price_minor!==null&&item.unit_price_minor!==undefined)left(`${orderMoney(item.unit_price_minor,currency)} l’unité`,14,false,2);
  }
  divider();
  if(order.total_minor!==null&&order.total_minor!==undefined)leftRight('TOTAL',orderMoney(order.total_minor,currency),24,true);
  if(order.customer_note){divider();left('Note :',16,true,1);left(order.customer_note,16,false,2)}
  divider();
  center(clean(opts.receiptFooter||'Commande enregistrée avec Qatalink'),15,false,0);
  y+=14;

  const out=document.createElement('canvas');out.width=width;out.height=Math.max(220,Math.ceil(y));
  const outCtx=out.getContext('2d');if(!outCtx)throw new Error('CANVAS_UNAVAILABLE');
  outCtx.fillStyle='#fff';outCtx.fillRect(0,0,out.width,out.height);outCtx.drawImage(work,0,0,width,out.height,0,0,width,out.height);
  const blob=await new Promise<Blob>((resolve,reject)=>out.toBlob(value=>value?resolve(value):reject(new Error('IMAGE_EXPORT_FAILED')),'image/png',1));
  const safe=clean(order.order_number).replace(/[^a-z0-9_-]+/gi,'-')||'ticket';
  const file=new File([blob],`ticket-${safe}.png`,{type:'image/png'});
  const sharePayload={files:[file],title:`Ticket ${clean(order.order_number)}`};
  try{
    if(typeof navigator.canShare==='function'&&!navigator.canShare(sharePayload))throw new Error('FILE_SHARE_UNSUPPORTED');
    await navigator.share(sharePayload);
  }catch(err:any){
    if(err?.name==='AbortError')return;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
}

export async function connectEscPosPrinter(baudRate=9600){
  if(mobileShareAvailable())return true;
  const serial=navSerial();if(!serial)throw new Error('DIRECT_PRINT_UNSUPPORTED');
  let port:any=null;
  const granted=await serial.getPorts().catch(()=>[]);
  if(granted?.length===1)port=granted[0];
  if(!port)port=await serial.requestPort();
  if(!port.writable)await port.open({baudRate});
  activePort=port;
  return true;
}

export async function disconnectEscPosPrinter(){
  if(!activePort)return;
  try{if(activePort.writable){const writer=activePort.writable.getWriter();await writer.close().catch(()=>{});writer.releaseLock?.()}}catch{}
  try{await activePort.close()}catch{}
  activePort=null;
}

export async function ensureEscPosPrinter(baudRate=9600,requestIfMissing=false){
  if(activePort?.writable)return activePort;
  const serial=navSerial();if(!serial)throw new Error('DIRECT_PRINT_UNSUPPORTED');
  const ports=await serial.getPorts().catch(()=>[]);
  if(ports?.length){
    activePort=ports[0];
    if(!activePort.writable)await activePort.open({baudRate});
    return activePort;
  }
  if(requestIfMissing){
    const port=await serial.requestPort();
    if(!port.writable)await port.open({baudRate});
    activePort=port;
    return activePort;
  }
  throw new Error('PRINTER_NOT_CONNECTED');
}

export async function printEscPosReceipt(order:PrintableOrder,opts:PrinterOptions){
  if(mobileShareAvailable()){
    await shareReceiptImage(order,opts);
    return;
  }
  const port=await ensureEscPosPrinter(opts.baudRate||9600,true);
  if(!port?.writable)throw new Error('PRINTER_NOT_CONNECTED');
  const currency=order.currency_code||'XOF';
  const chunks:Uint8Array[]=[];
  chunks.push(cmd(0x1b,0x40));
  chunks.push(cmd(0x1b,0x74,0x02));
  chunks.push(cmd(0x1b,0x61,0x01),cmd(0x1b,0x45,0x01));
  chunks.push(text(`${clean(opts.receiptTitle||opts.businessName)}\n`));
  chunks.push(cmd(0x1b,0x45,0x00));
  if(opts.catalogTitle)chunks.push(text(`${clean(opts.catalogTitle)}\n`));
  chunks.push(text(`${clean(order.order_number)}\n${new Date(order.created_at).toLocaleString('fr-FR')}\n`));
  chunks.push(cmd(0x1b,0x61,0x00));
  chunks.push(text('--------------------------------\n'));
  if(order.table_number)chunks.push(text(`Table : ${clean(order.table_number)}\n`));
  if(order.delivery_address)for(const l of wrap(`Livraison : ${order.delivery_address}`))chunks.push(text(`${l}\n`));
  if(opts.sourceOrderNumbers?.length)for(const l of wrap(`Commandes : ${opts.sourceOrderNumbers.join(', ')}`))chunks.push(text(`${l}\n`));
  if(order.table_number||order.delivery_address||opts.sourceOrderNumbers?.length)chunks.push(text('--------------------------------\n'));
  for(const item of order.items||[]){
    for(const l of wrap(`${item.quantity} x ${item.name}`))chunks.push(text(`${l}\n`));
    if(item.line_total_minor!==null&&item.line_total_minor!==undefined){
      chunks.push(text(`${padLine('',orderMoney(item.line_total_minor,currency))}\n`));
    }
  }
  chunks.push(text('--------------------------------\n'));
  if(order.total_minor!==null&&order.total_minor!==undefined){
    chunks.push(cmd(0x1b,0x45,0x01));
    chunks.push(text(`${padLine('TOTAL',orderMoney(order.total_minor,currency))}\n`));
    chunks.push(cmd(0x1b,0x45,0x00));
  }
  if(order.customer_note){chunks.push(text('--------------------------------\n'));for(const l of wrap(`Note : ${order.customer_note}`))chunks.push(text(`${l}\n`))}
  chunks.push(cmd(0x1b,0x61,0x01));
  chunks.push(text(`\n${clean(opts.receiptFooter||'Commande enregistree avec Qatalink')}\n\n\n`));
  chunks.push(cmd(0x1b,0x61,0x00));
  const writer=port.writable.getWriter();
  try{await writer.write(concat(chunks))}finally{writer.releaseLock()}
}
