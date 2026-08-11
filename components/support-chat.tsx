'use client';

import {useEffect,useMemo,useState} from 'react';
import {Headphones,Send,X} from 'lucide-react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

type Msg={id:string;thread_id:string;sender_role:'client'|'support';body:string;created_at:string};

export function SupportChat(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [open,setOpen]=useState(false);const [userId,setUserId]=useState('');const [threadId,setThreadId]=useState('');const [messages,setMessages]=useState<Msg[]>([]);const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');

  useEffect(()=>{const handler=()=>setOpen(true);window.addEventListener('qatalink:support-open',handler);return()=>window.removeEventListener('qatalink:support-open',handler)},[]);
  useEffect(()=>{if(open)load()},[open]);

  async function load(){
    setNotice('');
    const {data:{session}}=await supabase.auth.getSession();if(!session)return;setUserId(session.user.id);
    let {data:thread}=await supabase.from('support_threads').select('id').eq('user_id',session.user.id).maybeSingle();
    if(!thread){const {data:biz}=await supabase.from('businesses').select('id').eq('owner_user_id',session.user.id).order('created_at',{ascending:true}).limit(1).maybeSingle();const created=await supabase.from('support_threads').insert({user_id:session.user.id,business_id:biz?.id||null}).select('id').single();thread=created.data||null}
    if(!thread)return setNotice('Le support est momentanément indisponible.');
    setThreadId(thread.id);const {data:rows}=await supabase.from('support_messages').select('id,thread_id,sender_role,body,created_at').eq('thread_id',thread.id).order('created_at',{ascending:true});setMessages((rows||[]) as Msg[]);
  }

  async function send(){if(!text.trim()||!threadId||!userId)return;setBusy(true);const body=text.trim();const {error}=await supabase.from('support_messages').insert({thread_id:threadId,sender_user_id:userId,sender_role:'client',body});if(error)setNotice('Impossible d’envoyer le message pour le moment.');else{setText('');await load()}setBusy(false)}

  return <><button className="support-chat-trigger" onClick={()=>setOpen(true)} aria-label="Ouvrir le support"><Headphones size={17}/><span>Support</span></button>{open&&<div className="support-backdrop"><section className="support-panel"><header><div><span className="eyebrow">QATALINK</span><h2>Support</h2><small>Besoin d’aide ? Écrivez-nous ici ou à support@qatalink.com.</small></div><button onClick={()=>setOpen(false)} aria-label="Fermer"><X/></button></header><div className="support-messages">{messages.length?messages.map(m=><div key={m.id} className={'support-message '+m.sender_role}><b>{m.sender_role==='support'?'Support Qatalink':'Vous'}</b><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>):<div className="support-empty"><Headphones/><b>Comment pouvons-nous vous aider ?</b><span>Décrivez votre problème ou votre question.</span></div>}</div>{notice&&<div className="support-notice">{notice}</div>}<footer><textarea value={text} onChange={e=>setText(e.target.value)} rows={2} placeholder="Écrivez votre message…" maxLength={5000}/><button onClick={send} disabled={busy||!text.trim()}><Send size={17}/></button></footer></section></div>}</>;
}
