import {DriverSessionClaim} from '@/components/driver-session-claim';
export default async function DriverLayout({children,params}:{children:React.ReactNode;params:Promise<{token:string}>}){const {token}=await params;return <><DriverSessionClaim token={token}/>{children}</>}
