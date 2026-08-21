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
import './vibecoder.css';
import './public-theme.css';
import './public-catalog-v2.css';
import './public-category-scroll.css';
import './public-currency.css';
import './public-flow.css';
import './multipage.css';
import './vitrine.css';
import './qatalink-v3.css';
import './pwa.css';
import './landing-extras.css';
import './landing-sales.css';
import './pricing-2026.css';
import './turnkey.css';
import './cle-en-main.css';
import './cle-en-main-hero.css';
import './legal.css';
import './activation-engine.css';
import './trial-lifecycle.css';
import './mobile-money.css';
import './mobile-hardening.css';
import './onboarding-admin.css';
import './onboarding-v3.css';
import './support-chat.css';
import './trial-conversion.css';
import './generation-activity.css';
import './image-generation-controls.css';
import './business-stock.css';
import './catalog-completion.css';
import './plan-experience.css';
import './ux-fix.css';
import './catalog-deletion.css';
import './qr-canonical.css';
import './order-ops.css';
import './order-ops-v2.css';
import './ops-color-ui.css';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaInstallButton } from '@/components/pwa-install-button';
import { MetaPixel } from '@/components/meta-pixel';
import { GenerationActivityCenter } from '@/components/generation-activity-center';
import { ItemImageGenerationControls } from '@/components/item-image-generation-controls';
import { ItemDescriptionGenerationControls } from '@/components/item-description-generation-controls';
import { StockManagementCenter } from '@/components/stock-management-center';
import { CatalogCompletionControls } from '@/components/catalog-completion-controls';
import { DashboardPlanExperience } from '@/components/dashboard-plan-experience';
import { QatalinkUxRefinements } from '@/components/qatalink-ux-refinements';
import { CatalogDeletionControls } from '@/components/catalog-deletion-controls';
import { QrCanonicalControls } from '@/components/qr-canonical-controls';
import { OrderOperationsCenter } from '@/components/order-operations-center';
import { ProviderNameScrubber } from '@/components/provider-name-scrubber';
import { MobileMoneyPaymentInfo } from '@/components/mobile-money-payment-info';
import { LandingSupportExperience } from '@/components/landing-support-experience';
import { PlanCopyAlignment } from '@/components/plan-copy-alignment';
import { DashboardKeyInHandPrompt } from '@/components/key-in-hand-configurator';
import { DirectPrintLabelFix } from '@/components/direct-print-label-fix';
import { OpsStockAlerts } from '@/components/ops-stock-alerts';
import { DashboardVibecoder } from '@/components/dashboard-vibecoder';
import { DashboardNavOrder } from '@/components/dashboard-nav-order';

const jakarta=Plus_Jakarta_Sans({subsets:['latin'],variable:'--font-jakarta'});
const playfair=Playfair_Display({subsets:['latin'],style:['normal','italic'],variable:'--font-playfair'});
const logo='/qatalink-icon.svg';

export const metadata={
  title:'Qatalink — Catalogue & menu interactif',
  description:'Transformez une image, un texte ou votre offre en menu/catalogue interactif, modifiable et partageable par QR code.',
  manifest:'/manifest.webmanifest',
  icons:{icon:[{url:logo,type:'image/svg+xml'}],shortcut:logo,apple:logo},
  appleWebApp:{capable:true,statusBarStyle:'default' as const,title:'Qatalink'}
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="fr" suppressHydrationWarning><body className={`${jakarta.variable} ${playfair.variable}`}><ThemeProvider>{children}<ProviderNameScrubber/><MobileMoneyPaymentInfo/><LandingSupportExperience/><PlanCopyAlignment/><DashboardPlanExperience/><ItemImageGenerationControls/><ItemDescriptionGenerationControls/><StockManagementCenter/><CatalogCompletionControls/><QatalinkUxRefinements/><CatalogDeletionControls/><QrCanonicalControls/><OrderOperationsCenter/><OpsStockAlerts/><GenerationActivityCenter/><DashboardKeyInHandPrompt/><DirectPrintLabelFix/><DashboardVibecoder/><DashboardNavOrder/><PwaInstallButton/><MetaPixel/></ThemeProvider></body></html>;
}
