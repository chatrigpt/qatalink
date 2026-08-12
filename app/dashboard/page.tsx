import { DashboardAppV3 } from '@/components/dashboard-app-v3';
import { DashboardLogoutButton } from '@/components/dashboard-logout-button';
import { DashboardAdvancedControls } from '@/components/dashboard-advanced-controls';
import { DashboardVitrineMedia } from '@/components/dashboard-vitrine-media';
import { DashboardSidebarTools } from '@/components/dashboard-sidebar-tools';
import { DashboardCustomerFlow } from '@/components/dashboard-customer-flow';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { DashboardActivationEngine } from '@/components/dashboard-activation-engine';
import { DashboardSafeBoundary, DashboardStorageGuard } from '@/components/dashboard-safe-boundary';
import { NewUserGuide } from '@/components/new-user-guide';
import { SupportChat } from '@/components/support-chat';
import { DashboardSubscriptionStatus } from '@/components/dashboard-subscription-status';
import { TrialConversionCoach } from '@/components/trial-conversion-coach';
import { TrialCreditAccess } from '@/components/trial-credit-access';
import { DashboardUtilityControls } from '@/components/dashboard-utility-controls';
import { TrialLifecycleBanner } from '@/components/trial-lifecycle-banner';

export default function DashboardPage(){
  return <>
    <DashboardStorageGuard/>
    <DashboardSafeBoundary critical><DashboardAppV3/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialLifecycleBanner/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardUtilityControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardActivationEngine/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAnalytics/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAdvancedControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardVitrineMedia/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardCustomerFlow/></DashboardSafeBoundary>
    <DashboardSafeBoundary><SupportChat/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSidebarTools/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSubscriptionStatus/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialCreditAccess/></DashboardSafeBoundary>
    <DashboardSafeBoundary><TrialConversionCoach/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardLogoutButton/></DashboardSafeBoundary>
    <DashboardSafeBoundary><NewUserGuide/></DashboardSafeBoundary>
  </>;
}
