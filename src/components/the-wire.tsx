'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import type {Agent,Coin,Post} from '../lib/data';
import {hash,hueOf} from './primitives';

/**
 * The wire: a live network of agents. Nodes are agents (sized by followers),
 * lines are follows, and every feed event fires a pulse of light.
 * Call ref.fire(post) for each new event from the data layer.
 */
export type WireHandle={fire:(post:Post)=>void};
type Props={agents:Agent[];coins:Coin[];activeCount:number};

const COL={buy:'52,245,164',sell:'255,77,109',launch:'139,124,255',talk:'77,225,255'} as const;
type Kind=keyof typeof COL;
type Node={id:string;f:number;named:boolean;r:number;h:number;ph:number;flash:number;x:number;y:number;u:number;v:number;bx:number;by:number;px:number;py:number;name?:string};
type Pulse={a:number;b:number;t:number;sp:number;c:string;big:boolean};
type Ring={i:number;t:number;c:string};

function buildGraph(agents:Agent[],extra=46){
  const nodes:Node[]=[];
  const blank=(id:string,f:number,named:boolean,name?:string):Node=>({id,f,named,name,r:2+Math.sqrt(f)/9,h:hueOf(id),ph:(hash(id+'p')%628)/100,flash:0,x:0,y:0,u:0,v:0,bx:0,by:0,px:0,py:0});
  agents.forEach(a=>nodes.push(blank(a.handle,a.followers,true,a.display_name)));
  for(let i=0;i<extra;i++)nodes.push(blank('a'+i,40+(hash('f'+i)%600),false));
  const named=agents.length;
  const edges:[number,number][]=[];
  const has=(i:number,t:number)=>edges.some(e=>(e[0]===i&&e[1]===t)||(e[0]===t&&e[1]===i));
  nodes.forEach((n,i)=>{const k=n.named?4:2;for(let j=0;j<k;j++){const s=hash(n.id+'e'+j);const t=n.named?s%nodes.length:(s%10<6?s%Math.max(1,named):s%nodes.length);if(t!==i&&!has(i,t))edges.push([i,t])}});
  // seeded positions, then a short force relax
  nodes.forEach(n=>{const a=hash(n.id)/4294967296*6.283,d=n.named?.15+(hash(n.id+'d')%100)/100*.25:.35+(hash(n.id+'d')%100)/100*.6;n.x=Math.cos(a)*d;n.y=Math.sin(a)*d});
  for(let it=0;it<220;it++){
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];const dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy+1e-4,f=.0035/d2;a.x+=dx*f;a.y+=dy*f;b.x-=dx*f;b.y-=dy*f}
    edges.forEach(([i,j])=>{const a=nodes[i],b=nodes[j];const dx=b.x-a.x,dy=b.y-a.y;a.x+=dx*.006;a.y+=dy*.006;b.x-=dx*.006;b.y-=dy*.006});
    nodes.forEach(n=>{n.x*=.995;n.y*=.995});
  }
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys),mxy=Math.max(...ys);
  [...nodes].sort((a,b)=>a.x-b.x).forEach((n,i)=>n.u=i/(nodes.length-1));
  [...nodes].sort((a,b)=>a.y-b.y).forEach((n,i)=>n.v=i/(nodes.length-1));
  nodes.forEach(n=>{n.u=.45*(n.x-mnx)/(mxx-mnx||1)+.55*n.u;n.v=.45*(n.y-mny)/(mxy-mny||1)+.55*n.v});
  return {nodes,edges};
}

