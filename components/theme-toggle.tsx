'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <button className="icon-btn" aria-label="Thème"><Moon size={18}/></button>;
  const dark = theme === 'dark';
  return <button className="icon-btn" onClick={() => setTheme(dark ? 'light':'dark')} aria-label="Changer le thème">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>;
}
