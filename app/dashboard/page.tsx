import { DashboardAppV3 } from '@/components/dashboard-app-v3';
import { DashboardLogoutButton } from '@/components/dashboard-logout-button';
import { DashboardAdvancedControls } from '@/components/dashboard-advanced-controls';

export default function DashboardPage(){
  return <><DashboardAppV3/><DashboardAdvancedControls/><DashboardLogoutButton/></>;
}
