import React from 'react';

function inline(text:string){
  const parts=text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.startsWith('`')&&part.endsWith('`')?<code key={i}>{part.slice(1,-1)}</code>:<React.Fragment key={i}>{part}</React.Fragment>);
}

export function SeoMarkdown({markdown}:{markdown:string}){
  const lines=String(markdown||'').replace(/\r/g,'').split('\n');
  const out:React.ReactNode[]=[];let list:string[]=[];let para:string[]=[];let key=0;
  const flushPara=()=>{if(!para.length)return;out.push(<p key={`p-${key++}`}>{inline(para.join(' '))}</p>);para=[]};
  const flushList=()=>{if(!list.length)return;out.push(<ul key={`ul-${key++}`}>{list.map((x,i)=><li key={i}>{inline(x)}</li>)}</ul>);list=[]};
  for(const raw of lines){const line=raw.trim();
    if(!line){flushPara();flushList();continue}
    if(line.startsWith('### ')){flushPara();flushList();out.push(<h3 key={`h3-${key++}`}>{inline(line.slice(4))}</h3>);continue}
    if(line.startsWith('## ')){flushPara();flushList();out.push(<h2 key={`h2-${key++}`}>{inline(line.slice(3))}</h2>);continue}
    if(line.startsWith('# ')){flushPara();flushList();out.push(<h1 key={`h1-${key++}`}>{inline(line.slice(2))}</h1>);continue}
    if(/^[-*] /.test(line)){flushPara();list.push(line.slice(2));continue}
    if(/^\d+\. /.test(line)){flushPara();list.push(line.replace(/^\d+\. /,''));continue}
    if(line.startsWith('> ')){flushPara();flushList();out.push(<blockquote key={`q-${key++}`}>{inline(line.slice(2))}</blockquote>);continue}
    para.push(line);
  }
  flushPara();flushList();return <div className="seo-markdown">{out}</div>;
}
