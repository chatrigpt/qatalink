'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {AlertTriangle,CheckCircle2,ChevronDown,ChevronUp,Sparkles,X} from 'lucide-react';

type JobStatus='processing'|'completed'|'failed';
type Job={id:string;label:string;status:JobStatus;progress:number;cost:number;refunded:boolean;createdAt:number};
type Summary={total:number;success:number;failed:number;spent:number;refunded:number};

const active=(j:Job)=>j.status==='processing';
const asUrl=(input:RequestInfo|URL)=>typeof input==='string'?input:input instanceof URL?input.toString():input.url;

export function GenerationActivityCenter(){
  const [jobs,setJobs]=useState<Record<string,Job>>({});
  const [toast,setToast]=useState<{count:number;stamp:number}|null>(null);
  const [summary,setSummary]=useState<Summary|null>(null);
  const [collapsed,setCollapsed]=useState(false);
  const summaryShown=useRef(false);

  const list=useMemo(()=>Object.values(jobs).sort((a,b)=>a.createdAt-b.createdAt),[jobs]);
  const running=list.filter(active).length;
  const successes=list.filter(j=>j.status==='completed').length;
  const failures=list.filter(j=>j.status==='failed').length;
  const progress=list.length?Math.round(list.reduce((n,j)=>n+j.progress,0)/list.length):0;
  const reserved=list.reduce((n,j)=>n+j.cost,0);
  const spent=list.filter(j=>j.status==='completed').reduce((n,j)=>n+j.cost,0);

  function addJobs(incoming:Job[]){
    if(!incoming.length)return;
    setSummary(null);
    setCollapsed(false);
    setJobs(prev=>{
      const hasActive=Object.values(prev).some(active);
      if(!hasActive)summaryShown.current=false;
      const base=hasActive?{...prev}:{};
      for(const job of incoming)base[job.id]=job;
      return base;
    });
    setToast({count:incoming.length,stamp:Date.now()});
  }

  function patchJob(id:string,patch:Partial<Job>){
    setJobs(prev=>{
      const current=prev[id];
      if(!current)return prev;
      const nextProgress=patch.status==='completed'||patch.status==='failed'?100:Math.max(current.progress,Math.min(92,Number(patch.progress??current.progress+7)));
      return {...prev,[id]:{...current,...patch,progress:nextProgress}};
    });
  }

  useEffect(()=>{
    if(!toast)return;
    const t=setTimeout(()=>setToast(null),3800);
    return()=>clearTimeout(t);
  },[toast?.stamp]);

  useEffect(()=>{
    if(!list.length||running>0||summaryShown.current)return;
    summaryShown.current=true;
    const next:Summary={
      total:list.length,
      success:successes,
      failed:failures,
      spent,
      refunded:list.filter(j=>j.status==='failed'&&j.refunded).reduce((n,j)=>n+j.cost,0)
    };
    const t=setTimeout(()=>setSummary(next),350);
    return()=>clearTimeout(t);
  },[list.length,running,successes,failures,spent]);

  useEffect(()=>{
    const original=window.fetch.bind(window);
    const wrapped:typeof window.fetch=async(input,init)=>{
      const response=await original(input as any,init as any);
      try{
        const url=asUrl(input as any);
        if(response.headers.get('content-type')?.includes('application/json')){
          const data:any=await response.clone().json().catch(()=>null);
          if(url.includes('/api/images/generate')&&response.ok&&Array.isArray(data?.jobs)){
            const now=Date.now();let order=0;
            const incoming:Job[]=data.jobs.filter((j:any)=>j?.job_id).map((j:any)=>{
              const failed=!!j.error;
              const cost=Number(j.credit_cost??(j.refunded?5:(failed?0:5)));
              return {id:String(j.job_id),label:String(j.item_name||`Illustration ${++order}`),status:failed?'failed':'processing',progress:failed?100:8,cost,refunded:Boolean(j.refunded),createdAt:now+order};
            });
            addJobs(incoming);
          }
          if(url.includes('/api/images/status')&&response.ok&&Array.isArray(data?.results)){
            for(const r of data.results){
              if(!r?.job_id)continue;
              if(r.status==='completed')patchJob(String(r.job_id),{status:'completed',progress:100,cost:Number(r.credit_cost||jobs[String(r.job_id)]?.cost||5)});
              else if(r.status==='failed')patchJob(String(r.job_id),{status:'failed',progress:100,refunded:Boolean(r.refunded)});
              else patchJob(String(r.job_id),{status:'processing',progress:Number(r.progress||0)});
            }
          }
          if(url.includes('/api/theme/background/submit')&&response.ok&&data?.job_id){
            addJobs([{id:String(data.job_id),label:'Fond du catalogue',status:'processing',progress:8,cost:5,refunded:false,createdAt:Date.now()}]);
          }
          if(url.includes('/api/theme/background/status')&&data?.status){
            let body:any=null;try{body=typeof init?.body==='string'?JSON.parse(init.body):null}catch{}
            const id=String(body?.job_id||'');
            if(id){
              if(data.status==='completed')patchJob(id,{status:'completed',progress:100});
              else if(data.status==='failed')patchJob(id,{status:'failed',progress:100,refunded:Boolean(data.refunded)});
              else patchJob(id,{status:'processing',progress:Number(data.progress||0)});
            }
          }
        }
      }catch{}
      return response;
    };
    window.fetch=wrapped;
    return()=>{if(window.fetch===wrapped)window.fetch=original};
  },[]);

  function closeSummary(){setSummary(null);setJobs({});setCollapsed(false)}

  return <>
    {toast&&<aside className="generation-toast" role="status"><div className="generation-toast-icon"><Sparkles size={18}/></div><div><b>Génération lancée</b><span>{toast.count} image{toast.count>1?'s':''} ajoutée{toast.count>1?'s':''} à la file.</span></div><button onClick={()=>setToast(null)} aria-label="Fermer"><X size={16}/></button></aside>}

    {!!list.length&&!summary&&<aside className={'generation-dock '+(collapsed?'collapsed':'')} aria-live="polite">
      <div className="generation-dock-head"><div className="generation-dock-title"><span className="generation-live-dot"/><div><b>{running?`${running} génération${running>1?'s':''} en cours`:'Finalisation…'}</b><small>{successes} réussie{successes>1?'s':''} · {failures} échec{failures>1?'s':''} · {reserved} crédits engagés</small></div></div><div className="generation-dock-actions"><strong>{progress}%</strong><button onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?'Déplier':'Réduire'}>{collapsed?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button></div></div>
      <div className="generation-progress"><i style={{width:`${progress}%`}}/></div>
      {!collapsed&&<div className="generation-job-list">{list.map(job=><div className={'generation-job '+job.status} key={job.id}><span>{job.status==='completed'?<CheckCircle2 size={16}/>:job.status==='failed'?<AlertTriangle size={16}/>:<Sparkles size={16}/>}</span><div><b>{job.label}</b><small>{job.status==='completed'?'Terminée':job.status==='failed'?(job.refunded?'Échec · crédits recrédités':'Échec'):`Création en cours · ${job.progress}%`}</small></div><em>{job.cost} cr</em></div>)}</div>}
    </aside>}

    {summary&&<div className="generation-summary-backdrop"><section className="generation-summary" role="dialog" aria-modal="true"><button className="generation-summary-close" onClick={closeSummary}><X size={17}/></button><div className="generation-summary-icon"><CheckCircle2 size={25}/></div><span className="eyebrow">GÉNÉRATION TERMINÉE</span><h2>{summary.success} image{summary.success>1?'s':''} créée{summary.success>1?'s':''}</h2><p>{summary.failed?`${summary.failed} génération${summary.failed>1?'s ont':' a'} échoué. Les crédits concernés ont été recrédités lorsqu’ils avaient été débités.`:'Toutes les générations se sont terminées avec succès.'}</p><div className="generation-summary-grid"><div><span>Réussites</span><b>{summary.success}</b></div><div><span>Échecs</span><b>{summary.failed}</b></div><div><span>Crédits dépensés</span><b>{summary.spent}</b></div><div><span>Crédits recrédités</span><b>{summary.refunded}</b></div></div><button className="btn btn-primary" onClick={closeSummary}>Terminer</button></section></div>}
  </>;
}
