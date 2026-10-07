'use client';
import {Fragment} from 'react';
import {Icon} from './icons';
import {config} from '../config';
export function hash(s:string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
/** 5x5 mirrored pixel identicon in greys: unique per agent, terminal style. */
export function Avatar({seed,size=36}:{seed:string;size?:number}){
 const h=hash(seed),h2=hash(seed+'#');const tones=['#E8E8E8','#BDBDBD','#8C8C8C'];const ink=tones[h2%3];const bg=['#262626','#202020','#2B2B2B'][(h2>>>3)%3];
 const cells:React.ReactNode[]=[];
 for(let y=0;y<5;y++)for(let x=0;x<3;x++){if(((h>>>(y*3+x))&1)===1){cells.push(<rect key={`${x}-${y}`} x={1+x} y={1+y} width="1" height="1" fill={ink}/>);if(x<2)cells.push(<rect key={`m${x}-${y}`} x={5-x} y={1+y} width="1" height="1" fill={ink}/>)}}
 return <svg className="av" width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true" style={{width:size,height:size}}><rect width="7" height="7" fill={bg}/>{cells}</svg>}
export function CoinImage({ticker,size=44}:{ticker:string;size?:number}){const h=hash(ticker);const g=24+(h%5)*6;return <span className={`ci ci-${size}`} style={{background:`rgb(${g},${g},${g})`}}>{ticker.slice(0,size<32?2:3)}</span>}
const history=new Map<string,number[]>();
/** Small live price line. Keeps the last 24 values seen per coin in memory. */
export function Spark({ticker,value,change}:{ticker:string;value:number;change:number}){
 let h=history.get(ticker);
 if(!h){let v=value*(1-change/100);const seed=hash(ticker);h=Array.from({length:24},(_,i)=>{v+=(value-v)/(24-i)+(((seed>>>(i%24))&7)-3.5)/3.5*value*.025;return v});history.set(ticker,h)}
 if(h[h.length-1]!==value){h.push(value);if(h.length>24)h.shift()}
 const mn=Math.min(...h),mx=Math.max(...h),w=56,H=24;
 const pts=h.map((v,i)=>`${(i/(h!.length-1)*w).toFixed(1)},${(H-2-(v-mn)/(mx-mn||1)*(H-4)).toFixed(1)}`).join(' ');
 const up=change>=0;
 return <svg className="spark" viewBox={`0 0 ${w} ${H}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={up?'#E8E8E8':'#7C7C7C'} strokeWidth="1.25" strokeDasharray={up?undefined:'2 2'} strokeLinejoin="miter"/></svg>}
export function SolAmount({value}:{value:number}){return <>{value<1?value.toFixed(4):value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}<span className="sol">SOL</span></>}
export function TickerText({text}:{text:string}){return <>{text.split(/(\$[A-Z0-9]{2,10})/g).map((part,i)=>/^\$[A-Z0-9]+$/.test(part)?<span className="tk" key={i}>{part}</span>:<Fragment key={i}>{part}</Fragment>)}</>}
export function ProgressBar({value,mini=false}:{value:number;mini?:boolean}){return <div className={mini?'mini':'prog'}><div className="bar" role="progressbar" aria-label="Curve progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></div><span>{value}%</span></div>}
export function TxButton({signature,label,onMock}:{signature?:string;label:string;onMock:()=>void}){return <a className="tx" href={signature?config.EXPLORER_TX.replace('{sig}',encodeURIComponent(signature)):undefined} role={signature?undefined:'button'} tabIndex={signature?undefined:0} target={signature?'_blank':undefined} rel={signature?'noopener noreferrer':undefined} title={signature?'View on Solscan':'Simulated transaction — no explorer record'} onClick={signature?undefined:onMock} onKeyDown={e=>{if(!signature&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onMock()}}}>{label}<Icon name="ext"/></a>}
export function TimeAgo({seconds,date}:{seconds:number;date:number}){const label=seconds<60?`${seconds}s`:seconds<3600?`${Math.floor(seconds/60)}m`:seconds<86400?`${Math.floor(seconds/3600)}h`:`${Math.floor(seconds/86400)}d`;return <span className="time" title={new Date(date).toISOString()}>· {label}</span>}
