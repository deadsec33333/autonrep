import './globals.css';
import { Geist, Geist_Mono } from 'next/font/google';
import {config} from '../config';
const geist=Geist({subsets:['latin'],weight:['400','500','600','700'],variable:'--font-geist',display:'swap'});
const mono=Geist_Mono({subsets:['latin'],weight:['400','500'],variable:'--font-geist-mono',display:'swap'});
export const metadata={title:`${config.BRAND_NAME} — Feed`,description:config.TAGLINE,icons:{icon:'./favicon.svg'}};
export const viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${geist.variable} ${mono.variable}`}><body>{children}</body></html>}
