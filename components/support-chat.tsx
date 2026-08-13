'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,Bell,BellOff,Bot,Headphones,MessagesSquare,Send,Sparkles,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Mode='ai'|'human';
type Msg={id:string;thread_id:string;sender_role:'client'|'support'|'assistant'|'system';body:string;created_at:string;metadata?:Record<string,unknown>};
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://rifjsvbbhsnpifgooenl.supabase.co';
const FUNCTION_URL=`${SUPABASE_URL}/functions/v1/qatalink-support-agent`;

function getVisitorId(){
  if(typeof window==='undefined')return'';
  let id=localStorage.getItem('qatalink_support_visitor_id')||'';
  if(!/^[a-zA-Z0-9_-]{20,120}$/.test(id)){
    id=`ql_${crypto.randomUUID().replace(/-/g,'')}_${Date.now().toString(36)}`;
    localStorage.setItem('qatalink_support_visitor_id',id);
  }
  return id;
}
async function showSupportNotification(body:string){
  if(typeof window==='undefined'||!('Notification'in window)||Notification.permission!=='granted')return;
  try{
    if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification('Qatalink',{body,icon:'/qatalink-icon.svg',badge:'/qatalink-icon.svg',data:{url:'/dashboard?support=1'}});return}
    new Notification('Qatalink',{body,icon:'/qatalink-icon.svg'});
  }catch{}
}
function displayName(role:Msg['sender_role']){if(role==='client')return'Vous';if(role==='assistant')return'Assistant Qatalink';if(role==='support')return'Support Qatalink';return'Qatalink'}

