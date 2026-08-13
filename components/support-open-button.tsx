'use client';

import type {ReactNode} from 'react';

type Props={mode?:'ai'|'human';className?:string;children:ReactNode};

export function SupportOpenButton({mode='ai',className='btn btn-primary',children}:Props){
  return <button type="button" className={`${className} support-open-btn`} onClick={()=>window.dispatchEvent(new CustomEvent('qatalink:support-open',{detail:{mode}}))}>{children}</button>;
}
