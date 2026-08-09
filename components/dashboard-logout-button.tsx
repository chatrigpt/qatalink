'use client';

import {LogOut} from 'lucide-react';
import {useMemo,useState} from 'react';
import {createSupabaseBrowserClient} from '@/lib/supabase';

export function DashboardLogoutButton(){
  const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
  const [busy,setBusy]=useState(false);

  async function logout(){
    if(busy)return;
    setBusy(true);
    try{
      await supabase.auth.signOut();
    }finally{
      window.location.replace('/login');
    }
  }

  return <button type="button" className="dashboard-logout-button" onClick={logout} disabled={busy} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17}/><span>{busy?'Déconnexion…':'Déconnexion'}</span></button>;
}
