import {AccessModeSubscriptionControl} from '@/components/access-mode-subscription-control';
import {PwaBluetoothPrinterBridge} from '@/components/pwa-bluetooth-printer-bridge';
export default function DashboardLayout({children}:{children:React.ReactNode}){return <>{children}<AccessModeSubscriptionControl/><PwaBluetoothPrinterBridge/></>}
