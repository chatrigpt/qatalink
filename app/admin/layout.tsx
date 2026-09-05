import {AdminRoleInsights} from '@/components/admin-role-insights';
import {AdminCatalogLinkAccess} from '@/components/admin-catalog-link-access';

export default function AdminLayout({children}:{children:React.ReactNode}){
  return <>{children}<AdminRoleInsights/><AdminCatalogLinkAccess/></>;
}
