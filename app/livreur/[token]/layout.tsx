import {DriverSessionClaim} from '@/components/driver-session-claim';
import {DriverNativeOpen} from '@/components/driver-native-open';
export default async function DriverLayout({children,params}:{children:React.ReactNode;params:Promise<{token:string}>}){const {token}=await params;return <><DriverNativeOpen token={token}/><DriverSessionClaim token={token}/>{children}</>}