export function SupportChat(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [threadId,setThreadId]=useState('');const [messages,setMessages]=useState<Msg[]>([]);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [mode,setMode]=useState<Mode>('ai');const [notifications,setNotifications]=useState(false);const [unread,setUnread]=useState(0);const [unreadPromptVisible,setUnreadPromptVisible]=useState(false);const [visitorId,setVisitorId]=useState('');const [loadingHistory,setLoadingHistory]=useState(false);
  const lastCount=useRef(0);const messagesEndRef=useRef<HTMLDivElement|null>(null);

  function jumpToUnread(){
    setOpen(true);setUnread(0);setUnreadPromptVisible(false);setNotice('');
    window.setTimeout(()=>messagesEndRef.current?.scrollIntoView({behavior:'smooth',block:'end'}),90);
  }
  function registerNewReplies(replies:Msg[]){
    if(!replies.length)return;
    setUnread(v=>v+replies.length);setUnreadPromptVisible(true);
    const latest=replies.at(-1)!;
    const label=latest.sender_role==='support'?'Le Support Qatalink vous a répondu.':'Votre Assistant Qatalink a répondu.';
    if(document.visibilityState!=='visible'&&notifications)void showSupportNotification(label);
  }

  useEffect(()=>{
    const visitor=getVisitorId();setVisitorId(visitor);
    const savedMode=localStorage.getItem('qatalink_support_mode');if(savedMode==='human'||savedMode==='ai')setMode(savedMode);
    setThreadId(localStorage.getItem('qatalink_support_thread_id')||'');
    setNotifications(localStorage.getItem('qatalink_support_notifications')==='1');
    const params=new URLSearchParams(window.location.search);if(params.get('support')==='1'){const requested=params.get('support_mode');if(requested==='human'||requested==='ai')setMode(requested);setOpen(true)}
    const handler=(event:Event)=>{const detail=(event as CustomEvent<{mode?:Mode}>).detail;const requested=detail?.mode;if(requested==='human'||requested==='ai')setMode(requested);setOpen(true)};
    window.addEventListener('qatalink:support-open',handler as EventListener);return()=>window.removeEventListener('qatalink:support-open',handler as EventListener);
  },[]);

  async function callAgent(payload:Record<string,unknown>){
    const {data:{session}}=await supabase.auth.getSession();
    const headers:Record<string,string>={'Content-Type':'application/json'};if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
    const r=await fetch(FUNCTION_URL,{method:'POST',headers,body:JSON.stringify({visitor_id:visitorId,thread_id:threadId||undefined,source:window.location.pathname==='/'?'landing':'dashboard',page:window.location.pathname+window.location.search,...payload})});
    const data=await r.json().catch(()=>null);if(!r.ok)throw new Error(data?.error||'SUPPORT_UNAVAILABLE');
    if(data?.thread_id){setThreadId(data.thread_id);localStorage.setItem('qatalink_support_thread_id',data.thread_id)}
    if(data?.mode==='ai'||data?.mode==='human'){setMode(data.mode);localStorage.setItem('qatalink_support_mode',data.mode)}
    if(Array.isArray(data?.messages))setMessages(data.messages as Msg[]);
    return data;
  }

  async function loadHistory(silent=false){
    if(!visitorId)return;if(!silent)setLoadingHistory(true);
    const before=lastCount.current;
    try{
      const data=await callAgent({action:'history',mode});const next=(data?.messages||[]) as Msg[];
      const initialLoad=before===0;
      const newReplies=!initialLoad&&next.length>before?next.slice(before).filter(m=>m.sender_role==='support'||m.sender_role==='assistant'):[];
      setMessages(next);lastCount.current=next.length;registerNewReplies(newReplies);
    }catch{if(!silent)setNotice('Le chat est momentanément indisponible. Réessayez dans un instant.')}finally{if(!silent)setLoadingHistory(false)}
  }

  useEffect(()=>{if(open&&visitorId)void loadHistory()},[open,visitorId]);
  useEffect(()=>{if(!visitorId)return;const timer=setInterval(()=>{if(threadId)void loadHistory(true)},3500);return()=>clearInterval(timer)},[visitorId,threadId,notifications,mode]);

  async function switchMode(next:Mode){
    if(next===mode)return;setMode(next);localStorage.setItem('qatalink_support_mode',next);setNotice(next==='human'?'Vous parlez maintenant au Support Qatalink. L’équipe reprendra la conversation dès que possible.':'Assistant Qatalink activé : posez votre question et obtenez une réponse immédiate.');
    try{const data=await callAgent({action:'switch',mode:next});if(Array.isArray(data?.messages))lastCount.current=data.messages.length}catch{}
  }
  async function toggleNotifications(){
    if(notifications){localStorage.setItem('qatalink_support_notifications','0');setNotifications(false);setNotice('Notifications désactivées.');return}
    if(typeof window==='undefined'||!('Notification'in window)){setNotice('Les notifications ne sont pas disponibles sur ce navigateur.');return}
    const permission=await Notification.requestPermission();if(permission!=='granted'){setNotice('Autorisez les notifications dans votre navigateur pour les recevoir.');return}
    localStorage.setItem('qatalink_support_notifications','1');setNotifications(true);setNotice('Notifications du support activées.');
  }
  async function send(value?:string){
    const body=(value??text).trim();if(!body||busy||!visitorId)return;setBusy(true);setNotice('');
    const before=lastCount.current;
    const optimistic:Msg={id:`temp-${Date.now()}`,thread_id:threadId,sender_role:'client',body,created_at:new Date().toISOString()};setMessages(prev=>[...prev,optimistic]);if(!value)setText('');
    try{
      const data=await callAgent({action:'send',mode,message:body});
      if(Array.isArray(data?.messages)){
        const next=data.messages as Msg[];
        const newReplies=next.length>before?next.slice(before).filter(m=>m.sender_role==='support'||m.sender_role==='assistant'):[];
        lastCount.current=next.length;setMessages(next);registerNewReplies(newReplies);
      }
      if(data?.waiting_for_human)setNotice('Message transmis au Support Qatalink. Vous pouvez continuer à écrire ici pendant l’attente.');else if(data?.escalate)setNotice('L’assistant recommande une intervention humaine. Vous pouvez choisir « Support humain » ci-dessus.');
    }
    catch{setMessages(prev=>prev.filter(m=>m.id!==optimistic.id));setNotice('Votre message n’a pas pu être envoyé. Réessayez.');if(!value)setText(body)}finally{setBusy(false)}
  }

  const quick=[['Quel thème choisir ?','Aide-moi à choisir le meilleur thème pour mon activité.'],['Mettre une image en fond','Comment mettre une image en fond de mon catalogue sans nuire à la lisibilité ?'],['Paiements disponibles','Quels moyens de paiement puis-je utiliser pour mon abonnement ?'],['Publier et partager mon QR','Guide-moi pour publier mon catalogue et partager correctement mon QR code.']];
  const latestReplyId=unread>0?[...messages].reverse().find(m=>m.sender_role==='assistant'||m.sender_role==='support')?.id||'':'';

  return <>
    {unread>0&&unreadPromptVisible&&<div className={'support-new-message-popover '+(open?'chat-open':'')} role="status"><button className="support-new-message-main" onClick={jumpToUnread}><span className="support-new-message-icon"><MessagesSquare size={17}/></span><span><b>{unread===1?'Nouveau message non lu':'Nouveaux messages non lus'}</b><small>{unread===1?'Voir la nouvelle réponse':'Voir les nouvelles réponses'}</small></span><ArrowDown size={16}/></button><button className="support-new-message-close" onClick={()=>setUnreadPromptVisible(false)} aria-label="Fermer l’alerte de nouveau message"><X size={14}/></button></div>}
    <button className="support-chat-trigger" onClick={()=>setOpen(true)} aria-label="Ouvrir l’aide Qatalink"><MessagesSquare size={19}/><span>Aide & support</span>{unread>0&&<b className="support-unread-badge">{unread>9?'9+':unread}</b>}</button>
    {open&&<div className="support-backdrop"><section className="support-panel"><header><div><span className="eyebrow">QATALINK</span><h2>Besoin d’aide ?</h2><small>Choisissez une réponse immédiate par l’IA ou le Support Qatalink.</small></div><div className="support-header-actions"><button className={'support-notification-toggle '+(notifications?'active':'')} onClick={toggleNotifications} title={notifications?'Désactiver les notifications':'Activer les notifications'}>{notifications?<Bell size={17}/>:<BellOff size={17}/>}</button><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></div></header><div className="support-mode-switch"><button className={mode==='ai'?'active':''} onClick={()=>switchMode('ai')}><Bot size={16}/><span><b>Assistant IA</b><small>Réponse immédiate</small></span></button><button className={mode==='human'?'active':''} onClick={()=>switchMode('human')}><Headphones size={16}/><span><b>Support humain</b><small>Équipe Qatalink</small></span></button></div><div className="support-messages" aria-live="polite" aria-relevant="additions text">{loadingHistory&&!messages.length?<div className="support-empty"><Sparkles/><b>Préparation de votre assistance…</b></div>:messages.length?messages.map(m=><div key={m.id} className={'support-message '+m.sender_role+(m.id===latestReplyId&&m.sender_role!=='client'?' latest-reply':'')}><b>{displayName(m.sender_role)}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>):<div className="support-empty"><MessagesSquare/><b>{mode==='ai'?'Que voulez-vous faire dans Qatalink ?':'Comment pouvons-nous vous aider ?'}</b><span>{mode==='ai'?'Posez une question sur votre catalogue, le design, le QR, WhatsApp ou votre abonnement.':'Décrivez votre préoccupation : l’équipe Qatalink retrouvera toute la conversation.'}</span>{mode==='ai'&&<div className="support-quick-actions">{quick.map(([label,prompt])=><button key={label} onClick={()=>send(prompt)}>{label}</button>)}</div>}</div>}{busy&&mode==='ai'&&<div className="support-message assistant support-typing" role="status"><b>Assistant Qatalink</b><div className="support-typing-row"><span/><span/><span/><em>prépare sa réponse…</em></div></div>}<div ref={messagesEndRef} className="support-messages-end" aria-hidden="true"/></div>{notice&&<div className="support-notice">{notice}</div>}<footer><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} rows={2} placeholder={mode==='ai'?'Posez votre question à l’Assistant Qatalink…':'Écrivez votre préoccupation au Support Qatalink…'} maxLength={5000}/><button onClick={()=>send()} disabled={busy||!text.trim()} aria-label="Envoyer"><Send size={17}/></button></footer></section></div>}
  </>;
}
