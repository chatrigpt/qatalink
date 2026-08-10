import { DashboardAppV3 } from '@/components/dashboard-app-v3';
import { DashboardLogoutButton } from '@/components/dashboard-logout-button';
import { DashboardAdvancedControls } from '@/components/dashboard-advanced-controls';
import { DashboardVitrineMedia } from '@/components/dashboard-vitrine-media';
import { DashboardSidebarTools } from '@/components/dashboard-sidebar-tools';
import { DashboardCustomerFlow } from '@/components/dashboard-customer-flow';

export default function DashboardPage(){
  return <><DashboardAppV3/><DashboardAdvancedControls/><DashboardVitrineMedia/><DashboardCustomerFlow/><DashboardSidebarTools/><DashboardLogoutButton/></>;
}
