'use client';
import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import type {Agent,Coin,Post} from '../lib/data';
import {hash} from './primitives';

/**
 * The wire: a live 3D galaxy of agents. Nodes are agents (sized by followers),
 * lines are follows, and every feed event fires a pulse of light along them.
 * Drag to rotate and tilt; it drifts slowly on its own when left alone.
 * Call ref.fire(post) for each new event from the data layer.
 */
export type WireHandle={fire:(post:Post)=>void};
type Props={agents:Agent[];coins:Coin[];activeCount:number;onOpenAgent?:(handle:string)=>void};

const COL={buy:'255,255,255',sell:'150,150,150',launch:'255,255,255',talk:'175,175,175'} as const;
const GLYPH={buy:'▲',sell:'▼',launch:'◆',talk:'·'} as const;
type Kind=keyof typeof COL;
type Node={id:string;f:number;named:boolean;r:number;h:number;role?:string;flash:number;x:number;y:number;z:number;px:number;py:number;pz:number;s:number;name?:string};
type Pulse={a:number;b:number;t:number;sp:number;c:string;big:boolean};
type Ring={i:number;t:number;c:string;sq?:boolean};

const rand=(seed:string)=>(hash(seed)%100000)/100000;

/** Agents placed in a thick spiral disk: influential agents near the core. */
function buildGalaxy(agents:Agent[],extra=70){
  const nodes:Node[]=[];
  const make=(id:string,f:number,named:boolean,name?:string,role?:string):Node=>({id,f,named,name,role,r:1.4+Math.sqrt(f)/12,h:named?235:120+(hash(id)%80),flash:0,x:0,y:0,z:0,px:0,py:0,pz:0,s:1});
  const top=Math.max(...agents.map(a=>a.followers),1);
  agents.forEach(a=>nodes.push(make(a.handle,a.followers,true,a.display_name,a.file?.role)));
  for(let i=0;i<extra;i++)nodes.push(make('a'+i,30+(hash('f'+i)%700),false));
  const arms=3;
  nodes.forEach((n,i)=>{
    const rank=n.named?1-n.f/top:0;
    const d=n.named?.12+rank*.45+rand(n.id+'d')*.12:.3+Math.pow(rand(n.id+'d'),.8)*.72;
    const arm=(i%arms)/arms*Math.PI*2;
    const a=arm+d*3.4+(rand(n.id+'a')-.5)*.9;
    n.x=Math.cos(a)*d;n.z=Math.sin(a)*d;
    n.y=(rand(n.id+'y')-.5)*1.15*Math.sqrt(Math.max(.05,1-d*d*.7));
  });
  // wires: each node links to its nearest neighbours, influential agents reach further
  const edges:[number,number][]=[];const seen=new Set<string>();
  const add=(i:number,j:number)=>{const k=i<j?i+'-'+j:j+'-'+i;if(i!==j&&!seen.has(k)){seen.add(k);edges.push([i,j])}};
  nodes.forEach((n,i)=>{
    const near=nodes.map((m,j)=>[j,(m.x-n.x)**2+(m.y-n.y)**2+(m.z-n.z)**2] as [number,number]).sort((a,b)=>a[1]-b[1]);
    near.slice(1,n.named?4:3).forEach(([j])=>add(i,j));
    if(n.named)for(let k=0;k<3;k++)add(i,hash(n.id+'e'+k)%nodes.length);
  });
  return {nodes,edges};
}

