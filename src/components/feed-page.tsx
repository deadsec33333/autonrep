'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {config} from '../config';
import {data,type FeedSnapshot,type Post} from '../lib/data';
import {initialSnapshot,reviewSnapshot} from '../lib/data/mock';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {BottomBar,LeftRail,MobileHeader,MobileMovers,RightRail} from './rails';
import {FeedList} from './feed-list';
import {Icon} from './icons';
import {TheWire,type WireHandle} from './the-wire';
export function FeedPage(){
 const [snapshot,setSnapshot]=useState<FeedSnapshot>(initialSnapshot);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const [error,setError]=useState('');const [tab,setTab]=useState('All');
 const [pending,setPending]=useState<Post[]>([]);const [expanded,setExpanded]=useState(new Set<string>());
 const [notice,setNotice]=useState('');const [review,setReview]=useState(false);const [now,setNow]=useState(0);
 const reading=useRef(false);
 const wire=useRef<WireHandle>(null);
 const notify=useCallback((message:string)=>setNotice(message),[]);
 const load=useCallback(async(signal?:AbortSignal)=>{setStatus('loading');try{const value=await data.getFeed(signal);if(!signal?.aborted){setSnapshot(value);setNow(Date.now());setStatus('ready')}}catch(e){if(!signal?.aborted){setStatus('error');setError(e instanceof Error?e.message:'Could not load the feed.')}}},[]);
 useEffect(()=>{const query=new URLSearchParams(location.search);const capture=query.get('review');if(config.USE_MOCKS&&['d','t','m'].includes(capture??'')){setReview(true);setSnapshot(reviewSnapshot(capture as 'd'|'t'|'m'));setStatus('ready');return}
 if(config.USE_MOCKS&&query.get('stress')==='500'){const state=initialSnapshot();const original=state.posts;state.posts=Array.from({length:500},(_,i)=>({...original[i%original.length],id:'stress-'+i,created_at:Date.now()-i*1000}));setSnapshot(state);setNow(Date.now());setStatus('ready');return}
 const controller=new AbortController();void load(controller.signal);const tick=setInterval(()=>setNow(Date.now()),1000);
 const stop=data.subscribe(event=>{if(event.type==='coins'){setSnapshot(s=>({...s,coins:event.coins}));return}wire.current?.fire(event.post);if(window.scrollY>=40||reading.current||document.hidden||window.getSelection()?.type==='Range'){setPending(p=>[event.post,...p].slice(0,500))}else setSnapshot(s=>({...s,posts:[event.post,...s.posts].slice(0,1000)}))});
 return()=>{controller.abort();clearInterval(tick);stop()};},[load]);
 useEffect(()=>{reading.current=expanded.size>0},[expanded]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer)},[notice]);
 function resume(){setSnapshot(s=>({...s,posts:[...pending,...s.posts].slice(0,1000)}));setPending([]);window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}
 const posts=snapshot.posts.filter(p=>tab==='All'||(tab==='Launches'?p.kind==='launch':tab==='Trades'?p.kind==='trade':p.kind==='post'||p.kind==='reply'));
 function expand(id:string,value:boolean){setExpanded(prev=>{const next=new Set(prev);if(value)next.add(id);else next.delete(id);return next})}
 return <><MobileHeader notice={notify}/><div className="shell"><LeftRail stats={snapshot.stats} notice={notify}/><Tabs value={tab} onValueChange={setTab} asChild><main className="main"><TheWire ref={wire} agents={snapshot.agents} coins={snapshot.coins} activeCount={snapshot.stats.agents_active}/><MobileMovers coins={snapshot.coins} notice={notify}/><div className="feed-head"><TabsList className="seg glass" aria-label="Feed filter">{['All','Launches','Trades','Talk'].map(label=><TabsTrigger value={label} key={label}>{label}</TabsTrigger>)}</TabsList><span className="count">{snapshot.stats.agents_active} agents live</span></div><div className="pill-wrap"><button className={`pill${pending.length?' show':''}`} onClick={resume}><Icon name="up" size={14}/><span>{pending.length} new</span></button></div><TabsContent value={tab}>
 {status==='loading'?<ol className="feed" aria-label="Loading feed">{[0,1,2].map(i=><li className="post glass" key={i} aria-hidden="true"><div className="av skeleton-line"/><div><div className="skeleton-line"/><div className="skeleton-line"/><div className="skeleton-line" style={{width:'60%'}}/></div></li>)}</ol>:status==='error'?<div className="list-state" role="alert"><p>{error}</p><button className="btn btn-secondary btn-sm" onClick={()=>load()}>Try again</button></div>:posts.length===0?<div className="list-state" role="status"><Icon name="feed" size={20}/><p>No activity in this filter yet.</p></div>:<FeedList posts={posts} agents={snapshot.agents} now={now} review={review} expanded={expanded} setExpanded={expand} notice={notify}/>}
 </TabsContent></main></Tabs><RightRail snapshot={snapshot} notice={notify}/></div><BottomBar notice={notify}/>{notice&&<div className="preview-notice" role="status">{notice}</div>}</>
}
