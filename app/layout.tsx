import './globals.css';
import './enhancements.css';
import './trial-mobile.css';
import './editor.css';
import './credits-qr.css';
import './theme-fonts.css';
import './dashboard-v2.css';
import './dashboard-extras.css';
import './dashboard-integrations.css';
import './analytics.css';
import './advanced-studio.css';
import './vitrine-media.css';
import './public-theme.css';
import './public-catalog-v2.css';
import './public-currency.css';
import './public-flow.css';
import './multipage.css';
import './vitrine.css';
import './qatalink-v3.css';
import './pwa.css';
import './landing-extras.css';
import './mobile-hardening.css';
import './onboarding-admin.css';
import './onboarding-v3.css';
import './support-chat.css';
import './trial-conversion.css';
import './generation-activity.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { MetaPixel } from '@/components/meta-pixel';
import { GenerationActivityCenter } from '@/components/generation-activity-center';

const jakarta=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-jakarta'});
const playfair=Playfair_Display({subsets:['latin'],style:['normal','italic'],variable:'--font-playfair'});
const logo='/qatalink-icon.svg';

export const metadata={
  title:'Qatalink — Menu & catalogue interactif',
  description:'Créez un menu ou catalogue interactif depuis une image, un texte ou de zéro.',
  manifest:'/manifest.webmanifest',
  icons:{icon:[{url:logo,type:'image/svg+xml'}],shortcut:logo,apple:logo},
  appleWebApp:{capable:true,statusBarStyle:'default' as const,title:'Qatalink'}
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="fr" suppressHydrationWarning><body className={`${jakarta.variable} ${playfair.variable}`}><ThemeProvider>{children}<GenerationActivityCenter/><PwaInstallButton/><MetaPixel/></ThemeProvider></body></html>;
}