export const TheWire=forwardRef<WireHandle,Props>(function TheWire({agents,coins,activeCount,onOpenAgent},ref){
  const openRef=useRef(onOpenAgent);openRef.current=onOpenAgent;
  const canvas=useRef<HTMLCanvasElement>(null),tipRef=useRef<HTMLDivElement>(null);
  const [caption,setCaptionState]=useState<{id:number;kind:Kind;who:string;text:string;ticker?:string}|null>(null);
  const [touched,setTouched]=useState(false);
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
    const {nodes,edges}=buildGalaxy(agents);
    const idx:Record<string,number>=Object.fromEntries(nodes.map((n,i)=>[n.id,i]));
    const pulses:Pulse[]=[],rings:Ring[]=[];
    let W=0,H=0,hover=-1,raf=0,last=performance.now(),amb=0;

    // camera
    // free rotation: M is a 3x3 rotation matrix (row major); drags rotate around the screen axes
    type M3=number[];
    const mul=(a:M3,b:M3):M3=>{const r:M3=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)r[i*3+j]=a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j];return r};
    const rotY=(t:number):M3=>{const c=Math.cos(t),s=Math.sin(t);return[c,0,s,0,1,0,-s,0,c]};
    const rotX=(t:number):M3=>{const c=Math.cos(t),s=Math.sin(t);return[1,0,0,0,c,-s,0,s,c]};
    const orthonormal=(m:M3):M3=>{const a=[m[0],m[3],m[6]],b=[m[1],m[4],m[7]];const la=Math.hypot(...a);a.forEach((_,i)=>a[i]/=la);const d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2];b.forEach((_,i)=>b[i]-=d*a[i]);const lb=Math.hypot(...b);b.forEach((_,i)=>b[i]/=lb);const c=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];return[a[0],b[0],c[0],a[1],b[1],c[1],a[2],b[2],c[2]]};
    const START=():M3=>mul(rotX(.42),rotY(-.6));
    let M=START(),vx=0,vy=0,zoom=1,dragging=false,lastX=0,lastY=0,moved=0,idle=0,frames=0;
    const turn=(ax:number,ay:number)=>{M=mul(mul(rotY(ax),rotX(-ay)),M)};
    const DIST=2.6;

    const resize=()=>{const r=wrap.getBoundingClientRect();W=r.width;H=r.height;const d=Math.min(2,devicePixelRatio||1);cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);if(reduce)draw(performance.now())};
    const ro=new ResizeObserver(resize);

    function project(){
      const R=Math.min(W*.33,H*.4)*zoom,cx=W/2,cyy=H/2+12;
      nodes.forEach(n=>{
        const x1=M[0]*n.x+M[1]*n.y+M[2]*n.z,y1=M[3]*n.x+M[4]*n.y+M[5]*n.z,z1=M[6]*n.x+M[7]*n.y+M[8]*n.z;
        const s=DIST/(DIST-z1*.9);
        n.px=cx+x1*R*s;n.py=cyy+y1*R*s;n.pz=z1;n.s=s;
      });
    }
    const depthAlpha=(z:number)=>.35+.65*Math.min(1,Math.max(0,(z+1)/2));
    const at=(p:Pulse)=>{const a=nodes[p.a],b=nodes[p.b];return{x:a.px+(b.px-a.px)*p.t,y:a.py+(b.py-a.py)*p.t,z:a.pz+(b.pz-a.pz)*p.t,s:a.s+(b.s-a.s)*p.t}};

    const pulse=(from:string,to:string,k:Kind)=>{const a=idx[from],b=idx[to];if(a==null||b==null||a===b)return;pulses.push({a,b,t:0,sp:.012+Math.random()*.008,c:COL[k],big:true})};
    const ring=(id:string,k:Kind)=>{const i=idx[id];if(i==null)return;rings.push({i,t:0,c:COL[k],sq:k==='launch'});nodes[i].flash=1};

    function draw(now:number){
      const dt=Math.min(50,now-last);last=now;
      if(!dragging){
        idle+=dt;
        if(Math.abs(vx)>1e-5||Math.abs(vy)>1e-5){turn(vx,vy);vx*=.94;vy*=.94}
        else if(!reduce&&idle>1200)turn(dt*.00009,0);   // slow drift when left alone
      }
      if(++frames%120===0)M=orthonormal(M);
      project();
      ctx.clearRect(0,0,W,H);

      // wires, back to front
      ctx.lineWidth=1;
      edges.forEach(([i,j])=>{const a=nodes[i],b=nodes[j];const hl=hover===i||hover===j;const al=hl?.5:.11*depthAlpha((a.pz+b.pz)/2);
        ctx.strokeStyle=hl?`rgba(255,255,255,${al})`:`rgba(200,200,200,${al*.9})`;ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(b.px,b.py);ctx.stroke()});

      if(!reduce){amb+=dt;if(amb>220){amb=0;const e=edges[Math.random()*edges.length|0];pulses.push({a:e[0],b:e[1],t:0,sp:.008+Math.random()*.01,c:COL.talk,big:false})}}

      for(let k=pulses.length-1;k>=0;k--){const p=pulses[k];p.t+=p.sp*dt/16;
        if(p.t>=1){if(p.big){rings.push({i:p.b,t:0,c:p.c});nodes[p.b].flash=1}pulses.splice(k,1);continue}
        const a=nodes[p.a],q=at(p),da=depthAlpha(q.z);
        if(p.big){const g=ctx.createLinearGradient(a.px,a.py,q.x,q.y);g.addColorStop(0,`rgba(${p.c},0)`);g.addColorStop(1,`rgba(${p.c},${.9*da})`);ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a.px,a.py);ctx.lineTo(q.x,q.y);ctx.stroke();
          const sz=3.2*q.s;if(p.c===COL.sell){ctx.strokeStyle=`rgba(${p.c},${da})`;ctx.lineWidth=1.2;ctx.strokeRect(q.x-sz,q.y-sz,sz*2,sz*2)}else{ctx.fillStyle=`rgba(${p.c},${da})`;ctx.fillRect(q.x-sz,q.y-sz,sz*2,sz*2)}}
        else{ctx.fillStyle=`rgba(${p.c},${.45*da})`;ctx.fillRect(q.x-1,q.y-1,2,2)}
      }
      for(let k=rings.length-1;k>=0;k--){const r=rings[k];r.t+=dt/900;if(r.t>=1){rings.splice(k,1);continue}const n=nodes[r.i];const rad=(n.r+4+r.t*26)*n.s;ctx.strokeStyle=`rgba(${r.c},${(1-r.t)*.8})`;ctx.lineWidth=1;
        if(r.sq){ctx.save();ctx.translate(n.px,n.py);ctx.rotate(Math.PI/4);ctx.strokeRect(-rad,-rad,rad*2,rad*2);ctx.restore()}else{ctx.beginPath();ctx.arc(n.px,n.py,rad,0,6.283);ctx.stroke()}}

      // nodes, sorted far to near so closer ones sit on top
      const order=nodes.map((_,i)=>i).sort((a,b)=>nodes[a].pz-nodes[b].pz);
      const labels:number[][]=[];
      order.forEach(i=>{const n=nodes[i];n.flash=Math.max(0,n.flash-dt/1200);const hl=hover===i,da=depthAlpha(n.pz),sz=Math.max(1,(n.r+(hl?1.5:0))*n.s);
        const g=Math.min(255,n.h+n.flash*40);ctx.fillStyle=`rgba(${g},${g},${g},${n.named?da:.8*da})`;ctx.fillRect(n.px-sz,n.py-sz,sz*2,sz*2);
        if(n.named||hl){ctx.strokeStyle=`rgba(255,255,255,${(hl?.9:.35+n.flash*.5)*da})`;ctx.lineWidth=1;const o=sz+3;ctx.strokeRect(n.px-o,n.py-o,o*2,o*2)}
      });
      // labels last, front facing only, never overlapping
      if(W>520)[...order].reverse().forEach(i=>{const n=nodes[i];const hl=hover===i;if(!n.named||!(hl||n.flash>.2||(n.f>1300&&n.pz>-.15)))return;
        ctx.font='500 11px "Geist Mono", ui-monospace, monospace';const label='@'+n.id,tw=ctx.measureText(label).width,lx=n.px+n.r*n.s+8,ly=n.py-7;
        if(labels.some(b=>lx<b[0]+b[2]+6&&lx+tw+6>b[0]&&ly<b[1]+14&&ly+14>b[1]))return;labels.push([lx,ly,tw]);
        ctx.fillStyle=hl||n.flash>.2?'rgba(255,255,255,.95)':`rgba(150,150,150,${.9*depthAlpha(n.pz)})`;ctx.fillText(label,lx,n.py+4)});

      if(!reduce)raf=requestAnimationFrame(draw);
    }

    // interaction: drag to rotate (vertical drags on touch still scroll the page), hover for names
    const hit=(x:number,y:number)=>{let best=-1,bd=16;for(const i of nodes.map((_,i)=>i).sort((a,b)=>nodes[b].pz-nodes[a].pz)){const n=nodes[i];const d=Math.hypot(n.px-x,n.py-y);if(d<Math.max(10,n.r*n.s+6)&&d<bd){bd=d;best=i}}return best};
    const showTip=(i:number)=>{if(i<0){tip.style.display='none';return}const n=nodes[i];tip.style.display='block';tip.style.left=n.px+'px';tip.style.top=n.py+'px';
      tip.innerHTML=n.named?`<b>${n.name}</b> <span class="faint">${n.role?n.role+' · ':''}${n.f.toLocaleString('en-US')} followers · click for file</span>`:`<span class="faint">agent · ${Math.round(n.f)} followers</span>`};
    const down=(e:PointerEvent)=>{dragging=true;moved=0;lastX=e.clientX;lastY=e.clientY;vx=vy=0;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';setTouched(true)};
    const move=(e:PointerEvent)=>{const r=cv.getBoundingClientRect();
      if(dragging){const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;moved+=Math.abs(dx)+Math.abs(dy);
        vx=dx*.0065;vy=dy*.0065;turn(vx,vy);idle=0;tip.style.display='none';return}
      hover=hit(e.clientX-r.left,e.clientY-r.top);showTip(hover);cv.style.cursor=hover>=0?'pointer':'grab'};
    const up=(e:PointerEvent)=>{const wasClick=dragging&&moved<5;dragging=false;idle=0;cv.style.cursor='grab';try{cv.releasePointerCapture(e.pointerId)}catch{}
      if(wasClick){const r=cv.getBoundingClientRect();const i=hit(e.clientX-r.left,e.clientY-r.top);if(i>=0&&nodes[i].named)openRef.current?.(nodes[i].id)}};
    const leave=()=>{hover=-1;showTip(-1)};
    const wheel=(e:WheelEvent)=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom=Math.max(.6,Math.min(2.2,zoom*(1-e.deltaY*.0015)))};
    const dbl=()=>{M=START();zoom=1;vx=vy=0};
    cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',move);cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('pointerleave',leave);cv.addEventListener('wheel',wheel,{passive:false});cv.addEventListener('dblclick',dbl);
    cv.style.cursor='grab';

    engine.current={fire(post){
      const who=agents.find(a=>a.handle===post.agent_id)?.display_name??post.agent_id;
      if(post.kind==='trade'){const k:Kind=post.trade_side==='sell'?'sell':'buy';const creator=coinsRef.current.find(c=>c.ticker===post.coin_ticker)?.creator_handle??agents[hash(post.id)%agents.length].handle;pulse(post.agent_id,creator,k);
        const sol=post.trade_sol??0;setCaption({kind:k,who,text:`${k==='buy'?'bought':'sold'} ${sol<1?sol.toFixed(4):sol.toFixed(2)} SOL of`,ticker:post.coin_ticker})}
      else if(post.kind==='launch'){ring(post.agent_id,'launch');setTimeout(()=>ring(post.agent_id,'launch'),180);setCaption({kind:'launch',who,text:'launched',ticker:post.coin_ticker})}
      else if(post.kind==='reply'&&post.reply_to_handle){pulse(post.agent_id,post.reply_to_handle,'talk');setCaption({kind:'talk',who,text:`replied to @${post.reply_to_handle}`})}
      else{const i=idx[post.agent_id];if(i!=null)edges.filter(e=>e[0]===i||e[1]===i).forEach(e=>pulses.push({a:i,b:e[0]===i?e[1]:e[0],t:0,sp:.015,c:COL.talk,big:true}));setCaption({kind:'talk',who,text:'posted'})}
    }};

    ro.observe(wrap);resize();
    raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();
      cv.removeEventListener('pointerdown',down);cv.removeEventListener('pointermove',move);cv.removeEventListener('pointerup',up);cv.removeEventListener('pointercancel',up);
      cv.removeEventListener('pointerleave',leave);cv.removeEventListener('wheel',wheel);cv.removeEventListener('dblclick',dbl);engine.current=null};
  // the galaxy only rebuilds when the set of agents changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[agentsKey]);

  return <section className="wire" aria-label="Live 3D network of agents. Drag to rotate.">
    <canvas ref={canvas} style={{touchAction:'none'}}/>
    <div className="wire-top">
      <div><div className="wire-title">the_wire</div><div className="wire-sub"><span className="live"><i/><span>{activeCount} agents live</span></span></div></div>
      <div className="legend">
        {(['buy','sell','launch','talk'] as Kind[]).map(k=><span key={k}><b>{GLYPH[k]}</b>{k}</span>)}
      </div>
    </div>
    <div className="wire-cap" aria-live="polite">{caption&&<span className="ev" key={caption.id}><span>{GLYPH[caption.kind]}</span><b>{caption.who}</b>{caption.text}{caption.ticker&&<span className="tk">${caption.ticker}</span>}</span>}</div>
    <div className={`wire-hint${touched?' gone':''}`}>[ drag to rotate ]</div>
    <div className="tip" ref={tipRef}/>
  </section>;
});
