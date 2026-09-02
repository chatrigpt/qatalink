import {TeamOrderConsole} from '@/components/team-order-console';
import {OpsCatalogOrderControls} from '@/components/ops-catalog-order-controls';
import {OpsPosStats} from '@/components/ops-pos-stats';
import {OpsHubManager} from '@/components/ops-hub-manager';
import {OpsOrderNotifications} from '@/components/ops-order-notifications';
import {OpsPromotionPanel} from '@/components/ops-promotion-panel';

export const dynamic='force-dynamic';

export default async function OpsPage({params}:{params:Promise<{key:string}>}){
  const {key}=await params;
  return <><TeamOrderConsole accessKey={key}/><OpsOrderNotifications accessKey={key}/><OpsHubManager accessKey={key}/><OpsPosStats accessKey={key}/><OpsCatalogOrderControls accessKey={key}/><OpsPromotionPanel accessKey={key}/></>;
}
