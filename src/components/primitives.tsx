'use client';
import {Fragment} from 'react';
import {Icon} from './icons';
import {config} from '../config';
export function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export const HUES=[258,200,170,320,190,280,150,230,340,210];
export const hueOf=(s:string)=>HUES[hash(s)%10];
export function Avatar({seed,size=40}:{seed:string;size?:number}){const h=hash(seed),a=HUES[h%10],b=HUES[(h>>>4)%10],k=(h>>>8)%4,r=(h>>>12)%360;const fill=`hsl(${b} 95% 70%)`;const shapes=[<circle key="circle" cx={14+(h>>>16)%12} cy={14+(h>>>20)%12} r="11" fill={fill}/>,<rect key="rect" x="9" y="9" width="22" height="22" rx="6" transform={`rotate(${r} 20 20)`} fill={fill}/>,<path key="path" d={`M0 ${24+(h>>>16)%10}L40 ${12+(h>>>20)%10}V40H0z`} fill={fill}/>,<circle key="ring" cx="20" cy="20" r="9" fill="none" stroke={fill} strokeWidth="6"/>];return <svg className="av" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={size!==40?{width:size,height:size}:undefined}><rect width="40" height="40" fill={`hsl(${a} 55% 22%)`}/>{shapes[k]}</svg>}
export function CoinImage({ticker,size=44}:{ticker:string;size?:number}){const h=hueOf(ticker);return <span className={`ci ci-${size}`} style={{background:`linear-gradient(140deg,hsl(${h} 80% 52%),hsl(${(h+40)%360} 70% 30%))`}}>{ticker.slice(0,size<32?2:3)}</span>}
const history=new Map<string,number[]>();
/** Small live price line. Keeps the last 24 values seen per coin in memory. */
export function Spark({ticker,value,change}:{ticker:string;value:number;change:number}){
 let h=history.get(ticker);
 if(!h){let v=value*(1-change/100);const seed=hash(ticker);h=Array.from({length:24},(_,i)=>{v+=(value-v)/(24-i)+(((seed>>>(i%24))&7)-3.5)/3.5*value*.025;return v});history.set(ticker,h)}
 if(h[h.length-1]!==value){h.push(value);if(h.length>24)h.shift()}
 const mn=Math.min(...h),mx=Math.max(...h),w=56,H=24;
 const pts=h.map((v,i)=>`${(i/(h!.length-1)*w).toFixed(1)},${(H-2-(v-mn)/(mx-mn||1)*(H-4)).toFixed(1)}`).join(' ');
 const col=change>=0?'var(--up)':'var(--down)';
 return <svg className="spark" viewBox={`0 0 ${w} ${H}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" style={{filter:`drop-shadow(0 0 3px ${col})`}}/></svg>}
export function SolAmount({value}:{value:number}){return <>{value<1?value.toFixed(4):value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}<span className="sol">SOL</span></>}
export function TickerText({text}:{text:string}){return <>{text.split(/(\$[A-Z0-9]{2,10})/g).map((part,i)=>/^\$[A-Z0-9]+$/.test(part)?<span className="tk" key={i}>{part}</span>:<Fragment key={i}>{part}</Fragment>)}</>}
export function ProgressBar({value,mini=false}:{value:number;mini?:boolean}){return <div className={mini?'mini':'prog'}><div className="bar" role="progressbar" aria-label="Curve progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></div><span>{value}%</span></div>}
export function TxButton({signature,label,onMock}:{signature?:string;label:string;onMock:()=>void}){return <a className="tx" href={signature?config.EXPLORER_TX.replace('{sig}',encodeURIComponent(signature)):undefined} role={signature?undefined:'button'} tabIndex={signature?undefined:0} target={signature?'_blank':undefined} rel={signature?'noopener noreferrer':undefined} title={signature?'View on Solscan':'Simulated transaction — no explorer record'} onClick={signature?undefined:onMock} onKeyDown={e=>{if(!signature&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onMock()}}}>{label}<Icon name="ext"/></a>}
export function TimeAgo({seconds,date}:{seconds:number;date:number}){const label=seconds<60?`${seconds}s`:seconds<3600?`${Math.floor(seconds/60)}m`:seconds<86400?`${Math.floor(seconds/3600)}h`:`${Math.floor(seconds/86400)}d`;return <span className="time" title={new Date(date).toISOString()}>· {label}</span>}
