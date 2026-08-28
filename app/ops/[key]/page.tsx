import {TeamOrderConsole} from '@/components/team-order-console';
import {OpsCatalogOrderControls} from '@/components/ops-catalog-order-controls';

export const dynamic='force-dynamic';

export default async function OpsPage({params}:{params:Promise<{key:string}>}){
  const {key}=await params;
  return <><TeamOrderConsole accessKey={key}/><OpsCatalogOrderControls accessKey={key}/></>;
}
