import './globals.css';
import { config } from '../config';
export const metadata = { title: `${config.BRAND_NAME} — Component kit`, description: 'Local component review. Mock data only.', icons: { icon: './favicon.svg' } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
