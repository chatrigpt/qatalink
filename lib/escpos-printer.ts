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
export function escPosDirectSupported(){return !!navSerial()&&typeof window!=='undefined'&&window.isSecureContext}
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

export async function connectEscPosPrinter(baudRate=9600){
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
  // This function is called from the user's "Impression directe" click. If no
  // previously authorized serial printer exists, request the port right there
  // instead of forcing a separate "Connecter imprimante" step first.
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
