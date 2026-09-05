import { DashboardAppV3 } from '@/components/dashboard-app-v3';
import { DashboardLogoutButton } from '@/components/dashboard-logout-button';
import { DashboardAdvancedControls } from '@/components/dashboard-advanced-controls';
import { DashboardVitrineMedia } from '@/components/dashboard-vitrine-media';
import { DashboardHubCatalogSync } from '@/components/dashboard-hub-catalog-sync';
import { DashboardSidebarTools } from '@/components/dashboard-sidebar-tools';
import { DashboardCustomerFlow } from '@/components/dashboard-customer-flow';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { DashboardActivationEngine } from '@/components/dashboard-activation-engine';
import { DashboardSafeBoundary, DashboardStorageGuard } from '@/components/dashboard-safe-boundary';
import { NewUserGuide } from '@/components/new-user-guide';
import { SupportChat } from '@/components/support-chat';
import { DashboardSupportNudge } from '@/components/dashboard-support-nudge';
import { DashboardSubscriptionStatus } from '@/components/dashboard-subscription-status';
import { TrialConversionCoach } from '@/components/trial-conversion-coach';
import { TrialCreditAccess } from '@/components/trial-credit-access';
import { DashboardUtilityControls } from '@/components/dashboard-utility-controls';
import { TrialLifecycleBanner } from '@/components/trial-lifecycle-banner';
import { QrCanonicalControls } from '@/components/qr-canonical-controls';
import { QrMarketingAssets } from '@/components/qr-marketing-assets';
import { CatalogLinkRenamer } from '@/components/catalog-link-renamer';
import { CatalogOrderControls } from '@/components/catalog-order-controls';
import { IdentityCtaRefinement } from '@/components/identity-cta-refinement';
import { OwnerRevenueCenter } from '@/components/owner-revenue-center';
import { FreeHubManager } from '@/components/free-hub-manager';
import { BusinessCardStudio } from '@/components/business-card-studio';
import { ArticlePromotionInline } from '@/components/article-promotion-inline';
import { TeamPromotionPermission } from '@/components/team-promotion-permission';
import { StockCsvAndMatching } from '@/components/stock-csv-and-matching';
import { CatalogHubShortcut } from '@/components/catalog-hub-shortcut';
import { StockMobileAndCompletion } from '@/components/stock-mobile-and-completion';
import { StockWasteTracking } from '@/components/stock-waste-tracking';
import { SpecializedToolOnboarding } from '@/components/specialized-tool-onboarding';
import { SubscriptionPageTracker } from '@/components/subscription-page-tracker';
import { SharedCatalogAccessNotice } from '@/components/shared-catalog-access-notice';
import { DirectSubscriptionSync } from '@/components/direct-subscription-sync';
import { DashboardOperationalShell } from '@/components/dashboard-operational-shell';
import { DashboardMobilePlanPill } from '@/components/dashboard-mobile-plan-pill';

export default function DashboardPage(){
  return <>
    <DashboardStorageGuard/>
    <DashboardSafeBoundary critical><DashboardAppV3/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardOperationalShell/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardMobilePlanPill/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DirectSubscriptionSync/></DashboardSafeBoundary>
    <DashboardSafeBoundary><SubscriptionPageTracker/></DashboardSafeBoundary>
    <DashboardSafeBoundary><SharedCatalogAccessNotice/></DashboardSafeBoundary>
    <DashboardSafeBoundary><IdentityCtaRefinement/></DashboardSafeBoundary>
    <DashboardSafeBoundary><CatalogOrderControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialLifecycleBanner/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardUtilityControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><CatalogLinkRenamer/></DashboardSafeBoundary>
    <DashboardSafeBoundary><QrCanonicalControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><QrMarketingAssets/></DashboardSafeBoundary>
    <DashboardSafeBoundary><FreeHubManager/></DashboardSafeBoundary>
    <DashboardSafeBoundary><BusinessCardStudio/></DashboardSafeBoundary>
    <DashboardSafeBoundary><CatalogHubShortcut/></DashboardSafeBoundary>
    <DashboardSafeBoundary><ArticlePromotionInline/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TeamPromotionPermission/></DashboardSafeBoundary>
    <DashboardSafeBoundary><StockCsvAndMatching/></DashboardSafeBoundary>
    <DashboardSafeBoundary><StockMobileAndCompletion/></DashboardSafeBoundary>
    <DashboardSafeBoundary><StockWasteTracking/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardActivationEngine/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAnalytics/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAdvancedControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardVitrineMedia/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardHubCatalogSync/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardCustomerFlow/></DashboardSafeBoundary>
    <DashboardSafeBoundary><SupportChat/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSupportNudge/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSidebarTools/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSubscriptionStatus/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialCreditAccess/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialConversionCoach/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardLogoutButton/></DashboardSafeBoundary>
    <DashboardSafeBoundary><OwnerRevenueCenter/></DashboardSafeBoundary>
    <DashboardSafeBoundary><NewUserGuide/></DashboardSafeBoundary>
    <DashboardSafeBoundary><SpecializedToolOnboarding/></DashboardSafeBoundary>
  </>;
}
