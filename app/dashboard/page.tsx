import { DashboardAppV3 } from '@/components/dashboard-app-v3';
import { DashboardLogoutButton } from '@/components/dashboard-logout-button';
import { DashboardAdvancedControls } from '@/components/dashboard-advanced-controls';
import { DashboardVitrineMedia } from '@/components/dashboard-vitrine-media';
import { DashboardSidebarTools } from '@/components/dashboard-sidebar-tools';
import { DashboardCustomerFlow } from '@/components/dashboard-customer-flow';
import { DashboardAnalytics } from '@/components/dashboard-analytics';
import { DashboardSafeBoundary, DashboardStorageGuard } from '@/components/dashboard-safe-boundary';
import { NewUserGuide } from '@/components/new-user-guide';

export default function DashboardPage(){
  return <>
    <DashboardStorageGuard/>
    <DashboardSafeBoundary critical><DashboardAppV3/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAnalytics/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardAdvancedControls/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardVitrineMedia/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardCustomerFlow/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardSidebarTools/></DashboardSafeBoundary>
    <DashboardSafeBoundary><DashboardLogoutButton/></DashboardSafeBoundary>
    <DashboardSafeBoundary><NewUserGuide/></DashboardSafeBoundary>
  </>;
}
