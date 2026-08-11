'use client';

import {useEffect,useMemo,useState} from 'react';
import {Bell, BellOff, Headphones,Send,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Msg={id:string;thread_id:string;sender_role:'client'|'support';body:string;created_at:string};

async function showSupportNotification(body:string){
  if(typeof window==='undefined'||!('Notification'in window)||Notification.permission!=='granted')return;
  try{
    if('serviceWorker'in navigator){
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification('Support Qatalink',{body,icon:'/qatalink-icon.svg',badge:'/qatalink-icon.svg',data:{url:'/dashboard?support=1'}});
      return;
    }
    new Notification('Support Qatalink',{body,icon:'/qatalink-icon.svg'});
  }catch{}
}

export function SupportChat(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [userId,setUserId]=useState('');const [threadId,setThreadId]=useState('');const [messages,setMessages]=useState<Msg[]>([]);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [notifications,setNotifications]=useState(false);const [unread,setUnread]=useState(0);

  useEffect(()=>{const handler=()=>{setOpen(true);setUnread(0)};window.addEventListener('qatalink:support-open',handler);return()=>window.removeEventListener('qatalink:support-open',handler)},[]);
  useEffect(()=>{(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)return;setUserId(session.user.id);const [{data:p},{data:t}]=await Promise.all([supabase.from('profiles').select('support_notifications_enabled').eq('id',session.user.id).maybeSingle(),supabase.from('support_threads').select('id').eq('user_id',session.user.id).maybeSingle()]);setNotifications(Boolean(p?.support_notifications_enabled));if(t?.id){setThreadId(t.id);await loadMessages(t.id)}})()},[supabase]);
  useEffect(()=>{if(open){setUnread(0);void ensureThread()}},[open]);
  useEffect(()=>{if(!threadId)return;const channel=supabase.channel(`support-client-${threadId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages',filter:`thread_id=eq.${threadId}`},(payload:any)=>{const msg=payload.new as Msg;setMessages(prev=>prev.some(x=>x.id===msg.id)?prev:[...prev,msg]);if(msg.sender_role==='support'){if(!open)setUnread(v=>v+1);if(notifications)void showSupportNotification('Vous avez reçu une nouvelle réponse.')}}).subscribe();return()=>{void supabase.removeChannel(channel)}},[supabase,threadId,open,notifications]);

  async function loadMessages(id:string){const {data:rows}=await supabase.from('support_messages').select('id,thread_id,sender_role,body,created_at').eq('thread_id',id).order('created_at',{ascending:true});setMessages((rows||[]) as Msg[])}
  async function ensureThread(){
    setNotice('');
    if(!userId)return;
    let id=threadId;
    if(!id){let {data:thread}=await supabase.from('support_threads').select('id').eq('user_id',userId).maybeSingle();if(!thread){const {data:biz}=await supabase.from('businesses').select('id').eq('owner_user_id',userId).order('created_at',{ascending:true}).limit(1).maybeSingle();const created=await supabase.from('support_threads').insert({user_id:userId,business_id:biz?.id||null}).select('id').single();thread=created.data||null}if(!thread)return setNotice('Le support est momentanément indisponible.');id=thread.id;setThreadId(id)}
    await loadMessages(id);
  }
  async function toggleNotifications(){
    if(!userId)return;
    if(notifications){await supabase.from('profiles').update({support_notifications_enabled:false}).eq('id',userId);setNotifications(false);setNotice('Notifications désactivées.');return}
    if(typeof window==='undefined'||!('Notification'in window)){setNotice('Les notifications ne sont pas disponibles sur ce navigateur.');return}
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){setNotice('Autorisez les notifications dans votre navigateur pour les recevoir.');return}
    const {error}=await supabase.from('profiles').update({support_notifications_enabled:true}).eq('id',userId);if(error){setNotice('Impossible d’activer les notifications pour le moment.');return}setNotifications(true);setNotice('Notifications du support activées.');
  }
  async function send(){if(!text.trim()||!threadId||!userId)return;setBusy(true);const body=text.trim();const {error}=await supabase.from('support_messages').insert({thread_id:threadId,sender_user_id:userId,sender_role:'client',body});if(error)setNotice('Impossible d’envoyer le message pour le moment.');else setText('');setBusy(false)}

  return <><button className="support-chat-trigger" onClick={()=>{setOpen(true);setUnread(0)}} aria-label="Ouvrir le support"><Headphones size={17}/><span>Support</span>{unread>0&&<b className="support-unread-badge">{unread>9?'9+':unread}</b>}</button>{open&&<div className="support-backdrop"><section className="support-panel"><header><div><span className="eyebrow">QATALINK</span><h2>Support</h2><small>Besoin d’aide ? Écrivez-nous ici ou à support@qatalink.com.</small></div><div className="support-header-actions"><button className={'support-notification-toggle '+(notifications?'active':'')} onClick={toggleNotifications} title={notifications?'Désactiver les notifications':'Activer les notifications'}>{notifications?<Bell size={17}/>:<BellOff size={17}/>}</button><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></div></header><div className="support-messages">{messages.length?messages.map(m=><div key={m.id} className={'support-message '+m.sender_role}><b>{m.sender_role==='support'?'Support Qatalink':'Vous'}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>):<div className="support-empty"><Headphones/><b>Comment pouvons-nous vous aider ?</b><span>Décrivez votre problème ou votre question.</span></div>}</div>{notice&&<div className="support-notice">{notice}</div>}<footer><textarea value={text} onChange={e=>setText(e.target.value)} rows={2} placeholder="Écrivez votre message…" maxLength={5000}/><button onClick={send} disabled={busy||!text.trim()}><Send size={17}/></button></footer></section></div>}</>;
}
