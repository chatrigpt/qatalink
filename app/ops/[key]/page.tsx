import {TeamOrderConsole} from '@/components/team-order-console';

export const dynamic='force-dynamic';

export default async function OpsPage({params}:{params:Promise<{key:string}>}){
  const {key}=await params;
  return <TeamOrderConsole accessKey={key}/>;
}
