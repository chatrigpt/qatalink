import './globals.css';
import './enhancements.css';
import './trial-mobile.css';
import './editor.css';
import './credits-qr.css';
import './theme-fonts.css';
import './dashboard-v2.css';
import './public-theme.css';
import './public-catalog-v2.css';
import './qatalink-v3.css';
import './pwa.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaInstallButton } from '@/components/pwa-install-button';

const jakarta=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-jakarta'});
const playfair=Playfair_Display({subsets:['latin'],style:['normal','italic'],variable:'--font-playfair'});
const logo='https://monadia-bucket.sfo3.cdn.digitaloceanspaces.com/QATALINK%20LOGO%20(1).png';

export const metadata={
  title:'Qatalink — Menu & catalogue interactif',
  description:'Créez un menu ou catalogue interactif depuis une image, un texte ou de zéro.',
  manifest:'/manifest.webmanifest',
  icons:{icon:logo,apple:logo},
  appleWebApp:{capable:true,statusBarStyle:'default' as const,title:'Qatalink'}
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="fr" suppressHydrationWarning><body className={`${jakarta.variable} ${playfair.variable}`}><ThemeProvider>{children}<PwaInstallButton/></ThemeProvider></body></html>;
}
