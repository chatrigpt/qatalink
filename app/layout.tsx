import './globals.css';
import './enhancements.css';
import './trial-mobile.css';
import './editor.css';
import './credits-qr.css';
import './theme-fonts.css';
import './dashboard-v2.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
export const metadata = { title: 'Qatalink — Menu & catalogue interactif', description: 'Créez un menu ou catalogue interactif depuis une image, un texte ou de zéro.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr" suppressHydrationWarning><body className={jakarta.variable}><ThemeProvider>{children}</ThemeProvider></body></html>;
}