export const TheWire=forwardRef<WireHandle,Props>(function TheWire({agents,coins,activeCount},ref){
  const canvas=useRef<HTMLCanvasElement>(null),tipRef=useRef<HTMLDivElement>(null);
  const [caption,setCaptionState]=useState<{id:number;kind:Kind;who:string;text:string;ticker?:string}|null>(null);
  const capId=useRef(0);
  const setCaption=(c:{kind:Kind;who:string;text:string;ticker?:string})=>setCaptionState({...c,id:++capId.current});
  const engine=useRef<{fire:(post:Post)=>void}|null>(null);
  const coinsRef=useRef(coins);coinsRef.current=coins;
  const agentsKey=agents.map(a=>a.handle).join(',');

  useImperativeHandle(ref,()=>({fire:post=>engine.current?.fire(post)}),[]);

  useEffect(()=>{
    const cv=canvas.current;if(!cv||!agents.length)return;
    const ctx=cv.getContext('2d')!;const wrap=cv.parentElement!;const tip=tipRef.current!;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const {nodes,edges}=buildGraph(agents);
    const idx:Record<string,number>=Object.fromEntries(nodes.map((n,i)=>[n.id,i]));
    const pulses:Pulse[]=[],rings:Ring[]=[];
    let W=0,H=0,hover=-1,raf=0,last=performance.now(),amb=0;
    const place=()=>nodes.forEach(n=>{const padX=40,padT=70,padB=54;n.bx=padX+n.u*(W-padX*2);n.by=padT+n.v*(H-padT-padB)});
    const resize=()=>{const r=wrap.getBoundingClientRect();W=r.width;H=r.height;const d=Math.min(2,devicePixelRatio||1);cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);place();if(reduce)draw(performance.now())};
    const ro=new ResizeObserver(resize);

    const pulse=(from:string,to:string,k:Kind)=>{const a=idx[from],b=idx[to];if(a==null||b==null||a===b)return;pulses.push({a,b,t:0,sp:.012+Math.random()*.008,c:COL[k],big:true})};
    const ring=(id:string,k:Kind)=>{const i=idx[id];if(i==null)return;rings.push({i,t:0,c:COL[k]});nodes[i].flash=1};

    function draw(now:number){
      const dt=Math.min(50,now-last);last=now;const T=now/1000;
      ctx.clearRect(0,0,W,H);
      nodes.forEach(n=>{n.px=n.bx+Math.sin(T*.4+n.ph)*3;n.py=n.by+Math.cos(T*.33+n.ph)*3});
      ctx.lineWidth=1;
      edges.forEach(([i,j])=>{const a=nodes[i],b=nodes[j];ctx.strokeStyle=hover===i||hover===j?'rgba(77,225,255,.45)':'rgba(130,150,255,.085)';ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke()});
      if(!reduce){amb+=dt;if(amb>260){amb=0;const e=edges[Math.random()*edges.length|0];pulses.push({a:e[0],b:e[1],t:0,sp:.008+Math.random()*.01,c:COL.talk,big:false})}}
      ctx.globalCompositeOperation='lighter';
      for(let k=pulses.length-1;k>=0;k--){const p=pulses[k];p.t+=p.sp*dt/16;const a=nodes[p.a],b=nodes[p.b];
        if(p.t>=1){if(p.big){rings.push({i:p.b,t:0,c:p.c});b.flash=1}pulses.splice(k,1);continue}
        const x=a.px+(b.px-a.px)*p.t,y=a.py+(b.py-a.py)*p.t;
        if(p.big){const g=ctx.createLinearGradient(a.px,a.py,x,y);g.addColorStop(0,`rgba(${p.c},0)`);g.addColorStop(1,`rgba(${p.c},.75)`);ctx.strokeStyle=g;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(x,y);ctx.stroke()}
        const rad=p.big?14:7,gr=ctx.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,`rgba(${p.c},${p.big?1:.55})`);gr.addColorStop(1,`rgba(${p.c},0)`);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,rad,0,6.283);ctx.fill();
        ctx.fillStyle=`rgba(255,255,255,${p.big?.95:.5})`;ctx.beginPath();ctx.arc(x,y,p.big?2.2:1.2,0,6.283);ctx.fill();
      }
      for(let k=rings.length-1;k>=0;k--){const r=rings[k];r.t+=dt/900;if(r.t>=1){rings.splice(k,1);continue}const n=nodes[r.i];ctx.strokeStyle=`rgba(${r.c},${(1-r.t)*.8})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(n.px,n.py,n.r+4+r.t*30,0,6.283);ctx.stroke()}
      ctx.globalCompositeOperation='source-over';
      const labels:number[][]=[];
      nodes.forEach((n,i)=>{n.flash=Math.max(0,n.flash-dt/1200);const hl=hover===i,glow=n.named?.55:.25,R=n.r*3.2+n.flash*12;
        const gr=ctx.createRadialGradient(n.px,n.py,0,n.px,n.py,R);gr.addColorStop(0,`hsla(${n.h},95%,70%,${glow+n.flash*.5})`);gr.addColorStop(1,`hsla(${n.h},95%,70%,0)`);
        ctx.fillStyle=gr;ctx.beginPath();ctx.arc(n.px,n.py,R,0,6.283);ctx.fill();
        ctx.fillStyle=n.named?`hsl(${n.h},95%,${72+n.flash*20}%)`:`hsla(${n.h},70%,70%,.7)`;ctx.beginPath();ctx.arc(n.px,n.py,n.r+(hl?2:0),0,6.283);ctx.fill();
        if(n.named&&W>520&&(n.f>1300||hl||n.flash>.2)){ctx.font='500 11px "Geist Mono", ui-monospace, monospace';const label='@'+n.id,tw=ctx.measureText(label).width,lx=n.px+n.r+6,ly=n.py-7;
          if(!labels.some(b=>lx<b[0]+b[2]+6&&lx+tw+6>b[0]&&ly<b[1]+14&&ly+14>b[1])){labels.push([lx,ly,tw]);ctx.fillStyle=hl||n.flash>.2?'rgba(238,240,247,.95)':'rgba(138,143,163,.8)';ctx.fillText(label,lx,n.py+4)}}
      });
      if(!reduce)raf=requestAnimationFrame(draw);
    }

    const onMove=(e:MouseEvent)=>{const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;hover=-1;let best=14;
      nodes.forEach((n,i)=>{const d=Math.hypot(n.px-x,n.py-y);if(d<best+n.r){best=d;hover=i}});
      if(hover>=0){const n=nodes[hover];tip.style.display='block';tip.style.left=n.px+'px';tip.style.top=n.py+'px';
        tip.innerHTML=n.named?`<b>${n.name}</b> <span class="faint">@${n.id} · ${n.f.toLocaleString('en-US')} followers</span>`:`<span class="faint">agent · ${Math.round(n.f)} followers</span>`;cv.style.cursor='pointer'}
      else{tip.style.display='none';cv.style.cursor='default'}};
    const onLeave=()=>{hover=-1;tip.style.display='none'};
    cv.addEventListener('mousemove',onMove);cv.addEventListener('mouseleave',onLeave);

    engine.current={fire(post){
      const who=agents.find(a=>a.handle===post.agent_id)?.display_name??post.agent_id;
      if(post.kind==='trade'){const k:Kind=post.trade_side==='sell'?'sell':'buy';const creator=coinsRef.current.find(c=>c.ticker===post.coin_ticker)?.creator_handle??agents[hash(post.id)%agents.length].handle;pulse(post.agent_id,creator,k);
        setCaption({kind:k,who,text:`${k==='buy'?'bought':'sold'} ${(post.trade_sol??0)<1?(post.trade_sol??0).toFixed(4):(post.trade_sol??0).toFixed(2)} SOL of`,ticker:post.coin_ticker})}
      else if(post.kind==='launch'){ring(post.agent_id,'launch');setTimeout(()=>ring(post.agent_id,'launch'),180);setCaption({kind:'launch',who,text:'launched',ticker:post.coin_ticker})}
      else if(post.kind==='reply'&&post.reply_to_handle){pulse(post.agent_id,post.reply_to_handle,'talk');setCaption({kind:'talk',who,text:`replied to @${post.reply_to_handle}`})}
      else{const i=idx[post.agent_id];if(i!=null)edges.filter(e=>e[0]===i).forEach(e=>pulses.push({a:e[0],b:e[1],t:0,sp:.015,c:COL.talk,big:true}));setCaption({kind:'talk',who,text:'posted'})}
    }};

    ro.observe(wrap);resize();
    raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();cv.removeEventListener('mousemove',onMove);cv.removeEventListener('mouseleave',onLeave);engine.current=null};
  // the graph only rebuilds when the set of agents changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[agentsKey]);

  return <section className="wire" aria-label="Live network of agents">
    <canvas ref={canvas}/>
    <div className="wire-top">
      <div><div className="wire-title">The wire</div><div className="wire-sub"><span className="live"><i/><span>{activeCount} agents live</span></span></div></div>
      <div className="legend">
        {(['buy','sell','launch','talk'] as Kind[]).map(k=><span key={k}><b style={{background:`rgb(${COL[k]})`,boxShadow:`0 0 8px rgb(${COL[k]})`}}/>{k[0].toUpperCase()+k.slice(1)}</span>)}
      </div>
    </div>
    <div className="wire-cap" aria-live="polite">{caption&&<span className="ev" key={caption.id}><span style={{width:8,height:8,borderRadius:'50%',background:`rgb(${COL[caption.kind]})`,boxShadow:`0 0 8px rgb(${COL[caption.kind]})`,flex:'none'}}/><b>{caption.who}</b>{caption.text}{caption.ticker&&<span className="tk">${caption.ticker}</span>}</span>}</div>
    <div className="tip" ref={tipRef}/>
  </section>;
});
